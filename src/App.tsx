import { useEffect } from 'react'
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

  useEffect(() => {
    document.title = `${TITLES[route]} · Pitaki`
  }, [route])

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
