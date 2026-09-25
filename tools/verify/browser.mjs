/**
 * Playwright 启动器：让验证脚本在「受限容器」里也能跑。
 *
 * 背景：本仓库的开发容器里 GPU 进程会崩溃（`GPU process exited unexpectedly: exit_code=256`，
 * 伴随 /dev/shm 不可用），表现为 `chromium.launch()` 之后一开页就断开
 * （`Target page, context or browser has been closed`），有时干脆卡住不返回。
 * 因此这里带超时探测：默认参数先试，失败则退回软件 GL（ANGLE + SwiftShader）。
 * 正常的 CI runner / 桌面环境走默认分支，不会用到回退。
 */
import { chromium } from 'playwright'

const DEFAULT_ARGS = ['--no-sandbox', '--disable-dev-shm-usage']
const SOFTWARE_GL_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--disable-gpu-sandbox',
]

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时（${ms}ms）`)), ms)),
  ])
}

async function tryLaunch(args, timeoutMs) {
  const browser = await withTimeout(chromium.launch({ args }), timeoutMs, 'chromium.launch')
  try {
    const probe = await withTimeout(browser.newPage(), 10_000, 'newPage')
    await withTimeout(probe.goto('about:blank'), 10_000, 'goto(about:blank)')
    await probe.close()
    return browser
  } catch (error) {
    await browser.close().catch(() => {})
    throw error
  }
}

/**
 * 默认先试常规参数；受限容器里可设 PITAKI_PLAYWRIGHT_MODE=software-gl 直接走软件 GL
 * （某些环境下常规参数能启动但渲染进程随后崩溃，探测不出来 —— 显式指定更可靠）。
 */
export async function launchBrowser() {
  if (process.env.PITAKI_PLAYWRIGHT_MODE === 'software-gl') {
    return { browser: await tryLaunch(SOFTWARE_GL_ARGS, 60_000), mode: 'software-gl' }
  }
  try {
    return { browser: await tryLaunch(DEFAULT_ARGS, 20_000), mode: 'default' }
  } catch {
    return { browser: await tryLaunch(SOFTWARE_GL_ARGS, 60_000), mode: 'software-gl' }
  }
}
