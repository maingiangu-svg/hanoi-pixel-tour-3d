import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PlayerCollision } from '../src/player/PlayerCollision.js'
import { HOAN_KIEM_WATER_COLLIDERS } from '../src/world/HoanKiemDistrict.js'

function lakeCollision() {
  return new PlayerCollision({
    bounds: { minX: 64, maxX: 143, minZ: -43, maxZ: 60 },
    colliders: HOAN_KIEM_WATER_COLLIDERS.map(({ x, z, width, depth, name }) => ({
      name,
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    })),
  })
}

test('the west promenade cannot cross the Hồ Gươm water collider', () => {
  const collision = lakeCollision()
  const position = new THREE.Vector3(68, 0, 0)

  collision.move(position, new THREE.Vector3(12, 0, 0))

  assert.ok(position.x <= 71.6401)
})

test('the Thê Húc corridor remains open while water blocks both sides', () => {
  const collision = lakeCollision()
  const center = new THREE.Vector3(119, 0, 33.7)

  collision.move(center, new THREE.Vector3(0, 0, 11))
  assert.ok(center.z > 44)
  assert.equal(center.x, 119)

  const side = new THREE.Vector3(119, 0, 38)
  collision.move(side, new THREE.Vector3(4, 0, 0))
  assert.ok(side.x <= 120.5401)
})
