import { useCallback, useState } from 'react'
import { Button, Chip, useMediaQuery } from '@heroui/react'
import { ChevronLeft, ChevronRight, List, Settings2, Type } from 'lucide-react'
import { resolveFlow, useUiStore } from '../stores/ui'

/**
 * 阅读器外壳（Step 2 只有外壳与占位画布，引擎接入在 Step 3）。
 *
 * ⚠️ 这里**不实现**滑动翻页：引擎 paginator 已内置跟手 + 惯性吸附（R16，docs/UI.md §1）。
 * 顶/底栏一律用「点按画布切换显隐」，不依赖 hover（触摸设备没有 hover）。
 */
export function ReaderPage() {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const { flowPreference, setFlowPreference } = useUiStore()
  const flow = resolveFlow(flowPreference, isWide)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [spikeLines, setSpikeLines] = useState<string[]>([])

  const runSpike = useCallback(async () => {
    setSpikeLines(['运行中…'])
    // 整个 if 块在 prod 构建里会被 `import.meta.env.DEV → false` 折叠掉
    if (import.meta.env.DEV) {
      const { runSpike: run } = await import('../dev/spike')
      await run(message => setSpikeLines(previous => [...previous, message]))
    }
  }, [])

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      {/* 顶栏：点按画布切换显隐（tap-to-toggle），不靠 hover */}
      {chromeVisible ? (
        <header className="shell-safe-area flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
          <Button isIconOnly size="lg" variant="ghost" className="touch-target" aria-label="目录">
            <List aria-hidden />
          </Button>
          <span className="truncate text-sm text-[var(--muted)]">未打开书籍</span>
          <Button isIconOnly size="lg" variant="ghost" className="touch-target" aria-label="排版设置">
            <Type aria-hidden />
          </Button>
        </header>
      ) : null}

      {/* 书页画布占位。Step 3 会在这里挂 <foliate-view>，届时才设 touch-action / overscroll-behavior */}
      <div
        role="presentation"
        onClick={() => setChromeVisible((visible) => !visible)}
        className="flex min-h-0 flex-1 items-center justify-center bg-[var(--reader-paper)] p-4"
      >
        <div className="max-w-md text-center">
          <p className="text-sm text-[var(--reader-ink)]">
            书页画布（占位）—— Step 3 在此挂载 <code>foliate-view</code>
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            点按画布可切换顶/底栏显隐；滑动翻页由引擎自带，外壳不接管
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            flow 默认：{isWide ? '宽屏' : '窄屏'} → <strong>{flow}</strong>
          </p>
        </div>
      </div>

      {chromeVisible ? (
        <footer className="shell-safe-area flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
          <Button
            isIconOnly
            size="lg"
            variant="ghost"
            className="touch-target"
            aria-label="上一页"
            isDisabled
          >
            <ChevronLeft aria-hidden />
          </Button>
          <div className="flex items-center gap-2">
            <Chip size="sm">1 / 1</Chip>
            <Button
              size="lg"
              variant="ghost"
              className="touch-target"
              onPress={() => setFlowPreference(flow === 'paginated' ? 'scrolled' : 'paginated')}
            >
              <Settings2 size={18} aria-hidden />
              {flow === 'paginated' ? '分页' : '滚动'}
            </Button>
          </div>
          <Button
            isIconOnly
            size="lg"
            variant="ghost"
            className="touch-target"
            aria-label="下一页"
            isDisabled
          >
            <ChevronRight aria-hidden />
          </Button>
        </footer>
      ) : null}

      {import.meta.env.DEV ? (
        <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] p-2">
          <Button size="lg" variant="ghost" className="touch-target" onPress={() => void runSpike()}>
            复跑 Step 0/1 的 A/B 验证（dev）
          </Button>
          {spikeLines.length ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-[var(--surface-tertiary)] p-2 text-xs whitespace-pre-wrap">
              {spikeLines.join('\n')}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
