# AGENTS.md — Pitaki 开发指南（面向 AI 编码助手）

> 你正在接手一个**只有文档、零代码**的项目。本文件是你的上下文来源与执行手册。
> 读完本文件 + [§2 必读文件](#2-必读文件按顺序读完即停) 即可开工，**不要通读整个仓库**。

---

## 1. 30 秒理解项目

**Pitaki** 是一个本地优先（local-first）的跨平台电子书阅读器：桌面端用 **Tauri v2**，
Web 端用同一份 Vite 静态构建。阅读引擎是 **foliate-js**。

**当前状态：Pre-alpha —— 没有一行代码。** 只有经过实测验证的技术方案文档。

**你的任务：从「验证引擎能否落地」开始，逐步把它变成可运行的项目。**

---

## 2. 必读文件（按顺序，读完即停）

| # | 文件 | 读什么 | 约 |
|---|---|---|---|
| 1 | [`README.md`](README.md) | 全部 | 180 行 |
| 2 | [`docs/ENGINE.md`](docs/ENGINE.md) | **§3 构建 Vendor 产物** + §4 §5 | 主要看 §3 |
| 3 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | §1 分层总览 + §2 为什么这样分层 | 前 80 行 |
| 4 | [`docs/ROADMAP.md`](docs/ROADMAP.md) | 全部（阶段划分） | 90 行 |
| 5 | [`docs/TAURI.md`](docs/TAURI.md) | §1 §2 §3（ACL / CSP / 安全上下文） | 前 60 行 |

**按需查阅，不要预读：**

- `docs/THEMING.md` —— 只在做主题相关工作时读
- `docs/DATA-MODEL.md` —— 只在做存储工作时读
- `docs/RISKS.md` —— 遇到具体问题时查
- `docs/LICENSING.md` —— 只在新增依赖时查

---

## 3. 不可违反的规则

这些是**已经踩过的坑**，违反会导致返工或方案失效。全部有实测依据。

| # | 规则 | 原因 |
|---|---|---|
| R1 | **ZIP 解压必须用 `@zip.js/zip.js`，绝不用 fflate 顶替** | zip.js 是唯一支持 `File` 随机访问的库，是「不整体载入内存」的基础。fflate 在 foliate-js 里**只**用于 MOBI 字体解压（`unzlibSync`） |
| R2 | **foliate-js 只能用 git submodule，禁止 `npm i foliate-js`** | npm 上那个包是第三方发布、已停更；上游 README 明确要求 submodule |
| R3 | **PDF 是「构建期 vendor」，不是运行时 `import('pdfjs-dist')`** | 引擎通过 `globalThis.pdfjsLib` 使用它 |
| R4 | **PDF 的 `cmaps/` 和 `standard_fonts/` 必须一起拷贝** | 缺 `cmaps` 会让**中文 PDF 乱码** |
| R5 | **`pdfjs-dist` 精确锁 `5.5.207`，不带 `^`** | 引擎内部依赖该版本；6.x 有兼容风险 |
| R6 | **HeroUI 的 CSS 变量控制不了书页正文** | 书页在嵌套 iframe 内，必须走 `renderer.setStyles()` + `::part(filter)` |
| R7 | **`relocate` 事件必须节流** | 滚动模式下每帧触发，直接写 SQLite 会打爆 IO |
| R8 | **Tauri v2 的 capabilities 不配，插件调用直接失败** | v2 与 v1 最大的差异；CSP 还必须放行 `blob:` |
| R9 | **Rust 锁 `1.98.1`，不要用 `1.98.0`** | 1.98.0 有 vtable 误编译缺陷（rust-lang/rust#161441） |
| R10 | **不要改许可证（Apache-2.0），不要引入强制性 GPL/AGPL 依赖** | 已完成合规审计；新增 GPL 依赖会破坏整个许可方案 |
| R11 | **不要把引擎源码复制进 `src/`** | `view.js` 用相对路径 `./vendor/zip.js` 解析，目录结构必须保持 |
| R12 | **不要「顺手」重构文档或重命名目录** | 文档是经过实测的，改动需先说明理由 |
| R13 | **vendor 打包入口必须用相对路径 `lib/zip-core.js`** | 用包根会让产物从 36 KB 涨到 122 KB；用裸规格符会被 exports 映射到 WASM 变体 |
| R14 | **Tauri 里不要用 `view.open(url)` 或 `readFile` 作为最终取书方案** | 两者都会把整个文件读进内存，直接毁掉项目核心卖点。详见 [ENGINE.md §4.1](docs/ENGINE.md) |
| R15 | **不要删 `.npmrc` 的 `package-import-method=copy`** | TypeScript 7 是原生编译器，与 pnpm 硬链接存储不兼容，会启动即 panic |
| R16 | **不要自己实现滑动翻页；不要给 `foliate-view` 再挂 `touchmove`** | 引擎 paginator **已内置**滑动 + 惯性翻页，且已 `preventDefault()`，重复实现会打架 |
| R17 | **UI 必须响应式且支持触摸**（不可后补） | 目标含桌面触屏 / 平板 / 手机 Web。触摸目标 ≥44px、悬停态要有等价物、不用 UA 嗅探。见 [docs/UI.md](docs/UI.md) |
| R18 | **dev/测试代码不许放进 `src/`，也不许进 `dist`** | 冒烟 harness 曾占 `src/` 的 34%，还织进了 App 与 ReaderPage。工具放 `tools/`，页面用根目录 `smoke.html`（vite build 只构建 `index.html`） |
| R19 | **Rust 临时命令必须 `#[cfg(debug_assertions)]` 门控** | 未门控的临时命令会随 release 发布。曾有两个**无路径校验的任意文件读写** command（`smoke_read_book` / `smoke_write_result`）进了 release |

> ℹ️ **R3 / R4 / R5 属于 PDF 相关约束**。PDF 已推迟到 Phase 7，
> **当前 Step 0 / Step 1 不涉及**，做到 PDF 时再启用这三条。

---

## 4. 环境与版本（已锁定）

```
Node        ≥ 20（实测 22.23.2）
pnpm        9.15.9（或 npm / yarn / bun）
Rust        1.98.1（rust-toolchain.toml 已锁定）
Tauri       v2 稳定线（3.0.0-alpha 已发布，不要用）
gh CLI      已登录，账号 Pitaki-Dev
git 身份    Maicy0609 <215234680+Pitaki-Dev@users.noreply.github.com>
```

**前端版本（实测于 2026-09）：**

```
react / react-dom          ^19.3.0
@heroui/react              ^3.2.6
@heroui/styles             ^3.2.6   ← HeroUI v3 不需要 Provider
tailwindcss                ^4.3.3
@tailwindcss/vite          ^4.3.3
zustand                    ^5.0.15
@zip.js/zip.js             ^2.15.0
fflate                     ^0.8.3
lucide-react               ^1.47.0
vite                       ^8.3.0
@vitejs/plugin-react       ^6.1.1
typescript                 ^7.0.2
@tauri-apps/cli            ^2.11.4
@tauri-apps/api            ^2.11.1
@tauri-apps/plugin-fs      ^2.5.2
@tauri-apps/plugin-sql     ^2.4.1
pdfjs-dist                 5.5.207   ← 精确锁，不带 ^
```

> ⚠️ HeroUI v3 会经 `@react-types/color` 拖入整个 **Adobe Spectrum**。
> 打包时对取色器相关组件做代码分割，否则「轻量」目标会落空。

---

## 4.5 验证体系

**完整说明见 [docs/VERIFY.md](docs/VERIFY.md)。** 这里只留操作要点：

- 两套工具互补：`pnpm tauri:smoke`（真 Tauri：CSP / WebKitGTK / 运行时注入 / IPC）、
  `pnpm verify:epub|ui|snapshot`（Chromium：EPUB 回归 / UI 26 项 / 视觉）
- ⚠️ **本地受限容器跑不了 Chromium**（GPU/renderer 崩、`/dev/shm` 不可用）。
  **不要在本机反复尝试** —— `git push` 后看 CI：`gh run view <id> --log-failed`
- 「Chromium 绿了」≠「Tauri 绿了」：实测同一本书 WebKit 加载了 36 张图、
  Chromium 只加载 1.29%。**两边都要过**
- **新增工具前先问：它防的是哪个已发生过的回归？** 答不上来就别加

---

## 5. 分步执行计划

> **铁律：一次只做一个 Step，做完停下来汇报，等确认再继续。**
> 不要一口气推进多个阶段。

---

### Step 0 — 引擎可行性验证 ✅ 已完成

> **结论见 [docs/SPIKE-FINDINGS.md](docs/SPIKE-FINDINGS.md)。不要重做。**
> 验证能力已固化为常驻工具（见 §4.5），要复跑 A/B 直接用它们，**不要再临时搭 `spike/` 目录**。

#### 环境约定（仍然适用）

- ⚠️ **本地沙箱是 aarch64 且资源受限，跑不了 Chromium**（GPU/renderer 崩、`/dev/shm` 不可用）。
  **浏览器侧验证一律走 CI**，不要在本机反复尝试 —— 详见 §4.5。
- **不要用 `--host` 通过局域网 IP 访问**（`http://192.168.x.x:5173` **不是安全上下文**，
  会让 Web Crypto SHA-1 失效、字体去混淆报错）。一律用 `http://localhost:5173`。
- Vite dev server **不设 CSP**；要验 CSP 必须用 `pnpm tauri:smoke`。

#### 已验证的结论（摘要）

- `view.open(file)` **不渲染任何章节**，必须再调 `init()` / `goTo()`（见 [ENGINE.md §4](docs/ENGINE.md)）
- `view.goTo(target)` 只接受 number / `{fraction}` / CFI / href，**不接受 `{index, anchor}`**（见 §5.1）
- `import()` **无法**加载 `public/` 下的 JS，必须用 `<script type="module" src>`
- zip.js 的 `File` 随机访问成立：12.49 MiB EPUB 只读 0.69%

---

### Step 1 — 工程骨架

- [ ] `pnpm create tauri-app`（或手动初始化）：Vite + React + TS + Tauri v2
- [ ] 落地第 4 节的依赖版本（不要用脚手架默认的旧版）
- [ ] `rust-toolchain.toml` 已在仓库根，确认生效
- [ ] 配置 `src-tauri/tauri.conf.json`：
  - **CSP**：放行 `blob:`（`frame-src` / `worker-src` / `img-src`）、`style-src 'unsafe-inline'`
  - 参考 `docs/TAURI.md` §2
- [ ] 配置 `src-tauri/capabilities/default.json`：`core:default`、`fs:allow-read-file`、`fs:allow-write-file`、`dialog:default`、`sql:default`
- [ ] 把 Step 0 的 vendor 构建固化成 `scripts/build-foliate-vendor.mjs`
- [ ] 把引擎同步固化成 `scripts/sync-foliate.mjs`（或 `postinstall`）
- [ ] `git submodule add https://github.com/johnfactotum/foliate-js third_party/foliate-js` 并**锁定 commit**
- [ ] CI：`tsc --noEmit` + `vite build` + vendor 构建

**DoD**：
- [ ] `pnpm tauri:dev` 能启动窗口，控制台无报错
- [ ] `pnpm build:vendor` 能重复产出一致的 vendor 产物
- [ ] **在 Tauri 窗口内重跑 A/B 并全部通过**：`pnpm tauri:smoke`
      —— 浏览器能跑通 ≠ Tauri 能跑通（真实差异在 CSP 与安全上下文）

---

### Step 2 — UI 基础

> 📌 **开工前必读 [`docs/UI.md`](docs/UI.md)。** 响应式与触摸是**硬性要求**，不是收尾工作。

- [ ] HeroUI v3 + Tailwind v4 接入，`globals.css` 中 `@import "tailwindcss";` **必须在 `@import "@heroui/styles";` 之前**
- [ ] 在 `@layer base` 里定义**完整**的外壳主题 token（不要只改 `--background`/`--foreground`）
- [ ] 自写轻量路由（**不要引 React Router**）+ 三页骨架：书库 / 阅读器 / 设置
- [ ] **响应式**：落实手机（<768）/ 平板（768–1024）/ 桌面（≥1024）三档布局
- [ ] **触摸**：
  - [ ] 触摸目标 ≥ 44×44 px（`min-h-11 min-w-11`）
  - [ ] 悬停态全部补触摸等价物（顶/底栏用 **tap-to-toggle**，不要 hover）
  - [ ] viewport 含 `viewport-fit=cover`，**绝不含** `user-scalable=no`
  - [ ] 用 `pointer-coarse:` 变体（Tailwind v4 内置）而非 UA 嗅探
- [ ] `touch-action` / `overscroll-behavior` 暂不设 —— 留到 Step 3/4 阅读器落地时一起处理

**DoD**：
- [ ] 三个页面可切换；主题切换生效；`<Button>` 样式正常（证明 HeroUI 接入成功）
- [ ] 320px 窄屏与 1440px 宽屏下布局均不破
- [ ] **用浏览器 DevTools 的触摸模拟跑一遍**，确认无 hover-only 死角
- [ ] 键盘 Tab 顺序可用、Esc 能关弹层

---

### Step 3 — 引擎接入

- [ ] 实现 **L2 适配层** `src/lib/reader/foliate/adapter.ts` —— **全项目唯一允许 import 引擎的地方**
- [ ] 打通 `open()` → **`init()`** → `relocate` / `load`
      （⚠️ **`open()` 后必须调 `init()`，否则不渲染任何章节**，见 [ENGINE.md §4](docs/ENGINE.md)）
- [ ] 适配层包平 `goTo` 的两层签名，对外只暴露 `goToIndex` / `goToCFI` / `goToFraction`
- [ ] **定下桌面端的取书路径**（本项目核心前提，见 [ENGINE.md §4.1](docs/ENGINE.md)）：
      - ❌ `view.open(assetUrl)` —— 引擎的 `fetchFile()` 会整读
      - ❌ `plugin-fs readFile()` —— 字节本就全量在内存
      - ✅ **`assetUrl` + 自建 loader + zip.js `HttpRangeReader`**（Tauri asset 协议原生支持 Range）
      - 若 v1 暂时接受整读，**必须在文档与 UI 中如实标注**，并排期补上
- [ ] L3 订阅 `load` 事件做书页样式注入

**DoD**：能从本地选一个 EPUB 并在 App 里翻页阅读。

---

### Step 4 — 阅读体验

- [ ] 进度保存（**必须按 `reason` 节流**，见 `docs/ENGINE.md` §7）
- [ ] 书页主题：`renderer.setStyles()` + `foliate-view::part(filter)`
- [ ] 分页/滚动切换（分页器**只有 `setAttribute` API**，无 JS 属性）
- [ ] 字体/字号/行距/边距面板

**DoD**：改字号后关闭再打开，进度能恢复到同一处。

---

### Step 5+ — 见 [`docs/ROADMAP.md`](docs/ROADMAP.md)

存储 / 批注 / 搜索 / 扩展。

---

## 6. 汇报格式（每个 Step 结束时）

保持简短，**不要贴大段代码**：

```
## Step N — <名称>  [完成 / 阻塞]

**做了什么**：2–3 句
**验证结果**：命令 + 实际输出（关键行）
**与预期的偏差**：有/无，是什么
**新增/修改的文件**：列表
**下一步建议**：1 句
**需要你决策的**：有/无
```

---

## 7. 上下文管理纪律

本项目的目标是**避免上下文耗尽**，请遵守：

1. **不要通读仓库**。只读 [§2](#2-必读文件按顺序读完即停) 列出的文件。
2. **不要重复读同一个文件**。需要时用搜索定位具体段落。
3. **不要贴大段文件内容回对话**。引用时只写「文件:行号」。
4. **一次一个 Step**，做完汇报，不要连续推进。
5. **写代码前先列计划**（3–5 行即可），确认后再动手。
6. **长任务用文件承载状态**：进展写进 `NOTES.md`（gitignore 或提交均可），不要靠对话记忆。
7. **遇到不确定就停下来问**，不要猜。
8. 修改代码时用**精准编辑**，不要整文件重写。

---

## 8. 关键速查

**引擎 API 的完整清单** → [`docs/ENGINE.md`](docs/ENGINE.md) §5
**Tauri 权限/CSP 的完整配置** → [`docs/TAURI.md`](docs/TAURI.md) §1 §2
**SQLite 表结构的完整 DDL** → [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) §1
**主题两套机制的完整示例** → [`docs/THEMING.md`](docs/THEMING.md)

**规划中但未实现** —— 不要在文档或 UI 里宣称已支持：
PDF（实验性）、书签/高亮/笔记、全文搜索、云同步、OPDS、TTS。

**明确不支持**：DRM 保护的书籍、CBR（RAR）、混合版式。

---

## 9. 第一条回复应该是什么

读完本文件与 [§2](#2-必读文件按顺序读完即停) 后，**先不要写代码**。
用不超过 15 行回复：

1. 你对项目的一句话理解；
2. 你打算怎么执行 **Step 0**（具体到要跑哪些命令、验证什么）；
3. 你需要的输入（例如：**一个 >10MB 的 EPUB 样本**，是否已有？）；
4. 任何你认为本文件没说清的地方。

**等用户确认后再动手。**
