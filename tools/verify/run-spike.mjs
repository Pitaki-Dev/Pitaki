// Chromium 侧的 EPUB 回归（引擎冒烟）：驱动 /smoke.html，用真实 <input type=file> 灌样本，
// 校验「不整体载入内存」（A）与「blob iframe 渲染 + 跳转」（B）。
//
// 用途：CI / 本地回归；Tauri 窗口内的等价检查见 `pnpm tauri:smoke`（WebKit + 真 CSP）。
// 用法：pnpm dev（5173，需先 pnpm prepare:engine）→ PITAKI_SAMPLES_DIR=… pnpm verify:epub
import { launchBrowser } from './browser.mjs'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BASE = process.env.PITAKI_BASE_URL ?? 'http://localhost:5173'
const SAMPLES_DIR = process.env.PITAKI_SAMPLES_DIR ?? '/tmp/pitaki-samples'
const OUT_DIR = 'tools/verify/artifacts'

const samplePaths = readdirSync(SAMPLES_DIR)
  .filter(name => name.endsWith('.epub'))
  .sort()
  .map(name => join(SAMPLES_DIR, name))

if (!samplePaths.length) {
  console.error(`没有样本：${SAMPLES_DIR} 里没有 .epub。先跑 \`pnpm gen:sample\`，或设置 PITAKI_SAMPLES_DIR。`)
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })
const { browser, mode } = await launchBrowser()
if (mode !== 'default') console.log(`[browser] 回退到软件 GL（${mode}）`)
const page = await browser.newPage()
const consoleErrors = []
page.on('pageerror', error => consoleErrors.push(String(error)))
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })

await page.goto(`${BASE}/smoke.html`, { waitUntil: 'load' })
await page.waitForFunction(() => !!window.__smoke, null, { timeout: 15_000 })

const results = []
for (const path of samplePaths) {
  const name = path.split('/').pop()
  console.log(`\n=== ${name} ===`)
  await page.setInputFiles('#smoke-file', path)
  await page.waitForFunction(() => window.__smoke?.done === true, null, { timeout: 120_000 })
  const report = await page.evaluate(() => window.__smoke?.report ?? null)
  const error = await page.evaluate(() => window.__smoke?.error ?? null)
  if (!report || error) {
    results.push({ name, ok: false, reason: error ?? '无报告' })
    console.log(`❌ ${name}: ${error ?? '无报告'}`)
  } else {
    const sample = report.samples[0]
    const sizeMiB = sample.fileSize / 1048576
    const openPercent = sample.randomAccess.bytesAfterOpen / sample.fileSize
    const rendered = sample.midSection.textLen > 0
    const noWholeFileRead = sample.randomAccess.streamCalls === 0 && sample.randomAccess.arrayBufferCalls === 0
    // 判据：open() 阶段 < 10% 文件大小（>10 MiB 的样本必须满足）；渲染出文字；没有整读迹象
    const ok = rendered && noWholeFileRead && (sizeMiB <= 10 || openPercent < 0.1)
    console.log(
      `${ok ? '✅' : '❌'} ${name} ${sizeMiB.toFixed(2)} MiB | open=${sample.randomAccess.bytesAfterOpen} B (${(openPercent * 100).toFixed(2)}%)` +
      ` | total=${sample.randomAccess.sliceBytes} B (${sample.randomAccess.slicePercent}%)` +
      ` | stream=${sample.randomAccess.streamCalls} arrayBuffer=${sample.randomAccess.arrayBufferCalls}` +
      ` | midText=${sample.midSection.textLen} blob=${sample.midSection.isBlobUrl} CJK=${sample.midSection.containsCJK}`,
    )
    results.push({ name, ok, sizeMiB, randomAccess: sample.randomAccess, midSection: sample.midSection, book: sample.book })
  }
  // 复位，准备下一个样本
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__smoke, null, { timeout: 15_000 })
}

const payload = { base: BASE, samplesDir: SAMPLES_DIR, results, consoleErrors }
writeFileSync(resolve(OUT_DIR, 'epub-report.json'), JSON.stringify(payload, null, 2))
await browser.close()

const failed = results.filter(result => !result.ok)
console.log(`\n共 ${results.length} 个样本，失败 ${failed.length}；console error ${consoleErrors.length}`)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 3).join('\n'))
process.exit(failed.length || consoleErrors.length ? 1 : 0)
