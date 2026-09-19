#!/usr/bin/env node
/**
 * 生成占位应用图标（纯色 + 简易书页图形），避免引入任何第三方美术资源与授权问题。
 * Step 2 做 UI 基础时用正式图标替换。
 *
 * 只产出 PNG：bundle.active 目前为 false，不需要 .icns / .ico。
 * 若将来 `tauri build` 需要打包，再补 icon.icns / icon.ico。
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'src-tauri/icons')

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

const crc32 = (buffer) => {
  let c = -1
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const BACKGROUND = [0x1f, 0x29, 0x37]
const PAGE = [0xf5, 0xf5, 0xf4]
const SPINE = [0x6b, 0x8e, 0xf2]

function render(size) {
  const raw = Buffer.alloc(size * (1 + size * 4)) // filter byte + RGBA
  const margin = Math.round(size * 0.24)
  const pageWidth = size - margin * 2
  const pageHeight = size - margin * 2
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const inPage = x >= margin && x < margin + pageWidth && y >= margin && y < margin + pageHeight
      const inSpine = inPage && x < margin + Math.max(2, Math.round(pageWidth * 0.08))
      const color = inSpine ? SPINE : inPage ? PAGE : BACKGROUND
      const offset = rowStart + 1 + x * 4
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
      raw[offset + 3] = 0xff
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT, { recursive: true })
const targets = [
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['icon.png', 512],
]
for (const [name, size] of targets) {
  const png = render(size)
  writeFileSync(resolve(OUT, name), png)
  console.log(`${name.padEnd(14)} ${size}×${size}  ${png.length} B`)
}
