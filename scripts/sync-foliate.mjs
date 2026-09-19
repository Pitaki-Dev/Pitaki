#!/usr/bin/env node
/**
 * 把引擎源码从 third_party/foliate-js（git submodule，锁 commit）同步到 public/foliate/。
 *
 * 用 **allowlist** 而不是 denylist：上游随时可能新增文件（README、CI 配置、demo…），
 * 白名单能保证非运行时文件永远不会混进产物。
 *
 * 允许内容（只有两类）：
 *   1. 根目录的 *.js —— 引擎全部运行时模块（view.js / epub.js / mobi.js / pdf.js …），
 *      但排除纯开发/演示文件（见 EXCLUDED_ROOT_FILES）
 *   2. LICENSE —— 上游 MIT 许可证，署名义务，必须随附
 * vendor/ 不在同步范围内：它由 scripts/build-foliate-vendor.mjs 独占生成（R11 要求它与 view.js 同级）。
 *
 * 为什么保留 pdf.js（≈7 KB）：PDF 虽推迟到 Phase 7，但 view.js 会 `await import('./pdf.js')` 分发 PDF，
 * 删掉会让 PDF 直接 404。Phase 7 再连同 vendor/pdfjs/ 一起处理。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'third_party/foliate-js')
const DST = resolve(root, 'public/foliate')

/** 根目录里不需要进产物的文件（开发/构建/演示用） */
const EXCLUDED_ROOT_FILES = new Set([
  'eslint.config.js', // ESLint 配置
  'rollup.config.js', // 上游打包配置（我们自己有 build-foliate-vendor.mjs）
  'reader.js', // 官方 demo 脚本（依赖 ui/）
  'package.json',
  'package-lock.json',
])

/** 必须存在的运行时文件，缺一个就说明上游结构变了 */
const REQUIRED = ['view.js', 'epub.js', 'mobi.js', 'fb2.js', 'comic-book.js', 'pdf.js', 'paginator.js', 'progress.js', 'LICENSE']

if (!existsSync(join(SRC, 'view.js'))) {
  console.error(`找不到引擎源码：${SRC}/view.js`)
  console.error('请先执行：git submodule update --init --recursive')
  process.exit(1)
}

/** 计算 allowlist */
const entries = readdirSync(SRC, { withFileTypes: true })
const allow = []
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.js') && !EXCLUDED_ROOT_FILES.has(entry.name)) {
    allow.push(entry.name)
  } else if (entry.isFile() && entry.name === 'LICENSE') {
    allow.push(entry.name)
  }
}
allow.sort()

for (const name of REQUIRED) {
  if (!allow.includes(name)) {
    console.error(`allowlist 缺少必需文件 ${name} —— 上游结构可能变了，请检查本脚本`)
    process.exit(1)
  }
}

// 只清引擎文件，保留 vendor/（由 build:vendor 生成，误删会让 view.js 的 ./vendor/zip.js 404）
mkdirSync(DST, { recursive: true })
for (const entry of readdirSync(DST)) {
  if (entry !== 'vendor') rmSync(join(DST, entry), { recursive: true, force: true })
}
let bytes = 0
for (const name of allow) {
  copyFileSync(join(SRC, name), join(DST, name))
  bytes += statSync(join(DST, name)).size
}

// R11 断言：view.js 必须以相对路径加载 vendor，且 vendor 与它同级
if (!readFileSync(join(DST, 'view.js'), 'utf8').includes("await import('./vendor/zip.js')")) {
  console.error("public/foliate/view.js 里找不到 `await import('./vendor/zip.js')` —— 上游结构可能变了，请检查 R11")
  process.exit(1)
}

// 不允许出现 allowlist 之外的文件（vendor/ 除外）
const unexpected = readdirSync(DST).filter(name => name !== 'vendor' && !allow.includes(name))
if (unexpected.length) {
  console.error(`public/foliate 出现未授权文件：${unexpected.join(', ')}`)
  process.exit(1)
}

const excluded = entries
  .filter(entry => entry.name !== 'vendor' && !allow.includes(entry.name))
  .map(entry => (entry.isDirectory() ? `${entry.name}/` : entry.name))
console.log(`同步完成：${allow.length} 个文件 → public/foliate（${bytes} B，${(bytes / 1024).toFixed(0)} KiB）`)
console.log(`  已排除：${[...new Set(excluded)].join(' / ')}`)
console.log('  vendor/ 产物由 pnpm build:vendor 生成')
