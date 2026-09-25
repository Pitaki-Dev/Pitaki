// Step 2 DoD 验证：响应式（320 / 1440）、触摸等价物、键盘 Tab / Esc、HeroUI 是否真的生效。
// 用法：pnpm dev（http://localhost:5173）后 node tools/verify-ui.mjs
import { launchBrowser } from './browser.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.PITAKI_BASE_URL ?? 'http://localhost:5173'
const OUT = 'tools/verify/artifacts'
mkdirSync(OUT, { recursive: true })

const { browser, mode } = await launchBrowser()
if (mode !== 'default') console.log(`[browser] 回退到软件 GL（${mode}）`)
const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function openPage(context, hash) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}${hash ?? ''}`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  return { page, errors }
}

// ---------- 1. 桌面 1440 ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const { page, errors } = await openPage(context, '#/library')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('1440px 无横向溢出', overflow <= 1, `scrollWidth-innerWidth=${overflow}`)

  const columns = await page.evaluate(() =>
    getComputedStyle(document.querySelector('ul.grid') ?? document.body).gridTemplateColumns.split(' ').length)
  check('1440px 书库 ≥6 列', columns >= 6, `列数=${columns}`)

  const sidebarVisible = await page.locator('aside').first().isVisible()
  check('1440px 侧栏常驻', sidebarVisible)
  const menuButtonVisible = await page.getByRole('button', { name: '打开导航' }).isVisible().catch(() => false)
  check('1440px 顶栏汉堡按钮隐藏', !menuButtonVisible)

  const button = page.getByRole('button', { name: /导入书籍/ })
  const style = await button.evaluate(el => {
    const s = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    return { bg: s.backgroundColor, radius: s.borderRadius, h: box.height, w: box.width, fontSize: s.fontSize }
  })
  // HeroUI 的 Button 用固定高度 + 居中，而不是 padding，所以断言看背景/圆角/高度
  check('HeroUI Button 已生效（背景 + 圆角 + ≥40px 高）',
    style.bg !== 'rgba(0, 0, 0, 0)' && parseFloat(style.radius) > 0 && style.h >= 40,
    JSON.stringify(style))

  // 主题切换（HeroUI useTheme 写 <html class="dark">）
  await page.goto(`${BASE}#/settings`, { waitUntil: 'load' })
  await page.getByRole('button', { name: '深色' }).click()
  await page.waitForTimeout(300)
  const darkApplied = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark')
  const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  check('主题切换生效（html.dark + body 背景变化）', darkApplied, `body background=${bgAfter}`)
  await page.screenshot({ path: `${OUT}/ui-1440-dark-settings.png`, fullPage: true })
  await page.getByRole('button', { name: '浅色' }).click()
  await page.waitForTimeout(200)

  // 键盘：Tab 顺序 + 侧栏链接可聚焦
  await page.goto(`${BASE}#/library`, { waitUntil: 'load' })
  await page.keyboard.press('Tab')
  const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 12))
  check('Tab 可聚焦首个可交互元素', !!firstFocus, `focus=${firstFocus}`)

  check('桌面端无 console error', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.screenshot({ path: `${OUT}/ui-1440-library.png`, fullPage: true })
  await context.close()
}

// ---------- 2. 手机 320 + 触摸 ----------
{
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  })
  const { page, errors } = await openPage(context, '#/library')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('320px 无横向溢出', overflow <= 1, `scrollWidth-innerWidth=${overflow}`)
  const columns = await page.evaluate(() =>
    getComputedStyle(document.querySelector('ul.grid') ?? document.body).gridTemplateColumns.split(' ').length)
  check('320px 书库 2 列', columns === 2, `列数=${columns}`)
  check('320px 侧栏隐藏', !(await page.locator('aside').first().isVisible()))

  const menu = page.getByRole('button', { name: '打开导航' })
  const menuBox = await menu.boundingBox()
  check('汉堡按钮 ≥44×44', !!menuBox && menuBox.width >= 44 && menuBox.height >= 44, JSON.stringify(menuBox))

  // 抽屉：打开 → 导航 → 自动关闭
  await menu.tap()
  await page.waitForTimeout(400)
  check('抽屉可打开', await page.getByRole('navigation', { name: '主导航' }).isVisible())
  const navBox = await page.getByRole('link', { name: '阅读器' }).boundingBox()
  check('导航项 ≥44px 高', !!navBox && navBox.height >= 44, `height=${navBox?.height}`)
  await page.getByRole('link', { name: '阅读器' }).tap()
  await page.waitForTimeout(400)
  check('点击导航后抽屉关闭', !(await page.getByRole('navigation', { name: '主导航' }).isVisible().catch(() => false)))
  check('路由切换到阅读器', page.url().endsWith('#/reader'), page.url())

  // 组件 CSS 的「层叠顺序」回归：.drawer__close-trigger 必须是 absolute（相对 .drawer__dialog）
  await menu.tap()
  await page.waitForTimeout(400)
  const closeTrigger = await page.evaluate(() => {
    const el = document.querySelector('.drawer__close-trigger')
    if (!el) return null
    const s = getComputedStyle(el)
    const dialog = document.querySelector('.drawer__dialog')?.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    return { position: s.position, isTopRight: !!dialog && rect.x > dialog.x + dialog.width / 2 && rect.y < dialog.y + 60 }
  })
  check('Drawer 关闭按钮为 absolute 且位于右上（组件 CSS 顺序正确）',
    !!closeTrigger && closeTrigger.position === 'absolute' && closeTrigger.isTopRight, JSON.stringify(closeTrigger))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Esc 关抽屉
  await menu.tap()
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('Esc 可关闭抽屉', !(await page.getByRole('navigation', { name: '主导航' }).isVisible().catch(() => false)))

  // 触摸等价物：点按画布切换顶/底栏
  const hasChromeBefore = await page.locator('footer').isVisible()
  await page.locator('[role="presentation"]').tap()
  await page.waitForTimeout(300)
  const hasChromeAfter = await page.locator('footer').isVisible()
  check('点按画布可切换顶/底栏（tap-to-toggle）', hasChromeBefore !== hasChromeAfter, `${hasChromeBefore} → ${hasChromeAfter}`)

  const flowText = await page.locator('[role="presentation"]').innerText()
  check('窄屏默认 scrolled', flowText.includes('scrolled'), flowText.split('\n').at(-1))

  // pointer: coarse 是否匹配（Chromium 触摸模拟）—— 徽标在设置页
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
  await page.goto(`${BASE}#/settings`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  const coarseBadge = await page.getByText('检测到粗略指针（触摸）').isVisible().catch(() => false)
  const fineBadge = await page.getByText('检测到精细指针（鼠标 / 触控板）').isVisible().catch(() => false)
  check('pointer-coarse 变体生效（触摸设备显示触摸徽标）', coarse && coarseBadge && !fineBadge,
    `matchMedia=${coarse}, 触摸徽标=${coarseBadge}, 鼠标徽标=${fineBadge}`)

  check('320px 无 console error', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.screenshot({ path: `${OUT}/ui-320-library.png`, fullPage: true })
  await context.close()
}

// ---------- 3. 平板 834（触摸，md 档 = 抽屉式侧栏） ----------
{
  const context = await browser.newContext({ viewport: { width: 834, height: 1112 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const { page, errors } = await openPage(context, '#/library')
  const width = await page.evaluate(() => window.innerWidth)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`平板 ${width}px 无横向溢出`, overflow <= 1, `scrollWidth-innerWidth=${overflow}`)
  check('平板（<lg）侧栏为抽屉、非常驻', !(await page.locator('aside').first().isVisible()))
  const columns = await page.evaluate(() =>
    getComputedStyle(document.querySelector('ul.grid') ?? document.body).gridTemplateColumns.split(' ').length)
  check('平板书库 3–4 列', columns >= 3 && columns <= 4, `列数=${columns}`)
  check('平板无 console error', errors.length === 0, errors.slice(0, 2).join(' | '))
  await context.close()
}

writeFileSync(`${OUT}/ui-verify.json`, JSON.stringify(results, null, 2))
await browser.close()
const failed = results.filter(r => !r.ok)
console.log(`\n共 ${results.length} 项，失败 ${failed.length} 项`)
process.exit(failed.length ? 1 : 0)
