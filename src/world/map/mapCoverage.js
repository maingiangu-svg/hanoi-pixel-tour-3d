import { MAP_IDS, MAP_REGISTRY } from './MapRegistry.js'

export const COVERAGE_CATEGORIES = Object.freeze([
  'terrain',
  'roads',
  'buildings',
  'landmarks',
  'collision',
  'connection',
  'environment',
  'fixtures',
])

export const MAP_COVERAGE_TARGETS = Object.freeze(Object.fromEntries(MAP_IDS.map((mapId) => {
  const data = MAP_REGISTRY[mapId].data
  return [mapId, Object.freeze({
    terrain: data.groundPatches.length + data.water.length,
    roads: data.walkZones.length,
    buildings: data.buildings.length + data.shops.length + (data.vehicleShops?.length ?? 0),
    landmarks: data.landmarks.length,
    collision: countSourceStaticColliders(data),
    connection: data.exits.length,
    environment: data.decorations.length + (data.parkingSpots?.length ?? 0),
    fixtures: data.interiorFixtures?.length ?? 0,
  })]
})))

export function createFullCoverageRecord(mapId) {
  const target = MAP_COVERAGE_TARGETS[mapId]
  if (!target) throw new Error(`Unknown coverage map: ${mapId}`)
  return Object.freeze({ mapId, ...target })
}

export function coveragePercent(completed, total) {
  if (total === 0) return 100
  return Math.round((completed / total) * 10000) / 100
}

export function getCoverageSummary(records) {
  return Object.fromEntries(MAP_IDS.map((mapId) => {
    const target = MAP_COVERAGE_TARGETS[mapId]
    const completed = records[mapId] ?? {}
    return [mapId, Object.fromEntries(COVERAGE_CATEGORIES.map((category) => [category, {
      completed: completed[category] ?? 0,
      total: target[category],
      percent: coveragePercent(completed[category] ?? 0, target[category]),
    }]))]
  }))
}

export function validateCoverageRecord(record) {
  const target = MAP_COVERAGE_TARGETS[record.mapId]
  if (!target) return [`Unknown coverage map: ${record.mapId}`]
  return COVERAGE_CATEGORIES.flatMap((category) => {
    const value = record[category] ?? 0
    if (!Number.isInteger(value) || value < 0 || value > target[category]) {
      return [`${record.mapId}.${category} is ${value}; expected 0..${target[category]}`]
    }
    return []
  })
}

function countSourceStaticColliders(data) {
  if (data.kind === 'churchInterior') return data.collisionBlocks.length
  return data.buildings.length +
    data.shops.length +
    (data.vehicleShops?.length ?? 0) +
    (data.collisionBlocks?.length ?? 0) +
    data.landmarks.filter((landmark) => landmark.solid !== false).length
}
