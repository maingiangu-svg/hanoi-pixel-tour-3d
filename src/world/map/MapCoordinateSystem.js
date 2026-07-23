const OUTDOOR_WORLD_UNITS_PER_PIXEL = 0.12
const INTERIOR_WORLD_UNITS_PER_PIXEL = 0.025

export const MAP_COORDINATE_CONFIG = deepFreeze({
  hoanKiem: {
    width: 2800,
    height: 1900,
    scale: OUTDOOR_WORLD_UNITS_PER_PIXEL,
    flipX: true,
    sourceAnchor: { x: 2484, y: 750 },
    worldAnchor: { x: 0, z: -12.65 },
  },
  baDinh: {
    width: 3000,
    height: 2200,
    scale: OUTDOOR_WORLD_UNITS_PER_PIXEL,
    flipX: true,
    sourceAnchor: { x: 1500, y: 1100 },
    worldAnchor: { x: 0, z: 0 },
  },
  longBien: {
    width: 3000,
    height: 1800,
    scale: OUTDOOR_WORLD_UNITS_PER_PIXEL,
    flipX: true,
    sourceAnchor: { x: 1500, y: 900 },
    worldAnchor: { x: 0, z: 0 },
  },
  churchInterior: {
    width: 1400,
    height: 980,
    scale: INTERIOR_WORLD_UNITS_PER_PIXEL,
    flipX: true,
    sourceAnchor: { x: 700, y: 876 },
    worldAnchor: { x: 0, z: 13.15 },
  },
})

/**
 * Central conversion between top-left-origin 2D pixels and Three.js X/Z.
 * Outdoor maps deliberately mirror source X so the detailed cathedral-to-lake
 * direction already present in the 3D slice remains intact. Source Y always
 * grows toward positive world Z. The interior uses one centralized scale
 * override because its 2D scene is an independent close-up, not an outdoor
 * map drawn at the same physical scale.
 */
export class MapCoordinateSystem {
  constructor(config = MAP_COORDINATE_CONFIG) {
    this.config = config
  }

  get(mapId) {
    const map = this.config[mapId]
    if (!map) throw new Error(`Unknown map coordinate system: ${mapId}`)
    return map
  }

  point(mapId, xOrPoint, maybeY) {
    const source = normalizePoint(xOrPoint, maybeY)
    const config = this.get(mapId)
    const sourceDeltaX = source.x - config.sourceAnchor.x
    const sourceDeltaY = source.y - config.sourceAnchor.y
    return {
      x: config.worldAnchor.x + sourceDeltaX * config.scale * (config.flipX ? -1 : 1),
      z: config.worldAnchor.z + sourceDeltaY * config.scale,
    }
  }

  playerPoint(mapId, sourceTopLeft) {
    return this.point(mapId, {
      x: sourceTopLeft.x + 12,
      y: sourceTopLeft.y + 16,
    })
  }

  worldToSource(mapId, xOrPoint, maybeZ) {
    const world = normalizeWorldPoint(xOrPoint, maybeZ)
    const config = this.get(mapId)
    return {
      x: config.sourceAnchor.x + (
        (world.x - config.worldAnchor.x) / config.scale
      ) * (config.flipX ? -1 : 1),
      y: config.sourceAnchor.y + (world.z - config.worldAnchor.z) / config.scale,
    }
  }

  rect(mapId, sourceRect) {
    assertRect(sourceRect)
    const center = this.point(
      mapId,
      sourceRect.x + sourceRect.width / 2,
      sourceRect.y + sourceRect.height / 2,
    )
    const scale = this.get(mapId).scale
    const width = sourceRect.width * scale
    const depth = sourceRect.height * scale
    return {
      x: center.x,
      z: center.z,
      width,
      depth,
      minX: center.x - width / 2,
      maxX: center.x + width / 2,
      minZ: center.z - depth / 2,
      maxZ: center.z + depth / 2,
    }
  }

  dimensions(mapId, widthOrRect, maybeHeight) {
    const config = this.get(mapId)
    if (typeof widthOrRect === 'object') {
      return {
        width: widthOrRect.width * config.scale,
        depth: widthOrRect.height * config.scale,
      }
    }
    return {
      width: widthOrRect * config.scale,
      depth: maybeHeight * config.scale,
    }
  }

  distance(mapId, pixels) {
    return pixels * this.get(mapId).scale
  }

  bounds(mapId) {
    const config = this.get(mapId)
    const rect = this.rect(mapId, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
    })
    return {
      minX: rect.minX,
      maxX: rect.maxX,
      minZ: rect.minZ,
      maxZ: rect.maxZ,
    }
  }

  collider(mapId, sourceRect, name = sourceRect.name ?? sourceRect.id ?? 'Map collider') {
    const rect = this.rect(mapId, sourceRect)
    return {
      x: rect.x,
      z: rect.z,
      width: rect.width,
      depth: rect.depth,
      // PlayerCollision consumes min/max AABBs. Keep centre/size fields as
      // source-map metadata while making the collider immediately usable.
      minX: rect.minX,
      maxX: rect.maxX,
      minZ: rect.minZ,
      maxZ: rect.maxZ,
      name,
      sourceId: sourceRect.id ?? null,
      sourceMapId: mapId,
    }
  }
}

export const mapCoordinates = new MapCoordinateSystem()

function normalizePoint(xOrPoint, maybeY) {
  const x = typeof xOrPoint === 'object' ? xOrPoint?.x : xOrPoint
  const y = typeof xOrPoint === 'object' ? xOrPoint?.y : maybeY
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`Invalid 2D point: (${x}, ${y})`)
  }
  return { x, y }
}

function normalizeWorldPoint(xOrPoint, maybeZ) {
  const x = typeof xOrPoint === 'object' ? xOrPoint?.x : xOrPoint
  const z = typeof xOrPoint === 'object' ? xOrPoint?.z : maybeZ
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new TypeError(`Invalid world point: (${x}, ${z})`)
  }
  return { x, z }
}

function assertRect(rect) {
  if (
    !rect ||
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width < 0 ||
    rect.height < 0
  ) {
    throw new TypeError('Invalid source rectangle')
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export const MAP_SCALE = Object.freeze({
  outdoor: OUTDOOR_WORLD_UNITS_PER_PIXEL,
  interior: INTERIOR_WORLD_UNITS_PER_PIXEL,
})
