#!/usr/bin/env node
/**
 * 把引擎源码从 third_party/foliate-js（git submodule，锁 commit）同步到 public/foliate/（docs/ENGINE.md §3.4 方案 A）。
 *
 * 同步规则：
 *   - 整体拷贝，保留上游目录结构（R11：不能打散，view.js 依赖相对路径）
 *   - 排除 .git / node_modules / rollup（构建脚本）/ tests / vendor
 *     （vendor/ 由 scripts/build-foliate-vendor.mjs 独占生成，避免上游预构建产物混入）
 *   - PDF（vendor/pdfjs/）推迟到 Phase 7，不拷贝
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'third_party/foliate-js')
const DST = resolve(root, 'public/foliate')
const EXCLUDE = new Set(['.git', 'node_modules', 'rollup', 'tests', 'vendor'])

if (!existsSync(join(SRC, 'view.js'))) {
  console.error(`找不到引擎源码：${SRC}/view.js`)
  console.error('请先执行：git submodule update --init --recursive')
  process.exit(1)
}

// 只清掉引擎文件，保留 vendor/ —— 它由 build:vendor 生成，误删会让 public/foliate/view.js 404
mkdirSync(DST, { recursive: true })
if (existsSync(DST)) {
  for (const entry of readdirSync(DST)) {
    if (entry !== 'vendor') rmSync(join(DST, entry), { recursive: true, force: true })
  }
}
cpSync(SRC, DST, {
  recursive: true,
  dereference: false,
  filter: (source) => {
    const relative = source.slice(SRC.length + 1)
    if (!relative) return true
    const first = relative.split('/')[0]
    return !EXCLUDE.has(first)
  },
})

// R11：view.js 必须以相对路径加载 vendor，且 vendor 与它同级
const viewSource = readFileSync(join(DST, 'view.js'), 'utf8')
if (!viewSource.includes("await import('./vendor/zip.js')")) {
  console.error("public/foliate/view.js 里找不到 `await import('./vendor/zip.js')` —— 上游结构可能变了，请检查 R11")
  process.exit(1)
}

function directorySize(directory) {
  let total = 0
  const stack = [directory]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current)) {
      const path = join(current, entry)
      const stats = statSync(path)
      if (stats.isDirectory()) stack.push(path)
      else total += stats.size
    }
  }
  return total
}

const size = directorySize(DST)
console.log(`同步完成：third_party/foliate-js → public/foliate（${(size / 1024).toFixed(0)} KiB，已排除 ${[...EXCLUDE].join(' / ')}）`)
console.log('vendor/ 产物由 pnpm build:vendor 生成')
