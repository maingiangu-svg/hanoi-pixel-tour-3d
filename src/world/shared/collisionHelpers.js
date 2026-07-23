import { mapCoordinates } from '../map/MapCoordinateSystem.js'

const EPSILON = 1e-7

export function pointInSourceRect(point, rect, margin = 0) {
  return point.x >= rect.x - margin &&
    point.x <= rect.x + rect.width + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.height + margin
}

export function sourceRectsOverlap(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
}

export function isSourcePointWalkable(mapData, point) {
  return point.x >= 0 &&
    point.y >= 0 &&
    point.x <= mapData.width &&
    point.y <= mapData.height &&
    mapData.walkZones.some((zone) => pointInSourceRect(point, zone))
}

export function pointInWorldCollider(point, collider, margin = 0) {
  const bounds = getWorldColliderBounds(collider)
  if (!bounds) return false
  return point.x >= bounds.minX - margin &&
    point.x <= bounds.maxX + margin &&
    point.z >= bounds.minZ - margin &&
    point.z <= bounds.maxZ + margin
}

export function pointInWorldBounds(point, bounds, margin = 0) {
  return point.x >= bounds.minX + margin &&
    point.x <= bounds.maxX - margin &&
    point.z >= bounds.minZ + margin &&
    point.z <= bounds.maxZ - margin
}

export function isWorldSpawnClear(area, margin = 0.42) {
  const point = { x: area.spawn.x, z: area.spawn.z }
  return pointInWorldBounds(point, area.bounds, margin) &&
    !area.colliders.some((collider) => (
      !collider.disabled && pointInWorldCollider(point, collider, margin)
    ))
}

/**
 * Returns the exact orthogonal complement of the union of walk zones inside
 * the source map. The result is merged into larger rectangles before being
 * converted to PlayerCollision AABBs.
 */
export function buildNonWalkableSourceRects(mapData) {
  const clippedZones = mapData.walkZones
    .map((zone) => clipSourceRect(zone, mapData.width, mapData.height))
    .filter((zone) => zone.width > EPSILON && zone.height > EPSILON)
  const xs = sortedUnique([
    0,
    mapData.width,
    ...clippedZones.flatMap((zone) => [zone.x, zone.x + zone.width]),
  ])
  const ys = sortedUnique([
    0,
    mapData.height,
    ...clippedZones.flatMap((zone) => [zone.y, zone.y + zone.height]),
  ])

  const merged = []
  let active = new Map()
  for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
    const y = ys[yIndex]
    const height = ys[yIndex + 1] - y
    const runs = []
    let runStart = null

    for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
      const x = xs[xIndex]
      const nextX = xs[xIndex + 1]
      const center = { x: (x + nextX) / 2, y: y + height / 2 }
      const blocked = !clippedZones.some((zone) => pointInSourceRect(center, zone))
      if (blocked && runStart === null) runStart = x
      if ((!blocked || xIndex === xs.length - 2) && runStart !== null) {
        const runEnd = blocked && xIndex === xs.length - 2 ? nextX : x
        runs.push({ x: runStart, y, width: runEnd - runStart, height })
        runStart = null
      }
    }

    const nextActive = new Map()
    runs.forEach((run) => {
      const key = `${run.x}:${run.width}`
      const previous = active.get(key)
      if (previous && Math.abs(previous.y + previous.height - run.y) < EPSILON) {
        previous.height += run.height
        nextActive.set(key, previous)
      } else {
        const created = { ...run }
        merged.push(created)
        nextActive.set(key, created)
      }
    })
    active = nextActive
  }

  return merged.map((rect, index) => ({
    ...rect,
    id: `non-walk-${String(index + 1).padStart(3, '0')}`,
    kind: 'nonWalkBoundary',
  }))
}

export function buildNonWalkableColliders(mapData, coordinates = mapCoordinates) {
  return buildNonWalkableSourceRects(mapData).map((rect) => coordinates.collider(
    mapData.id,
    rect,
    `Ranh giới vùng đi bộ ${mapData.id} ${rect.id}`,
  ))
}

export function buildStaticSourceRects(mapData) {
  const source = [
    ...(mapData.buildings ?? []),
    ...(mapData.shops ?? []),
    ...(mapData.vehicleShops ?? []),
    ...(mapData.collisionBlocks ?? []),
    ...(mapData.landmarks ?? []).filter((landmark) => landmark.solid !== false),
  ]
  const unique = new Map()
  source.forEach((rect) => {
    const key = `${rect.x}:${rect.y}:${rect.width}:${rect.height}`
    if (!unique.has(key)) unique.set(key, rect)
  })
  return [...unique.values()]
}

export function buildStaticColliders(mapData, coordinates = mapCoordinates) {
  return buildStaticSourceRects(mapData).flatMap((rect) => {
    const openings = getNavigationOpenings(mapData, rect)
    return subtractSourceRects(rect, openings).map((piece, index) => coordinates.collider(
      mapData.id,
      { ...piece, id: index ? `${rect.id}-part-${index + 1}` : rect.id },
      rect.name ?? rect.sign ?? rect.id ?? `Vật cản ${mapData.id}`,
    ))
  })
}

export function getNavigationOpenings(mapData, targetRect) {
  return (mapData.navigationRepairs ?? [])
    .filter((repair) => {
      const opening = repair.rect ?? repair.opening
      const kindMatches = repair.kind === 'opening' || repair.kind === 'colliderOpening'
      const targetMatches = !repair.targetId || repair.targetId === targetRect.id
      return kindMatches && opening && targetMatches && sourceRectsOverlap(targetRect, opening)
    })
    .map((repair) => repair.rect ?? repair.opening)
}

/** Split base around one or more cuts; pieces never overlap a cut. */
export function subtractSourceRects(base, cuts = []) {
  return cuts.reduce((pieces, cut) => pieces.flatMap((piece) => subtractOne(piece, cut)), [{
    x: base.x,
    y: base.y,
    width: base.width,
    height: base.height,
  }]).filter((rect) => rect.width > EPSILON && rect.height > EPSILON)
}

function subtractOne(base, cut) {
  const left = Math.max(base.x, cut.x)
  const top = Math.max(base.y, cut.y)
  const right = Math.min(base.x + base.width, cut.x + cut.width)
  const bottom = Math.min(base.y + base.height, cut.y + cut.height)
  if (right <= left || bottom <= top) return [base]

  const result = []
  if (top > base.y) {
    result.push({ x: base.x, y: base.y, width: base.width, height: top - base.y })
  }
  if (bottom < base.y + base.height) {
    result.push({ x: base.x, y: bottom, width: base.width, height: base.y + base.height - bottom })
  }
  if (left > base.x) {
    result.push({ x: base.x, y: top, width: left - base.x, height: bottom - top })
  }
  if (right < base.x + base.width) {
    result.push({ x: right, y: top, width: base.x + base.width - right, height: bottom - top })
  }
  return result
}

function clipSourceRect(rect, width, height) {
  const x = Math.max(0, rect.x)
  const y = Math.max(0, rect.y)
  const right = Math.min(width, rect.x + rect.width)
  const bottom = Math.min(height, rect.y + rect.height)
  return { ...rect, x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }
}

function sortedUnique(values) {
  return [...new Set(values.map((value) => Number(value)))].sort((a, b) => a - b)
}

function getWorldColliderBounds(collider) {
  if (
    Number.isFinite(collider?.minX) &&
    Number.isFinite(collider?.maxX) &&
    Number.isFinite(collider?.minZ) &&
    Number.isFinite(collider?.maxZ)
  ) {
    return collider
  }
  if (
    Number.isFinite(collider?.x) &&
    Number.isFinite(collider?.z) &&
    Number.isFinite(collider?.width) &&
    Number.isFinite(collider?.depth)
  ) {
    return {
      minX: collider.x - collider.width / 2,
      maxX: collider.x + collider.width / 2,
      minZ: collider.z - collider.depth / 2,
      maxZ: collider.z + collider.depth / 2,
    }
  }
  return null
}
