import test from 'node:test'
import assert from 'node:assert/strict'
import { PlayerCollision } from '../src/player/PlayerCollision.js'

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }
const wall = { minX: 1, maxX: 2, minZ: -2, maxZ: 2 }

test('player cannot leave world bounds', () => {
  const collision = new PlayerCollision({ colliders: [], bounds, radius: 0.5 })
  const position = { x: 0, z: 0 }

  collision.move(position, { x: 20, z: -20 })

  assert.equal(position.x, 4.5)
  assert.equal(position.z, -4.5)
})

test('player cannot tunnel through a building', () => {
  const collision = new PlayerCollision({ colliders: [wall], bounds, radius: 0.5 })
  const position = { x: 0, z: 0 }

  collision.move(position, { x: 4, z: 0 })

  assert.ok(position.x <= 0.5001)
})

test('diagonal movement slides along a wall', () => {
  const collision = new PlayerCollision({ colliders: [wall], bounds, radius: 0.5 })
  const position = { x: 0, z: 0 }

  collision.move(position, { x: 2, z: 1 })

  assert.ok(position.x <= 0.5001)
  assert.ok(position.z > 0.8)
})

test('corner resolution stays outside both obstacles', () => {
  const corner = [
    { minX: 1, maxX: 2, minZ: -2, maxZ: 1 },
    { minX: -2, maxX: 2, minZ: 1, maxZ: 2 },
  ]
  const collision = new PlayerCollision({ colliders: corner, bounds, radius: 0.5 })
  const position = { x: 0, z: 0 }

  collision.move(position, { x: 2, z: 2 })

  const overlaps = corner.some((box) => {
    const x = Math.max(box.minX, Math.min(position.x, box.maxX))
    const z = Math.max(box.minZ, Math.min(position.z, box.maxZ))
    return Math.hypot(position.x - x, position.z - z) < 0.4999
  })

  assert.equal(overlaps, false)
})

test('collision world can switch without recreating the player', () => {
  const collision = new PlayerCollision({ colliders: [wall], bounds, radius: 0.5 })
  const interiorBounds = { minX: -2, maxX: 2, minZ: -3, maxZ: 3 }

  collision.setWorld({ colliders: [], bounds: interiorBounds })
  const position = { x: 0, z: 0 }
  collision.move(position, { x: 10, z: 10 })

  assert.equal(position.x, 1.5)
  assert.equal(position.z, 2.5)
})
