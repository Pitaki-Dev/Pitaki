/**
 * 引擎动态加载（docs/ENGINE.md §3.4）。
 *
 * 为什么必须用 <script type="module"> 而不是 import()：
 * Vite 8 禁止 import public/ 下的 JS（"Cannot import non-asset file … which is inside /public"），
 * 变量 + `@vite-ignore` 也会被包装成 `__vite__injectQuery(url, 'import')` 而失败。
 *
 * 为什么动态注入而不是写死在 index.html：
 * 引擎源码约 323 KB，写死会让它进入启动关键路径。
 *
 * 全项目唯一允许触发引擎加载的地方是 L2 适配层（Step 3），此处只提供加载原语。
 */
let pending: Promise<void> | undefined

export function loadEngine(): Promise<void> {
  return (pending ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = '/foliate/view.js'
    script.onload = () => {
      // view.js 顶部就会 customElements.define('foliate-view', …)
      customElements.whenDefined('foliate-view').then(() => resolve(), reject)
    }
    script.onerror = () => reject(new Error('无法加载 /foliate/view.js（先跑 pnpm sync:foliate）'))
    document.head.append(script)
  }))
}

export function createView(): HTMLElement {
  return document.createElement('foliate-view')
}
