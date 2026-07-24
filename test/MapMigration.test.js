import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  MAP_COORDINATE_CONFIG,
  MAP_SCALE,
  mapCoordinates,
} from '../src/world/map/MapCoordinateSystem.js'
import {
  MAP_AREA_NAMES,
  MAP_IDS,
  MAP_REGISTRY,
  getAreaNameForMap,
  getMapDefinition,
  getMapIdForArea,
  resolveMapDestination,
  validateMapRegistry,
} from '../src/world/map/MapRegistry.js'
import {
  COVERAGE_CATEGORIES,
  MAP_COVERAGE_TARGETS,
  coveragePercent,
  createFullCoverageRecord,
  getCoverageSummary,
  validateCoverageRecord,
} from '../src/world/map/mapCoverage.js'
import {
  buildNonWalkableColliders,
  buildStaticColliders,
  buildStaticSourceRects,
  getNavigationOpenings,
  isSourcePointWalkable,
  isWorldSpawnClear,
  pointInSourceRect,
  pointInWorldCollider,
  sourceRectsOverlap,
  subtractSourceRects,
} from '../src/world/shared/collisionHelpers.js'
import { MapSurfaceBuilder } from '../src/world/shared/MapSurfaceBuilder.js'
import { MapStructureBuilder } from '../src/world/shared/MapStructureBuilder.js'
import { MapDecorationBuilder } from '../src/world/shared/MapDecorationBuilder.js'
import { LandmarkBuilder } from '../src/world/landmarks/LandmarkBuilder.js'
import { ChurchInterior } from '../src/world/interiors/ChurchInterior.js'
import { ChurchDistrict } from '../src/world/ChurchDistrict.js'
import {
  MAP_INSPECTION_TARGETS,
  createMapInspectionTarget,
} from '../src/world/map/MapInspection.js'
import {
  MAP_MOBILITY_METADATA,
  MAP_MOBILITY_POLICY,
} from '../src/world/map/data/mapMobilityMetadata.js'

const SOURCE_COLLECTIONS = Object.freeze([
  'walkZones',
  'water',
  'groundPatches',
  'buildings',
  'shops',
  'vehicleShops',
  'landmarks',
  'collisionBlocks',
  'exits',
  'decorations',
  'parkingSpots',
  'interiorFixtures',
])

function approximately(actual, expected, epsilon = 1e-9, message = undefined) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    message ?? `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

function sourceCount(data, key) {
  if (key === 'terrain') return data.groundPatches.length + data.water.length
  if (key === 'fixtures') return data.interiorFixtures?.length ?? 0
  if (key === 'staticCollision') return data.collisionBlocks?.length ?? 0
  if (key === 'totalGeometryEntries') {
    return Object.entries(data.sourceCounts)
      .filter(([sourceKey]) => sourceKey !== 'totalGeometryEntries')
      .reduce((total, [, count]) => total + count, 0)
  }
  return data[key]?.length
}

function rawStaticCollisionCount(data) {
  return data.buildings.length +
    data.shops.length +
    (data.vehicleShops?.length ?? 0) +
    (data.collisionBlocks?.length ?? 0) +
    data.landmarks.filter((landmark) => landmark.solid !== false).length
}

function expectedCoverage(data) {
  return {
    terrain: data.groundPatches.length + data.water.length,
    roads: data.walkZones.length,
    buildings: data.buildings.length + data.shops.length + (data.vehicleShops?.length ?? 0),
    landmarks: data.landmarks.length,
    collision: rawStaticCollisionCount(data),
    connection: data.exits.length,
    environment: data.decorations.length + (data.parkingSpots?.length ?? 0),
    fixtures: data.interiorFixtures?.length ?? 0,
  }
}

function makeRecordingKit() {
  const calls = {
    box: [],
    cylinder: [],
    gable: [],
    instancedBoxes: [],
    sign: [],
    sphere: [],
  }

  const addObject = (method, parent, options = {}) => {
    calls[method].push(options)
    const object = new THREE.Object3D()
    object.name = options.name ?? ''
    parent.add(object)
    return object
  }

  return {
    calls,
    box(parent, options) { return addObject('box', parent, options) },
    cylinder(parent, options) { return addObject('cylinder', parent, options) },
    gable(parent, options) { return addObject('gable', parent, options) },
    instancedBoxes(parent, options) { return addObject('instancedBoxes', parent, options) },
    sign(parent, options) { return addObject('sign', parent, options) },
    sphere(parent, options) { return addObject('sphere', parent, options) },
    arch(parent, options) {
      calls.arch ??= []
      return addObject('arch', parent, options)
    },
    addCollider(colliders, x, z, width, depth, name) {
      colliders.push({ x, z, width, depth, name })
    },
  }
}

function installCanvasDocumentStub() {
  const previousDocument = globalThis.document
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
  }
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, 'canvas')
      return {
        width: 0,
        height: 0,
        getContext(contextType) {
          assert.equal(contextType, '2d')
          return context
        },
      }
    },
  }
  return () => {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

function buildRuntimeColliders(mapData) {
  const colliders = [
    ...buildStaticColliders(mapData),
    ...buildNonWalkableColliders(mapData),
  ]
  const parent = new THREE.Group()
  const kit = makeRecordingKit()
  new MapSurfaceBuilder({ kit, parent, mapData, colliders }).build()
  new MapDecorationBuilder({ kit, parent, mapData, colliders }).build()
  return colliders
}

function findReachableSourceCells(mapData) {
  const step = mapData.kind === 'churchInterior' ? 6 : 10
  const sourceRadius = 0.42 / MAP_COORDINATE_CONFIG[mapData.id].scale
  const staticRects = buildStaticSourceRects(mapData).flatMap((rect) => (
    subtractSourceRects(rect, getNavigationOpenings(mapData, rect))
  ))
  const columns = Math.ceil(mapData.width / step) + 1
  const rows = Math.ceil(mapData.height / step) + 1
  const cellIndex = (column, row) => row * columns + column
  const clear = new Uint8Array(columns * rows)

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point = {
        x: Math.min(mapData.width, column * step),
        y: Math.min(mapData.height, row * step),
      }
      if (
        isSourcePointWalkable(mapData, point) &&
        !staticRects.some((rect) => pointInSourceRect(point, rect, sourceRadius))
      ) {
        clear[cellIndex(column, row)] = 1
      }
    }
  }

  const nearestClearCell = (point) => {
    const baseColumn = Math.round(point.x / step)
    const baseRow = Math.round(point.y / step)
    for (let distance = 0; distance <= 8; distance += 1) {
      for (let rowOffset = -distance; rowOffset <= distance; rowOffset += 1) {
        for (let columnOffset = -distance; columnOffset <= distance; columnOffset += 1) {
          const column = baseColumn + columnOffset
          const row = baseRow + rowOffset
          if (
            column >= 0 && column < columns && row >= 0 && row < rows &&
            clear[cellIndex(column, row)]
          ) return { column, row }
        }
      }
    }
    return null
  }

  const start = nearestClearCell({
    x: mapData.spawn.x + 12,
    y: mapData.spawn.y + 16,
  })
  assert.ok(start, `${mapData.id} has no clear navigation cell near spawn`)
  const reachable = new Uint8Array(columns * rows)
  const queue = [start]
  reachable[cellIndex(start.column, start.row)] = 1

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]
    for (const [columnOffset, rowOffset] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const column = current.column + columnOffset
      const row = current.row + rowOffset
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue
      const index = cellIndex(column, row)
      if (!clear[index] || reachable[index]) continue
      reachable[index] = 1
      queue.push({ column, row })
    }
  }

  return {
    hasPathTo(point) {
      const cell = nearestClearCell(point)
      return Boolean(cell && reachable[cellIndex(cell.column, cell.row)])
    },
  }
}

test('map registry is complete, valid, and resolves every map/area alias', () => {
  assert.deepEqual(MAP_IDS, ['hoanKiem', 'baDinh', 'longBien', 'churchInterior'])
  assert.deepEqual(validateMapRegistry(), [])

  for (const mapId of MAP_IDS) {
    const definition = MAP_REGISTRY[mapId]
    const areaName = MAP_AREA_NAMES[mapId]
    assert.ok(definition, `${mapId} is missing from MAP_REGISTRY`)
    assert.equal(definition.id, mapId)
    assert.equal(definition.areaName, areaName)
    assert.equal(getMapDefinition(mapId), definition)
    assert.equal(getMapDefinition(areaName), definition)
    assert.equal(getAreaNameForMap(mapId), areaName)
    assert.equal(getMapIdForArea(areaName), mapId)
    assert.ok(definition.bounds.minX < definition.bounds.maxX)
    assert.ok(definition.bounds.minZ < definition.bounds.maxZ)
    assert.ok(Object.isFrozen(definition))
    assert.ok(Object.isFrozen(definition.exits))
  }

  assert.throws(() => getMapDefinition('missing-map'), /Unknown map or area/)
  assert.throws(() => resolveMapDestination(null), /Map destination/)
})

test('all migrated collection counts match sourceCounts and full coverage targets', () => {
  const fullRecords = {}

  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    for (const [key, expected] of Object.entries(data.sourceCounts)) {
      assert.equal(
        sourceCount(data, key),
        expected,
        `${mapId}.${key} drifted from the audited 2D source count`,
      )
    }

    assert.deepEqual(MAP_COVERAGE_TARGETS[mapId], expectedCoverage(data))
    const record = createFullCoverageRecord(mapId)
    assert.deepEqual(validateCoverageRecord(record), [])
    fullRecords[mapId] = record
  }

  const summary = getCoverageSummary(fullRecords)
  for (const mapId of MAP_IDS) {
    for (const category of COVERAGE_CATEGORIES) {
      assert.equal(summary[mapId][category].percent, 100)
      assert.equal(summary[mapId][category].completed, summary[mapId][category].total)
    }
  }
  assert.equal(coveragePercent(1, 3), 33.33)
  assert.equal(coveragePercent(0, 0), 100)

  // Chợ Đồng Xuân is intentionally represented once at runtime even though the
  // source collision audit counts both its building and solid landmark records.
  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    const deduplicated = buildStaticSourceRects(data).length
    const raw = MAP_COVERAGE_TARGETS[mapId].collision
    assert.equal(raw - deduplicated, mapId === 'longBien' ? 1 : 0)
  }
})

test('every migrated source object has a globally unique stable ID', () => {
  const seen = new Map()

  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    for (const collection of SOURCE_COLLECTIONS) {
      for (const entry of data[collection] ?? []) {
        assert.equal(typeof entry.id, 'string', `${mapId}.${collection} contains an entry without an ID`)
        assert.ok(entry.id.length > 0, `${mapId}.${collection} contains an empty ID`)
        assert.equal(
          seen.has(entry.id),
          false,
          `duplicate ID ${entry.id} in ${seen.get(entry.id)} and ${mapId}.${collection}`,
        )
        seen.set(entry.id, `${mapId}.${collection}`)
      }
    }
  }

  assert.equal(seen.size, 527)
  const worldExitIds = MAP_IDS.flatMap((mapId) => MAP_REGISTRY[mapId].exits.map((exit) => exit.id))
  assert.equal(new Set(worldExitIds).size, worldExitIds.length)
})

test('every static source entry is represented by its responsible builder', () => {
  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    const kit = makeRecordingKit()
    const parent = new THREE.Group()
    const colliders = []
    const surface = new MapSurfaceBuilder({ kit, parent, mapData: data, colliders }).build()
    const structures = new MapStructureBuilder({ kit, parent, mapData: data }).build()
    const landmarks = new LandmarkBuilder({
      kit, parent, mapData: data, colliders, existingLandmarks: {},
    }).build()
    const decorations = new MapDecorationBuilder({
      kit, parent, mapData: data, colliders,
    }).build()

    const surfaceIds = [
      ...data.groundPatches,
      ...data.water,
      ...data.walkZones,
      ...(data.parkingSpots ?? []),
    ].map((entry) => entry.id)
    const structureIds = [
      ...data.buildings,
      ...data.shops,
      ...(data.vehicleShops ?? []),
    ].map((entry) => entry.id)
    const landmarkIds = data.landmarks.map((entry) => entry.sourceId ?? entry.id)
    const decorationIds = data.decorations.map((entry) => entry.id)

    assert.deepEqual([...surface.meshesBySourceId.keys()], surfaceIds)
    assert.deepEqual([...structures.meshesBySourceId.keys()], structureIds)
    assert.deepEqual([...landmarks.groupsBySourceId.keys()], landmarkIds)
    assert.deepEqual([...decorations.groupsBySourceId.keys()], decorationIds)
  }
})

test('maps.js mobility fields are audited without adding vehicle gameplay', () => {
  assert.deepEqual(MAP_MOBILITY_POLICY, {
    parkingSpots: 'static-environment',
    vehicleRestrictedZones: 'metadata-only-vehicle-rule',
    ambientVehicles: 'metadata-only-gameplay-excluded',
  })
  const expected = {
    hoanKiem: { parkingSpots: 1, vehicleRestrictedZones: 1, ambientVehicles: 5 },
    baDinh: { parkingSpots: 2, vehicleRestrictedZones: 2, ambientVehicles: 3 },
    longBien: { parkingSpots: 1, vehicleRestrictedZones: 1, ambientVehicles: 5 },
    churchInterior: { parkingSpots: 0, vehicleRestrictedZones: 0, ambientVehicles: 0 },
  }
  const metadataIds = new Set()

  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    assert.equal(data.parkingSpots, MAP_MOBILITY_METADATA[mapId].parkingSpots)
    assert.equal(
      data.vehicleRestrictedZones,
      MAP_MOBILITY_METADATA[mapId].vehicleRestrictedZones,
    )
    assert.equal(data.ambientVehicles, MAP_MOBILITY_METADATA[mapId].ambientVehicles)
    assert.deepEqual(data.mobilitySourceCounts, expected[mapId])

    for (const collection of ['vehicleRestrictedZones', 'ambientVehicles']) {
      for (const entry of data[collection]) {
        assert.equal(metadataIds.has(entry.id), false, `duplicate mobility metadata ID ${entry.id}`)
        metadataIds.add(entry.id)
      }
    }

    const colliders = buildRuntimeColliders(data)
    const nonWalkingIds = new Set([
      ...data.parkingSpots,
      ...data.vehicleRestrictedZones,
      ...data.ambientVehicles,
    ].map((entry) => entry.id))
    assert.equal(
      colliders.some((collider) => nonWalkingIds.has(collider.sourceId)),
      false,
      `${mapId} mobility metadata must not create first-person collision`,
    )
  }

  assert.equal(metadataIds.size, 17)
})

test('central map coordinates preserve anchors, bounds, dimensions, and round trips', () => {
  assert.equal(MAP_SCALE.outdoor, 0.12)
  assert.equal(MAP_SCALE.interior, 0.025)

  for (const mapId of MAP_IDS) {
    const config = MAP_COORDINATE_CONFIG[mapId]
    const sourceBounds = mapCoordinates.sourceBounds(mapId)
    const anchor = mapCoordinates.point(mapId, config.sourceAnchor)
    approximately(anchor.x, config.worldAnchor.x)
    approximately(anchor.z, config.worldAnchor.z)

    const samples = [
      { x: sourceBounds.x, y: sourceBounds.y },
      config.sourceAnchor,
      {
        x: sourceBounds.x + sourceBounds.width,
        y: sourceBounds.y + sourceBounds.height,
      },
      {
        x: MAP_REGISTRY[mapId].data.spawn.x + 12,
        y: MAP_REGISTRY[mapId].data.spawn.y + 16,
      },
    ]
    for (const source of samples) {
      const world = mapCoordinates.point(mapId, source)
      const roundTrip = mapCoordinates.worldToSource(mapId, world)
      approximately(roundTrip.x, source.x)
      approximately(roundTrip.y, source.y)
    }

    const playerPoint = mapCoordinates.playerPoint(mapId, MAP_REGISTRY[mapId].data.spawn)
    const expectedPlayerPoint = mapCoordinates.point(mapId, samples.at(-1))
    approximately(playerPoint.x, expectedPlayerPoint.x)
    approximately(playerPoint.z, expectedPlayerPoint.z)

    const fullRect = mapCoordinates.rect(mapId, {
      x: sourceBounds.x,
      y: sourceBounds.y,
      width: sourceBounds.width,
      height: sourceBounds.height,
    })
    const bounds = mapCoordinates.bounds(mapId)
    approximately(fullRect.minX, bounds.minX)
    approximately(fullRect.maxX, bounds.maxX)
    approximately(fullRect.minZ, bounds.minZ)
    approximately(fullRect.maxZ, bounds.maxZ)
    approximately(fullRect.width, sourceBounds.width * config.scale)
    approximately(fullRect.depth, sourceBounds.height * config.scale)

    const sourceLeft = mapCoordinates.point(mapId, sourceBounds.x, config.sourceAnchor.y)
    const sourceRight = mapCoordinates.point(
      mapId,
      sourceBounds.x + sourceBounds.width,
      config.sourceAnchor.y,
    )
    assert.ok(sourceLeft.x > sourceRight.x, `${mapId} must consistently mirror source X`)
  }

  assert.throws(() => mapCoordinates.get('missing-map'), /Unknown map coordinate system/)
  assert.throws(() => mapCoordinates.point('hoanKiem', Number.NaN, 0), /Invalid 2D point/)
})

test('portals preserve source positions and resolve to walkable destination coordinates', () => {
  for (const sourceMapId of MAP_IDS) {
    const definition = MAP_REGISTRY[sourceMapId]
    assert.equal(definition.exits.length, definition.data.exits.length)

    definition.data.exits.forEach((sourceExit, index) => {
      const exit = definition.exits[index]
      const interaction = sourceExit.interactionPoint ?? {
        x: sourceExit.x + sourceExit.width / 2,
        y: sourceExit.y + sourceExit.height / 2,
        radius: 56,
      }
      const expectedPosition = mapCoordinates.point(sourceMapId, interaction)
      const expectedRadius = Math.max(
        2.35,
        Math.min(6.2, mapCoordinates.distance(sourceMapId, interaction.radius ?? 56)),
      )

      assert.equal(exit.id, sourceExit.sourceId ?? sourceExit.id)
      assert.equal(exit.sourceId, sourceExit.id)
      assert.equal(exit.sourceMapId, sourceMapId)
      assert.equal(exit.type, 'portal')
      approximately(exit.position.x, expectedPosition.x)
      assert.equal(exit.position.y, 0)
      approximately(exit.position.z, expectedPosition.z)
      approximately(exit.radius, expectedRadius)
      assert.ok(pointInSourceRect(interaction, sourceExit), `${sourceMapId}/${exit.id} interaction left its exit`)

      assert.equal(exit.target.mapId, sourceExit.targetMap)
      assert.deepEqual(exit.target.targetSource, {
        x: sourceExit.targetX,
        y: sourceExit.targetY,
      })
      const destination = resolveMapDestination(exit.target)
      const expectedSpawn = mapCoordinates.playerPoint(sourceExit.targetMap, {
        x: sourceExit.targetX,
        y: sourceExit.targetY,
      })
      approximately(destination.spawn.x, expectedSpawn.x)
      approximately(destination.spawn.z, expectedSpawn.z)
      assert.equal(destination.exitId, exit.id)

      const destinationSource = {
        x: sourceExit.targetX + 12,
        y: sourceExit.targetY + 16,
      }
      assert.equal(
        isSourcePointWalkable(MAP_REGISTRY[sourceExit.targetMap].data, destinationSource),
        true,
        `${sourceMapId}/${exit.id} lands outside a destination walk zone`,
      )
    })
  }
})

test('default spawns and every portal arrival remain clear in runtime collision sets', () => {
  const runtimeColliders = Object.fromEntries(MAP_IDS.map((mapId) => [
    mapId,
    buildRuntimeColliders(MAP_REGISTRY[mapId].data),
  ]))

  for (const mapId of MAP_IDS) {
    const definition = MAP_REGISTRY[mapId]
    assert.equal(
      isSourcePointWalkable(definition.data, {
        x: definition.data.spawn.x + 12,
        y: definition.data.spawn.y + 16,
      }),
      true,
      `${mapId} source spawn is outside all walk zones`,
    )
    assert.equal(
      isWorldSpawnClear({
        spawn: definition.spawn,
        bounds: definition.bounds,
        colliders: runtimeColliders[mapId],
      }),
      true,
      `${mapId} default spawn is blocked`,
    )
  }

  for (const source of Object.values(MAP_REGISTRY)) {
    for (const exit of source.exits) {
      const destination = resolveMapDestination(exit.target)
      assert.equal(
        isWorldSpawnClear({
          spawn: destination.spawn,
          bounds: destination.definition.bounds,
          colliders: runtimeColliders[destination.definition.id],
        }),
        true,
        `${source.id}/${exit.id} arrival is blocked in ${destination.definition.id}`,
      )
    }
  }
})

test('every map connects its spawn to all exits and landmark exploration points', () => {
  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    const navigation = findReachableSourceCells(data)
    const targets = [
      ...data.exits.map((exit) => ({
        id: `exit:${exit.id}`,
        point: exit.interactionPoint ?? {
          x: exit.x + exit.width / 2,
          y: exit.y + exit.height / 2,
        },
      })),
      ...data.landmarks.map((landmark) => ({
        id: `landmark:${landmark.sourceId ?? landmark.id}`,
        point: landmark.interactionPoint ?? {
          x: landmark.x + landmark.width / 2,
          y: landmark.y + landmark.height / 2,
        },
      })),
    ]

    for (const target of targets) {
      assert.equal(
        navigation.hasPathTo(target.point),
        true,
        `${mapId} spawn cannot reach ${target.id}`,
      )
    }
  }
})

test('Ba Dinh navigation repairs cut both Van Mieu gates out of wall colliders', () => {
  const data = MAP_REGISTRY.baDinh.data
  const sourceRects = buildStaticSourceRects(data)
  const colliders = buildStaticColliders(data)
  assert.equal(sourceRects.length, 31)
  assert.equal(colliders.length, 33, 'two wall openings should split two colliders')
  assert.equal(data.navigationRepairs.length, 2)

  for (const repair of data.navigationRepairs) {
    const wall = sourceRects.find((rect) => rect.id === repair.targetId)
    const walkZone = data.walkZones.find((zone) => zone.id === repair.alignsWithWalkZoneId)
    assert.ok(wall, `missing repaired wall ${repair.targetId}`)
    assert.ok(walkZone, `missing aligned walk zone ${repair.alignsWithWalkZoneId}`)
    assert.deepEqual(getNavigationOpenings(data, wall), [repair.opening])

    const gateCenter = {
      x: repair.opening.x + repair.opening.width / 2,
      y: repair.opening.y + repair.opening.height / 2,
    }
    assert.equal(pointInSourceRect(gateCenter, walkZone), true)
    const pieces = subtractSourceRects(wall, [repair.opening])
    assert.equal(pieces.length, 2)
    assert.equal(pieces.some((piece) => sourceRectsOverlap(piece, repair.opening)), false)
    assert.equal(
      pieces.reduce((total, piece) => total + piece.width * piece.height, 0),
      wall.width * wall.height - repair.opening.width * repair.opening.height,
    )

    const wallColliders = colliders.filter((collider) =>
      collider.sourceId === wall.id || collider.sourceId?.startsWith(`${wall.id}-part-`),
    )
    const worldGateCenter = mapCoordinates.point('baDinh', gateCenter)
    assert.equal(wallColliders.some((collider) => pointInWorldCollider(worldGateCenter, collider)), false)

    for (const sample of [
      { x: gateCenter.x, y: repair.opening.y - 10 },
      { x: gateCenter.x, y: repair.opening.y + repair.opening.height + 10 },
    ]) {
      const worldSample = mapCoordinates.point('baDinh', sample)
      assert.equal(
        wallColliders.some((collider) => pointInWorldCollider(worldSample, collider)),
        true,
        `${repair.id} removed more wall than its gate opening`,
      )
    }
  }
})

test('Hoan Kiem navigation repair connects Cau The Huc to the Ngoc Son plaza', () => {
  const data = MAP_REGISTRY.hoanKiem.data
  const [repair] = data.navigationRepairs
  const wall = buildStaticSourceRects(data).find((rect) => rect.id === repair.targetId)
  const bridge = data.walkZones.find((zone) => zone.kind === 'bridge')
  const plaza = data.walkZones.find((zone) => (
    zone.kind === 'plaza' && sourceRectsOverlap(zone, bridge)
  ))
  const gateCenter = {
    x: repair.opening.x + repair.opening.width / 2,
    y: repair.opening.y + repair.opening.height / 2,
  }

  assert.equal(data.navigationRepairs.length, 1)
  assert.ok(wall)
  assert.ok(bridge)
  assert.ok(plaza)
  assert.equal(pointInSourceRect(gateCenter, bridge), true)
  assert.equal(pointInSourceRect(gateCenter, plaza), true)
  assert.deepEqual(getNavigationOpenings(data, wall), [repair.opening])

  const wallColliders = buildStaticColliders(data).filter((collider) => (
    collider.sourceId === wall.id || collider.sourceId?.startsWith(`${wall.id}-part-`)
  ))
  const worldGateCenter = mapCoordinates.point('hoanKiem', gateCenter)
  assert.equal(wallColliders.length, 2)
  assert.equal(
    wallColliders.some((collider) => pointInWorldCollider(worldGateCenter, collider)),
    false,
  )
})

test('Long Bien water collision is cut around bridge decks and safety edges become colliders', () => {
  const data = MAP_REGISTRY.longBien.data
  const bridgeZones = data.walkZones.filter((zone) => zone.kind === 'bridge')
  const water = data.water[0]
  const expectedWaterPieces = subtractSourceRects(water, bridgeZones)
  assert.equal(bridgeZones.length, 2)
  assert.equal(data.bridgeSafety.decks.length, 2)
  assert.equal(data.bridgeSafety.fallEdges.length, 5)
  assert.equal(data.bridgeSafety.scenicDeadEnd.bridgeHasMapExit, false)
  assert.equal(data.bridgeSafety.scenicDeadEnd.terminalBarrierRequiredIn3d, true)
  assert.equal(data.bridgeSafety.rails.every((rail) => rail.collisionRequiredIn3d), true)

  for (const deck of data.bridgeSafety.decks) {
    assert.ok(bridgeZones.some((zone) => zone.id === deck.zoneId))
  }

  const surfaceColliders = []
  new MapSurfaceBuilder({
    kit: makeRecordingKit(),
    parent: new THREE.Group(),
    mapData: data,
    colliders: surfaceColliders,
  }).build()
  const waterColliders = surfaceColliders.filter((collider) => collider.kind === 'water')
  assert.equal(waterColliders.length, expectedWaterPieces.length)

  expectedWaterPieces.forEach((piece, index) => {
    const expected = mapCoordinates.collider('longBien', piece)
    const actual = waterColliders[index]
    approximately(actual.x, expected.x)
    approximately(actual.z, expected.z)
    approximately(actual.width, expected.width)
    approximately(actual.depth, expected.depth)
    assert.equal(actual.sourceWaterId, water.id)
  })

  for (const deck of data.bridgeSafety.decks) {
    const deckCenter = mapCoordinates.point('longBien', {
      x: deck.riverSpan.x + deck.riverSpan.width / 2,
      y: deck.riverSpan.y + deck.riverSpan.height / 2,
    })
    assert.equal(
      waterColliders.some((collider) => pointInWorldCollider(deckCenter, collider)),
      false,
      `${deck.zoneId} is blocked by river collision`,
    )
  }

  const expectedCutArea = bridgeZones.reduce((total, zone) => {
    const left = Math.max(water.x, zone.x)
    const top = Math.max(water.y, zone.y)
    const right = Math.min(water.x + water.width, zone.x + zone.width)
    const bottom = Math.min(water.y + water.height, zone.y + zone.height)
    return total + Math.max(0, right - left) * Math.max(0, bottom - top)
  }, 0)
  const remainingWaterArea = expectedWaterPieces.reduce(
    (total, piece) => total + piece.width * piece.height,
    0,
  )
  assert.equal(remainingWaterArea, water.width * water.height - expectedCutArea)

  const decorationColliders = []
  new MapDecorationBuilder({
    kit: makeRecordingKit(),
    parent: new THREE.Group(),
    mapData: data,
    colliders: decorationColliders,
  }).build()
  const safetyColliders = decorationColliders.filter((collider) => collider.kind === 'bridgeSafety')
  assert.deepEqual(
    safetyColliders.map((collider) => collider.sourceId),
    data.bridgeSafety.fallEdges.map((edge) => edge.id),
  )

  data.bridgeSafety.fallEdges.forEach((edge, index) => {
    const start = mapCoordinates.point('longBien', edge.x1, edge.y1)
    const end = mapCoordinates.point('longBien', edge.x2, edge.y2)
    const horizontal = Math.abs(start.x - end.x) >= Math.abs(start.z - end.z)
    const collider = safetyColliders[index]
    approximately(collider.x, (start.x + end.x) / 2)
    approximately(collider.z, (start.z + end.z) / 2)
    approximately(collider.width, horizontal ? Math.abs(start.x - end.x) : 0.32)
    approximately(collider.depth, horizontal ? 0.32 : Math.abs(start.z - end.z))
  })
})

test('ChurchInterior instantiates the exact migrated fixture and collision layout', () => {
  const kit = makeRecordingKit()
  const parent = new THREE.Group()
  const interior = new ChurchInterior({ kit, parent })

  assert.equal(interior.group.parent, parent)
  assert.equal(interior.group.visible, false)
  assert.equal(interior.mapData.layout.pews.length, 12)
  assert.equal(interior.mapData.layout.columns.length, 6)
  assert.equal(interior.mapData.layout.windows.length, 8)
  assert.equal(interior.mapData.interiorFixtures.length, 28)
  const fixtureKindCounts = Object.fromEntries(Object.entries(
    Object.groupBy(interior.mapData.interiorFixtures, (fixture) => fixture.kind),
  ).map(([kind, fixtures]) => [kind, fixtures.length]))
  assert.deepEqual(fixtureKindCounts, {
    sanctuary: 1,
    altar: 1,
    pew: 12,
    column: 6,
    stainedGlass: 8,
  })

  assert.equal(interior.sourceColliders.length, 24)
  assert.equal(interior.colliders.length, 28)
  assert.equal(interior.exits.length, 1)
  assert.deepEqual(interior.coverage, createFullCoverageRecord('churchInterior'))
  assert.equal(isWorldSpawnClear(interior), true)

  const pewGroups = interior.group.children.filter((child) =>
    child.userData.sourceRef?.startsWith('churchInterior:pew-'),
  )
  assert.equal(pewGroups.length, 12)
  assert.equal(kit.calls.box.length, 61)
  assert.equal(kit.calls.cylinder.length, 12)
  assert.equal(kit.calls.arch.length, 20)
  assert.equal(kit.calls.sphere.length, 4)
  assert.equal(interior.lighting.pendantLights.length, 4)
  assert.ok(interior.lighting.altarLight?.isSpotLight)
})

test('all inspection aliases resolve to clear positions facing their intended landmark', () => {
  assert.equal(Object.keys(MAP_INSPECTION_TARGETS).length, 13)
  const expectedMapViews = {
    'hoan-kiem': { x: 610, y: 1370 },
    interior: { x: 688, y: 850 },
    'church-interior': { x: 688, y: 850 },
    'long-bien': { x: 150, y: 890 },
  }

  for (const [alias, inspection] of Object.entries(MAP_INSPECTION_TARGETS)) {
    const data = MAP_REGISTRY[inspection.mapId].data
    const target = createMapInspectionTarget(inspection)
    assert.equal(typeof target, 'object', `${alias} must resolve to an explicit destination`)
    assert.equal(target.mapId, inspection.mapId)
    assert.equal(Number.isFinite(target.yaw), true)

    const sourceCenter = {
      x: target.targetSource.x + 12,
      y: target.targetSource.y + 16,
    }
    if (inspection.worldPoint) {
      const resolvedWorld = mapCoordinates.point(inspection.mapId, sourceCenter)
      approximately(resolvedWorld.x, inspection.worldPoint.x)
      approximately(resolvedWorld.z, inspection.worldPoint.z)
    } else {
      assert.equal(
        isSourcePointWalkable(data, sourceCenter),
        true,
        `${alias} source destination is not walkable`,
      )
    }
    if (expectedMapViews[alias]) {
      assert.deepEqual(target.targetSource, expectedMapViews[alias])
    }
    if (alias === 'van-mieu') {
      assert.deepEqual(target.targetSource, { x: 1088, y: 1234 })
    }

    const landmark = inspection.landmarkId
      ? data.landmarks.find((entry) => (
          entry.id === inspection.landmarkId || entry.sourceId === inspection.landmarkId
        ))
      : null
    const lookAtSource = inspection.lookAtSource ?? (landmark
      ? { x: landmark.x + landmark.width / 2, y: landmark.y + landmark.height / 2 }
      : null)
    if (inspection.lookAtWorld || lookAtSource) {
      const playerWorld = mapCoordinates.point(inspection.mapId, sourceCenter)
      const lookAtWorld = inspection.lookAtWorld
        ?? mapCoordinates.point(inspection.mapId, lookAtSource)
      approximately(
        target.yaw,
        Math.atan2(
          -(lookAtWorld.x - playerWorld.x),
          -(lookAtWorld.z - playerWorld.z),
        ),
      )
    }
  }

  assert.throws(
    () => createMapInspectionTarget({ mapId: 'missing-map' }),
    /Unknown inspection map/,
  )
  assert.throws(
    () => createMapInspectionTarget({ mapId: 'hoanKiem', landmarkId: 'missing-landmark' }),
    /Unknown inspection landmark/,
  )
})

test('ChurchDistrict mounts and transitions through all four registered maps', () => {
  const restoreDocument = installCanvasDocumentStub()
  const world = new ChurchDistrict(new THREE.Scene())

  try {
    assert.deepEqual(Object.keys(world.areas), ['outdoor', 'baDinh', 'longBien', 'interior'])
    for (const sourceId of ['building-056', 'building-057']) {
      const sourceGroup = world.hoanKiemCoverageDistrict.group.children.find(
        (object) => object.userData.sourceRef === `hoanKiem:${sourceId}`,
      )
      assert.equal(sourceGroup?.visible, false, `${sourceId} geometry must not block the expanded lake`)
      assert.equal(
        world.areas.outdoor.colliders
          .filter((collider) => collider.sourceId?.startsWith(sourceId))
          .every((collider) => collider.disabled),
        true,
        `${sourceId} collision must yield to the expanded lake boundary`,
      )
    }

    for (const mapId of MAP_IDS) {
      const definition = MAP_REGISTRY[mapId]
      const destination = world.transition(mapId)
      assert.equal(world.activeMapId, mapId)
      assert.equal(world.activeAreaName, definition.areaName)
      assert.equal(destination.mapId, mapId)
      assert.deepEqual(destination.bounds, definition.bounds)
      assert.ok(destination.colliders.length > 0)
      assert.equal(destination.portals.length, definition.exits.length)
      assert.equal(isWorldSpawnClear(destination), true)

      for (const portal of destination.portals) {
        assert.equal(
          destination.colliders.some((collider) => (
            !collider.disabled && pointInWorldCollider(portal.position, collider, 0.36)
          )),
          false,
          `${mapId}/${portal.id} portal is blocked in the mounted world`,
        )
      }
      for (const [areaName, area] of Object.entries(world.areas)) {
        assert.equal(area.group.visible, areaName === definition.areaName)
      }
    }

    for (const [alias, inspection] of Object.entries(MAP_INSPECTION_TARGETS)) {
      const area = Object.values(world.areas).find((candidate) => (
        candidate.mapId === inspection.mapId
      ))
      const target = createMapInspectionTarget(inspection, area)
      assert.equal(typeof target, 'object')
      if (alias === 'van-mieu') {
        assert.deepEqual(target.targetSource, { x: 1088, y: 1234 })
      }
      const destination = world.transition(target)
      assert.equal(
        isWorldSpawnClear(destination),
        true,
        `${alias} inspection destination is blocked`,
      )
    }

    for (const definition of Object.values(MAP_REGISTRY)) {
      for (const exit of definition.exits) {
        const destination = world.transition(exit.target)
        const expected = resolveMapDestination(exit.target)
        assert.equal(world.activeMapId, expected.definition.id)
        assert.equal(destination.exitId, exit.id)
        approximately(destination.spawn.x, expected.spawn.x)
        approximately(destination.spawn.z, expected.spawn.z)
        assert.equal(isWorldSpawnClear(destination), true)
      }
    }
  } finally {
    world.dispose()
    restoreDocument()
  }
})
