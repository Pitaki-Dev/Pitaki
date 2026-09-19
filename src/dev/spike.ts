/**
 * ⚠️ 临时脚本 —— Step 1 验收用（在 Tauri 窗口内复跑 Step 0 的 A/B）。
 * Step 3 落地 L2 适配层（src/lib/reader/foliate/adapter.ts）后删除本文件与 App 里的调用。
 *
 * A：统计 zip.js 经 File.slice 实际读取的字节数（覆盖实例上的 slice，不用 Proxy）。
 * B：EPUB 渲染进 blob: iframe，正文可见、可翻页、可 relocate，且无 CSP 违规。
 */
import { invoke } from '@tauri-apps/api/core'
import { createView, loadEngine } from '../lib/vendor'

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

export interface SpikeContext {
  origin: string
  userAgent: string
  isSecureContext: boolean
  cryptoSubtle: boolean
  cspViolations: string[]
}

export interface SpikeSampleResult {
  name: string
  path: string
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

export interface SpikeReport {
  phase: 'step1-tauri-ab'
  ranAt: string
  context: SpikeContext
  samples: SpikeSampleResult[]
  fatal?: string | undefined
}

const cspViolations: string[] = []
const runtimeErrors: string[] = []
let capturing = false

function startCapturing() {
  if (capturing) return
  capturing = true
  document.addEventListener('securitypolicyviolation', e => {
    cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI} (${e.sourceFile}:${e.lineNumber})`)
  })
  window.addEventListener('error', e => runtimeErrors.push(`error: ${e.message}`))
  window.addEventListener('unhandledrejection', e => runtimeErrors.push(`unhandledrejection: ${String(e.reason)}`))
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    runtimeErrors.push(`console.error: ${args.map(a => String(a)).join(' ')}`)
    original(...args)
  }
}

function instrument(file: File): SliceMetrics {
  const m: SliceMetrics = {
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
    m.calls++
    m.bytes += blob.size
    m.maxSlice = Math.max(m.maxSlice, blob.size)
    // >64 KiB 的读取基本都是内容资源（图片/字体），与「容器索引」的随机访问分开统计
    if (blob.size > 65_536) { m.largeSliceCount++; m.largeSliceBytes += blob.size }
    if (m.firstSlices.length < 8) m.firstSlices.push([args[0] ?? null, args[1] ?? null, blob.size])
    return blob
  }
  const originalStream = file.stream?.bind(file)
  if (originalStream) file.stream = (...args: []) => { m.streamCalls++; return originalStream(...args) }
  const originalArrayBuffer = file.arrayBuffer.bind(file)
  file.arrayBuffer = (...args: []) => { m.arrayBufferCalls++; return originalArrayBuffer(...args) }
  return m
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
      ? {
          p: doc.querySelectorAll('p').length,
          img: doc.querySelectorAll('img').length,
          h1: doc.querySelectorAll('h1').length,
        }
      : null,
  }
}

export async function runSpike(log: (message: string) => void): Promise<SpikeReport> {
  startCapturing()
  const env = await invoke<Record<string, string>>('spike_env')
  const paths = (env['PITAKI_SPIKE_SAMPLES'] ?? '').split(',').map(s => s.trim()).filter(Boolean)

  const context: SpikeContext = {
    origin: location.origin,
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    cryptoSubtle: typeof crypto?.subtle?.digest === 'function',
    cspViolations,
  }

  log(`[env] origin=${context.origin} secureContext=${context.isSecureContext} crypto.subtle=${context.cryptoSubtle}`)
  log(`[env] userAgent=${context.userAgent}`)
  log('[engine] 注入 <script type="module" src="/foliate/view.js"> …')
  await loadEngine()
  log('[engine] foliate-view 已注册')

  const samples: SpikeSampleResult[] = []

  for (const path of paths) {
    const name = path.split('/').pop() ?? path
    log(`\n=== ${name} ===`)
    try {
      const buffer = await invoke<ArrayBuffer>('read_book', { path })
      const file = new File([buffer], name, { type: 'application/epub+zip' })
      const metrics = instrument(file)
      log(`[A] 文件 ${(file.size / 1048576).toFixed(2)} MiB，开始统计 File.slice`)

      const errors: string[] = []
      const view = createView() as FoliateView
      view.style.display = 'block'
      view.style.width = '700px'
      view.style.height = '500px'
      let loads = 0
      view.addEventListener('load', () => { loads++ })
      view.addEventListener('error', (e: Event) => errors.push(`view error: ${String((e as CustomEvent).detail)}`))
      document.getElementById('spike-reader')!.replaceChildren(view)

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
      log(`[A] 其中大块读取（>64 KiB，内容资源）${metrics.largeSliceCount} 次 / ${metrics.largeSliceBytes} B；stream=${metrics.streamCalls}，arrayBuffer=${metrics.arrayBufferCalls}`)
      log(`[B] 首节 textLen=${firstSection.textLen} blob=${firstSection.isBlobUrl}；中段 textLen=${midSection.textLen} p=${midSection.elements?.p} img=${midSection.elements?.img} CJK=${midSection.containsCJK}`)

      samples.push({
        name,
        path,
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

  const report: SpikeReport = {
    phase: 'step1-tauri-ab',
    ranAt: new Date().toISOString(),
    context: { ...context, cspViolations, },
    samples,
    fatal: runtimeErrors.length ? runtimeErrors.join('\n') : undefined,
  }

  const out = await invoke<string>('write_spike_result', { content: JSON.stringify(report, null, 2) })
  log(`\n结果已写入：${out}`)
  return report
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
