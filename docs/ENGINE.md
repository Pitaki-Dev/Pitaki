# 阅读引擎集成

[← 返回 README](../README.md)

本文档描述 **foliate-js** 的引入方式、vendor 产物构建、API 用法与升级流程。

---

## 1. 引擎来源

| 项 | 值 |
|---|---|
| 项目 | [johnfactotum/foliate-js](https://github.com/johnfactotum/foliate-js) |
| 许可证 | MIT |
| 格式支持 | EPUB、MOBI、KF8（AZW3）、FB2、CBZ、PDF（实验性） |
| 生产案例 | Foliate、Readest |
| 稳定性 | ⚠️ 上游自述 *"not stable, expect it to break"* |

---

## 2. 引入方式：git submodule（禁止 npm）

**npm 上的 `foliate-js` 不是官方包** —— 实际为第三方发布（`1.0.1`，2025-04 后未更新），而官方仓库 `package.json` 的 version 为 `0.0.0`。上游 README 原文：

> *"since there's no release yet, it is recommended that you include the library as a **git submodule** in your project so that you can easily update it."*

```bash
git submodule add https://github.com/johnfactotum/foliate-js third_party/foliate-js
cd third_party/foliate-js && git checkout <pinned-commit>
```

要求：

- 必须**锁定 commit**，不追 `main`
- 不允许改动 submodule 内的文件（否则升级时产生冲突）
- 全项目**只有 L2 适配层**可以 `import` 引擎

---

## 3. Vendor 产物构建

foliate-js 依赖 `public/vendor/foliate/` 下的构建产物。**这些产物不入库，必须自行生成。**

### 3.1 产物清单

| 文件 | 来源 | 用途 |
|---|---|---|
| `vendor/foliate/zip.js` | `@zip.js/zip.js` 打包 | EPUB/CBZ 容器解压（**随机访问**） |
| `vendor/foliate/fflate.js` | `fflate` 打包 | MOBI/KF8 **字体**解压（`unzlibSync`） |
| `vendor/foliate/pdfjs/pdf.mjs` | `pdfjs-dist/build/` | PDF 渲染 |
| `vendor/foliate/pdfjs/pdf.worker.mjs` | `pdfjs-dist/build/` | PDF Worker |
| `vendor/foliate/pdfjs/cmaps/` | `pdfjs-dist/cmaps/` | ★ **中文 PDF 必需** |
| `vendor/foliate/pdfjs/standard_fonts/` | `pdfjs-dist/standard_fonts/` | 标准字体 |
| `vendor/foliate/pdfjs/*.css` | pdf.js 仓库对应 tag | 文本层 / 标注层样式 |

### 3.2 打包入口

与上游 `rollup.config.js` 等价，只需两个薄入口：

```js
// scripts/entries/zip.js
export { configure, ZipReader, BlobReader, TextWriter, BlobWriter } from '@zip.js/zip.js'

// scripts/entries/fflate.js
export { unzlibSync } from 'fflate'
```

### 3.3 关键点

- ⚠️ **ZIP 必须用 `@zip.js/zip.js`，不能用 fflate 顶替**

  引擎源码 `view.js` 原文：

  ```js
  const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } =
      await import('./vendor/zip.js')
  ```

  上游 README 明确推荐 zip.js，*"because it seems to be the only library that supports **random access** for `File` objects (as well as HTTP range requests)"* —— 它正是「流式读取、不整体载入内存」的实现基础。

  而 `fflate` 在引擎中**只出现一处**：MOBI/KF8 字体解压。

- ⚠️ **PDF 是「构建期拷进 vendor」，不是运行时 `import`**

  引擎源码 `pdf.js` 原文：

  ```js
  import './vendor/pdfjs/pdf.mjs'
  const pdfjsLib = globalThis.pdfjsLib
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsPath('pdf.worker.mjs')
  const textLayerBuilderCSS = await fetchText(pdfjsPath('text_layer_builder.css'))
  ```

  它不是 `import('pdfjs-dist')`，而是**构建期把文件拷进 `vendor/pdfjs/`**，运行时通过 `globalThis.pdfjsLib` 使用，并额外 `fetch` 两个 CSS。

- ⚠️ **`cmaps` 不可省** —— 缺失会导致中日韩（CJK）PDF 文字映射错误。
- ⚠️ **`pdfjs-dist` 精确锁 `5.5.207`**，与引擎内部依赖对齐；不要升到 6.x。

### 3.4 与 Vite 的配合

引擎使用**原生 ES modules**，且以**相对路径**解析 vendor：

```js
await import('./vendor/zip.js')   // 相对 view.js 自身
```

两种可行方案：

- **方案 A（推荐）**：`third_party/foliate-js/` 保留上游目录结构，构建时整体同步到 `public/foliate/`，运行时从 `/foliate/view.js` 动态 import，天然满足相对路径；
- **方案 B**：把这两行 `import` 改成绝对 URL。缺点是引入对上游文件的本地 patch，升级需重新处理。

---

## 4. 加载与基础用法

```ts
// src/lib/vendor.ts
export async function loadEngine() {
  return import(/* @vite-ignore */ '/foliate/view.js')
}
```

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
  schedulePersist({ fraction, cfi, reason })
})

// 章节加载完成
view.addEventListener('load', (e: CustomEvent) => {
  const { doc, index } = e.detail
  applyBookTheme(doc)          // 见 THEMING.md
})
```

> `relocate` 的 detail 结构已在源码 `progress.js` + `view.js` 中核实：
> `lastLocation = { ...progress, tocItem, pageItem, cfi, range }`，
> 其中 `progress = { fraction, section, location }`，并附带 `reason`。

---

## 5. API 速查

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
| 词典 / TTS / OPDS | 引擎自带 `dict.js` / `tts.js` / `opds.js` |

---

## 6. 分页与滚动

分页器**只有 HTML 属性 API，没有 JS 属性**，必须用 `setAttribute`：

```ts
view.setAttribute('flow', 'paginated')         // 'paginated' | 'scrolled'
view.setAttribute('margin', '48px')            // 单位必须 px
view.setAttribute('gap', '6%')                 // 百分比
view.setAttribute('max-inline-size', '720px')  // 单位必须 px
view.setAttribute('max-block-size', '960px')
view.setAttribute('max-column-count', '2')
view.setAttribute('animated', '')              // 布尔属性，加上即开启翻页动画
```

> 分页实现基于 CSS multi-column，与 Epub.js 有相同局限（性能、部分样式异常）。上游 README 已说明。

---

## 7. 进度持久化（必须节流）

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
  await db.saveProgress(pending)
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

## 8. 引擎升级流程

因为引擎 API 不稳定，升级必须走固定流程：

1. 在 submodule 中 `git fetch && git log` 查看变更；
2. 读上游 `README.md` 与相关模块的 diff，识别破坏性变更；
3. 更新 pinned commit，**只改 L2 适配层**；
4. 跑回归样本集（EPUB / AZW3 / CBZ / 中文 PDF 各一）；
5. 同步 `scripts/build-foliate-vendor.mjs` 中 vendor 产物清单（若上游新增/改名了 vendor 文件）。

---

## 9. 已知限制

| 限制 | 说明 |
|---|---|
| DRM | 不支持任何 DRM 保护的书籍 |
| CBR | 不支持（RAR），仅 CBZ |
| PDF | 上游标记为 *proof-of-concept, highly experimental* |
| 混合版式 | 不支持 reflowable + pre-paginated 混排 |
| 安全上下文 | IDPF 字体去混淆依赖 Web Crypto SHA-1，**仅安全上下文可用** |
| 内容隔离 | 引擎以 `blob:` 同源 iframe 渲染，上游 README 承认 *"currently impossible to do so securely"* |
