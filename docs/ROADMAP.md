# 路线图

[← 返回 README](../README.md)

> 当前状态：**Pre-alpha**（设计与验证阶段，尚无可用代码）

---

## 阶段总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 技术选型与可行性验证 | ✅ 已完成 |
| Phase 0 | 依赖与许可证审计 | ✅ 已完成 |
| Phase 1 | 工程骨架 | ✅ 已完成 |
| Phase 2 | 界面基础（响应式 + 触摸） | ✅ 已完成（`touch-action` 除外，见下） |
| Phase 3 | 引擎接入 | 📋 规划中 |
| Phase 4 | 阅读体验 | 📋 规划中 |
| Phase 5 | 本地存储 | 📋 规划中 |
| Phase 6 | 功能完善 | 📋 规划中 |
| Phase 7 | 可选扩展 | 📋 规划中 |

---

## Phase 0 — 验证

- [x] 技术选型与版本实测（对照 npm registry / crates.io / 上游源码）
- [x] 引擎能力核实（格式支持、API、限制）
- [x] npm 依赖许可证审计（101 包实测）→ [LICENSING.md](LICENSING.md)
- [x] Rust / crates.io 依赖许可证审计（626 crate 实测）
- [ ] 以最终 `Cargo.lock` + `cargo-deny` 复核（见 Phase 5）
- [x] 架构分层定稿 → [ARCHITECTURE.md](ARCHITECTURE.md)

## Phase 1 — 工程骨架

- [x] Vite + React + TS + Tauri v2 初始化
- [x] Tauri capabilities 与 CSP 配置 → [TAURI.md](TAURI.md)
- [x] `git submodule` 引入 foliate-js 并锁定 commit
- [x] `scripts/build-foliate-vendor.mjs` 跑通（zip.js / fflate；pdfjs 推迟到 Phase 7）
- [x] CI：typecheck + build + vendor 构建验证（含入口守卫）
- [ ] CI 尚未接 **lint**

## Phase 2 — 界面基础

- [x] HeroUI v3 + Tailwind v4 接入
- [x] 定义**外壳**主题 token（含 `@layer base` 完整块）→ [THEMING.md](THEMING.md)
- [x] 自写轻量路由 + 基础布局（书库 / 阅读器 / 设置）
- [x] **响应式**：按 [UI.md](UI.md) §4 落实三个断点的布局（手机 / 平板 / 桌面）
- [x] **触摸**：
  - [x] 触摸目标 ≥ 44×44 px（`min-h-11 min-w-11`）
  - [x] 悬停态全部补上触摸等价物（tap-to-toggle chrome 等）
  - [ ] `touch-action` / `overscroll-behavior` 按 [UI.md](UI.md) §2 设置
        —— **刻意留到 Phase 3/4**，因为要设在 `<foliate-view>` 上（`ReaderPage.tsx` 有注释）
  - [x] viewport 含 `viewport-fit=cover`，**不含** `user-scalable=no`
- [x] 用 `pointer-coarse:` 变体而非 UA 嗅探区分输入方式

## Phase 3 — 引擎接入

- [ ] **先定下取书路径**（本项目风险最高的一步，见 [ENGINE.md §4.1](ENGINE.md) / R14）：
      `view.open(url)` 与 `readFile` **都会整读进内存**。正解是 asset URL +
      L2 自建 loader + `HttpRangeReader`（Tauri asset 协议原生支持 Range）。
      **这条链从未被验证过 —— 先验它，再写适配层**
- [ ] 验证 `view.js` 相对路径可解析
- [ ] L2 适配层：`open()` → `init()` → `relocate` / `load` 打通，
      并把 `view.goTo` 与 `renderer.goTo` 的两层签名包平（[ENGINE.md §5.1](ENGINE.md)）
- [ ] 打开本地 EPUB，确认渲染正常
- [ ] 目录（TOC）渲染
- [ ] **补齐格式覆盖**：README 声称 5 种格式，`verify:epub` 只跑 EPUB。
      MOBI/KF8 走 `unzlibSync`、CBZ 走 `fixed-layout.js`（无触摸处理）、FB2 独立解析器 ——
      **都是一次没跑过的独立路径**。每补一种就加进样本矩阵 → [VERIFY.md §6.5](VERIFY.md)
- [ ] **真实书覆盖**：合成样本测不到怪结构 —— 已观察到某本中文 EPUB
      **532 个 section 却只有 3 条目录项**。加 `schedule` + `workflow_dispatch`
      的独立 CI job（pin URL + 校验 sha256，**不进 push/PR 路径**）→ [VERIFY.md §6.2](VERIFY.md)

## Phase 4 — 阅读体验

- [ ] 进度保存（含节流）→ [ENGINE.md](ENGINE.md)
- [ ] 书页主题：`setStyles()` + `::part(filter)` + 分页属性
- [ ] 分页 / 滚动模式切换
- [ ] 字体 / 字号 / 行距 / 边距调节面板

## Phase 5 — 本地存储

- [ ] `tauri-plugin-sql` 接入与数据库迁移 → [DATA-MODEL.md](DATA-MODEL.md)
- [ ] CI 接入 `cargo-deny` 与 npm 许可证检查，锁死 copyleft 回流 → [LICENSING.md](LICENSING.md)
- [ ] Zustand ↔ SQLite 双向同步（含失败回滚）
- [ ] 书库管理：导入 / 删除 / 封面

## Phase 6 — 功能完善

- [ ] 纯文本（TXT）导入 —— 引擎支持自定义实现 `book` 接口（上游 README 明示），
      Readest 已有先例；**难点是把大文件切分成多个 section**
      （单个 10 MB 文本作为一个 section 会不可用），不是格式解析本身
- [ ] 书签 / 高亮 / 笔记（Overlayer）
- [ ] 全文搜索（引擎自带 `search.js`）
- [ ] 多格式回归验证（EPUB / AZW3 / CBZ / 中文 PDF）
- [ ] Linux（WebKitGTK）兼容性验证 → [RISKS.md](RISKS.md) R7

## Phase 7 — 可选扩展

- [ ] PDF 独立构建（锁 5.5.207 + cmaps）
- [ ] OPDS / Calibre 集成（引擎自带 `opds.js`）
- [ ] 云同步（接口预留，默认关闭）
- [ ] 词典（`dict.js`）、TTS（`tts.js`）
- [ ] 简繁转换 / 中文分词

---

## 排序依据

1. **先验证不可逆的部分** —— vendor 产物构建（Phase 1）必须在写业务代码前跑通，否则整套方案的可行性存疑；
2. **先打通最短路径** —— Phase 3 只求「能打开一本书」，不追求完整功能；
3. **把高频 IO 和跨 iframe 的坑提前** —— 进度节流与主题分层（Phase 4）在功能膨胀前解决成本最低。
