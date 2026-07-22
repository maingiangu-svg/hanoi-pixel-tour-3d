import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'
import {
  cleanMoBillboardPixels,
  MO_CLEAN_PADDING,
} from '../src/assets/MoBillboardProcessor.js'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..')
const ASSET_DIRECTORY = resolve(PROJECT_ROOT, 'src/assets/characters/mo')
const OUTFITS = [
  ['idle', 'fullbody-idle.png', 'fullbody-idle-clean.png'],
  ['church', 'fullbody-church.png', 'fullbody-church-clean.png'],
]

const CRC_TABLE = new Uint32Array(256)
for (let index = 0; index < 256; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  CRC_TABLE[index] = value >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const value of buffer) crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const aboveDistance = Math.abs(estimate - above)
  const upperLeftDistance = Math.abs(estimate - upperLeft)
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left
  return aboveDistance <= upperLeftDistance ? above : upperLeft
}

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Invalid PNG signature')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const imageChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += length + 12
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      imageChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
    throw new Error(`Unsupported PNG format: depth=${bitDepth}, color=${colorType}, interlace=${interlace}`)
  }

  const channels = colorType === 2 ? 3 : 4
  const stride = width * channels
  const packed = inflateSync(Buffer.concat(imageChunks))
  const pixels = new Uint8Array(stride * height)
  let packedOffset = 0

  for (let y = 0; y < height; y += 1) {
    const filter = packed[packedOffset]
    packedOffset += 1
    const rowOffset = y * stride
    const previousOffset = rowOffset - stride
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[packedOffset]
      packedOffset += 1
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0
      const above = y > 0 ? pixels[previousOffset + x] : 0
      const upperLeft = y > 0 && x >= channels ? pixels[previousOffset + x - channels] : 0
      let value
      if (filter === 0) value = raw
      else if (filter === 1) value = raw + left
      else if (filter === 2) value = raw + above
      else if (filter === 3) value = raw + Math.floor((left + above) / 2)
      else if (filter === 4) value = raw + paeth(left, above, upperLeft)
      else throw new Error(`Unsupported PNG filter: ${filter}`)
      pixels[rowOffset + x] = value & 0xff
    }
  }

  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * channels
    const targetOffset = index * 4
    rgba[targetOffset] = pixels[sourceOffset]
    rgba[targetOffset + 1] = pixels[sourceOffset + 1]
    rgba[targetOffset + 2] = pixels[sourceOffset + 2]
    rgba[targetOffset + 3] = channels === 4 ? pixels[sourceOffset + 3] : 255
  }
  return { data: rgba, width, height }
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const chunk = Buffer.allocUnsafe(data.length + 12)
  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8)
  return chunk
}

function encodePng({ data, width, height }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const scanlines = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * 4 + 1)
    scanlines[targetOffset] = 0
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4)
      .copy(scanlines, targetOffset + 1)
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function createPreview(cleanedOutfits) {
  const backgrounds = [
    [0, 0, 0],
    [170, 20, 34],
    [0, 92, 72],
  ]
  const margin = 12
  const cellWidth = Math.max(...cleanedOutfits.map(({ image }) => image.width)) + margin * 2
  const cellHeight = Math.max(...cleanedOutfits.map(({ image }) => image.height)) + margin * 2
  const width = cellWidth * backgrounds.length
  const height = cellHeight * cleanedOutfits.length
  const data = new Uint8ClampedArray(width * height * 4)

  cleanedOutfits.forEach(({ image }, row) => {
    backgrounds.forEach((background, column) => {
      const cellX = column * cellWidth
      const cellY = row * cellHeight
      for (let y = 0; y < cellHeight; y += 1) {
        for (let x = 0; x < cellWidth; x += 1) {
          const offset = ((cellY + y) * width + cellX + x) * 4
          data[offset] = background[0]
          data[offset + 1] = background[1]
          data[offset + 2] = background[2]
          data[offset + 3] = 255
        }
      }

      const imageX = cellX + Math.floor((cellWidth - image.width) / 2)
      const imageY = cellY + Math.floor((cellHeight - image.height) / 2)
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          const sourceOffset = (y * image.width + x) * 4
          const targetOffset = ((imageY + y) * width + imageX + x) * 4
          const alpha = image.data[sourceOffset + 3] / 255
          data[targetOffset] = Math.round(
            image.data[sourceOffset] * alpha + data[targetOffset] * (1 - alpha),
          )
          data[targetOffset + 1] = Math.round(
            image.data[sourceOffset + 1] * alpha + data[targetOffset + 1] * (1 - alpha),
          )
          data[targetOffset + 2] = Math.round(
            image.data[sourceOffset + 2] * alpha + data[targetOffset + 2] * (1 - alpha),
          )
        }
      }
    })
  })

  return { data, width, height }
}

const cleanedOutfits = []
for (const [id, sourceName, outputName] of OUTFITS) {
  const sourcePath = resolve(ASSET_DIRECTORY, sourceName)
  const outputPath = resolve(ASSET_DIRECTORY, outputName)
  const source = decodePng(await readFile(sourcePath))
  const image = cleanMoBillboardPixels(source, { padding: MO_CLEAN_PADDING })
  await writeFile(outputPath, encodePng(image))
  cleanedOutfits.push({ id, image })
  const removedPercent = Math.round(
    image.metadata.removedPixels / (source.width * source.height) * 100,
  )
  console.log(
    `${id}: ${source.width}x${source.height} -> ${image.width}x${image.height}; ` +
    `${removedPercent}% detected background removed`,
  )
}

const previewFlag = process.argv.indexOf('--preview')
if (previewFlag >= 0) {
  const previewPath = resolve(process.argv[previewFlag + 1] ?? '/tmp/mo-alpha-preview.png')
  await mkdir(dirname(previewPath), { recursive: true })
  await writeFile(previewPath, encodePng(createPreview(cleanedOutfits)))
  console.log(`preview: ${previewPath}`)
}
