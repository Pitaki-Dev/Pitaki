# Pitaki

> **A lightweight, cross-platform reading engine.**
> 轻量、现代、可高度自定义的跨平台电子书阅读器 —— 桌面端为主，兼顾轻量 Web 环境。

![Status](https://img.shields.io/badge/status-pre--alpha-orange)
![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.11-24C8DB?logo=tauri&logoColor=white)
![HeroUI](https://img.shields.io/badge/HeroUI-3.2-000000)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Apache--2.0-blue)

---

## ⚠️ 项目状态：Pre-alpha（尚无可用代码）

**本仓库当前处于设计与验证阶段，还没有可运行的代码。** 下面列出的特性是**目标特性**，而非已交付功能。请勿据此判断本项目已可用。

| 阶段 | 状态 |
|---|---|
| 技术选型与可行性验证 | ✅ 已完成（对照 npm registry / crates.io / 上游源码实测） |
| 依赖与许可证审计 | ✅ 已完成（npm 101 包 + Rust 626 crate）→ [docs/LICENSING.md](docs/LICENSING.md) |
| 工程骨架搭建 | 📋 待开始 |
| 引擎接入与核心功能 | 📋 规划中 |

---

## 目录

- [项目简介](#项目简介)
- [目标特性](#目标特性)
- [技术栈](#技术栈)
- [架构概览](#架构概览)
- [快速开始](#快速开始)
- [文档索引](#文档索引)
- [许可证](#许可证)

---

## 项目简介

**Pitaki** 是一个本地优先（local-first）的跨平台电子书阅读器。它用一套轻量 Web 技术栈同时覆盖：

- **桌面端** —— Tauri v2 打包，使用系统原生 WebView，安装包体积小；
- **Web / 轻量分布式环境** —— 同一份前端静态构建即可运行。

阅读引擎基于 **foliate-js** —— 一个纯 JavaScript、无硬依赖、支持流式读取的渲染库，已在 Foliate 与 Readest 等真实产品中使用。

> ℹ️ **术语约定**：本项目中「**外壳**」指 App 自身的界面（侧栏、按钮、弹窗）；「**书页**」指书籍正文。两者的主题机制完全不同，见 [docs/THEMING.md](docs/THEMING.md)。

---

## 目标特性

> 以下均为**规划中的目标**，当前尚未实现。

### 阅读

| 特性 | 说明 |
|---|---|
| 多格式 | EPUB、MOBI、KF8（AZW3）、FB2、CBZ |
| PDF | 基于 PDF.js 的固定版式适配器（上游标记为实验性） |
| 分页 / 滚动 | 双模式，可运行时切换 |
| 目录与进度 | 基于 CFI 精确定位 |
| 全文搜索 | 复用引擎自带 `search.js` |
| 书签 / 高亮 / 笔记 | 基于 CFI + Overlayer |

### 外观

| 特性 | 说明 |
|---|---|
| 多套阅读主题 | 纸质、护眼、夜间等 |
| 排版可调 | 字体 / 字号 / 行距 / 边距 / 对齐 |
| 外壳主题 | 基于 HeroUI + Tailwind v4 的 CSS 变量，高度可定制 |
| 响应式 | 手机 / 平板 / 桌面三档布局，同一份构建 |
| 触摸 | 滑动翻页（引擎自带）、≥44px 触摸目标、无 hover 死角 → [docs/UI.md](docs/UI.md) |

### 工程

| 特性 | 说明 |
|---|---|
| 本地优先 | 离线完全可用 |
| 轻量 | 无 Next.js、无 React Router、无大型 UI 全家桶 |
| 类型安全 | 全程 TypeScript |

### 明确不支持

- ❌ **DRM 保护的书籍**（AZW3/MOBI 仅支持无 DRM）
- ❌ **CBR（RAR 漫画）**，仅支持 CBZ
- ❌ 混合版式（reflowable + pre-paginated 混排）的书籍

---

## 技术栈

> 版本为 **2026-09 实测**（npm registry / crates.io）。正式开发时请提交 lockfile 锁定。

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 构建工具 | **Vite** | `^8.3.0` | HMR 快，Tauri 官方推荐 |
| 框架 | **React** + TypeScript | `^19.3.0` / `^7.0.2` | 现代、类型安全 |
| UI 组件库 | **HeroUI** | `^3.2.6` | 基于 React Aria + Tailwind v4；**无需 Provider** |
| 样式 | **Tailwind CSS** | `^4.3.3` | 配合 HeroUI v3 |
| 状态管理 | **Zustand** | `^5.0.15` | ~1KB，适合书库与阅读状态 |
| 阅读引擎 | **foliate-js** | `main`（锁 commit） | 纯 JS、无硬依赖、流式读取 |
| ZIP 容器 | **@zip.js/zip.js** | `^2.15.0` | 支持 `File` 随机访问 |
| 压缩原语 | **fflate** | `^0.8.3` | 仅用于 MOBI/KF8 字体解压 |
| PDF | **pdfjs-dist** | `5.5.207`（精确锁） | 构建期 vendor |
| 图标 | **lucide-react** | `^1.47.0` | 按需引入 |
| 桌面壳 | **Tauri** | `^2.11.4` | 系统原生 WebView |
| 本地数据库 | **tauri-plugin-sql** | `^2.4.1` | 启用 `sqlite` feature |
| 文件系统 | **tauri-plugin-fs** | `^2.5.2` | 读取本地书籍 |
| 系统对话框 | **tauri-plugin-dialog** | `^2.7.3` | 选择书籍 / 目录 |
| Rust | stable | `1.98.1`（锁定，MSRV 同值） | 后端，见 [rust-toolchain.toml](rust-toolchain.toml) |

**依赖控制原则**

- 不引入 Next.js、React Router（页面结构简单，自写轻量路由即可）
- 不引入大型 UI 全家桶
- **foliate-js 禁止 `npm install`** —— npm 上的包非官方，必须以 git submodule 引入

---

## 架构概览

```
L3  业务层    src/lib/reader/         主题 · 进度 · 书签 · 状态同步
L2  适配层    src/lib/reader/foliate/ ★ 唯一允许 import 引擎的地方
L1  引擎层    third_party/foliate-js/ git submodule，锁 commit
L0  Vendor    public/vendor/foliate/  zip.js · fflate.js · pdfjs/
```

设计要点：**L0 与 L1 的相对位置必须固定**（引擎以相对路径动态加载 vendor），**L2 用于隔离引擎的 API 漂移**。

完整分层图、目录结构、数据流 → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 快速开始

> 当前仓库尚无代码，以下命令是**规划中的目标形态**，暂不可用。

### 前置要求

- **Node.js** ≥ 20
- **Rust** ≥ **1.98.1**（仅桌面端构建需要；仓库已用 [rust-toolchain.toml](rust-toolchain.toml) 锁定，rustup 会自动切换）
- 各平台 Tauri v2 系统依赖，见 [官方文档](https://v2.tauri.app/start/prerequisites/)

### 安装与开发

```bash
git clone --recurse-submodules <repo-url> Pitaki
cd Pitaki
pnpm install
pnpm run build:vendor      # 生成 public/foliate/vendor/*（首次必做）
pnpm run tauri:dev         # 桌面端开发
```

### ⚠️ 已知环境问题

| 症状 | 原因 | 处理 |
|---|---|---|
| `tsc` 启动即 panic：`bundled: …/store/v3/files/…/lib.d.ts does not exist` | TypeScript 7 是**原生（Go）编译器**，自带 platform binary，与 pnpm 的硬链接存储不兼容 | 已在 `.npmrc` 设 `package-import-method=copy`，**不要删** |
| `vite build` 报缺 `esbuild` | Vite 8 默认 minifier 已切换，`minify: 'esbuild'` 需额外安装 | 用 `minify: 'oxc'`（仓库已配置） |
| Playwright 启动后立刻断开 / 卡住 | **受限容器**（无 `/dev/shm`、无 GPU）下 Chromium 的 GPU/renderer 进程崩溃 —— 与 CPU 架构无关 | 别在本机硬跑，**用 CI 验证**（见 [docs/VERIFY.md](docs/VERIFY.md)） |

---

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 分层架构、目录结构、设计取舍 |
| [docs/ENGINE.md](docs/ENGINE.md) | foliate-js 集成、vendor 产物构建、API 速查 |
| [docs/THEMING.md](docs/THEMING.md) | 外壳主题与书页主题的两套机制 |
| [docs/UI.md](docs/UI.md) | **响应式与触摸**：引擎已有的手势、断点、触摸目标、陷阱 |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | SQLite 表结构、状态管理与同步策略 |
| [docs/TAURI.md](docs/TAURI.md) | capabilities / ACL、CSP、安全上下文 |
| [docs/VERIFY.md](docs/VERIFY.md) | **验证体系**：两套工具、CI、本地限制 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 分阶段实施计划 |
| [docs/RISKS.md](docs/RISKS.md) | 风险登记表与已知限制 |
| [docs/LICENSING.md](docs/LICENSING.md) | 依赖许可证审计结果与结论 |

---

## 许可证

本项目采用 **Apache License 2.0**，详见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

选择 Apache-2.0 的理由（含显式专利授权）与完整的依赖许可证审计结果，见 [docs/LICENSING.md](docs/LICENSING.md)。
