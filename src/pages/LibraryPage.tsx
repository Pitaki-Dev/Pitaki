import { Button, Card } from '@heroui/react'
import { BookPlus } from 'lucide-react'

/** 占位书单 —— Step 3 起换成 SQLite 里的真实书库 */
const PLACEHOLDER = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  title: `示例书籍 ${index + 1}`,
  meta: index % 3 === 0 ? 'EPUB · 12.4 MiB' : index % 3 === 1 ? 'EPUB · 2.2 MiB' : 'MOBI · 3.1 MiB',
}))

export function LibraryPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">书库</h1>
          <p className="text-sm text-[var(--muted)]">本地优先：所有书籍都保存在本机</p>
        </div>
        {/* 44px 触摸目标；触摸设备 48px */}
        <Button variant="primary" className="touch-target pointer-coarse:min-h-12" isDisabled>
          <BookPlus size={18} aria-hidden />
          导入书籍（Step 3）
        </Button>
      </header>

      {/* 手机 2 列 → 平板 3–4 列 → 桌面 6 列（docs/UI.md §4.1） */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {PLACEHOLDER.map((book) => (
          <li key={book.id}>
            <Card className="h-full">
              <Card.Header>
                <Card.Title className="text-sm">{book.title}</Card.Title>
                <Card.Description className="text-xs">{book.meta}</Card.Description>
              </Card.Header>
              <Card.Content>
                <div
                  aria-hidden
                  className="aspect-2/3 w-full rounded-md bg-[var(--surface-tertiary)]"
                />
              </Card.Content>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-[var(--muted)]">
        提示：Step 3 会用 foliate-js 打开真实 EPUB；本页仅验证布局在 320px–1440px 下不破。
      </p>
    </section>
  )
}
