import { useState, type ReactNode } from 'react'
import { Button, Drawer, useMediaQuery, useOverlayState } from '@heroui/react'
import { BookOpen, Library, Menu, Settings } from 'lucide-react'
import { hrefOf, type Route } from '../lib/router'

const NAV: { route: Route; label: string; icon: typeof Library }[] = [
  { route: 'library', label: '书库', icon: Library },
  { route: 'reader', label: '阅读器', icon: BookOpen },
  { route: 'settings', label: '设置', icon: Settings },
]

/**
 * 外壳布局（docs/UI.md §4）。
 * - ≥lg：侧栏常驻
 * - <lg：顶栏 + 覆盖式抽屉（抽屉是 HeroUI Drawer，Esc/点遮罩可关）
 * 只用 CSS 断点切换两种布局，不做 UA 嗅探。
 */
export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const drawer = useOverlayState()
  // 抽屉在桌面断点下直接卸载，避免隐藏但仍可聚焦
  const [drawerMounted, setDrawerMounted] = useState(false)

  return (
    <div className="flex min-h-dvh bg-[var(--shell-canvas)] text-[var(--foreground)]">
      {/* 桌面侧栏 */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:gap-1 lg:border-r lg:border-[var(--border)] lg:bg-[var(--shell-sidebar)] lg:p-3">
        <div className="px-2 py-3 text-lg font-semibold">Pitaki</div>
        <NavList route={route} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动/平板顶栏 */}
        <header className="shell-safe-area sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--shell-topbar)] px-2 py-1.5 backdrop-blur lg:hidden">
          <Button
            isIconOnly
            size="lg"
            variant="ghost"
            aria-label="打开导航"
            className="pitaki-touch"
            onPress={() => {
              setDrawerMounted(true)
              drawer.open()
            }}
          >
            <Menu aria-hidden />
          </Button>
          <span className="text-base font-semibold">Pitaki</span>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>

      {!isDesktop && drawerMounted ? (
        <Drawer state={drawer}>
          <Drawer.Backdrop>
            <Drawer.Content placement="left" className="w-64">
              <Drawer.Dialog aria-label="主导航">
                <Drawer.Header>
                  <Drawer.Heading>Pitaki</Drawer.Heading>
                  <Drawer.CloseTrigger />
                </Drawer.Header>
                <Drawer.Body>
                  <NavList route={route} onNavigate={() => drawer.close()} />
                </Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      ) : null}
    </div>
  )
}

function NavList({ route, onNavigate }: { route: Route; onNavigate?: () => void }) {
  return (
    <nav aria-label="主导航" className="flex flex-col gap-1">
      {NAV.map(({ route: target, label, icon: Icon }) => {
        const active = route === target
        return (
          <a
            key={target}
            href={hrefOf(target)}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            // 44px 触摸目标；触摸设备再放宽到 48px（pointer-coarse 变体，不用 UA 嗅探）
            className={[
              'pitaki-touch pointer-coarse:min-h-12',
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm no-underline',
              'transition-colors',
              active
                ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent-soft-foreground)]'
                : 'text-[var(--foreground)] hover:bg-[var(--surface-secondary)]',
            ].join(' ')}
          >
            <Icon size={18} aria-hidden />
            {label}
          </a>
        )
      })}
    </nav>
  )
}
