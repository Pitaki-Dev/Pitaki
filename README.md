# Pitaki

> **A lightweight, cross-platform reading engine.**
> 轻量、现代、可高度自定义的跨平台电子书阅读器 —— 桌面端为主，兼顾轻量 Web 环境。

![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.11-24C8DB?logo=tauri&logoColor=white)
![HeroUI](https://img.shields.io/badge/HeroUI-3.2-000000)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [架构总览](#架构总览)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [构建 Vendor 产物](#构建-vendor-产物)
- [阅读引擎集成](#阅读引擎集成)
- [主题系统](#主题系统)
- [数据模型](#数据模型)
- [Tauri 配置要点](#tauri-配置要点)
- [路线图](#路线图)
- [已知限制](#已知限制)
- [风险登记](#风险登记)
- [第三方许可](#第三方许可)
- [参考资料](#参考资料)

---

## 项目简介

**Pitaki** 是一个本地优先（local-first）的跨平台电子书阅读器。它用一套轻量 Web 技术栈同时覆盖：

- **桌面端** —— Tauri v2 打包，使用系统原生 WebView，安装包体积小；
- **Web / 轻量分布式环境** —— 同一份前端静态构建即可运行。

设计目标是在「**好看、可自定义、功能完整、真实可用、相对轻量**」之间取得平衡。书籍、进度、书签、笔记全部先落本地，云同步为可选能力。

阅读引擎基于 **foliate-js** —— 一个纯 JavaScript、无硬依赖、支持流式读取的渲染库，已在 Foliate 与 Readest 等真实产品中使用。

> ⚠️ **术语约定**：本文中「**外壳**」指 App 自身的界面（侧栏、按钮、弹窗）；「**书页**」指书籍正文。两者的主题机制完全不同，见 [主题系统](#主题系统)。

---

## 核心特性

### 阅读

- ✅ **多格式**：EPUB、MOBI、KF8（AZW3）、FB2、CBZ
- ⚠️ **PDF**（实验性）：基于 PDF.js 的固定版式适配器，按需加载
- ✅ **分页 / 滚动**双模式，可运行时切换
- ✅ **目录（TOC）与阅读进度**，基于 CFI 精确定位
- ✅ **全文搜索**（引擎自带 `search.js`）
- ✅ **书签 / 高亮 / 笔记**（基于 CFI + Overlayer）

### 外观

- ✅ **多套阅读主题**：纸质、护眼、夜间、深空黑等
- ✅ **字体 / 字号 / 行距 / 边距 / 对齐**全可调
- ✅ 外壳主题基于 HeroUI + Tailwind v4 的 CSS 变量，高度可定制

### 工程

- ✅ **本地优先**：离线完全可用
- ✅ **轻量**：无 Next.js、无 React Router、无大型 UI 全家桶
- ✅ **类型安全**：全程 TypeScript
- ✅ 桌面安装包体积小（Tauri 原生 WebView）

### 暂不支持

- ❌ **DRM 保护的书籍**（AZW3/MOBI 仅支持无 DRM）
- ❌ **CBR（RAR 漫画）**，仅支持 CBZ
- ❌ 混合版式（reflowable + pre-paginated 混排）的书籍

---

## 技术栈

> 版本为 **2026-09 实测**（npm registry / crates.io）。生产环境请提交 lockfile 锁定。

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 构建工具 | **Vite** | `^8.3.0` | HMR 快，Tauri 官方推荐 |
| 框架 | **React** + TypeScript | `^19.3.0` / `^7.0.2` | 现代、类型安全 |
| UI 组件库 | **HeroUI** | `^3.2.6` | 基于 React Aria + Tailwind v4；**无需 Provider** |
| 样式 | **Tailwind CSS** | `^4.3.3` | 配合 HeroUI v3 |
| 状态管理 | **Zustand** | `^5.0.15` | ~1KB，适合书库与阅读状态 |
| 阅读引擎 | **foliate-js** | `main`（锁 commit） | 纯 JS、无硬依赖、流式读取 |
| ZIP 容器 | **@zip.js/zip.js** | `^2.15.0` | **支持 File 随机访问**，是「不整体载入内存」的基础 |
| 压缩原语 | **fflate** | `^0.8.3` | 仅用于 MOBI/KF8 字体解压（`unzlibSync`） |
| PDF | **pdfjs-dist** | `5.5.207`（精确锁） | **构建期 vendor**，与引擎内部版本对齐 |
| 图标 | **lucide-react** | `^1.47.0` | 与 HeroUI 风格契合，按需引入 |
| 桌面壳 | **Tauri** | `^2.11.4` | 系统原生 WebView，包体小 |
| 本地数据库 | **tauri-plugin-sql** | `^2.4.1` | 启用 `sqlite` feature |
| 文件系统 | **tauri-plugin-fs** | `^2.5.2` | 打开本地书籍、选择目录 |
| Rust | stable | `1.98.1` | 后端 |

**依赖控制原则**

- 不引入 Next.js、React Router（页面结构简单，自写轻量路由即可）
- 不引入大型 UI 全家桶
- PDF 相关资源仅在需要时加载
- **foliate-js 禁止 `npm install`** —— npm 上的包非官方，必须用 git submodule（见下）

---

## 架构总览

```
┌───────────────────────────────────────────────────────────────┐
│  L3  业务层      src/lib/reader/                              │
│      主题分层 · 进度节流 · 书签/高亮 · 目录                    │
│      Zustand 状态  ↔  SQLite 持久化                            │
├───────────────────────────────────────────────────────────────┤
│  L2  适配层      src/lib/reader/foliate/adapter.ts            │
│      ★ 全项目唯一允许 import foliate-js 的地方                 │
│      把引擎 API 收敛为稳定的项目内接口                          │
│      引擎升级只改这一层（隔离 API 漂移）                        │
├───────────────────────────────────────────────────────────────┤
│  L1  引擎层      third_party/foliate-js/  (git submodule)     │
│      view.js · epub.js · mobi.js · pdf.js · search.js …       │
├───────────────────────────────────────────────────────────────┤
│  L0  Vendor      public/vendor/foliate/                       │
│      zip.js · fflate.js · pdfjs/{pdf.mjs, pdf.worker.mjs,    │
│      cmaps/, standard_fonts/}                                 │
└───────────────────────────────────────────────────────────────┘
        ▲                                          ▲
        │ Vite 静态构建                             │ Tauri IPC
┌───────┴───────────┐                    ┌─────────┴─────────────┐
│  Web (浏览器)      │                    │  Tauri v2 (Rust)      │
│  HTTPS 部署        │                    │  fs · dialog · sql    │
└───────────────────┘                    └───────────────────────┘
```

**为什么分四层？**

1. `view.js` 用**相对路径**动态 `import('./vendor/zip.js')`，所以 L0 与 L1 的相对位置必须固定；
2. foliate-js 官方自述 **API 不稳定**（*"Expect it to break and the API to change at any time"*），L2 适配层是唯一防线；
3. Rust 侧保持极简：只负责文件访问、SQLite 和必要的系统调用，复杂解析全部留在前端。

---

## 目录结构

```
Pitaki/
├── third_party/
│   └── foliate-js/                 # git submodule，锁定 commit，勿改
├── scripts/
│   └── build-foliate-vendor.mjs    # 生成 public/vendor/foliate/*
├── public/
│   ├── foliate/                    # 引擎副本（保留原目录结构，构建时同步）
│   └── vendor/
│       └── foliate/
│           ├── zip.js              # @zip.js/zip.js 打包产物
│           ├── fflate.js           # fflate 打包产物（仅 unzlibSync）
│           └── pdfjs/
│               ├── pdf.mjs
│               ├── pdf.worker.mjs
│               ├── text_layer_builder.css
│               ├── annotation_layer_builder.css
│               ├── cmaps/          # ★ 中文 PDF 必需
│               └── standard_fonts/
├── src/
│   ├── components/                 # HeroUI 二次封装 + 业务组件
│   ├── pages/                      # 书库 / 阅读器 / 设置
│   ├── stores/                     # Zustand stores
│   ├── lib/
│   │   ├── reader/
│   │   │   ├── foliate/
│   │   │   │   └── adapter.ts      # ★ L2 适配层
│   │   │   ├── theme.ts            # 书页主题注入
│   │   │   └── progress.ts         # 进度节流
│   │   ├── db.ts                   # SQLite 封装
│   │   └── vendor.ts               # 引擎动态加载
│   ├── styles/
│   │   └── globals.css             # Tailwind + HeroUI + 主题 token
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                      # Tauri + Rust
│   ├── src/
│   ├── capabilities/               # ★ v2 权限配置
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 快速开始

### 前置要求

- **Node.js** ≥ 20
- **Rust** ≥ 1.98（仅桌面端构建需要）
- 各平台 Tauri v2 系统依赖（见 [官方文档](https://v2.tauri.app/start/prerequisites/)）

### 安装

```bash
git clone --recurse-submodules <your-repo-url> Pitaki
cd Pitaki
pnpm install          # 或 npm / yarn / bun

# 若克隆时忘了 --recurse-submodules
git submodule update --init --recursive

# 构建引擎 vendor 产物（首次必做）
pnpm run build:vendor
```

### 开发

```bash
pnpm run dev            # 仅前端（浏览器调试）
pnpm run tauri:dev      # 桌面端（Tauri + Vite HMR）
```

### 构建

```bash
pnpm run build          # 前端静态构建 → dist/
pnpm run tauri:build    # 桌面安装包
```

### 建议的 npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "build:vendor": "node scripts/build-foliate-vendor.mjs",
    "sync:engine": "node scripts/sync-foliate.mjs",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "postinstall": "node scripts/sync-foliate.mjs"
  }
}
```

---

## 构建 Vendor 产物

foliate-js 依赖 `public/vendor/foliate/` 下的构建产物。**这些产物不在仓库中，必须自行生成。**

### 产物清单

| 文件 | 来源 | 用途 |
|---|---|---|
| `vendor/foliate/zip.js` | `@zip.js/zip.js` 打包 | EPUB/CBZ 容器解压（**随机访问**） |
| `vendor/foliate/fflate.js` | `fflate` 打包 | MOBI/KF8 **字体**解压（`unzlibSync`） |
| `vendor/foliate/pdfjs/pdf.mjs` | `pdfjs-dist/build/` | PDF 渲染 |
| `vendor/foliate/pdfjs/pdf.worker.mjs` | `pdfjs-dist/build/` | PDF Worker |
| `vendor/foliate/pdfjs/cmaps/` | `pdfjs-dist/cmaps/` | ★ **中文 PDF 必需** |
| `vendor/foliate/pdfjs/standard_fonts/` | `pdfjs-dist/standard_fonts/` | 标准字体 |
| `vendor/foliate/pdfjs/*.css` | pdf.js 仓库对应 tag | 文本层 / 标注层样式 |

> 打包入口（与官方 `rollup.config.js` 等价）：
> ```js
> // zip 入口
> export { configure, ZipReader, BlobReader, TextWriter, BlobWriter } from '@zip.js/zip.js'
> // fflate 入口
> export { unzlibSync } from 'fflate'
> ```

### 关键点

- ⚠️ **ZIP 必须用 `@zip.js/zip.js`，不能用 fflate 顶替**。zip.js 是 README 明确推荐、且**唯一支持 `File` 随机访问 / HTTP Range** 的库；它正是「流式读取、不整体载入内存」的实现基础。
- ⚠️ **PDF 是「构建期拷进 vendor」，不是运行时 `import`**。引擎通过 `globalThis.pdfjsLib` 使用它，并会 `fetch` 两个 CSS 文件。
- ⚠️ **`cmaps` 不可省** —— 缺失会导致中文 PDF 文字映射错误。
- ⚠️ `pdfjs-dist` **精确锁 `5.5.207`**，与引擎内部依赖对齐；不要升到 6.x。

---

## 阅读引擎集成

### 加载

引擎放在 `public/foliate/`，运行时动态加载（避免 Vite 预打包破坏原生 ES module 语义）：

```ts
// src/lib/vendor.ts
export async function loadEngine() {
  return import(/* @vite-ignore */ '/foliate/view.js')
}
```

### 基础用法

```ts
await loadEngine()

const view = document.createElement('foliate-view')
document.getElementById('reader-container')!.append(view)

// 打开：File / Blob / 解包的 EPUB 目录
await view.open(file)

// 位置变化
view.addEventListener('relocate', (e: CustomEvent) => {
  const { fraction, cfi, location, tocItem, pageItem, range, reason } = e.detail
  // reason: 'snap' | 'page' | 'scroll'
  useReaderStore.getState().updateProgress({ fraction, cfi, location })
  schedulePersist({ fraction, cfi, reason })   // 见下：必须节流
})

// 章节加载完成
view.addEventListener('load', (e: CustomEvent) => {
  const { doc, index } = e.detail
  applyBookTheme(doc)                          // 见「主题系统」
})
```

### 关键 API 速查

| 能力 | API |
|---|---|
| 打开书籍 | `view.open(file)` |
| 上一 / 下一页 | `view.prev()` / `view.next()` |
| 跳转到位置 | `view.goTo({ index, anchor })` |
| 目录 / 页表 | `book.toc` / `book.pageList` |
| 阅读进度 | `relocate` 事件 → `detail.fraction` |
| 书内样式注入 | `view.renderer.setStyles(css)` |
| 反色 / 护眼滤镜 | `foliate-view::part(filter)` |
| 页眉 / 页脚 | `.heads` / `.feet`，样式用 `::part(head)` / `::part(foot)` |
| 全文搜索 | 引擎自带 `search.js` |
| 高亮层 | `create-overlayer` 事件 + `Overlayer` |

### 分页 / 滚动

分页器**只有 HTML 属性 API，没有 JS 属性**，必须用 `setAttribute`：

```ts
view.setAttribute('flow', 'paginated')      // 'paginated' | 'scrolled'
view.setAttribute('margin', '48px')         // 单位必须 px
view.setAttribute('gap', '6%')              // 百分比
view.setAttribute('max-inline-size', '720px')  // 单位必须 px
view.setAttribute('max-block-size', '960px')
view.setAttribute('max-column-count', '2')
view.setAttribute('animated', '')           // 布尔属性，加上即开启翻页动画
```

### 进度持久化（必须节流）

`relocate` 在**滚动模式下每帧触发**，直接写库会打爆 IO：

```ts
let timer: number | undefined
let pending: Progress | null = null

function schedulePersist(p: Progress) {
  pending = p
  const delay = p.reason === 'scroll' ? 1000 : 0   // 滚动防抖，翻页立即
  clearTimeout(timer)
  timer = setTimeout(flush, delay)
}

async function flush() {
  if (!pending) return
  await db.saveProgress(pending)   // tauri-plugin-sql
  pending = null
}

// 退出 / 切书 / 失焦 / 切后台：强制落库
window.addEventListener('blur', flush)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
```

> `cfi` 作为主定位（跨排版稳定），`fraction` 作为兜底。

---

## 主题系统

**外壳主题与书页主题是两套独立机制。** HeroUI/Tailwind 的 CSS 变量作用不到书页 —— 书籍正文渲染在引擎的**嵌套 iframe** 内。

| 层 | 作用范围 | 机制 |
|---|---|---|
| **外壳** | App 界面（侧栏、按钮、弹窗） | HeroUI + Tailwind v4 CSS 变量 |
| **书页** | 书籍正文 | 引擎 `renderer.setStyles()` + `::part(filter)` |

### 外壳主题

```css
/* src/styles/globals.css */
@import "tailwindcss";        /* ★ 必须最先导入 */
@import "@heroui/styles";

@layer base {
  /* 自定义命名主题：给出完整 token，而非只改 2~3 个变量 */
  [data-theme="paper"] {
    color-scheme: light;
    --background: oklch(0.96 0.02 85);
    --foreground: oklch(0.30 0.03 50);
    --accent: oklch(0.55 0.09 60);
    --accent-foreground: oklch(0.98 0.01 85);
    --default: oklch(0.92 0.015 85);
    --default-foreground: oklch(0.30 0.03 50);
    --radius: 0.75rem;
    --spacing: 0.25rem;
  }

  [data-theme="eye-care"] {
    color-scheme: light;
    --background: oklch(0.94 0.03 140);
    --foreground: oklch(0.25 0.04 140);
    --accent: oklch(0.55 0.12 150);
    --accent-foreground: oklch(0.98 0.01 140);
    --default: oklch(0.90 0.02 140);
    --default-foreground: oklch(0.25 0.04 140);
  }
}
```

```html
<!-- 切换主题：同时更新 class 与 data-theme -->
<html class="light" data-theme="paper">
  <body class="bg-background text-foreground"><!-- App --></body>
</html>
```

> 变量命名规则（HeroUI v3）：无后缀 = 底色（`--accent`），带 `-foreground` = 其上文字（`--accent-foreground`）。
> 建议先用官方 Theme Builder 导出完整主题 CSS，再按需覆盖。

### 书页主题

```ts
const bookCSS = ({ theme, fontSize, lineHeight, fontFamily, justify }: BookStyle) => `
  html { color-scheme: ${theme.dark ? 'dark' : 'light'}; }
  body {
    color: ${theme.fg};
    background: ${theme.bg};
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
  }
  p, li, blockquote, dd {
    line-height: ${lineHeight};
    text-align: ${justify ? 'justify' : 'start'};
  }
  a { color: ${theme.link}; }
`

// 应用 / 切换
view.renderer.setStyles?.(bookCSS(state.bookStyle))
```

**白天 / 纸质 / 护眼** → 用 `setStyles()` 换色；
**夜间反色** → 优先用滤镜（廉价、无重排）：

```css
foliate-view::part(filter) { filter: invert(1) hue-rotate(180deg); }
```

---

## 数据模型

本地优先：书籍文件由用户选择目录承载，元数据 / 进度 / 批注 / 设置全部存 SQLite。

```sql
-- 书籍
CREATE TABLE books (
  id            TEXT PRIMARY KEY,
  path          TEXT NOT NULL,
  title         TEXT,
  author        TEXT,
  cover_path    TEXT,        -- 封面走文件路径，避免大 BLOB 拖慢查询
  format        TEXT,        -- epub / azw3 / mobi / fb2 / cbz / pdf
  last_read     INTEGER,
  progress      REAL,        -- 0~1，兜底
  cfi           TEXT,        -- 主定位
  added_at      INTEGER
);

-- 书签 / 高亮 / 笔记
CREATE TABLE annotations (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL,
  type          TEXT,        -- bookmark / highlight / note
  cfi           TEXT,
  section_index INTEGER,     -- 冗余字段，便于按章节检索
  content       TEXT,
  color         TEXT,
  created_at    INTEGER,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE INDEX idx_ann_book ON annotations(book_id, section_index);

-- 设置
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### 状态管理约定

```ts
interface ReaderState {
  currentBook: Book | null
  progress: number
  cfi: string | null
  theme: 'light' | 'dark' | 'paper' | 'sepia' | 'eye-care'
  fontSize: number
  lineHeight: number
  fontFamily: string
  margin: number

  updateProgress: (p: { fraction: number; cfi: string; location?: unknown }) => void
  setTheme: (t: ReaderState['theme']) => void
  flush: () => Promise<void>
}
```

**同步策略**：内存（Zustand）实时更新 UI；SQLite 承载可恢复点，写入**必须防抖**。
云同步为可选能力，接口预留，默认关闭。

---

## Tauri 配置要点

> Tauri v2 与 v1 最大的差异是 **Capabilities / ACL 权限体系**。不配置会导致插件调用直接失败。

### 权限（`src-tauri/capabilities/default.json`）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "dialog:default",
    "sql:default",
    "sql:allow-execute"
  ]
}
```

### CSP（必须放行书籍渲染方式）

引擎使用 `blob:` 同源 iframe 渲染正文，并可能使用 Worker：

```
default-src 'self';
img-src 'self' data: blob: asset: http://asset.localhost;
frame-src 'self' blob: data:;
worker-src 'self' blob:;
style-src 'self' 'unsafe-inline';
```

### 安全上下文

字体去混淆（IDPF 算法）默认调用 Web Crypto 的 **SHA-1**，**仅在安全上下文可用**：

- **Tauri**：自定义协议（`tauri://localhost` / `http://tauri.localhost`）通常视为安全上下文 ✅
- **纯 HTTP 的 Web 部署**：**会失败** ❌ —— 必须启用 HTTPS，或自行提供 SHA-1 实现

### Rust 侧原则

保持极简：只做文件访问、SQLite、系统调用。**复杂解析全部留在前端**。

---

## 路线图

### Phase 1 — 骨架

- [ ] Vite + React + TS + Tauri v2 工程初始化
- [ ] Tauri capabilities 与 CSP 配置
- [ ] CI：typecheck + lint

### Phase 2 — 界面

- [ ] HeroUI v3 + Tailwind v4 接入
- [ ] 定义**外壳**主题 token（含 `@layer base` 完整块）

### Phase 3 — 引擎

- [ ] `scripts/build-foliate-vendor.mjs` 跑通（zip.js / fflate / pdfjs）
- [ ] 验证 `view.js` 相对路径可解析
- [ ] `open()` + `relocate` + `load` 打通

### Phase 4 — 阅读体验

- [ ] 目录与进度（含节流落库）
- [ ] 书页主题：`setStyles()` + `::part(filter)` + 分页属性
- [ ] 分页 / 滚动切换

### Phase 5 — 存储

- [ ] `tauri-plugin-sql` + Zustand 同步
- [ ] 数据库迁移与防抖写入

### Phase 6 — 功能完善

- [ ] 书签 / 高亮 / 笔记（Overlayer）
- [ ] 全文搜索（`search.js`）
- [ ] 设置面板（字体 / 行距 / 边距 / 主题）

### Phase 7 — 可选扩展

- [ ] PDF 独立构建（锁 5.5.207 + cmaps）
- [ ] OPDS / Calibre 集成（引擎自带 `opds.js`）
- [ ] 云同步
- [ ] 词典（`dict.js`）、TTS（`tts.js`）

---

## 已知限制

| 项 | 说明 |
|---|---|
| 引擎 API 稳定性 | foliate-js 官方自述 *not stable*，API 可能随时变更 —— 已用 L2 适配层 + submodule 锁 commit 缓解 |
| DRM | 不支持任何 DRM 保护的书籍 |
| CBR | 不支持，仅 CBZ |
| PDF | 引擎的 PDF 适配器为 **proof-of-concept**，功能有限 |
| HeroUI Pro | DataGrid / Kanban / Command palette 等属**付费组件**，免费版不含 |
| WebKitGTK | Linux 平台使用 WebKitGTK，需实测 `srcdoc` iframe + CSS 多列分页的兼容性与性能 |
| 纯 HTTP 部署 | Web 端必须 HTTPS（Web Crypto SHA-1 需安全上下文） |

---

## 风险登记

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|---|
| R1 | 引擎 API 漂移 | 高 | 高 | submodule 锁 commit + L2 适配层 |
| R2 | 误用 fflate 顶替 zip.js，失去随机访问 | 中 | 高 | 明确依赖职责，见 [构建 Vendor 产物](#构建-vendor-产物) |
| R3 | PDF 缺 `cmaps` 导致中文乱码 | 中 | 中 | vendor 拷贝时包含 `cmaps` + `standard_fonts` |
| R4 | CSP 未放行 `blob:` 导致打不开书 | 中 | 高 | 见 [Tauri 配置要点](#tauri-配置要点) |
| R5 | v2 ACL 未授权导致插件调用失败 | 中 | 高 | capabilities 显式声明权限 |
| R6 | `relocate` 高频写库导致 IO 抖动 | 高 | 中 | 按 `reason` 区分防抖 / 立即落库 |
| R7 | WebKitGTK 渲染兼容问题 | 中 | 中 | 早期在 Linux 冒烟测试 |
| R8 | 纯 HTTP 部署导致 SHA-1 不可用 | 中 | 中 | 强制 HTTPS 或自带 SHA-1 |
| R9 | 误装 npm 上的非官方 `foliate-js` 包 | 中 | 高 | 只用 submodule，禁止 `npm i foliate-js` |
| R10 | 自定义主题只改少量变量导致对比度异常 | 中 | 低 | 用 Theme Builder 导出完整 token |

---

## 第三方许可

本项目采用 **MIT** 许可。

打包 / 依赖的第三方组件许可：

| 组件 | 许可 | 备注 |
|---|---|---|
| foliate-js | MIT | 以 submodule 形式引入 |
| @zip.js/zip.js | BSD-3-Clause | |
| PDF.js (pdfjs-dist) | Apache-2.0 | |
| HeroUI | MIT | |
| Tauri | MIT / Apache-2.0 | |

> ⚠️ 若参考 **Readest**（同为 foliate-js 生态）的实现，注意其采用 **AGPL-3.0**，代码复用需遵守其许可。

---

## 参考资料

- [foliate-js](https://github.com/johnfactotum/foliate-js) — 阅读引擎
- [HeroUI](https://heroui.com) — UI 组件库（v3）
- [Tauri v2](https://v2.tauri.app) — 桌面壳
- [zip.js](https://github.com/gildas-lormeau/zip.js) — ZIP 随机访问
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF 渲染
- [Readest](https://github.com/readest/readest) — 同类开源参考实现

---

<div align="center">

**Pitaki** — 轻量、现代、可自定义的跨平台阅读引擎

</div>
