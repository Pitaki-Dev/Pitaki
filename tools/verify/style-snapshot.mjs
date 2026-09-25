// Step 2 优化（CSS 按组件引入）的视觉回归：抓取 5 个组件的计算样式，light/dark 两套。
// 用法：pnpm dev（5173）→ node tools/style-snapshot.mjs <输出文件> [截图前缀]
import { launchBrowser } from './browser.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.PITAKI_BASE_URL ?? 'http://localhost:5173'
const outFile = process.argv[2] ?? 'tools/verify/artifacts/style-snapshot.json'
const shotPrefix = process.argv[3] ?? 'tools/verify/artifacts/shots'

const PROPS = [
  'display', 'position', 'backgroundColor', 'color', 'borderRadius', 'borderWidth', 'borderColor',
  'borderStyle', 'boxShadow', 'paddingTop', 'paddingLeft', 'fontSize', 'fontWeight', 'lineHeight',
  'gap', 'width', 'height', 'minHeight', 'minWidth', 'opacity', 'overflow', 'zIndex',
  'transitionProperty', 'transitionDuration', 'transitionTimingFunction', 'translate', 'backdropFilter',
]

const { browser, mode } = await launchBrowser()
if (mode !== 'default') console.log(`[browser] 回退到软件 GL（${mode}）`)
const snapshot = {}

async function readStyles(page, selector, label) {
  const data = await page.evaluate(({ selector, PROPS }) => {
    const el = document.querySelector(selector)
    if (!el) return { missing: true }
    const s = getComputedStyle(el)
    const styles = {}
    for (const p of PROPS) styles[p] = s[p]
    const rect = el.getBoundingClientRect()
    return { classes: el.className, rect: { w: Math.round(rect.width), h: Math.round(rect.height) }, styles }
  }, { selector, PROPS })
  snapshot[label] = data
}

async function setTheme(page, theme) {
  await page.goto(`${BASE}#/settings`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: theme === 'dark' ? '深色' : '浅色' }).click()
  await page.waitForTimeout(300)
}

for (const theme of ['light', 'dark']) {
  mkdirSync(shotPrefix, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await setTheme(page, theme)

  // —— 设置页：Button（primary / ghost）、Separator ——
  const buttons = page.locator('button[aria-pressed]')
  await readStyles(page, 'button[aria-pressed="true"]', `${theme}.buttonPrimary`)
  await readStyles(page, 'button[aria-pressed="false"]', `${theme}.buttonGhost`)
  await readStyles(page, '.separator', `${theme}.separator`)
  await page.screenshot({ path: `${shotPrefix}/${theme}-settings.png`, fullPage: true })

  // —— 书库页：Card ——
  await page.goto(`${BASE}#/library`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  await readStyles(page, '.card', `${theme}.card`)
  await page.screenshot({ path: `${shotPrefix}/${theme}-library.png`, fullPage: true })

  // —— 阅读器页：Chip ——
  await page.goto(`${BASE}#/reader`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  await readStyles(page, '.chip', `${theme}.chip`)
  await page.screenshot({ path: `${shotPrefix}/${theme}-reader.png`, fullPage: true })

  // —— 抽屉（320px）：backdrop / dialog / heading ——
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto(`${BASE}#/library`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: '打开导航' }).click()
  await page.waitForTimeout(1200)  // 等抽屉入场动画（250ms）+ 遮罩过渡完全结束
  await readStyles(page, '.drawer__backdrop', `${theme}.drawerBackdrop`)
  await readStyles(page, '.drawer__dialog', `${theme}.drawerDialog`)
  await readStyles(page, '.drawer__heading', `${theme}.drawerHeading`)
  await page.screenshot({ path: `${shotPrefix}/${theme}-drawer-320.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  await context.close()
}

writeFileSync(outFile, JSON.stringify(snapshot, null, 2))
await browser.close()

const missing = Object.entries(snapshot).filter(([, v]) => v.missing).map(([k]) => k)
console.log(`快照写入 ${outFile}（${Object.keys(snapshot).length} 项，缺失 ${missing.length}）`)
if (missing.length) console.log('缺失：', missing.join(', '))
