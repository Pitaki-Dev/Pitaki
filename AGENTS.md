# AGENTS.md

> **给 agent 看的 README**（[agents.md](https://agents.md/) 约定，60k+ 项目使用）。
>
> 本文件**只放开工必需的速查**。事实来源是 [`docs/`](docs/) —— 需要细节就去那里，**不要在这里重复**。
> 同一份信息**只有一个 owner**：若本文件与 `docs/` 冲突，**以 `docs/` 为准**，并报告冲突。

---

## 1. 项目概览

**Pitaki** —— 轻依赖、兼容性广的跨平台电子书阅读器。
桌面端 Tauri v2；Web 用同一份 Vite 静态构建；引擎是 **foliate-js**（vendored submodule，不是 npm 包）。

**当前状态：外壳已完成，阅读功能尚未实现。**

| ✅ 已完成 | 📋 未开始 |
|---|---|
| 技术选型 / 许可证审计 / 引擎可行性验证 | **Phase 3 引擎接入 ← 下一步** |
| 工程骨架 + CI + 两套验证工具 | Phase 4 阅读体验 |
| 界面外壳（响应式 + 触摸就绪） | Phase 5 本地存储 |

阅读器页**尚未接入引擎**（画布是占位），书库页**没有导入功能**。
完整计划 → [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## 2. 命令

```bash
pnpm install
pnpm run build:vendor     # ★ 首次克隆后必跑，生成 public/foliate/vendor/*
pnpm run tauri:dev        # 桌面端开发
pnpm run dev              # 仅前端（浏览器）
pnpm run typecheck        # tsc --noEmit
pnpm run build            # 前端构建

# 验证（见 §6）
pnpm run tauri:smoke      # Tauri 内冒烟：CSP / WebKitGTK / 运行时注入 / IPC
pnpm run verify:epub      # Chromium 侧 EPUB 回归
pnpm run verify:ui        # 26 项 UI / 响应式 / 触摸
pnpm run gen:sample       # 生成确定性样本
```

| 锁定版本 | |
|---|---|
| Node | ≥ 20 |
| Rust | **1.98.1**（`rust-toolchain.toml` 已锁，rustup 自动切换） |
| 包管理器 | pnpm 9.15.9（`packageManager` 字段） |

---

## 3. 工作纪律

- **一次只做一个 Phase**，做完按 §10 格式汇报，**等确认再继续**
- 动手前先列 3–5 行计划
- **不要通读仓库**：先用 §9 定位，只读相关的那一份
- 不要重复读同一个文件；引用写「文件:行号」，**不要贴大段代码回对话**
- 用**精准编辑**，不要整文件重写
- 长任务把进展写进 `NOTES.md`，不要靠对话记忆
- 不确定就停下来问，不要猜

> 本文件的职责是**让你少读**。若发现自己在通读 `docs/`，说明入口找错了。

---

## 4. 不可违反的规则

**已经踩过的坑**，全部有实测依据。违反会导致返工或方案失效。

| # | 规则 | 原因 |
|---|---|---|
| R1 | **ZIP 解压必须用 `@zip.js/zip.js`，绝不用 fflate 顶替** | zip.js 是唯一支持 `File` 随机访问的库，是「不整体载入内存」的基础。fflate 在引擎里**只**用于 MOBI 字体解压 |
| R2 | **foliate-js 只能用 git submodule，禁止 `npm i foliate-js`** | npm 上那个包是第三方发布、已停更 |
| R3 | **PDF 是「构建期 vendor」，不是运行时 `import('pdfjs-dist')`** | 引擎通过 `globalThis.pdfjsLib` 使用它 |
| R4 | **PDF 的 `cmaps/` 和 `standard_fonts/` 必须一起拷贝** | 缺 `cmaps` 会让**中文 PDF 乱码** |
| R5 | **`pdfjs-dist` 精确锁 `5.5.207`，不带 `^`** | 引擎内部依赖该版本 |
| R6 | **HeroUI 的 CSS 变量控制不了书页正文** | 书页在嵌套 iframe 内，必须走 `renderer.setStyles()` + `::part(filter)` |
| R7 | **`relocate` 事件必须节流** | 滚动模式下每帧触发，直接写 SQLite 会打爆 IO |
| R8 | **Tauri v2 的 capabilities 不配，插件调用直接失败** | v2 与 v1 最大的差异；CSP 还必须放行 `blob:` |
| R9 | **Rust 锁 `1.98.1`，不要用 `1.98.0`** | 1.98.0 有 vtable 误编译缺陷（rust-lang/rust#161441） |
| R10 | **不要改许可证（Apache-2.0），不要引入强制性 GPL/AGPL 依赖** | 已完成合规审计 |
| R11 | **不要把引擎源码复制进 `src/`** | `view.js` 用相对路径 `./vendor/zip.js` 解析，目录结构必须保持 |
| R12 | **不要「顺手」重构文档或重命名目录** | 文档是经过实测的，改动需先说明理由 |
| R13 | **vendor 打包入口必须用相对路径 `lib/zip-core.js`** | 用包根会让产物从 36 KB 涨到 122 KB；裸规格符会被 exports 映射到 WASM 变体 |
| R14 | **Tauri 里不要用 `view.open(url)` 或 `readFile` 作为最终取书方案** | 两者都整读进内存，毁掉核心卖点 → [ENGINE.md §4.1](docs/ENGINE.md) |
| R15 | **不要删 `.npmrc` 的 `package-import-method=copy`** | TypeScript 7 是原生编译器，与 pnpm 硬链接存储不兼容，会启动即 panic |
| R16 | **不要自己实现滑动翻页；不要给 `foliate-view` 再挂 `touchmove`** | 引擎 paginator **已内置**滑动 + 惯性翻页，且已 `preventDefault()` |
| R17 | **UI 必须响应式且支持触摸**（不可后补） | 触摸目标 ≥44px、悬停态要有等价物、不用 UA 嗅探 → [docs/UI.md](docs/UI.md) |
| R18 | **dev/测试代码不许进 `src/`，也不许进 `dist`** | 工具放 `tools/`；页面用根目录 `smoke.html`（vite build 只构建 `index.html`） |
| R19 | **Rust 临时命令必须 `#[cfg(debug_assertions)]` 门控** | 未门控会随 release 发布。曾有两个**无路径校验的任意文件读写** command 进了 release |

> ℹ️ **R3 / R4 / R5 是 PDF 相关约束**。PDF 推迟到 Phase 7，当前不涉及。

---

## 5. 代码风格

| 项 | 约定 |
|---|---|
| 引号 / 分号 | **单引号，无分号** |
| 缩进 | 2 空格 |
| 注释 | **中文**，解释**为什么**而不是「是什么」 |
| 类型导入 | `verbatimModuleSyntax` 已开 → 必须写 `import { useState, type ReactNode }` |
| 严格度 | tsconfig 最严格档：`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride` + `verbatimModuleSyntax` |
| 抽象 | **不要为未来预留抽象**。少 wrapper、少 Provider；注释解释取舍 |

---

## 6. 测试与验证

两套工具**互补、不可替代**，完整说明 → [`docs/VERIFY.md`](docs/VERIFY.md)。

| 工具 | 覆盖什么 |
|---|---|
| `pnpm tauri:smoke` | **只有真 Tauri 能验**：CSP、WebKitGTK、运行时 `<script>` 注入、Rust IPC |
| `pnpm verify:*` | Chromium：EPUB 随机访问回归、26 项 UI、视觉快照 |

- ⚠️ 实测同一本书 **WebKit 加载 36 张图、Chromium 只加载 1.29%** —— **两边都要过**
- `tools/verify/` 需要**完整可用的 Chromium**（GPU，或足够大的 `/dev/shm`）。
  跑不起来就 `git push` 后看 CI：`gh run view <id> --log-failed`
- 改代码后 CI 会自动跑；**纯文档提交不触发 CI**（`paths-ignore`）

### 每一批的收尾定义（不可协商）

一批改动**只有全绿才算完成**，缺一项就是未完成：

```bash
pnpm typecheck && pnpm build          # 静态
pnpm tauri:smoke                      # Tauri 侧：CSP / WebKitGTK / 运行时注入 / IPC
pnpm verify:epub && pnpm verify:ui    # Chromium 侧：EPUB 回归 / 26 项 UI
gh run list --limit 1                 # CI 必须绿
```

- **两边都要过。** 一边绿不代表另一边绿（实测同一本书 WebKit 加载 36 张图、
  Chromium 只加载 1.29%）
- **不要把「本地跑不起来」写成「已验证」** —— 不可复现的结论必须显式标注
  **「未验证」**，并说明为什么
- **声称支持的功能必须有测试兜底**，否则就是文档在撒谎
  （当前 README 声称 5 种格式，`verify:epub` 只跑 EPUB → [VERIFY.md §6.5](docs/VERIFY.md)）
- **新增工具前先问：它防的是哪个已发生过的回归？** 答不上来就别加
  （曾出现 `tools/` 883 行 vs 应用代码 1,028 行 = 86%）

---

## 7. 安全注意事项

- **IPC 命令默认对自身前端可达** —— 任何文件读写命令都必须校验路径，且临时命令用
  `#[cfg(debug_assertions)]` 门控（R19）
- **引擎的正文渲染是 `blob:` 同源 iframe**，上游 README 自认无法安全隔离。
  打开不可信来源的书籍时需自行评估
- **CSP 必须放行 `blob:`**（`frame-src` / `worker-src` / `img-src`）与 `style-src 'unsafe-inline'`
- **不要用 `import()` 加载 `public/` 下的 JS**（Vite 会拒绝），也不要用
  `new Function('return import(...)')` 绕过 —— **Tauri CSP 禁 `unsafe-eval`**

---

## 8. 提交信息

**Conventional Commits**：`feat` / `fix` / `chore` / `docs` / `perf` / `refactor` / `ci`，可带 scope（如 `feat(ui):`）。

- 标题中英文不限；**正文用英文**，说明**为什么**改
- 一次提交只做一件事；**不要把文档改动混进代码提交**
- 提交前跑 `pnpm typecheck`（CI 会再跑一遍）

---

## 9. 文档地图

| 问题 | 看哪 |
|---|---|
| 分层、目录结构、设计取舍 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 引擎集成、vendor 构建、API 速查 | [`docs/ENGINE.md`](docs/ENGINE.md) |
| 外壳主题 vs 书页主题 | [`docs/THEMING.md`](docs/THEMING.md) |
| 响应式、触摸、断点、陷阱 | [`docs/UI.md`](docs/UI.md) |
| SQLite 表结构、状态同步 | [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) |
| Tauri capabilities / CSP / Rust 工具链 | [`docs/TAURI.md`](docs/TAURI.md) |
| 验证工具、CI、运行环境要求 | [`docs/VERIFY.md`](docs/VERIFY.md) |
| 分阶段计划（**计划的唯一 owner**） | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| 风险与已知限制 | [`docs/RISKS.md`](docs/RISKS.md) |
| 依赖许可证审计 | [`docs/LICENSING.md`](docs/LICENSING.md) |
| Step 0 的实测证据 | [`docs/SPIKE-FINDINGS.md`](docs/SPIKE-FINDINGS.md) |

---

## 10. 汇报格式

保持简短，**不要贴大段代码**：

```
## Phase N — <名称>  [完成 / 阻塞]

**做了什么**：2–3 句
**验证结果**：命令 + 实际输出（关键行）
**与预期的偏差**：有/无，是什么
**新增/修改的文件**：列表
**下一步建议**：1 句
**需要决策的**：有/无
```

---

## 11. 第一条回复应该是什么

读完本文件后**先不要写代码**。用不超过 15 行回复：

1. 你对项目的一句话理解；
2. 你打算怎么执行**当前的 Phase**（具体到跑哪些命令、验证什么）；
3. 你需要的输入（样本？凭据？）；
4. 任何你认为本文件没说清的地方。

**等确认后再动手。**
