import assert from 'node:assert/strict'
import test from 'node:test'
import { FAST_TRAVEL_STOPS, FastTravelSystem } from '../src/systems/FastTravelSystem.js'

test('FastTravelSystem lists all defined stops with names and coordinates', () => {
  const system = new FastTravelSystem()
  const stops = system.getStops()

  assert.equal(stops.length, 6)
  assert.equal(stops[0].id, 'bus-church')
  assert.equal(stops[0].name, 'Trạm Bus Nhà Thờ Lớn')
  assert.equal(stops[0].type, 'bus')
})

test('FastTravelSystem retrieves stop by ID correctly', () => {
  const system = new FastTravelSystem()
  const stop = system.getStopById('xeom-old-quarter')

  assert.notEqual(stop, null)
  assert.equal(stop.name, 'Bến Xe Ôm Phố Cổ (Hàng Bạc)')
  assert.equal(stop.type, 'xeom')
  assert.equal(system.getStopById('invalid-id'), null)
})

test('FastTravelSystem teleports player to target stop coordinates and yaw', () => {
  let teleportedSpawn = null
  let teleportedYaw = null
  let noticeShown = null

  const mockPlayer = {
    teleport(spawn, yaw) {
      teleportedSpawn = spawn
      teleportedYaw = yaw
    },
  }

  const mockUi = {
    showNotice(text) {
      noticeShown = text
    },
  }

  const system = new FastTravelSystem({ player: mockPlayer, ui: mockUi })
  const result = system.travelToStop('bus-lake-west')

  assert.equal(result, true)
  assert.deepEqual(teleportedSpawn, { x: 68, z: -3 })
  assert.equal(teleportedYaw, -Math.PI / 2)
  assert.match(noticeShown, /Trạm Bus Bờ Hồ/)
})
