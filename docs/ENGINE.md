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

foliate-js 依赖 `vendor/` 下的构建产物。

> ⚠️ **勘误（2026-09 实测）**：上游仓库**已经提交了预构建的**
> `vendor/zip.js`（36,512 B）与 `vendor/fflate.js`（3,857 B），
> 并非「必须自行生成」。我们仍然自己构建，理由见 §3.2。

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

> ⚠️ **入口写法会决定产物体积，实测差 3.3 倍。**

上游 `rollup.config.js` **用相对路径**指向 `lib/zip-core.js`：

```js
// 上游做法：相对路径，绕过 package.json 的 exports 映射
export { configure, ZipReader, BlobReader, TextWriter, BlobWriter }
    from '../node_modules/@zip.js/zip.js/lib/zip-core.js'
```

**三种写法实测对比：**

| 写法 | 实际解析到 | 产物体积 |
|---|---|---|
| `from '@zip.js/zip.js'` | 包根 → `index.js`（**完整构建**，含 writer / zip-fs / 各编解码器） | **122,036 B** ❌ |
| `from '@zip.js/zip.js/lib/zip-core.js'` | 被 exports 映射到 `zip-core-wasm.js`（**WASM 变体**） | 体积与行为都不可控 ⚠️ |
| **相对路径 → `lib/zip-core.js`** | 只 `export * from './zip-core-base.js'` + `terminateWorkers` | **36,512 B** ✅ |

我们的入口：

```js
// scripts/entries/zip.js
export { configure, ZipReader, BlobReader, TextWriter, BlobWriter }
    from '../node_modules/@zip.js/zip.js/lib/zip-core.js'

// scripts/entries/fflate.js
export { unzlibSync } from 'fflate'
```

**CI 断言**：`zip.js` 产物应 ≈ **36 KB**。若明显超出，说明入口被改回了包根。

> **为什么不直接用上游预构建的 `vendor/zip.js`**：
> 上游用 `@zip.js/zip.js@^2.7.52` 构建，我们用 `2.15.0`。
> 自己构建才能控制版本与安全更新，同时保持体积对等。

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

#### ⚠️ 不能用 `import()` 加载引擎（Vite 8 实测）

```js
await import('/foliate/view.js')   // ❌ 500
```

Vite 8.3.0 的报错原文：

```
Cannot import non-asset file /foliate/view.js which is inside /public.
JS/CSS files inside /public are copied as-is on build and can only be
referenced via <script src> or <link href> in html.
```

改成**变量 + `@vite-ignore` 同样无效** —— Vite 会把动态 import 包装成
`__vite__injectQuery(url, 'import')`，仍然 500。

`new Function('u', 'return import(u)')` 这类绕过方式**不可取**：
Tauri 的 CSP 会禁掉 `unsafe-eval`，在真实环境里必然翻车。

#### ✅ 可行方案（实测通过，dev 与 build 均成立）

保留上游目录结构，构建时整体同步到 `public/foliate/`，
用 `<script type="module">` 让**浏览器原生解析**（请求路径不带 `?import`）：

```html
<script type="module" src="/foliate/view.js"></script>
```

```js
await customElements.whenDefined('foliate-view')   // view.js 自行注册自定义元素
```

这样上游的 `./vendor/zip.js` 相对路径**照常解析**，
[ARCHITECTURE.md §2.1](ARCHITECTURE.md#21-l0-与-l1-的相对位置必须固定) 的「L0/L1 相对位置固定」依然成立。

> **建议增强**：不要把 `<script>` 静态写进 `index.html` —— 那会让引擎（实测约 323 KB 源码）
> 进入启动关键路径。改为**首次打开书籍时动态注入**：
>
> ```ts
> let engine: Promise<void> | undefined
> export function loadEngine() {
>   return (engine ??= new Promise((resolve, reject) => {
>     const s = document.createElement('script')
>     s.type = 'module'
>     s.src = '/foliate/view.js'
>     s.onload = () => customElements.whenDefined('foliate-view').then(() => resolve())
>     s.onerror = reject
>     document.head.append(s)
>   }))
> }
> ```

#### 备选方案（未采用）

把引擎移出 `public/`（如 `src/foliate/`），让它进入 Vite 模块图被转换与打包。
代价是**破坏上游目录结构**，与 R11 冲突。

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

// ⚠️ 关键：open() 只完成"解析书籍 + 建 renderer"，**不渲染任何章节**
//    必须再调 init() 才会显示内容并触发首个 load 事件
await view.init({ showTextStart: true })
// 或指定位置：await view.goTo(0) / view.goTo({ fraction: 0.5 }) / view.goTo(cfi)

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
| 跳转到位置 | `view.goTo(target)` —— target **只能是** number / `{ fraction }` / CFI 字符串 / href 字符串（**不是** `{ index, anchor }`，见 §5.1） |
| 目录 / 页表 | `book.toc` / `book.pageList` |
| 阅读进度 | `relocate` 事件 → `detail.fraction` |
| 书内样式注入 | `view.renderer.setStyles(css)` |
| 反色 / 护眼滤镜 | `foliate-view::part(filter)` |
| 页眉 / 页脚 | `.heads` / `.feet`，样式用 `::part(head)` / `::part(foot)` |
| 全文搜索 | 引擎自带 `search.js` |
| 高亮层 | `create-overlayer` 事件 + `Overlayer` |
| 词典 / TTS / OPDS | 引擎自带 `dict.js` / `tts.js` / `opds.js` |

### 5.1 ⚠️ `view` 与 `renderer` 是两层，签名不同

实测踩坑：`view.goTo({ index, anchor })` **会抛异常** ——

```
TypeError: href.split is not a function        at EPUB.resolveHref
  → Could not resolve target [object Object]
  → TypeError: Cannot read properties of undefined (reading 'index')  at Paginator.goTo
```

根因在 `view.js#resolveNavigation(target)`，它**只认四种形态**：

```js
resolveNavigation(target) {
    if (typeof target === 'number') return { index: target }          // 节序号
    if (typeof target.fraction === 'number') { ... }                  // 全书比例
    if (CFI.isCFI.test(target)) return this.resolveCFI(target)        // CFI 字符串
    return this.book.resolveHref(target)                              // href 字符串
}
```

传对象会落到最后一个分支 → `book.resolveHref(obj)` → `obj.split is not a function`。

| 层 | 接受的 target |
|---|---|
| `foliate-view.goTo(target)` | `number` / `{ fraction }` / CFI 字符串 / href 字符串 |
| `renderer.goTo(dest)` | `{ index, anchor }`（**内部签名，业务层不该接触**） |

**L2 适配层的职责**就是把这个差异包平，对外只暴露：

```ts
goToIndex(i: number): Promise<void>          // → view.goTo(i)
goToCFI(cfi: string): Promise<void>          // → view.goTo(cfi)
goToFraction(f: number): Promise<void>       // → view.goTo({ fraction: f })
```

业务层不应拿到 `view.renderer` 对象。

> 同理注意 `open()` 与 `init()` 的分工（见 §4），二者都是 view 层但职责不同：
> `open()` 建 renderer，`init()` 才定位并渲染。

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
