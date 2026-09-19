import { useEffect, useRef } from 'react'
import { useTheme } from '@heroui/react'
import { AppShell } from './components/AppShell'
import { useRoute } from './lib/router'
import { LibraryPage } from './pages/LibraryPage'
import { ReaderPage } from './pages/ReaderPage'
import { SettingsPage } from './pages/SettingsPage'

const TITLES = { library: '书库', reader: '阅读器', settings: '设置' } as const

export default function App() {
  const route = useRoute()
  // HeroUI v3 的 useTheme：写 <html> 的 class + data-theme，跟随系统，无需 Provider
  const { theme, resolvedTheme, setTheme } = useTheme()

  const spikeStarted = useRef(false)

  useEffect(() => {
    document.title = `${TITLES[route]} · Pitaki`
  }, [route])

  // dev + Tauri 下自动复跑 Step 0/1 的 A/B（样本清单由 Rust 侧 PITAKI_SPIKE_SAMPLES 提供）。
  // 放在 App 而不是阅读器页：无头跑时不依赖当前路由。Step 3 落地 L2 适配层后连同 src/dev/ 一起删。
  useEffect(() => {
    if (!import.meta.env.DEV || spikeStarted.current) return
    spikeStarted.current = true
    void (async () => {
      const { isTauri, runSpike } = await import('./dev/spike')
      if (isTauri()) await runSpike(() => {})
    })()
  }, [])

  return (
    <AppShell route={route}>
      {route === 'library' ? <LibraryPage /> : null}
      {route === 'reader' ? <ReaderPage /> : null}
      {route === 'settings' ? (
        <SettingsPage theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} />
      ) : null}
    </AppShell>
  )
}
