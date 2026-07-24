import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_IDS, MAP_REGISTRY } from '../src/world/map/MapRegistry.js'
import { mapCoordinates } from '../src/world/map/MapCoordinateSystem.js'
import {
  createMapViewModel,
  getMapHotkeyAction,
  projectWorldPositionToMap,
} from '../src/ui/MapOverlay.js'

function approximately(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

test('map overlay view models expose the complete current-map topology', () => {
  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    const view = createMapViewModel(mapId)
    const sourceBounds = mapCoordinates.sourceBounds(mapId)
    assert.equal(view.mapId, mapId)
    assert.equal(view.name, MAP_REGISTRY[mapId].name)
    assert.equal(view.minX, sourceBounds.x)
    assert.equal(view.minY, sourceBounds.y)
    assert.equal(view.width, sourceBounds.width)
    assert.equal(view.height, sourceBounds.height)
    assert.equal(view.groundPatches.length, data.groundPatches.length)
    assert.equal(
      view.water.length + (view.expansion?.waterPolygons.length ?? 0),
      data.water.length,
    )
    assert.equal(view.walkZones.length, data.walkZones.length)
    assert.equal(view.buildings.length, data.buildings.length)
    assert.equal(
      view.shops.length,
      data.shops.length + (data.vehicleShops?.length ?? 0),
    )
    assert.equal(view.landmarks.length, data.landmarks.length)
    assert.equal(view.exits.length, data.exits.length)
    assert.equal(view.parkingSpots.length, data.parkingSpots.length)
    assert.equal(view.fixtures.length, data.interiorFixtures?.length ?? 0)
    if (mapId === 'hoanKiem') {
      assert.ok(view.expansion.roads.length >= 4)
      assert.ok(view.expansion.plazas.length >= 2)
      assert.equal(view.expansion.promenadePolygons.length, 1)
      assert.ok(view.expansion.pedestrianZones.length >= 8)
      assert.ok(view.expansion.urbanRoads.length >= 4)
      assert.ok(view.expansion.urbanBuildings.length >= 30)
      const bridge = view.landmarks.find((landmark) => landmark.sourceId === 'cauTheHuc')
      const bridgeCenter = mapCoordinates.worldToSource('hoanKiem', { x: 119, z: 39.35 })
      approximately(bridge.x + bridge.width / 2, bridgeCenter.x)
      approximately(bridge.y + bridge.height / 2, bridgeCenter.y)
      const temple = view.landmarks.find((landmark) => landmark.sourceId === 'denNgocSon')
      const templePoint = mapCoordinates.worldToSource('hoanKiem', { x: 119, z: 48.5 })
      approximately(temple.interactionPoint.x, templePoint.x)
      approximately(temple.interactionPoint.y, templePoint.y)
    }
  }
  assert.throws(() => createMapViewModel('missing-map'), /Unknown map overlay map/)
})

test('registered world spawns project to the exact player center on all maps', () => {
  for (const mapId of MAP_IDS) {
    const data = MAP_REGISTRY[mapId].data
    const marker = projectWorldPositionToMap(mapId, MAP_REGISTRY[mapId].spawn)
    approximately(marker.rawX, data.spawn.x + 12)
    approximately(marker.rawY, data.spawn.y + 16)
    approximately(marker.x, data.spawn.x + 12)
    approximately(marker.y, data.spawn.y + 16)
    assert.equal(marker.inside, true)
  }
})

test('map marker heading follows camera direction through mirrored coordinates', () => {
  for (const mapId of MAP_IDS) {
    const position = MAP_REGISTRY[mapId].spawn
    approximately(projectWorldPositionToMap(mapId, position, { x: 1, z: 0 }).heading, 270)
    approximately(projectWorldPositionToMap(mapId, position, { x: 0, z: 1 }).heading, 180)
    approximately(projectWorldPositionToMap(mapId, position, { x: 0, z: -1 }).heading, 0)
  }
})

test('out-of-bounds positions are clamped while retaining their raw source coordinates', () => {
  for (const mapId of MAP_IDS) {
    const sourceBounds = mapCoordinates.sourceBounds(mapId)
    const outside = {
      x: sourceBounds.x - 100,
      y: sourceBounds.y - 50,
    }
    const world = mapCoordinates.point(mapId, outside)
    const marker = projectWorldPositionToMap(mapId, world)
    approximately(marker.rawX, outside.x)
    approximately(marker.rawY, outside.y)
    assert.equal(marker.x, sourceBounds.x)
    assert.equal(marker.y, sourceBounds.y)
    assert.equal(marker.inside, false)
  }
  assert.throws(
    () => projectWorldPositionToMap('hoanKiem', { x: Number.NaN, z: 0 }),
    /finite world X\/Z position/,
  )
})

test('M toggles the map, Escape closes it, and held keys are ignored', () => {
  assert.equal(getMapHotkeyAction({ code: 'KeyM', repeat: false }, false), 'open')
  assert.equal(getMapHotkeyAction({ code: 'KeyM', repeat: false }, true), 'close-resume')
  assert.equal(getMapHotkeyAction({ code: 'Escape', repeat: false }, true), 'close')
  assert.equal(getMapHotkeyAction({ code: 'Escape', repeat: false }, false), null)
  assert.equal(getMapHotkeyAction({ code: 'KeyM', repeat: true }, false), null)
  assert.equal(getMapHotkeyAction({ code: 'KeyW', repeat: false }, false), null)
})
