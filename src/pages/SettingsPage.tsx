import { Button, Chip, Separator } from '@heroui/react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useUiStore, type FlowPreference } from '../stores/ui'

const THEMES = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const

const FLOWS: { value: FlowPreference; label: string }[] = [
  { value: null, label: '自动（窄屏滚动 / 宽屏分页）' },
  { value: 'paginated', label: '分页' },
  { value: 'scrolled', label: '滚动' },
]

interface SettingsPageProps {
  theme: string
  resolvedTheme: string | undefined
  setTheme: (theme: string) => void
}

export function SettingsPage({ theme, resolvedTheme, setTheme }: SettingsPageProps) {
  const { flowPreference, setFlowPreference } = useUiStore()

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5">
      <h1 className="text-lg font-semibold">设置</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        外壳主题与书页主题是两套机制：这里只控制外壳（HeroUI），书页样式走
        <code className="mx-1">renderer.setStyles()</code>（见 docs/THEMING.md）。
      </p>

      <h2 className="mt-6 text-sm font-medium">外观</h2>
      <Separator className="my-2" />
      {/* 触摸目标 ≥44px：size="lg" + pitaki-touch；触摸设备 48px */}
      <div className="flex flex-wrap gap-2">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            size="lg"
            variant={theme === value ? 'primary' : 'ghost'}
            className="pitaki-touch pointer-coarse:min-h-12"
            aria-pressed={theme === value}
            onPress={() => setTheme(value)}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        当前生效：<Chip size="sm">{resolvedTheme ?? '未知'}</Chip>
      </p>

      <h2 className="mt-6 text-sm font-medium">默认阅读模式</h2>
      <Separator className="my-2" />
      <div className="flex flex-wrap gap-2">
        {FLOWS.map(({ value, label }) => (
          <Button
            key={label}
            size="lg"
            variant={flowPreference === value ? 'primary' : 'ghost'}
            className="pitaki-touch pointer-coarse:min-h-12"
            aria-pressed={flowPreference === value}
            onPress={() => setFlowPreference(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        窄屏默认滚动、宽屏默认分页（docs/UI.md §6）。分页模式的翻页手势由引擎提供。
      </p>

      <h2 className="mt-6 text-sm font-medium">输入方式</h2>
      <Separator className="my-2" />
      <p className="text-sm">
        {/* pointer-coarse 变体只在触摸设备显示，不用 UA 嗅探 */}
        <span className="hidden rounded bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent-soft-foreground)] pointer-coarse:inline">
          检测到粗略指针（触摸）
        </span>
        <span className="rounded bg-[var(--surface-secondary)] px-2 py-1 text-xs pointer-coarse:hidden">
          检测到精细指针（鼠标 / 触控板）
        </span>
      </p>

      <h2 className="mt-6 text-sm font-medium">尚未实现（规划中）</h2>
      <Separator className="my-2" />
      <ul className="list-disc pl-5 text-sm text-[var(--muted)]">
        <li>PDF（推迟到 Phase 7）</li>
        <li>书签 / 高亮 / 笔记、全文搜索、云同步、OPDS、TTS</li>
        <li>纯文本（TXT）导入（Phase 6）</li>
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">
        明确不支持：DRM 保护的书籍、CBR（RAR）、混合版式。
      </p>
    </section>
  )
}
