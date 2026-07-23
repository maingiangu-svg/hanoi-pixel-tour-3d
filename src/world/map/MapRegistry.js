import { mapCoordinates } from './MapCoordinateSystem.js'
import { hoanKiemMapData } from './data/hoanKiemMapData.js'
import { baDinhMapData } from './data/baDinhMapData.js'
import { longBienMapData } from './data/longBienMapData.js'
import { churchInteriorMapData } from './data/churchInteriorMapData.js'

export const MAP_IDS = Object.freeze([
  'hoanKiem',
  'baDinh',
  'longBien',
  'churchInterior',
])

export const MAP_AREA_NAMES = Object.freeze({
  hoanKiem: 'outdoor',
  baDinh: 'baDinh',
  longBien: 'longBien',
  churchInterior: 'interior',
})

const MAP_DATA = Object.freeze({
  hoanKiem: hoanKiemMapData,
  baDinh: baDinhMapData,
  longBien: longBienMapData,
  churchInterior: churchInteriorMapData,
})

export const MAP_REGISTRY = Object.freeze(Object.fromEntries(MAP_IDS.map((mapId) => {
  const data = MAP_DATA[mapId]
  const spawnPoint = mapCoordinates.playerPoint(mapId, data.spawn)
  const entry = Object.freeze({
    id: mapId,
    name: data.name,
    areaName: MAP_AREA_NAMES[mapId],
    data,
    bounds: Object.freeze(mapCoordinates.bounds(mapId)),
    spawn: Object.freeze({ ...spawnPoint, yaw: defaultYaw(mapId) }),
    exits: Object.freeze(data.exits.map((exit) => createWorldExit(mapId, exit))),
  })
  return [mapId, entry]
})))

export function getMapDefinition(mapIdOrAreaName) {
  if (MAP_REGISTRY[mapIdOrAreaName]) return MAP_REGISTRY[mapIdOrAreaName]
  const mapId = MAP_IDS.find((candidate) => MAP_AREA_NAMES[candidate] === mapIdOrAreaName)
  if (!mapId) throw new Error(`Unknown map or area: ${mapIdOrAreaName}`)
  return MAP_REGISTRY[mapId]
}

export function getMapIdForArea(areaName) {
  return getMapDefinition(areaName).id
}

export function getAreaNameForMap(mapId) {
  return getMapDefinition(mapId).areaName
}

export function resolveMapDestination(target) {
  if (typeof target === 'string') {
    const definition = getMapDefinition(target)
    return { definition, spawn: definition.spawn, exitId: null }
  }

  if (!target || typeof target !== 'object') {
    throw new TypeError('Map destination must be a map/area name or destination object')
  }

  const definition = getMapDefinition(target.mapId ?? target.areaName)
  const sourcePoint = target.targetSource ?? (
    Number.isFinite(target.targetX) && Number.isFinite(target.targetY)
      ? { x: target.targetX, y: target.targetY }
      : null
  )
  const point = sourcePoint
    ? mapCoordinates.playerPoint(definition.id, sourcePoint)
    : definition.spawn
  return {
    definition,
    spawn: {
      x: point.x,
      z: point.z,
      yaw: Number.isFinite(target.yaw) ? target.yaw : defaultYaw(definition.id),
    },
    exitId: target.exitId ?? null,
  }
}

export function createWorldExit(sourceMapId, exit) {
  const interaction = exit.interactionPoint ?? {
    x: exit.x + exit.width / 2,
    y: exit.y + exit.height / 2,
    radius: 56,
  }
  const position = mapCoordinates.point(sourceMapId, interaction)
  const radius = Math.max(2.35, Math.min(6.2, mapCoordinates.distance(
    sourceMapId,
    interaction.radius ?? 56,
  )))
  return Object.freeze({
    id: exit.sourceId ?? exit.id,
    sourceId: exit.id,
    sourceMapId,
    name: exit.name,
    kind: exit.kind,
    type: 'portal',
    position: Object.freeze({ x: position.x, y: 0, z: position.z }),
    radius,
    label: exit.prompt?.replace(/^E\s*·\s*/, '') ?? exit.name,
    target: Object.freeze({
      mapId: exit.targetMap,
      targetSource: Object.freeze({ x: exit.targetX, y: exit.targetY }),
      exitId: exit.sourceId ?? exit.id,
    }),
  })
}

export function validateMapRegistry() {
  const errors = []
  for (const mapId of MAP_IDS) {
    const definition = MAP_REGISTRY[mapId]
    if (!definition) {
      errors.push(`Missing registry entry: ${mapId}`)
      continue
    }
    if (!definition.data.walkZones.length) errors.push(`${mapId} has no walk zones`)
    definition.exits.forEach((exit) => {
      if (!MAP_REGISTRY[exit.target.mapId]) {
        errors.push(`${mapId}/${exit.id} targets unknown map ${exit.target.mapId}`)
      }
    })
  }
  return errors
}

function defaultYaw(mapId) {
  if (mapId === 'hoanKiem') return -Math.PI / 2
  if (mapId === 'baDinh') return Math.PI
  if (mapId === 'longBien') return -Math.PI / 2
  return Math.PI
}

if (validateMapRegistry().length) {
  throw new Error(`Invalid map registry: ${validateMapRegistry().join('; ')}`)
}
