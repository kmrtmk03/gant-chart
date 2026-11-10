// PWA アイコン（帯が並んだガントチャート風）の PNG を生成する。
// 実行: node scripts/generate-icons.mjs
// 外部ライブラリに依存せず、矩形だけを塗って PNG に書き出す。
import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"

/** 背景色（_tokens.scss の $color-primary と揃える） */
const BACKGROUND = [0x2f, 0x6f, 0xed]
/** 帯の色 */
const BAR = [0xff, 0xff, 0xff]

/**
 * 帯の配置。座標は 0〜1 の比率で、maskable の安全領域（中央 80%）に収まるよう
 * 内側 60% の範囲（0.2〜0.8）だけを使う。[左, 上, 幅, 高さ]
 */
const BARS = [
  [0.2, 0.25, 0.35, 0.1],
  [0.35, 0.45, 0.4, 0.1],
  [0.5, 0.65, 0.3, 0.1],
]

/** CRC32 の計算表 */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** 一辺 size px の正方形アイコンを PNG（RGB）で作る */
function createIconPng(size) {
  const rowLength = size * 3 + 1
  const raw = Buffer.alloc(rowLength * size)

  for (let y = 0; y < size; y++) {
    raw[y * rowLength] = 0 // フィルタなし
    for (let x = 0; x < size; x++) {
      const isBar = BARS.some(
        ([left, top, width, height]) =>
          x >= left * size &&
          x < (left + width) * size &&
          y >= top * size &&
          y < (top + height) * size,
      )
      const color = isBar ? BAR : BACKGROUND
      raw.set(color, y * rowLength + 1 + x * 3)
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // ビット深度
  header[9] = 2 // カラータイプ: RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    createChunk("IHDR", header),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0)),
  ])
}

const OUTPUTS = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-maskable-512.png", 512],
  ["src/app/apple-icon.png", 180],
]

mkdirSync("public/icons", { recursive: true })
for (const [path, size] of OUTPUTS) {
  writeFileSync(path, createIconPng(size))
  console.log(`生成: ${path} (${size}x${size})`)
}
