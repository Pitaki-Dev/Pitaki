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

## 3. 运行环境要求

`tools/verify/` 需要**完整可用的 Chromium**：有 GPU，或至少足够大的 `/dev/shm` 与共享内存配额。

在**资源受限的容器**里（无 GPU、`/dev/shm` 过小），Chromium 的 GPU/renderer 进程会崩溃，
表现为 launch 后立刻断开或卡住 —— 软件 GL 回退（`--use-gl=angle --use-angle=swiftshader`）
也救不回来。

**本地能跑就在本地跑。** 若你的环境跑不起来（无头容器、无 GPU 的云开发机等），
不要花时间硬调，直接交给 CI：

```bash
git push
gh run list                            # 找最新 run
gh run view <run-id> --log-failed      # 只看失败 step
gh run download <run-id>               # 取 artifact
```

CI 的 `verify` job 跑在标准 GitHub runner 上，是**权威环境**：它执行
`verify:epub` + `verify:ui` 并上传 `verify-artifacts`。

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
> 真实书覆盖**已决定推迟到 Step 3**（理由见 [§6.2](#62-真实书-ci-覆盖推迟到-step-3)）。

---

## 5. Artifact 位置

| 位置 | 内容 |
|---|---|
| `gh run download <run-id>` | CI 产物（报告 JSON + 截图） |
| `tools/verify/artifacts/ci-<run-id>/` | 取回本地的同一份（gitignored） |

---

## 6. 两个已决定的事项

### 6.1 Action 版本：升到最新 major（Node 24）

当前所有 action 都 target Node 20（已 EOL），GitHub 现在强制它们跑在 Node 24 上并给出警告。

| Action | 现在 | 目标 | 最新 major 的运行时 |
|---|---|---|---|
| `actions/checkout` | v4 | **v7** | node24 |
| `actions/setup-node` | v4 | **v7** | node24 |
| `actions/upload-artifact` | v4 | **v7** | node24 |
| `pnpm/action-setup` | v4 | **v6** | node24 |

⚠️ **`setup-node` v5+ 的一个坑**：当 `package.json` 有 `packageManager` 字段时（本项目有：
`pnpm@9.15.9`），它会**自动启用缓存**，可能与现有的显式 `cache: pnpm` 冲突。
若 CI 报缓存配置错误，设 `package-manager-cache: false` 并保留显式缓存。

> 为什么不直接设 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`：那只是把警告压下去，
> Node 20 的 action 迟早会失效。自己挑时间升，好过被逼着升。

### 6.2 真实书 CI 覆盖：**推迟到 Step 3**

按 [§7](#7-别把测试当产品代码) 的规则自问「它防的是哪个已发生过的回归？」——
**真实书目前还没抓出过回归**，所以现在不加。

但已经**观察到过一个合成样本测不到的异常**：某本中文 EPUB 有 **532 个 section 却只有 3 条目录项**。
这类怪结构正是真实书的价值所在。因此把它作为 **Step 3 的验收项**记入
[ROADMAP.md](ROADMAP.md)：等 L2 适配层落地、真实书成为真实输入时再加，
形式为 `schedule` + `workflow_dispatch` 的**独立 job**，**不进 push/PR 路径**
（否则网络抖动会让每次 push 变红）。样本需 pin URL + 校验 sha256。

---

## 6.5 ⚠️ 覆盖缺口（未补之前，不得声称"支持"）

**当前 `verify:epub` 只处理 `.epub`**（`run-spike.mjs` 里 `.filter(name => name.endsWith('.epub'))`），
`gen:sample` 也只生成 EPUB。而 README 声称支持 **5 种**格式。

| 声称支持 | 实测覆盖 | 风险 |
|---|---|---|
| EPUB | ✅ 合成样本 + 真实书（本地） | — |
| **MOBI / KF8 (AZW3)** | ❌ **从未跑过** | 走 `fflate` 的 `unzlibSync`，HUFF/CDIC 解压是**完全不同的代码路径** |
| **FB2** | ❌ 从未跑过 | 独立解析器 |
| **CBZ** | ❌ 从未跑过 | 走 `fixed-layout.js` —— 该渲染器**连触摸处理都没有**（见 [UI.md](UI.md) §2） |
| **TXT** | ❌ 尚未实现 | 引擎无内置 TXT，需**自己实现 `book` 接口**。难点是把大文件切成多个 section（单个 10 MB 文本做一个 section 会不可用） |

**规则：声称支持的格式必须有对应测试，否则就是文档在撒谎。**

其他已知缺口：

| 缺口 | 现状 |
|---|---|
| 跨平台 | CI 只跑 `ubuntu-24.04`。**macOS（WKWebView）/ Windows（WebView2）从未测过** —— 对"兼容性广"的项目是硬伤 |
| 内存侧 | 只测**读取字节数**，没测 RSS / JS 堆。"不整体载入内存"目前是**间接证据** |
| 错误路径 | 打不开的文件、损坏的 EPUB、超大文件 —— 全未覆盖 |
| 真实书 | 已观察到合成样本测不到的结构（532 sections / 3 TOC）→ 见 [§6.2](#62-真实书-ci-覆盖推迟到-step-3) |

---

## 7. 别把测试当产品代码

曾经的反面案例：**`tools/` 883 行 vs 应用代码 1,028 行 —— 86%**。

规则：**新增工具前先问「它防的是哪个已发生过的回归？」** 答不上来就别加。
验证有价值，但验证本身也有维护成本，而且它会伪装成「进度」。
