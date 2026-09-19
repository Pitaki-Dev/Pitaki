# 架构

[← 返回 README](../README.md)

---

## 1. 分层总览

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
│      原生 ES modules，无构建步骤，可直接 import                │
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

---

## 2. 为什么这样分层

### 2.1 L0 与 L1 的相对位置必须固定

`view.js` 以**相对路径**动态加载 vendor 产物：

```js
// foliate-js/view.js
const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } =
    await import('./vendor/zip.js')
```

因此 `vendor/` 必须位于 `view.js` 的同级目录。两种可行方案：

- **方案 A（已实测采用）**：`third_party/foliate-js/` 保留上游完整目录结构，构建时整体拷到 `public/foliate/`，
  运行时用 `<script type="module" src="/foliate/view.js">` 让**浏览器原生解析**，再
  `await customElements.whenDefined('foliate-view')` —— 天然满足相对路径。
  ⚠️ 注意：**不能**用 `import('/foliate/view.js')`，Vite 8 明确禁止 import `public/` 下的 JS，详见 [ENGINE.md §3.4](ENGINE.md#34-与-vite-的配合)；
- **方案 B（未采用）**：把引擎移出 `public/`（如 `src/foliate/`）进入 Vite 模块图。
  代价是破坏上游目录结构，与 R11 冲突。

### 2.2 L2 适配层是唯一防线

foliate-js 官方 README 明确声明：

> *"This library itself is, however, **not stable**. Expect it to break and the API to change at any time. Use at your own risk."*

因此：

- 引擎以 **git submodule + 锁定 commit** 引入，不追 `main`；
- 全项目**只有 L2 允许 `import` 引擎**，其余代码只依赖 L2 暴露的接口；
- 引擎升级时改动范围被限制在单个文件内。

### 2.3 Rust 侧保持极简

只负责：文件访问、SQLite、系统调用（对话框、窗口）。
**复杂解析全部留在前端**，避免前后端职责重叠。

---

## 3. 目录结构

```
Pitaki/
├── third_party/
│   └── foliate-js/                 # git submodule，锁定 commit，勿改
├── scripts/
│   ├── build-foliate-vendor.mjs    # 生成 public/vendor/foliate/*
│   └── sync-foliate.mjs            # 同步引擎到 public/foliate/
├── public/
│   └── foliate/                    # 引擎副本（保留上游目录结构）
│       ├── view.js  epub.js  mobi.js  fb2.js  ...
│       └── vendor/                 # ★ 必须与 view.js 同级（相对路径解析）
│           ├── zip.js              # @zip.js/zip.js 打包产物
│           ├── fflate.js           # fflate 打包产物（仅 unzlibSync）
│           └── pdfjs/              # Phase 7（PDF 已推迟）
│               ├── pdf.mjs
│               ├── pdf.worker.mjs
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
├── docs/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 4. 数据流

```
用户选择书籍
    │
    ▼
[L3] 文件路径 ──► Tauri fs 读取 ──► File/Blob
    │
    ▼
[L2] adapter.open(file)
    │
    ▼
[L1] view.open(file) ──► 按格式分发
    │                    ├─ ZIP 容器 → L0 zip.js（随机访问）
    │                    ├─ MOBI 字体 → L0 fflate（unzlibSync）
    │                    └─ PDF      → L0 pdfjs/
    ▼
渲染到嵌套 iframe
    │
    ├─► load 事件      → [L3] 注入书页样式
    └─► relocate 事件  → [L3] 更新进度（节流）→ SQLite
```

---

## 5. 关键设计取舍

| 决策 | 取舍 |
|---|---|
| 不用 Next.js | 无 SSR 需求，纯 SPA 更轻；代价是失去文件式路由 |
| 不用 React Router | 页面数量少，自写轻量路由足够；代价是多窗口/深链场景需自行处理 |
| 引擎 vendor 而非 npm | npm 上的 `foliate-js` 非官方且已停更；代价是需自建构建脚本 |
| 封面不入 SQLite BLOB | 避免大 BLOB 拖慢查询；代价是需管理文件路径与缩略图 |
| 进度防抖落库 | 避免滚动模式高频写库；代价是异常退出可能丢失最后 1 秒进度 |
