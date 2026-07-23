import test from 'node:test'
import assert from 'node:assert/strict'
import { getOutdoorGroundHeight } from '../src/world/ChurchDistrict.js'

test('roads, plazas and regular map ground stay on the shared zero plane', () => {
  assert.equal(getOutdoorGroundHeight({ x: 0, z: 13 }), 0)
  assert.equal(getOutdoorGroundHeight({ x: 68, z: -3 }), 0)
  assert.equal(getOutdoorGroundHeight({ x: -100, z: 50 }), 0)
})

test('Cầu Thê Húc ground sampler follows its shallow arch and joins the island', () => {
  const bridgeStart = getOutdoorGroundHeight({ x: 119, z: 33.7 })
  const bridgeMiddle = getOutdoorGroundHeight({ x: 119, z: 39.35 })
  const bridgeEnd = getOutdoorGroundHeight({ x: 119, z: 45 })
  const island = getOutdoorGroundHeight({ x: 119, z: 52 })

  assert.ok(Math.abs(bridgeStart - 0.23) < 0.0001)
  assert.ok(Math.abs(bridgeMiddle - 0.47) < 0.0001)
  assert.ok(bridgeEnd >= 0.23 && bridgeEnd < bridgeMiddle)
  assert.equal(island, 0.16)
})
