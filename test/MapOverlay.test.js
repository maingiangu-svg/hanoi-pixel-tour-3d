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
    assert.equal(view.mapId, mapId)
    assert.equal(view.name, MAP_REGISTRY[mapId].name)
    assert.equal(view.width, data.width)
    assert.equal(view.height, data.height)
    assert.equal(view.groundPatches.length, data.groundPatches.length)
    assert.equal(view.water.length, data.water.length)
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
    const world = mapCoordinates.point(mapId, { x: -100, y: -50 })
    const marker = projectWorldPositionToMap(mapId, world)
    approximately(marker.rawX, -100)
    approximately(marker.rawY, -50)
    assert.equal(marker.x, 0)
    assert.equal(marker.y, 0)
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
