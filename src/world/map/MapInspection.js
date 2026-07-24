import { mapCoordinates } from './MapCoordinateSystem.js'
import { MAP_REGISTRY } from './MapRegistry.js'
import {
  isSourcePointWalkable,
  pointInWorldBounds,
  pointInWorldCollider,
} from '../shared/collisionHelpers.js'

const PLAYER_SOURCE_OFFSET = Object.freeze({ x: 12, y: 16 })
const PLAYER_CLEARANCE = 0.42
const SEARCH_RADII = Object.freeze([0, 24, 48, 72, 96, 128])
const SEARCH_DIRECTION_COUNT = 16

export const MAP_INSPECTION_TARGETS = Object.freeze({
  'hoan-kiem': Object.freeze({
    mapId: 'hoanKiem',
    sourcePoint: Object.freeze({ x: 622, y: 1386 }),
    lookAtSource: Object.freeze({ x: 1698, y: 724 }),
  }),
  'old-quarter': Object.freeze({
    mapId: 'hoanKiem',
    landmarkId: 'phoCo',
    worldPoint: Object.freeze({ x: 252, z: -82 }),
    lookAtWorld: Object.freeze({ x: 283, z: -86 }),
  }),
  church: Object.freeze({ mapId: 'hoanKiem', landmarkId: 'nhaThoLon' }),
  'special-npcs': Object.freeze({
    mapId: 'hoanKiem',
    sourcePoint: Object.freeze({ x: 2484, y: 891 }),
    lookAtSource: Object.freeze({ x: 2484, y: 859 }),
  }),
  interior: Object.freeze({
    mapId: 'churchInterior',
    sourcePoint: Object.freeze({ x: 700, y: 866 }),
    lookAtSource: Object.freeze({ x: 700, y: 131 }),
  }),
  'church-interior': Object.freeze({
    mapId: 'churchInterior',
    sourcePoint: Object.freeze({ x: 700, y: 866 }),
    lookAtSource: Object.freeze({ x: 700, y: 131 }),
  }),
  'ho-guom': Object.freeze({
    mapId: 'hoanKiem',
    landmarkId: 'hoGuom',
    worldPoint: Object.freeze({ x: 68, z: 18 }),
    lookAtWorld: Object.freeze({ x: 103, z: 0 }),
  }),
  'ngoc-son': Object.freeze({
    mapId: 'hoanKiem',
    landmarkId: 'denNgocSon',
    worldPoint: Object.freeze({ x: 119, z: 48.5 }),
    lookAtWorld: Object.freeze({ x: 119, z: 53.6 }),
  }),
  'ba-dinh': Object.freeze({ mapId: 'baDinh', landmarkId: 'quangTruongBaDinh' }),
  'van-mieu': Object.freeze({
    mapId: 'baDinh',
    landmarkId: 'vanMieu',
    sourcePoint: Object.freeze({ x: 1100, y: 1250 }),
  }),
  'long-bien': Object.freeze({
    mapId: 'longBien',
    sourcePoint: Object.freeze({ x: 162, y: 906 }),
    lookAtSource: Object.freeze({ x: 775, y: 515 }),
  }),
  'dong-xuan': Object.freeze({ mapId: 'longBien', landmarkId: 'choDongXuan' }),
  'long-bien-bridge': Object.freeze({ mapId: 'longBien', landmarkId: 'cauLongBien' }),
})

/**
 * Resolve a debug inspection alias to a registered destination. Landmark
 * points begin at the 2D interaction anchor, then search a small ring for the
 * nearest walkable position with first-person clearance. This keeps debug
 * teleports valid when a source decoration (for example a bench) occupies the
 * label anchor without changing the map or its collision semantics.
 */
export function createMapInspectionTarget(inspection, area = null) {
  const definition = MAP_REGISTRY[inspection.mapId]
  if (!definition) throw new Error(`Unknown inspection map: ${inspection.mapId}`)
  const landmark = inspection.landmarkId
    ? definition.data.landmarks.find((candidate) => (
        candidate.id === inspection.landmarkId || candidate.sourceId === inspection.landmarkId
      ))
    : null
  if (inspection.landmarkId && !landmark) {
    throw new Error(`Unknown inspection landmark: ${inspection.mapId}/${inspection.landmarkId}`)
  }

  const preferredSourcePoint = inspection.worldPoint
    ? mapCoordinates.worldToSource(inspection.mapId, inspection.worldPoint)
    : inspection.sourcePoint ?? landmark?.interactionPoint ?? {
        x: definition.data.spawn.x + PLAYER_SOURCE_OFFSET.x,
        y: definition.data.spawn.y + PLAYER_SOURCE_OFFSET.y,
      }
  const sourcePoint = inspection.worldPoint && (
    !area || isWorldPointClear(inspection.mapId, preferredSourcePoint, area)
  )
    ? preferredSourcePoint
    : findClearInspectionSourcePoint(
        definition.data,
        preferredSourcePoint,
        area,
      )
  const playerPoint = mapCoordinates.point(inspection.mapId, sourcePoint)
  const lookAtSource = inspection.lookAtSource ?? (landmark
    ? {
        x: landmark.x + landmark.width / 2,
        y: landmark.y + landmark.height / 2,
      }
    : null)
  const lookAtPoint = inspection.lookAtWorld ?? (
    lookAtSource ? mapCoordinates.point(inspection.mapId, lookAtSource) : null
  )
  const yaw = Number.isFinite(inspection.yaw)
    ? inspection.yaw
    : lookAtPoint
      ? Math.atan2(
          -(lookAtPoint.x - playerPoint.x),
          -(lookAtPoint.z - playerPoint.z),
        )
      : definition.spawn.yaw

  return {
    mapId: inspection.mapId,
    targetSource: {
      x: sourcePoint.x - PLAYER_SOURCE_OFFSET.x,
      y: sourcePoint.y - PLAYER_SOURCE_OFFSET.y,
    },
    yaw,
  }
}

export function findClearInspectionSourcePoint(mapData, preferredSourcePoint, area = null) {
  for (const radius of SEARCH_RADII) {
    const directionCount = radius === 0 ? 1 : SEARCH_DIRECTION_COUNT
    for (let index = 0; index < directionCount; index += 1) {
      const angle = directionCount === 1 ? 0 : index * Math.PI * 2 / directionCount
      const candidate = {
        x: preferredSourcePoint.x + Math.cos(angle) * radius,
        y: preferredSourcePoint.y + Math.sin(angle) * radius,
      }
      if (!isSourcePointWalkable(mapData, candidate)) continue
      if (!area || isWorldPointClear(mapData.id, candidate, area)) return candidate
    }
  }

  throw new Error(`No clear inspection point near ${mapData.id} landmark anchor`)
}

function isWorldPointClear(mapId, sourcePoint, area) {
  const worldPoint = mapCoordinates.point(mapId, sourcePoint)
  return pointInWorldBounds(worldPoint, area.bounds, PLAYER_CLEARANCE) &&
    !area.colliders.some((collider) => (
      !collider.disabled && pointInWorldCollider(worldPoint, collider, PLAYER_CLEARANCE)
    ))
}
