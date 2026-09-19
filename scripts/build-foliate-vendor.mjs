#!/usr/bin/env node
/**
 * 生成 foliate-js 需要的 L0 vendor 产物（docs/ENGINE.md §3.2）。
 *
 * 产物位置：public/foliate/vendor/{zip.js,fflate.js}
 *   —— 必须与 public/foliate/view.js「同级」（view.js 用 `await import('./vendor/zip.js')`，相对自身解析，R11）。
 *   —— PDF（vendor/pdfjs/）推迟到 Phase 7，本脚本不处理。
 *
 * 体积断言（CI 用）—— **宽松兜底**，真正的保护是下面 assertEntryIsZipCore() 的入口守卫。
 * （打包器不同体积差很多：同一份 2.15.0 输入，rollup 出 ≈63 KB，esbuild 出 ≈96 KB，
 *   写死「≈36 KB」必然误报 —— 那是 2.8.x 的体积。见 docs/ENGINE.md §3.2。）
 *
 * 上限取 112 KiB：能拦下包根入口（≈122 KB）与 WASM 变体，同时给 esbuild 留余量。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { minify } from 'terser'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(root, 'public/foliate/vendor')

const ENTRIES = [
  { name: 'zip.js', entry: 'scripts/entries/zip.js', maxBytes: 112 * 1024, expected: 'rollup ≈63 KB（2.15.0）/ ≈36 KB（2.8.x）' },
  { name: 'fflate.js', entry: 'scripts/entries/fflate.js', maxBytes: 8 * 1024, expected: '≈3.9 KB' },
]

/** 防止有人把入口改回包根或裸规格符（R13）。只检查真实的 import/export 说明符。 */
function assertEntryIsZipCore(entryPath) {
  if (!entryPath.endsWith('entries/zip.js')) return
  const source = readFileSync(entryPath, 'utf8')
  // 剥掉注释，否则注释里举例的 '...' 也会被当成真实 import
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const specifiers = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1])
  if (!specifiers.length) throw new Error(`${entryPath} 里找不到任何 from '…' 模块说明符`)
  for (const specifier of specifiers) {
    if (!specifier.endsWith('/lib/zip-core.js')) {
      throw new Error(
        `${entryPath} 必须以「相对路径」import lib/zip-core.js（AGENTS.md R13），当前是 '${specifier}'：\n` +
        '  包根 → 完整构建（~122 KB）；裸规格符 → 被 exports 映射到 WASM 变体。',
      )
    }
  }
}

const minifyPlugin = {
  name: 'terser-minify',
  async renderChunk(code) {
    const result = await minify(code, { module: true })
    return { code: result.code ?? '', map: null }
  },
}

mkdirSync(OUT_DIR, { recursive: true })

let failed = false
for (const { name, entry, maxBytes, expected } of ENTRIES) {
  const entryPath = resolve(root, entry)
  assertEntryIsZipCore(entryPath)

  const bundle = await rollup({ input: entryPath, plugins: [nodeResolve()] })
  await bundle.write({ dir: OUT_DIR, format: 'esm', entryFileNames: name, plugins: [minifyPlugin] })
  await bundle.close()

  const outputPath = resolve(OUT_DIR, name)
  const { size } = statSync(outputPath)
  const sha256 = createHash('sha256').update(readFileSync(outputPath)).digest('hex')
  const verdict = size <= maxBytes ? 'OK' : 'FAIL'
  console.log(`${verdict}  ${name.padEnd(11)} ${String(size).padStart(7)} B  (expected ${expected}, 上限 ${maxBytes} B)`)
  console.log(`      sha256 ${sha256}`)
  if (size > maxBytes) failed = true
}

if (failed) {
  console.error('\nvendor 产物超出体积断言 —— 检查 scripts/entries/zip.js 是否被改回包根（R13）')
  process.exit(1)
}
console.log(`\n产物目录：public/foliate/vendor/`)
