import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanMoBillboardPixels,
  MO_CLEAN_PADDING,
  removeConnectedCheckerboard,
} from '../src/assets/MoBillboardProcessor.js'

function checkerImage(width, height) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 248 : 255
      const offset = (y * width + x) * 4
      data[offset] = value
      data[offset + 1] = value
      data[offset + 2] = value
      data[offset + 3] = 255
    }
  }
  return { data, width, height }
}

function paint(image, x, y, color) {
  const offset = (y * image.width + x) * 4
  image.data.set([...color, 255], offset)
}

function alphaAt(image, x, y) {
  return image.data[(y * image.width + x) * 4 + 3]
}

test('checker removal only clears bright neutral pixels connected to an image edge', () => {
  const image = checkerImage(16, 20)

  for (let y = 1; y < 20; y += 1) {
    for (let x = 4; x <= 11; x += 1) {
      const border = x === 4 || x === 11 || y === 1 || y === 19
      paint(image, x, y, border ? [42, 39, 36] : [250, 247, 242])
    }
  }
  paint(image, 7, 8, [248, 248, 248])

  const bounds = removeConnectedCheckerboard(image)

  assert.equal(alphaAt(image, 0, 0), 0)
  assert.equal(alphaAt(image, 15, 18), 0)
  assert.equal(alphaAt(image, 5, 6), 255, 'warm white clothes must remain opaque')
  assert.equal(alphaAt(image, 7, 8), 255, 'enclosed checker-like pixels must remain opaque')
  assert.deepEqual(
    { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
    { minX: 4, minY: 1, maxX: 11, maxY: 19 },
  )
})

test('an image containing only edge-connected checkerboard is rejected as unsafe', () => {
  const image = checkerImage(12, 12)
  assert.equal(removeConnectedCheckerboard(image), null)
})

test('a large enclosed checker pocket is removed without treating a small white detail as background', () => {
  const image = checkerImage(30, 40)
  for (let y = 1; y <= 38; y += 1) {
    for (let x = 4; x <= 25; x += 1) {
      paint(image, x, y, [46, 42, 38])
    }
  }
  for (let y = 8; y <= 36; y += 1) {
    for (let x = 13; x <= 16; x += 1) {
      const value = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 248 : 255
      paint(image, x, y, [value, value, value])
    }
  }
  paint(image, 8, 12, [248, 248, 248])

  removeConnectedCheckerboard(image)

  assert.equal(alphaAt(image, 14, 20), 0, 'large enclosed checker gap must clear')
  assert.equal(alphaAt(image, 8, 12), 255, 'isolated white garment detail must remain')
})

test('clean output is tightly cropped with transparent padding and opaque white clothing', () => {
  const image = checkerImage(30, 40)
  for (let y = 2; y <= 38; y += 1) {
    for (let x = 5; x <= 24; x += 1) {
      const outline = x === 5 || x === 24 || y === 2 || y === 38
      paint(image, x, y, outline ? [48, 42, 38] : [249, 246, 239])
    }
  }

  const cleaned = cleanMoBillboardPixels(image)
  assert.equal(cleaned.width, 20 + MO_CLEAN_PADDING * 2)
  assert.equal(cleaned.height, 37 + MO_CLEAN_PADDING * 2)
  assert.equal(alphaAt(cleaned, 0, 0), 0)
  assert.equal(
    alphaAt(cleaned, MO_CLEAN_PADDING + 10, MO_CLEAN_PADDING + 18),
    255,
    'enclosed warm-white clothing must survive full cleanup',
  )
  assert.equal(cleaned.metadata.bottomPadding, MO_CLEAN_PADDING)
})
