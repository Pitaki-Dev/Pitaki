// R13：必须用「相对路径」指向 lib/zip-core.js。
//   - 包根 '@zip.js/zip.js'        → 完整构建（含 writer / zip-fs / 全部编解码器），体积 ~3 倍
//   - 裸规格符 '@zip.js/zip.js/lib/zip-core.js' → 被 package.json exports 映射到 zip-core-wasm.js（WASM 变体）
//   - 相对路径                      → 只 export * from './zip-core-base.js'，体积最小
// HttpRangeReader：Tauri 侧靠它 + asset 协议的 Range 支持实现「不整读」（R14 / docs/ENGINE.md §4.1）
export { configure, ZipReader, BlobReader, HttpRangeReader, TextWriter, BlobWriter }
    from '../../node_modules/@zip.js/zip.js/lib/zip-core.js'
