# 路线图

[← 返回 README](../README.md)

> 当前状态：**Pre-alpha**（设计与验证阶段，尚无可用代码）

---

## 阶段总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 技术选型与可行性验证 | ✅ 已完成 |
| Phase 0 | 依赖与许可证审计 | 🔄 npm 已完成，Rust 待复核 |
| Phase 1 | 工程骨架 | 📋 待开始 |
| Phase 2 | 界面基础 | 📋 规划中 |
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
- [ ] Rust / crates.io 依赖许可证复核（需 `Cargo.lock`）
- [x] 架构分层定稿 → [ARCHITECTURE.md](ARCHITECTURE.md)

## Phase 1 — 工程骨架

- [ ] Vite + React + TS + Tauri v2 初始化
- [ ] Tauri capabilities 与 CSP 配置 → [TAURI.md](TAURI.md)
- [ ] `git submodule` 引入 foliate-js 并锁定 commit
- [ ] `scripts/build-foliate-vendor.mjs` 跑通（zip.js / fflate / pdfjs）
- [ ] CI：typecheck + lint + vendor 构建验证

## Phase 2 — 界面基础

- [ ] HeroUI v3 + Tailwind v4 接入
- [ ] 定义**外壳**主题 token（含 `@layer base` 完整块）→ [THEMING.md](THEMING.md)
- [ ] 自写轻量路由 + 基础布局（书库 / 阅读器 / 设置）

## Phase 3 — 引擎接入

- [ ] 验证 `view.js` 相对路径可解析
- [ ] L2 适配层：`open()` + `relocate` + `load` 打通
- [ ] 打开本地 EPUB，确认渲染正常
- [ ] 目录（TOC）渲染

## Phase 4 — 阅读体验

- [ ] 进度保存（含节流）→ [ENGINE.md](ENGINE.md)
- [ ] 书页主题：`setStyles()` + `::part(filter)` + 分页属性
- [ ] 分页 / 滚动模式切换
- [ ] 字体 / 字号 / 行距 / 边距调节面板

## Phase 5 — 本地存储

- [ ] `tauri-plugin-sql` 接入与数据库迁移 → [DATA-MODEL.md](DATA-MODEL.md)
- [ ] Zustand ↔ SQLite 双向同步（含失败回滚）
- [ ] 书库管理：导入 / 删除 / 封面

## Phase 6 — 功能完善

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
