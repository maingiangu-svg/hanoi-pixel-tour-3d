export const MO_CLEAN_PADDING = 3

const CROP_ALPHA_THRESHOLD = 8
const FLOOD_MIN_LUMINANCE = 230
const FLOOD_MAX_SATURATION = 0.08
const FLOOD_MAX_DISTANCE_SQUARED = 65 * 65

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function dimensionsOf(image) {
  return {
    width: image?.naturalWidth ?? image?.videoWidth ?? image?.width ?? 0,
    height: image?.naturalHeight ?? image?.videoHeight ?? image?.height ?? 0,
  }
}

function createWorkCanvas(width, height) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function colorMetrics(data, offset) {
  const red = data[offset]
  const green = data[offset + 1]
  const blue = data[offset + 2]
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  return {
    red,
    green,
    blue,
    luminance: red * 0.2126 + green * 0.7152 + blue * 0.0722,
    saturation: maximum === 0 ? 0 : (maximum - minimum) / maximum,
  }
}

function collectBackgroundPalette(data, width, height) {
  const histogram = new Map()
  const sample = (index) => {
    const offset = index * 4
    const metrics = colorMetrics(data, offset)
    if (metrics.luminance < 215 || metrics.saturation > 0.12) return
    const red = Math.round(metrics.red / 4) * 4
    const green = Math.round(metrics.green / 4) * 4
    const blue = Math.round(metrics.blue / 4) * 4
    const key = `${red},${green},${blue}`
    histogram.set(key, (histogram.get(key) ?? 0) + 1)
  }

  for (let x = 0; x < width; x += 1) {
    sample(x)
    sample((height - 1) * width + x)
  }
  for (let y = 1; y + 1 < height; y += 1) {
    sample(y * width)
    sample(y * width + width - 1)
  }

  const palette = [...histogram.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([key]) => key.split(',').map(Number))
  return palette.length > 0 ? palette : [[248, 248, 248], [255, 255, 255]]
}

function distanceToPaletteSquared(red, green, blue, palette) {
  let minimum = Infinity
  for (const color of palette) {
    const deltaRed = red - color[0]
    const deltaGreen = green - color[1]
    const deltaBlue = blue - color[2]
    minimum = Math.min(
      minimum,
      deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue,
    )
  }
  return minimum
}

function nearestPaletteMatch(red, green, blue, palette) {
  let index = 0
  let distanceSquared = Infinity
  for (let paletteIndex = 0; paletteIndex < palette.length; paletteIndex += 1) {
    const color = palette[paletteIndex]
    const deltaRed = red - color[0]
    const deltaGreen = green - color[1]
    const deltaBlue = blue - color[2]
    const candidate = deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue
    if (candidate < distanceSquared) {
      index = paletteIndex
      distanceSquared = candidate
    }
  }
  return { index, distanceSquared }
}

function isFloodBackground(data, offset, palette) {
  const metrics = colorMetrics(data, offset)
  return (
    metrics.luminance >= FLOOD_MIN_LUMINANCE &&
    metrics.saturation <= FLOOD_MAX_SATURATION &&
    distanceToPaletteSquared(metrics.red, metrics.green, metrics.blue, palette) <=
      FLOOD_MAX_DISTANCE_SQUARED
  )
}

function backgroundConfidence(data, offset, palette) {
  const metrics = colorMetrics(data, offset)
  const distance = Math.sqrt(
    distanceToPaletteSquared(metrics.red, metrics.green, metrics.blue, palette),
  )
  if (metrics.luminance < 145 || metrics.saturation > 0.22 || distance > 185) return 0

  const lightness = clamp01((metrics.luminance - 145) / 105)
  const neutrality = clamp01(1 - metrics.saturation / 0.22)
  const similarity = clamp01(1 - distance / 185)
  return lightness * 0.5 + neutrality * 0.3 + similarity * 0.2
}

function hasBackgroundNeighbour(data, index, width, height, alphaThreshold) {
  const x = index % width
  const y = Math.floor(index / width)
  return (
    (x > 0 && data[(index - 1) * 4 + 3] <= alphaThreshold) ||
    (x + 1 < width && data[(index + 1) * 4 + 3] <= alphaThreshold) ||
    (y > 0 && data[(index - width) * 4 + 3] <= alphaThreshold) ||
    (y + 1 < height && data[(index + width) * 4 + 3] <= alphaThreshold)
  )
}

function removeLargeEnclosedBackground(data, width, height, palette, exteriorMask) {
  const pixelCount = width * height
  const checked = new Uint8Array(exteriorMask)
  const queue = new Int32Array(pixelCount)
  const component = new Int32Array(pixelCount)
  const minimumArea = Math.max(96, Math.floor(pixelCount * 0.004))
  let removedPixels = 0

  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (checked[seed] || !isFloodBackground(data, seed * 4, palette)) continue
    let head = 0
    let tail = 1
    let componentSize = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    let strongPaletteMatches = 0
    const paletteCounts = new Uint32Array(palette.length)
    queue[0] = seed
    checked[seed] = 1

    while (head < tail) {
      const index = queue[head]
      head += 1
      component[componentSize] = index
      componentSize += 1
      const x = index % width
      const y = Math.floor(index / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      const dataOffset = index * 4
      const match = nearestPaletteMatch(
        data[dataOffset],
        data[dataOffset + 1],
        data[dataOffset + 2],
        palette,
      )
      paletteCounts[match.index] += 1
      if (match.distanceSquared <= 12 * 12) strongPaletteMatches += 1

      const enqueue = (neighbour) => {
        if (checked[neighbour] || !isFloodBackground(data, neighbour * 4, palette)) return
        checked[neighbour] = 1
        queue[tail] = neighbour
        tail += 1
      }
      if (x > 0) enqueue(index - 1)
      if (x + 1 < width) enqueue(index + 1)
      if (y > 0) enqueue(index - width)
      if (y + 1 < height) enqueue(index + width)
    }

    const spansCharacterGap = (
      maxY - minY + 1 >= height * 0.08 ||
      maxX - minX + 1 >= width * 0.08
    )
    const repeatedCheckerTones = paletteCounts.filter(
      (count) => count >= componentSize * 0.08,
    ).length >= 2
    const closelyMatchesBackground = strongPaletteMatches >= componentSize * 0.82
    if (
      componentSize < minimumArea ||
      !spansCharacterGap ||
      !repeatedCheckerTones ||
      !closelyMatchesBackground
    ) continue

    for (let offset = 0; offset < componentSize; offset += 1) {
      data[component[offset] * 4 + 3] = 0
    }
    removedPixels += componentSize
  }

  return removedPixels
}

function removeHaloRings(data, width, height, palette) {
  const pixelCount = width * height
  const nextAlpha = new Uint8ClampedArray(pixelCount)

  const passes = [
    { neighbourThreshold: 0, minimumConfidence: 0.25, strength: 1.45 },
    { neighbourThreshold: 160, minimumConfidence: 0.32, strength: 1.25 },
    { neighbourThreshold: 176, minimumConfidence: 0.42, strength: 1 },
    { neighbourThreshold: 190, minimumConfidence: 0.58, strength: 0.7 },
  ]

  for (const { neighbourThreshold, minimumConfidence, strength } of passes) {

    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4
      const alpha = data[offset + 3]
      nextAlpha[index] = alpha
      if (
        alpha === 0 ||
        !hasBackgroundNeighbour(data, index, width, height, neighbourThreshold)
      ) continue

      const confidence = backgroundConfidence(data, offset, palette)
      if (confidence < minimumConfidence) continue
      const remaining = clamp01(1 - confidence * strength)
      const softened = Math.round(255 * remaining * remaining)
      nextAlpha[index] = Math.min(alpha, softened <= CROP_ALPHA_THRESHOLD ? 0 : softened)
    }

    for (let index = 0; index < pixelCount; index += 1) {
      data[index * 4 + 3] = nextAlpha[index]
    }
  }
}

function findOpaqueBounds(data, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let opaquePixels = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha <= CROP_ALPHA_THRESHOLD) continue
      opaquePixels += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) return null
  return { minX, minY, maxX, maxY, opaquePixels }
}

function nearestPaletteColor(red, green, blue, palette) {
  let nearest = palette[0]
  let minimum = Infinity
  for (const color of palette) {
    const deltaRed = red - color[0]
    const deltaGreen = green - color[1]
    const deltaBlue = blue - color[2]
    const distance = deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue
    if (distance < minimum) {
      minimum = distance
      nearest = color
    }
  }
  return nearest
}

function matteOuterFringe(imageData, palette, radius = 7) {
  const { data, width, height } = imageData
  const pixelCount = width * height
  const distance = new Uint8Array(pixelCount)
  distance.fill(255)
  for (let index = 0; index < pixelCount; index += 1) {
    if (data[index * 4 + 3] <= CROP_ALPHA_THRESHOLD) distance[index] = 0
  }

  for (let step = 1; step <= radius; step += 1) {
    const ring = []
    for (let index = 0; index < pixelCount; index += 1) {
      if (distance[index] !== 255) continue
      const x = index % width
      const y = Math.floor(index / width)
      if (
        (x > 0 && distance[index - 1] === step - 1) ||
        (x + 1 < width && distance[index + 1] === step - 1) ||
        (y > 0 && distance[index - width] === step - 1) ||
        (y + 1 < height && distance[index + width] === step - 1)
      ) ring.push(index)
    }
    for (const index of ring) distance[index] = step
  }

  const source = new Uint8ClampedArray(data)
  for (let index = 0; index < pixelCount; index += 1) {
    if (distance[index] < 1 || distance[index] > radius) continue
    const offset = index * 4
    if (backgroundConfidence(source, offset, palette) < 0.42) continue
    const x = index % width
    const y = Math.floor(index / width)
    let coreIndex = -1
    let coreDistance = Infinity

    for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
      const candidateY = y + deltaY
      if (candidateY < 0 || candidateY >= height) continue
      for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
        const candidateX = x + deltaX
        if (candidateX < 0 || candidateX >= width) continue
        const candidateDistance = deltaX * deltaX + deltaY * deltaY
        if (candidateDistance === 0 || candidateDistance >= coreDistance) continue
        const candidate = candidateY * width + candidateX
        const candidateOffset = candidate * 4
        if (
          source[candidateOffset + 3] >= 230 &&
          backgroundConfidence(source, candidateOffset, palette) < 0.82
        ) {
          coreIndex = candidate
          coreDistance = candidateDistance
        }
      }
    }
    if (coreIndex < 0) continue

    const coreOffset = coreIndex * 4
    const background = nearestPaletteColor(
      source[offset],
      source[offset + 1],
      source[offset + 2],
      palette,
    )
    const foregroundRed = source[coreOffset] - background[0]
    const foregroundGreen = source[coreOffset + 1] - background[1]
    const foregroundBlue = source[coreOffset + 2] - background[2]
    const observedRed = source[offset] - background[0]
    const observedGreen = source[offset + 1] - background[1]
    const observedBlue = source[offset + 2] - background[2]
    const denominator = (
      foregroundRed * foregroundRed +
      foregroundGreen * foregroundGreen +
      foregroundBlue * foregroundBlue
    )
    if (denominator < 64) continue
    const estimatedAlpha = clamp01((
      observedRed * foregroundRed +
      observedGreen * foregroundGreen +
      observedBlue * foregroundBlue
    ) / denominator)
    const targetAlpha = Math.round(estimatedAlpha * 255)
    if (targetAlpha >= data[offset + 3]) continue

    data[offset + 3] = targetAlpha <= CROP_ALPHA_THRESHOLD ? 0 : targetAlpha
    const coreWeight = 1 - estimatedAlpha
    data[offset] = Math.round(source[offset] * estimatedAlpha + source[coreOffset] * coreWeight)
    data[offset + 1] = Math.round(
      source[offset + 1] * estimatedAlpha + source[coreOffset + 1] * coreWeight,
    )
    data[offset + 2] = Math.round(
      source[offset + 2] * estimatedAlpha + source[coreOffset + 2] * coreWeight,
    )
  }
}

function decontaminateTransparentRgb(imageData) {
  const { data, width, height } = imageData
  const pixelCount = width * height

  for (let pass = 0; pass < 4; pass += 1) {
    const source = new Uint8ClampedArray(data)
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4
      const alpha = source[offset + 3]
      if (alpha >= 250) continue

      const x = index % width
      const y = Math.floor(index / width)
      let bestNeighbour = -1
      let bestAlpha = alpha
      const consider = (neighbour) => {
        const neighbourAlpha = source[neighbour * 4 + 3]
        if (neighbourAlpha > bestAlpha) {
          bestAlpha = neighbourAlpha
          bestNeighbour = neighbour
        }
      }
      if (x > 0) consider(index - 1)
      if (x + 1 < width) consider(index + 1)
      if (y > 0) consider(index - width)
      if (y + 1 < height) consider(index + width)
      if (bestNeighbour < 0) continue

      const neighbourOffset = bestNeighbour * 4
      const foregroundWeight = 1 - alpha / 255
      data[offset] = Math.round(
        source[offset] * (1 - foregroundWeight) + source[neighbourOffset] * foregroundWeight,
      )
      data[offset + 1] = Math.round(
        source[offset + 1] * (1 - foregroundWeight) +
        source[neighbourOffset + 1] * foregroundWeight,
      )
      data[offset + 2] = Math.round(
        source[offset + 2] * (1 - foregroundWeight) +
        source[neighbourOffset + 2] * foregroundWeight,
      )
    }
  }
}

export function removeConnectedCheckerboard(imageData) {
  const { data, width, height } = imageData
  const pixelCount = width * height
  if (!width || !height || data.length !== pixelCount * 4) {
    throw new TypeError('Invalid billboard image data')
  }

  const palette = collectBackgroundPalette(data, width, height)
  const visited = new Uint8Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  let head = 0
  let tail = 0
  const enqueue = (index) => {
    if (visited[index] || !isFloodBackground(data, index * 4, palette)) return
    visited[index] = 1
    queue[tail] = index
    tail += 1
  }

  // Seed every border segment. Gaps between shoes or limbs can touch an edge
  // without being connected to a corner, so corner-only flood fill leaves
  // convincing checkerboard "holes" inside the silhouette.
  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y + 1 < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head]
    head += 1
    data[index * 4 + 3] = 0
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x + 1 < width) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y + 1 < height) enqueue(index + width)
  }

  const enclosedRemoved = removeLargeEnclosedBackground(
    data,
    width,
    height,
    palette,
    visited,
  )
  removeHaloRings(data, width, height, palette)
  const bounds = findOpaqueBounds(data, width, height)
  if (!bounds) return null

  const contentWidth = bounds.maxX - bounds.minX + 1
  const contentHeight = bounds.maxY - bounds.minY + 1
  const safe = (
    tail > pixelCount * 0.1 &&
    bounds.opaquePixels > pixelCount * 0.03 &&
    contentWidth > width * 0.15 &&
    contentHeight > height * 0.5
  )
  return safe
    ? {
        ...bounds,
        palette,
        removedPixels: tail + enclosedRemoved,
        contentWidth,
        contentHeight,
      }
    : null
}

export function cleanMoBillboardPixels(imageData, { padding = MO_CLEAN_PADDING } = {}) {
  const { data, width, height } = imageData
  const bounds = removeConnectedCheckerboard(imageData)
  if (!bounds) throw new Error('Unsafe Mơ billboard background removal')

  const cropWidth = bounds.contentWidth + padding * 2
  const cropHeight = bounds.contentHeight + padding * 2
  const croppedData = new Uint8ClampedArray(cropWidth * cropHeight * 4)
  for (let sourceY = bounds.minY; sourceY <= bounds.maxY; sourceY += 1) {
    const targetY = sourceY - bounds.minY + padding
    for (let sourceX = bounds.minX; sourceX <= bounds.maxX; sourceX += 1) {
      const targetX = sourceX - bounds.minX + padding
      const sourceOffset = (sourceY * width + sourceX) * 4
      const targetOffset = (targetY * cropWidth + targetX) * 4
      croppedData[targetOffset] = data[sourceOffset]
      croppedData[targetOffset + 1] = data[sourceOffset + 1]
      croppedData[targetOffset + 2] = data[sourceOffset + 2]
      croppedData[targetOffset + 3] = data[sourceOffset + 3]
    }
  }

  const cropped = { data: croppedData, width: cropWidth, height: cropHeight }
  matteOuterFringe(cropped, bounds.palette)
  decontaminateTransparentRgb(cropped)
  return {
    ...cropped,
    metadata: {
      sourceWidth: width,
      sourceHeight: height,
      contentWidth: bounds.contentWidth,
      contentHeight: bounds.contentHeight,
      cropWidth,
      cropHeight,
      bottomPadding: padding,
      removedPixels: bounds.removedPixels,
      palette: bounds.palette,
    },
  }
}

export function createCleanMoBillboardCanvas(
  image,
  { padding = MO_CLEAN_PADDING, canvasFactory = createWorkCanvas } = {},
) {
  const { width, height } = dimensionsOf(image)
  if (!width || !height) throw new TypeError('Mơ billboard image has no dimensions')

  const sourceCanvas = canvasFactory(width, height)
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  sourceContext.imageSmoothingEnabled = false
  sourceContext.drawImage(image, 0, 0, width, height)
  const cleaned = cleanMoBillboardPixels(
    sourceContext.getImageData(0, 0, width, height),
    { padding },
  )

  const canvas = canvasFactory(cleaned.width, cleaned.height)
  const context = canvas.getContext('2d')
  const output = context.createImageData(cleaned.width, cleaned.height)
  output.data.set(cleaned.data)
  context.putImageData(output, 0, 0)
  return { canvas, metadata: cleaned.metadata }
}
