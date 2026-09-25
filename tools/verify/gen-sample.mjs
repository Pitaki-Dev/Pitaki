// 生成一个 >10MB 的合法 EPUB 用于验证 A（zip.js 随机访问）。
// 结构贴近真实书：mimetype(stored) + container.xml + OPF + nav + 300 章 + 一张 ~12MB 随机噪声 PNG。
import { zipSync, zlibSync } from 'fflate'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash, randomFillSync } from 'node:crypto'

const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc32 = buf => {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function makePNG(w, h) {
  const raw = Buffer.alloc(h * (1 + w * 3))
  randomFillSync(raw)   // 真随机，保证不可压缩（LCG 在 JS 浮点下会退化出可压缩的长周期）
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.from(zlibSync(new Uint8Array(raw), { level: 1 }))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const N = 300
const enc = new TextEncoder()
const files = {}
files['mimetype'] = [enc.encode('application/epub+zip'), { level: 0 }]
files['META-INF/container.xml'] = enc.encode(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
const png = makePNG(1800, 2400)   // ~13MB
files['OEBPS/images/plate.png'] = new Uint8Array(png)
for (let i = 1; i <= N; i++) {
  files[`OEBPS/ch${i}.xhtml`] = enc.encode(`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${i}</title></head>
<body><h1>Chapter ${i}</h1><p>${('Lorem ipsum dolor sit amet, consectetur adipiscing elit. ').repeat(20)}</p>
<p>第三章测试文字：这是一段用于验证 iframe 渲染的中文正文。</p></body></html>`)
}
files['OEBPS/nav.xhtml'] = enc.encode(`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head>
<body><nav epub:type="toc"><ol>${Array.from({ length: N }, (_, k) => `<li><a href="ch${k + 1}.xhtml">Chapter ${k + 1}</a></li>`).join('')}</ol></nav></body></html>`)
files['OEBPS/content.opf'] = enc.encode(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:pitaki-spike-big</dc:identifier>
    <dc:title>Pitaki Spike Big Book</dc:title><dc:language>zh</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="plate" href="images/plate.png" media-type="image/png"/>
    ${Array.from({ length: N }, (_, k) => `<item id="c${k + 1}" href="ch${k + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>${Array.from({ length: N }, (_, k) => `<itemref idref="c${k + 1}"/>`).join('')}</spine>
</package>`)

const out = zipSync(files, { level: 6, mtime: new Date('2026-01-01T00:00:00Z') })
// 样本不入库：默认放 /tmp，可用 PITAKI_SAMPLES_DIR 覆盖（tools/verify/run-spike.mjs 读同一个变量）
const outDir = process.env.PITAKI_SAMPLES_DIR ?? '/tmp/pitaki-samples'
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'pitaki-spike-big.epub'), out)
const sha = createHash('sha256').update(out).digest('hex').slice(0, 16)
console.log(`bytes=${out.length} (${(out.length / 1048576).toFixed(2)} MiB) entries=${Object.keys(files).length} png=${(png.length / 1048576).toFixed(2)} MiB sha256_16=${sha}`)
