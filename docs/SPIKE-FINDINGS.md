# Step 0 Spike 结论：引擎可行性验证

[← 返回 README](../README.md)

> **状态：两项验证全部通过（A. ZIP 随机访问 ✅ / B. iframe + blob 渲染 ✅）。**
> PDF 不在本次范围内（推迟到 Phase 7）；本步只跑 EPUB 路径。
>
> ⚠️ **文档性质**：这是 **Step 0 的历史记录**，其中的路径与数字保持当时原貌，不改写。
> 当时的 `spike/` 临时目录**已删除**，验证能力已固化为常驻工具：
>
> | 当时 | 现在 |
> |---|---|
> | `spike/tools/gen-sample.mjs` | `tools/verify/gen-sample.mjs`（`pnpm gen:sample`） |
> | `spike/tools/run-spike.mjs` | `tools/verify/run-spike.mjs`（`pnpm verify:epub`） |
> | `spike/public/foliate/` | `public/foliate/`（正式产物） |
> | 应用内 harness（`src/dev/spike.ts`，317 行） | `tools/tauri-smoke/`（`pnpm tauri:smoke`） |
> | `PITAKI_SPIKE_*` | `PITAKI_SMOKE_*` |
>
> 复跑方式见 [AGENTS.md §4.5](../AGENTS.md)。

---

## 1. 结论摘要

| 项 | 结论 |
|---|---|
| **A. zip.js 的 `File` 随机访问** | ✅ **成立**。12.49 MiB 的 EPUB 只读取 **89,723 B（0.69%）**；23.69 MiB 读 **321,008 B（1.29%）**。读取位置集中在文件**末尾的 ZIP 中央目录**。无 `stream()` 整读、无 `arrayBuffer()` 整读 |
| **A. 是否随文件增大线性增长** | ✅ **不增长**。0.77 MiB → 330 KB、12.49 MiB → 90 KB、23.69 MiB → 321 KB；绝对读取量在 72–330 KB 区间，与文件大小无关 |
| **B. iframe + blob 渲染** | ✅ **成立**。EPUB 正文在 `blob:` iframe 内渲染并可见可翻页；`relocate` 给出 CFI + fraction + section/location；**控制台 0 error / 0 pageerror** |
| **引擎能否用相对路径加载 vendor** | ✅ `view.js` 的 `./vendor/zip.js` 解析成功（HTTP 200）——但**加载方式有硬约束**，见 §5.1 |

**结论：方案可行，可以进入 Step 1。** 但 §5 的三条发现会直接影响 Step 1 的骨架写法，需要先确认。

---

## 2. 环境

| 项 | 值 |
|---|---|
| Node | 22.23.2（pnpm 9.15.9） |
| Vite | 8.3.0 |
| **foliate-js commit** | **`78914aef4466eb960965702401634c2cb348e9b1`**（2026-05-01，`Use original hrefs for external links and add isExternal in fb2.js (#129)`） |
| `@zip.js/zip.js` | 2.15.0 |
| `fflate` | 0.8.3（只 `unzlibSync`，本步未走到） |
| rollup / terser | 4.63.3 / 5.46.0 |
| 浏览器 | Playwright 1.63.0 的 Chromium 153（`chromium-headless-shell`） |
| 访问方式 | `http://localhost:5173`（**未用 `--host`**；`isSecureContext = true`，`crypto.subtle.digest` 可用） |

---

## 3. Vendor 产物

构建入口与上游 `rollup.config.js` 等价，去掉 pdfjs 拷贝（PDF 推迟）：

```js
// zip 入口
export { configure, ZipReader, BlobReader, TextWriter, BlobWriter } from '@zip.js/zip.js'
// fflate 入口
export { unzlibSync } from 'fflate'
```

| 产物 | 体积 | sha256（连续两次构建一致，可复现） |
|---|---|---|
| `public/foliate/vendor/zip.js` | **119.2 KiB**（122,036 B） | `78f8f6c0ac814194f9e12fe91cac55c203684e9d45b0f40dc353ce8e5dd3a6bc` |
| `public/foliate/vendor/fflate.js` | **3.8 KiB**（3,857 B） | `e63bcc21f83a43e5f71d5cbefd351ff4d4dbd57bef8b29ad65c8bd65752f6e6b` |

引擎副本总体积：

| 范围 | 体积 |
|---|---|
| `spike/public/foliate/`（整棵引擎 + vendor） | **448,991 B（≈438 KiB）** |
| 其中 `vendor/`（自建产物） | 125,893 B |
| 其中引擎 JS/CSS（`--exclude=vendor`） | 323,098 B |

> ℹ️ AGENTS.md DoD 里写的路径 `spike/public/vendor/foliate/` 与实际结构不符（引擎是整棵放在 `public/foliate/`，vendor 在其**下一级**）。特此说明，未改文档。

**上游 `vendor/` 里其实已提交了预构建的 `zip.js` / `fflate.js`**（我们自建的产物覆盖了它们）。自建产物与上游预构建产物的差别本次未比对。

---

## 4. 验证 A / B 的实测数据

样本：

| 样本 | 大小 | 来源 |
|---|---|---|
| `pitaki-spike-big.epub` | 12.49 MiB | **本地合成**（`spike/tools/gen-sample.mjs`，可复现）：305 条目、300 章、一张 12.36 MiB 的不可压缩 PNG。sha256 `f3b4e969cee3b690…` |
| `pg1342-images-3.epub` | 23.69 MiB | Project Gutenberg《Pride and Prejudice》（含图）。sha256 `bbd82efa5e3e8d8a…` |
| `pg2701-images-3.epub` | 0.77 MiB | Project Gutenberg《Moby Dick》。sha256 `21078430c9d03432…` |
| `test.epub` | 2.19 MiB | **用户提供**：`/workspace/books/test.epub`，zh-CN，532 spine。sha256 `d65d11d8ce787af6…` |

### A. ZIP 随机访问

计数方法：覆盖 **`File` 实例上的 `slice`**（不用 Proxy），同时统计 `stream()` 调用与 `arrayBuffer()` 整读调用。样本经**真实 `<input type=file>`** 送入（Playwright `setInputFiles`），**不是** `fetch` 整个文件再包 `File`——即 Chromium 磁盘后备的 File，`slice` 才是唯一的读取路径。

| 样本 | 文件大小 | 读取字节 | 占比 | slice 次数 | 最大单次 | `stream()` | `arrayBuffer()` |
|---|---|---|---|---|---|---|---|
| 合成 | 12.49 MiB | **89,723** | **0.69%** | 11 | 65,557 | 0 | 0 |
| pg1342 | 23.69 MiB | **321,008** | **1.29%** | 15 | 229,591 | 0 | 0 |
| test.epub | 2.19 MiB | 275,784 | 12.02% | 13 | 157,964 | 0 | 0 |
| pg2701 | 0.77 MiB | 330,002 | 40.62% | 15 | 257,017 | 0 | 0 |

- 首次读取形态（以 test.epub 为例）：`[0,4)`（`isZip` 探针）→ `[2228727,2294284)`（**文件末尾**，即 ZIP 中央目录）→ 末尾若干次小范围读 → `[58,88)`、`[110,284)`（container.xml / OPF）。**典型随机访问，没有从头到尾读一遍。**
- `pg2701`（0.77 MiB）占比 40.62% 不是失败：它读的绝对量（330 KB）与 23.69 MiB 的样本（321 KB）几乎相同，**说明不随文件增大而增长**；占比高只是小文件分母小。DoD 的「< 10%」针对 **>10MB** 的样本，两个大样本分别为 0.69% 与 1.29%，通过。
- **局限（诚实说明）**：本验证测的是「引擎请求了多少字节」，**没有**测进程 RSS / JS 堆。要做内存侧证据需另加 `performance.measureUserAgentSpecificMemory()` 或 `--enable-precise-memory-info`，本步未做。

### B. iframe + blob 渲染

| 样本 | 书名 | sections / toc | 首节文字 | 跳到第 1 节后文字 | 其中图片 | `relocate` | error |
|---|---|---|---|---|---|---|---|
| 合成 | Pitaki Spike Big Book | 300 / 300 | 1,182（含中文） | 1,182（含中文，`Chapter 2…`） | 0 | 2 | **0** |
| pg1342 | Pride and Prejudice | 9 / 63 | 24（封面页） | **115,833** | 36 | 2 | **0** |
| test.epub | 雌小鬼魔女又在对我哈气 | **532** / 3 | 0（封面页） | 522（中文正文） | 0 | 2 | **0** |
| pg2701 | Moby Dick; Or, The Whale | 12 / 141 | 24（封面页） | **124,473** | 0 | 2 | **0** |

- 渲染容器：`view.renderer.getContents()[0].doc` 的 `location.href` 是 `blob:http://localhost…`，尺寸 700×500，`documentElement.scrollHeight = 404`，正文可见（截图存 `spike/tools/artifacts/*.png`）。
- 翻页：`view.next()` 正常，`relocate` detail 实测形态：
  `{ fraction: 0.00336, cfi: "epubcfi(/6/4!/4,/2[pg-header]/6[…])", section: { current: 1, total: 9 }, location: { current: 1, next: 1, total: 580 }, reason: … }`（与 `docs/ENGINE.md` §4 描述一致）。
- **控制台：0 error、0 requestfailed、0 Vite 错误页。** 唯一噪声是 Chromium 对 `sandbox="allow-same-origin allow-scripts"` 的 4 条 warning（上游已知的内容隔离缺陷，`docs/RISKS.md` / `docs/TAURI.md` §2 已记录）。
- 打开耗时：`open()` 162–241 ms（含解析 OPF/建 300–532 个 section 对象）。

---

## 5. 关键发现（会直接影响 Step 1）

### 5.1 ⚠️ Vite 不允许 `import()` `public/` 下的 JS —— 必须改用 `<script src>`

按 `docs/ENGINE.md` §3.4「方案 A」直接写 `import('/foliate/view.js')` **会失败**：

```
Error: Cannot import non-asset file /foliate/view.js which is inside /public.
JS/CSS files inside /public are copied as-is on build and can only be
referenced via <script src> or <link href> in html.
```

- 字面量 `import()` → 直接 500。
- 改成变量 + `@vite-ignore` 也没用：Vite 会把动态 import 包装成 `__vite__injectQuery(url, 'import')`，仍然 500（Vite 8.3.0 实测）。
- **实测可行的路径**（本次采用）：

  ```html
  <!-- index.html -->
  <script type="module" src="/foliate/view.js"></script>
  ```

  ```js
  await customElements.whenDefined('foliate-view')   // view.js 自己注册自定义元素
  ```

  这样 `view.js` 及其 `./vendor/zip.js` 都由**浏览器原生解析**（请求路径无 `?import` 查询），完全保留上游目录结构，也就保住了 `docs/ARCHITECTURE.md` §2.1 的「L0/L1 相对位置固定」。
- `vite build` 生产构建同样成立：`public/foliate/` 原样拷入 `dist/foliate/`，`<script src>` 标签保持不变（已实测 build 通过）。
- 不推荐 `new Function('u', 'return import(u)')` 这类绕过方式：**Tauri CSP 会禁掉 `unsafe-eval`**，在 Step 1 的真实环境里会翻车。
- 备选方案（未采用，供 Step 1 决策）：把引擎挪到 `public/` 之外（如 `src/foliate/` 或根目录 `foliate/`），让它进入 Vite 模块图被正常转换/打包。

### 5.2 ⚠️ `open()` 不会渲染，必须再调 `init()` / `goTo()`

`await view.open(file)` 只完成「解析书籍 + 建 renderer」，**不显示任何章节**（实测：`getContents()` 为空、无 `load` 事件）。要渲染首节必须：

```js
await view.open(file)
await view.init({ showTextStart: true })   // 或 await view.goTo(0) / view.goToFraction(f)
```

`view.init()` 内部走 `renderer.goTo()` 并 **await 首节 iframe 的 load**，所以 `init()` 返回后 `load` 事件已到达。**`docs/ENGINE.md` §4 的示例只写了 `open()`，会让人以为打开即渲染**——建议在 Step 3 前补一行说明（未擅自改文档，见 §7）。

### 5.3 ⚠️ `view.goTo()` 的签名：target ≠ `{ index, anchor }`

`docs/ENGINE.md` §5 写的是 `view.goTo({ index, anchor })`，实测**会抛异常**：

```
TypeError: href.split is not a function  at EPUB.resolveHref
→ Could not resolve target [object Object]
→ TypeError: Cannot read properties of undefined (reading 'index')  at Paginator.goTo
```

- `foliate-view.goTo(target)` 只接受 **number / `{ fraction }` / CFI 字符串 / href 字符串**（见 `view.js#resolveNavigation`）。
- `{ index, anchor }` 是**下一层** `renderer.goTo()` 的签名（`paginator.js`）。
- L2 适配层需要把这两层包平：对外暴露 `goToIndex(i)` / `goToCFI(cfi)` / `goToFraction(f)`，不要让业务层接触 renderer 对象。

### 5.4 其他

- `view.book.sections.length` 可拿到真实节数（合成书 300 / 用户书 **532**），`book.toc.length` 用户书只有 3（该书 nav 本身很浅），可作为 Step 3 TOC 的样本。
- 首节通常是封面页（`textContentLen` 24 或 0），**不要用「首节文字非空」当作渲染成功的判据**，应看 `load` 事件 + `getContents()[0].doc`。
- i18n/中文：zh-CN 书正常渲染，`doc.documentElement.lang` 由引擎写入，`isCJK` 分支生效，未出现乱码。

---

## 6. 复现步骤（历史记录）

> 下面的命令是**当时**的形态，`spike/` 已删除。要现在复跑，用
> `pnpm gen:sample` / `pnpm verify:epub` / `pnpm tauri:smoke`（见 [AGENTS.md §4.5](../AGENTS.md)）。

```bash
# 1. 引擎源码（spike/ 内，可整体删除）
git clone https://github.com/johnfactotum/foliate-js spike/.engine-src && cd spike/.engine-src && git checkout 78914aef
# 2. 拷到 spike/public/foliate/（整体，排除 .git / vendor/pdfjs），再 pnpm add -D vite rollup @rollup/plugin-node-resolve terser playwright；pnpm add @zip.js/zip.js fflate
node build-vendor.mjs                     # 产出 public/foliate/vendor/{zip.js,fflate.js}
node tools/gen-sample.mjs                 # 合成 12.49 MiB EPUB
curl -o public/samples/pg1342-images-3.epub https://www.gutenberg.org/cache/epub/1342/pg1342-images-3.epub
pnpm dev                                  # 必须 http://localhost:5173，不要 --host
node tools/run-spike.mjs                  # Playwright 驱动，产出 tools/artifacts/spike-results.json + 截图
```

---

## 7. DoD 逐条核对

| DoD 条目 | 状态 | 证据 |
|---|---|---|
| 两个验证全部通过 / 或指出失败项 | ✅ | §4（A/B 均通过） |
| 确认打开 EPUB 时没有整体载入内存 | ✅ | §4 A 表；`stream()` / `arrayBuffer()` 全量为 0；读取集中在文件末尾中央目录 |
| 记下 vendor 产物体积 | ✅ | §3（zip.js 119.2 KiB / fflate.js 3.8 KiB；引擎树 448,991 B） |
| 记下可用的加载路径 | ✅ | §5.1（`<script type="module" src="/foliate/view.js">`；`import()` ❌） |
| 记下 foliate-js commit hash | ✅ | §2（`78914ae…`） |
| 结论写入 `docs/SPIKE-FINDINGS.md` 并提交 | ✅ | 本文件 |
| 向用户汇报，等确认再进 Step 1 | ✅ | 已完成 —— Step 1/2 均已落地，CI 全绿 |

### 未验证 / 留待后续

- **Tauri 窗口内重跑 A/B**（Step 1 硬要求）：真实差异在 CSP（`frame-src blob:`、`style-src 'unsafe-inline'`）与安全上下文。
- MOBI / KF8 / FB2 / CBZ（本步范围外）；PDF 推迟到 Phase 7。
- IDPF 字体去混淆（需要一本**带混淆字体**的 EPUB，现有样本都没有）。
- 内存侧证据（RSS / 堆）未测，只测了读取字节数。
- 滚动模式（`flow=scrolled`）下 `relocate` 的真实触发频率——Step 4 节流参数的依据，本步未量化。
