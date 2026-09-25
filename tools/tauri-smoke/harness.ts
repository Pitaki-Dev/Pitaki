/**
 * Tauri 冒烟 harness（原 src/dev/spike.ts）。
 *
 * 为什么必须留在应用内跑（不能只用 Chromium 侧的 tools/verify/*）：
 *   1. 真 CSP 强制（frame-src blob: / style-src 'unsafe-inline' / script-src 'self'）——
 *      Vite dev server 不设 CSP，Chromium 侧永远测不到；
 *   2. WebKitGTK 渲染栈（与 Chromium 行为不同）；
 *   3. 应用自己的引擎加载路径（src/lib/vendor.ts 的运行时 <script> 注入）；
 *   4. Rust↔JS IPC 与 capabilities/ACL。
 * 浏览器（Playwright/Chromium）侧由 tools/verify/run-spike.mjs 驱动同一个 smoke.html。
 *
 * 触发方式：**只由 smoke.html 加载**（`tauri dev --config tauri.smoke.conf.json` 指到该页），
 * 因此正常 `pnpm tauri:dev` 永远不会跑到它 —— 这就是「显式开启」，不需要额外 env 开关。
 * Step 3 落地 L2 适配层后，把 loadTauriSamples/runSmoke 的驱动对象从「File」换成
 * `src/lib/reader/foliate/adapter.ts`，即成为生产取书路径（assetUrl + HttpRangeReader，R14）的验收工具。
 */
import { createView, loadEngine } from '../../src/lib/vendor'

type FoliateContents = { index: number; doc: Document | null }
type FoliateView = HTMLElement & {
  book: { metadata?: { title?: string }; sections?: unknown[]; toc?: unknown[] } | null
  renderer: { getContents(): FoliateContents[] }
  open(file: File): Promise<void>
  init(options: { showTextStart?: boolean }): Promise<void>
  next(distance?: number): Promise<void>
  goTo(target: unknown): Promise<unknown>
  close(): void
  lastLocation?: unknown
}

interface SliceMetrics {
  fileName: string
  fileSize: number
  bytes: number
  calls: number
  maxSlice: number
  largeSliceCount: number
  largeSliceBytes: number
  streamCalls: number
  arrayBufferCalls: number
  firstSlices: [number | null, number | null, number][]
}

interface SectionInfo {
  index: number | null
  textLen: number
  containsCJK: boolean
  head: string
  iframeHref: string | null
  isBlobUrl: boolean
  elements: { p: number; img: number; h1: number } | null
}

export interface SmokeContext {
  origin: string
  userAgent: string
  isSecureContext: boolean
  cryptoSubtle: boolean
  cspViolations: string[]
}

export interface SmokeSampleResult {
  name: string
  path: string | null
  fileSize: number
  randomAccess: {
    sliceBytes: number
    slicePercent: number
    sliceCalls: number
    maxSliceBytes: number
    firstSlices: [number | null, number | null, number][]
    streamCalls: number
    arrayBufferCalls: number
    bytesAfterOpen: number
    bytesAfterFirstRender: number
    bytesAfterNavigation: number
    largeSliceCount: number
    largeSliceBytes: number
  }
  openMs: number
  book: { title: string | null; sections: number | null; toc: number | null }
  firstSection: SectionInfo
  midSection: SectionInfo
  relocateCount: number
  lastRelocate: unknown
  errors: string[]
}

export interface SmokeReport {
  phase: 'tauri-smoke'
  ranAt: string
  context: SmokeContext
  samples: SmokeSampleResult[]
  fatal?: string | undefined
}

export interface SmokeInput {
  name: string
  file: File
  /** 仅 Tauri 路径有：来源文件的绝对路径（便于复现） */
  path?: string
}

const cspViolations: string[] = []
const runtimeErrors: string[] = []
let capturing = false

function startCapturing() {
  if (capturing) return
  capturing = true
  document.addEventListener('securitypolicyviolation', event => {
    cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI} (${event.sourceFile}:${event.lineNumber})`)
  })
  window.addEventListener('error', event => runtimeErrors.push(`error: ${event.message}`))
  window.addEventListener('unhandledrejection', event => runtimeErrors.push(`unhandledrejection: ${String(event.reason)}`))
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    runtimeErrors.push(`console.error: ${args.map(a => String(a)).join(' ')}`)
    original(...args)
  }
}

function instrument(file: File): SliceMetrics {
  const metrics: SliceMetrics = {
    fileName: file.name,
    fileSize: file.size,
    bytes: 0,
    calls: 0,
    maxSlice: 0,
    largeSliceCount: 0,
    largeSliceBytes: 0,
    streamCalls: 0,
    arrayBufferCalls: 0,
    firstSlices: [],
  }
  const originalSlice = file.slice.bind(file)
  file.slice = (...args: [number?, number?, string?]) => {
    const blob = originalSlice(...args)
    metrics.calls++
    metrics.bytes += blob.size
    metrics.maxSlice = Math.max(metrics.maxSlice, blob.size)
    // >64 KiB 的读取基本都是内容资源（图片/字体），与「容器索引」的随机访问分开统计
    if (blob.size > 65_536) {
      metrics.largeSliceCount++
      metrics.largeSliceBytes += blob.size
    }
    if (metrics.firstSlices.length < 8) metrics.firstSlices.push([args[0] ?? null, args[1] ?? null, blob.size])
    return blob
  }
  const originalStream = file.stream?.bind(file)
  if (originalStream) file.stream = (...args: []) => { metrics.streamCalls++; return originalStream(...args) }
  const originalArrayBuffer = file.arrayBuffer.bind(file)
  file.arrayBuffer = (...args: []) => { metrics.arrayBufferCalls++; return originalArrayBuffer(...args) }
  return metrics
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor(condition: () => boolean, label: string, timeout = 20_000) {
  const start = performance.now()
  while (performance.now() - start < timeout) {
    if (condition()) return
    await sleep(50)
  }
  throw new Error(`等待超时：${label}`)
}

function sectionInfo(view: FoliateView): SectionInfo {
  const contents = view.renderer?.getContents?.() ?? []
  const doc = contents[0]?.doc ?? null
  const text = doc?.body?.textContent ?? ''
  const href = doc?.location?.href ?? null
  return {
    index: contents[0]?.index ?? null,
    textLen: text.length,
    containsCJK: /[\u4e00-\u9fff]/.test(text),
    head: text.replace(/\s+/g, ' ').trim().slice(0, 60),
    iframeHref: href ? href.slice(0, 12) : null,
    isBlobUrl: !!href?.startsWith('blob:'),
    elements: doc
      ? { p: doc.querySelectorAll('p').length, img: doc.querySelectorAll('img').length, h1: doc.querySelectorAll('h1').length }
      : null,
  }
}

/** 屏外挂载点：冒烟页与正式页都不需要为它让位 */
function smokeHost(): HTMLElement {
  let host = document.getElementById('pitaki-smoke-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'pitaki-smoke-host'
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:700px;height:500px;visibility:hidden'
    document.body.append(host)
  }
  return host
}

export async function runSmoke(files: SmokeInput[], log: (message: string) => void): Promise<SmokeReport> {
  startCapturing()
  const context: SmokeContext = {
    origin: location.origin,
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    cryptoSubtle: typeof crypto?.subtle?.digest === 'function',
    cspViolations,
  }

  log(`[env] origin=${context.origin} secureContext=${context.isSecureContext} crypto.subtle=${context.cryptoSubtle}`)
  log(`[env] userAgent=${context.userAgent}`)
  log(`[env] CSP 违规累计=${cspViolations.length}`)
  log('[engine] 注入 <script type="module" src="/foliate/view.js"> …')
  await loadEngine()
  log('[engine] foliate-view 已注册')

  const samples: SmokeSampleResult[] = []

  for (const { name, file, path } of files) {
    log(`\n=== ${name} ===`)
    try {
      const metrics = instrument(file)
      log(`[A] 文件 ${(file.size / 1048576).toFixed(2)} MiB，开始统计 File.slice`)

      const errors: string[] = []
      const view = createView() as FoliateView
      view.style.display = 'block'
      view.style.width = '700px'
      view.style.height = '500px'
      let loads = 0
      view.addEventListener('load', () => { loads++ })
      view.addEventListener('error', (event: Event) => errors.push(`view error: ${String((event as CustomEvent).detail)}`))
      smokeHost().replaceChildren(view)

      const t0 = performance.now()
      await view.open(file)
      const bytesAfterOpen = metrics.bytes
      const msAfterOpen = Math.round(performance.now() - t0)
      // open() 不渲染：必须 init()（或 goTo()/next()）
      await view.init({ showTextStart: true })
      await waitFor(() => loads > 0, '首节 load 事件')
      const bytesAfterFirstRender = metrics.bytes
      const firstSection = sectionInfo(view)

      await view.next()
      await sleep(150)
      await view.next()
      await sleep(150)
      // goTo 只接受 number / {fraction} / CFI / href；传 { index, anchor } 会抛错（那是 renderer 层签名）
      const midIndex = (view.book?.sections?.length ?? 1) > 1 ? 1 : 0
      await view.goTo(midIndex)
      await waitFor(() => view.renderer.getContents().length > 0, 'goTo 后 contents')
      await sleep(400)
      const midSection = sectionInfo(view)
      const bytesAfterNavigation = metrics.bytes

      const randomAccess = {
        sliceBytes: metrics.bytes,
        slicePercent: +((metrics.bytes / file.size) * 100).toFixed(2),
        sliceCalls: metrics.calls,
        maxSliceBytes: metrics.maxSlice,
        firstSlices: metrics.firstSlices,
        streamCalls: metrics.streamCalls,
        arrayBufferCalls: metrics.arrayBufferCalls,
        bytesAfterOpen,
        bytesAfterFirstRender,
        bytesAfterNavigation,
        largeSliceCount: metrics.largeSliceCount,
        largeSliceBytes: metrics.largeSliceBytes,
      }
      log(`[A] open() 阶段 ${bytesAfterOpen} B（${((bytesAfterOpen / file.size) * 100).toFixed(2)}%）→ 首节渲染 ${bytesAfterFirstRender} B → 导航后 ${bytesAfterNavigation} B（${randomAccess.slicePercent}%）`)
      log(`[A] 大块读取（>64 KiB，内容资源）${metrics.largeSliceCount} 次 / ${metrics.largeSliceBytes} B；stream=${metrics.streamCalls}，arrayBuffer=${metrics.arrayBufferCalls}`)
      log(`[B] 首节 textLen=${firstSection.textLen} blob=${firstSection.isBlobUrl}；中段 textLen=${midSection.textLen} p=${midSection.elements?.p} img=${midSection.elements?.img} CJK=${midSection.containsCJK}`)

      samples.push({
        name,
        path: path ?? null,
        fileSize: file.size,
        randomAccess,
        openMs: msAfterOpen,
        book: {
          title: view.book?.metadata?.title ?? null,
          sections: view.book?.sections?.length ?? null,
          toc: view.book?.toc?.length ?? null,
        },
        firstSection,
        midSection,
        relocateCount: 0,
        lastRelocate: view.lastLocation ?? null,
        errors,
      })
      // 先 close()（renderer.destroy() 会 unobserve），再移除；否则 ResizeObserver 会在 iframe 消失后继续回调
      view.close()
      await sleep(100)
      view.remove()
    } catch (error) {
      log(`[!] ${name} 失败：${String(error)}`)
      runtimeErrors.push(`${name}: ${String(error)}`)
    }
  }

  return {
    phase: 'tauri-smoke',
    ranAt: new Date().toISOString(),
    context,
    samples,
    fatal: runtimeErrors.length ? runtimeErrors.join('\n') : undefined,
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Tauri 路径：样本清单来自 Rust 侧环境变量 PITAKI_SMOKE_SAMPLES（逗号分隔的绝对路径），
 * 字节经 tauri::ipc::Response 传回（原始 ArrayBuffer，不走 JSON 数组）。
 * 注意：这里拿到的是内存 Blob（不是磁盘句柄），所以它证明的是「引擎不会重复整读」；
 * 真正的磁盘随机访问由浏览器侧（<input type=file>）与 Step 3 的 assetUrl+HttpRangeReader 保证。
 */
export async function loadTauriSamples(): Promise<SmokeInput[]> {
  const { invoke } = await import('@tauri-apps/api/core')
  const env = await invoke<Record<string, string>>('smoke_env')
  const paths = (env['PITAKI_SMOKE_SAMPLES'] ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const inputs: SmokeInput[] = []
  for (const path of paths) {
    const name = path.split('/').pop() ?? path
    const buffer = await invoke<ArrayBuffer>('smoke_read_book', { path })
    inputs.push({ name, file: new File([buffer], name, { type: 'application/epub+zip' }), path })
  }
  return inputs
}

/** Tauri 路径：把报告落盘（写路径只由 Rust 侧 env 决定，前端只能传内容） */
export async function writeSmokeReport(report: SmokeReport): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('smoke_write_result', { content: JSON.stringify(report, null, 2) })
}
