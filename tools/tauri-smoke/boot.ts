/**
 * 冒烟页入口（smoke.html）。
 *
 * - Tauri 窗口（`pnpm tauri:smoke` → devUrl 指向 /smoke.html）：样本由 Rust 侧 env 提供，自动跑完并落盘；
 * - 浏览器（Playwright，tools/verify/run-spike.mjs）：由 <input type=file> 提供样本
 *   —— 这样文件是**真实磁盘句柄**，slice 计数才有「不整体载入内存」的证明力。
 */
import { isTauri, loadTauriSamples, runSmoke, writeSmokeReport, type SmokeInput, type SmokeReport } from './harness'

const logEl = document.getElementById('smoke-log')
const log = (message: string) => {
  if (!logEl) return
  logEl.textContent += `${message}\n`
  logEl.scrollTop = logEl.scrollHeight
}

interface SmokeApi {
  run(files: SmokeInput[]): Promise<SmokeReport>
  report: SmokeReport | null
  done: boolean
  error: string | null
}

const api: SmokeApi = { run: runWithFiles, report: null, done: false, error: null }

async function runWithFiles(files: SmokeInput[]): Promise<SmokeReport> {
  try {
    const report = await runSmoke(files, log)
    api.report = report
    if (isTauri()) {
      const out = await writeSmokeReport(report)
      log(`\n结果已写入：${out}`)
    }
    api.done = true
    return report
  } catch (error) {
    api.error = String(error)
    api.done = true
    log(`fatal: ${String(error)}`)
    throw error
  }
}

declare global {
  interface Window { __smoke?: SmokeApi }
}
window.__smoke = api

if (isTauri()) {
  void (async () => {
    try {
      const files = await loadTauriSamples()
      if (!files.length) {
        log('未配置 PITAKI_SMOKE_SAMPLES，跳过（在 Tauri 里由 Rust env 提供样本路径）')
        return
      }
      await runWithFiles(files)
    } catch (error) {
      api.error = String(error)
      api.done = true
      log(`fatal: ${String(error)}`)
    }
  })()
} else {
  // 浏览器模式：等 Playwright 用 setInputFiles 灌入样本
  const input = document.getElementById('smoke-file')
  if (input instanceof HTMLInputElement) {
    input.addEventListener('change', () => {
      const files: SmokeInput[] = [...(input.files ?? [])].map(file => ({ name: file.name, file }))
      void runWithFiles(files)
    })
  }
  log('浏览器模式：等待 <input type=file> 提供样本（Playwright setInputFiles）')
}
