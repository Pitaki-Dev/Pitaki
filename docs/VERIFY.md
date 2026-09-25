# 验证体系

[← 返回 README](../README.md)

> 这不是「测试计划」，是**已经产生回报的工具**。它们抓出过：Drawer 的 CSS 层叠回归、
> CSS 体积 85% 的浪费、以及 release 里两个无路径校验的文件读写入口。

---

## 1. 两套工具，互补而不重复

| 工具 | 命令 | 覆盖什么 | 为什么另一套做不到 |
|---|---|---|---|
| **`tools/tauri-smoke/`** | `pnpm tauri:smoke` | CSP 强制、WebKitGTK 渲染栈、**运行时 `<script>` 注入**、Rust IPC + ACL | 这些**只有真 Tauri 窗口**里才成立 |
| **`tools/verify/`** | `pnpm verify:epub`<br>`pnpm verify:ui`<br>`pnpm verify:snapshot` | EPUB 随机访问回归、26 项 UI/响应式/触摸检查、视觉回归 | 需要 Playwright 的稳定自动化与并行能力 |

**两者不能互相替代。** 实测证据：同一本 23.69 MiB 的 EPUB，
**WebKit 真加载了 36 张图（23.67%），Chromium 只有 1.29%** —— 渲染行为本身就有差异。
所以「Chromium 绿了」不等于「Tauri 绿了」，**两边都要过**。

---

## 2. 命令

```bash
# 生成确定性样本（12.49 MiB EPUB，不依赖外网）
pnpm gen:sample

# Chromium 侧
pnpm verify:epub        # EPUB 回归（随机访问判据）
pnpm verify:ui          # 26 项 UI / 响应式 / 触摸检查
pnpm verify:snapshot    # 计算样式快照 + 截图对比

# Tauri 侧（真窗口，CSP / WebKitGTK / IPC）
pnpm tauri:smoke
```

`tauri:smoke` 通过 `src-tauri/tauri.smoke.conf.json` 把 `devUrl` 指向根目录的
`smoke.html`（**dev-only**，`vite build` 只构建 `index.html`，所以它不进 `dist`）。

---

## 3. ⚠️ 本地跑不了 Chromium —— 用 CI

**受限容器**（无 `/dev/shm`、无 GPU）下 Chromium 的 GPU/renderer 进程会崩溃，
表现为 launch 后立刻断开或卡住。软件 GL 回退（`--use-gl=angle --use-angle=swiftshader`）
也试过，实页导航仍崩。**这与 CPU 架构无关，是容器资源限制。**

**不要在本机反复尝试。** 正确姿势：

```bash
git push
gh run list                            # 找最新 run
gh run view <run-id> --log-failed      # 只看失败 step
gh run download <run-id>               # 取 artifact
```

CI 的 `verify` job 是**权威**：它在正常 runner 上跑 `verify:epub` + `verify:ui`，
并上传 `verify-artifacts`。

---

## 4. CI

| Job | 内容 |
|---|---|
| `frontend` | `sync:foliate` → `build:vendor`（含入口守卫与体积断言）→ `typecheck` → `build` |
| `verify` | `playwright install` → `gen:sample` → 起 dev server → `verify:epub` → `verify:ui` → 上传 artifact |

样本**只用合成 EPUB**（`gen:sample.mjs`）—— 确定性、不依赖外网。真书（如 Gutenberg）
目前只在本地 `PITAKI_SAMPLES_DIR` 里跑。

> ℹ️ 合成样本的结构是**我们自己设计的**，测不到真实书的怪结构
> （比如某本中文书 532 个 section 但只有 3 条目录项）。
> 真实书覆盖是一个**待定项**，见 §6。

---

## 5. Artifact 位置

| 位置 | 内容 |
|---|---|
| `gh run download <run-id>` | CI 产物（报告 JSON + 截图） |
| `tools/verify/artifacts/ci-<run-id>/` | 取回本地的同一份（gitignored） |

---

## 6. 待定

- **真实书 CI 覆盖**：建议加成 `schedule` + `workflow_dispatch` 的**独立 job**，
  不进 push/PR 路径 —— 否则网络抖动会让每次 push 变红。等文档更新时一并决定。
- Node 20 deprecation 警告：把 action 升到 target Node 24 的版本，或设
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`。目前只是警告。

---

## 7. 别把测试当产品代码

曾经的反面案例：**`tools/` 883 行 vs 应用代码 1,028 行 —— 86%**。

规则：**新增工具前先问「它防的是哪个已发生过的回归？」** 答不上来就别加。
验证有价值，但验证本身也有维护成本，而且它会伪装成「进度」。
