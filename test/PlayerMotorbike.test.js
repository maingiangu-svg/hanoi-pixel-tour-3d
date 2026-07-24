import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PlayerMotorbike } from '../src/player/PlayerMotorbike.js'

function approximately(actual, expected, epsilon = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

test('player motorbike starts hidden and includes a low-poly NPC rider', () => {
  const parent = new THREE.Group()
  const motorbike = new PlayerMotorbike({ parent })

  assert.equal(motorbike.group.parent, parent)
  assert.equal(motorbike.group.visible, false)
  assert.equal(motorbike.mounted, false)
  assert.equal(motorbike.rider.preset.id, 'motorbikeDriver')
  assert.equal(motorbike.rider.behavior, 'seated')
  assert.equal(motorbike.rider.group.parent, motorbike.group)

  let meshCount = 0
  motorbike.group.traverse((object) => {
    if (object.isMesh) meshCount += 1
  })
  assert.ok(meshCount >= 20, 'bike and default avatar should both be visibly modelled')

  motorbike.dispose()
})

test('mount visibility, world transform, heading, and wheel travel stay synchronized', () => {
  const motorbike = new PlayerMotorbike()
  motorbike.setMounted(true)

  motorbike.update(0.05, {
    position: new THREE.Vector3(4, 1.68, -2),
    groundHeight: 0.35,
    heading: 0.8,
    distance: 0.68,
  })

  assert.equal(motorbike.mounted, true)
  assert.equal(motorbike.group.visible, true)
  assert.deepEqual(motorbike.group.position.toArray(), [4, 0.35, -2])
  approximately(motorbike.group.rotation.y, 0.8)
  approximately(motorbike.wheelRotation, -2)
  assert.equal(motorbike.wheelSpins.length, 2)
  for (const wheel of motorbike.wheelSpins) {
    approximately(wheel.rotation.x, -2)
  }

  motorbike.setMounted(false)
  const parkedPosition = motorbike.group.position.clone()
  motorbike.update(0.05, {
    position: new THREE.Vector3(10, 1.68, 10),
    heading: 1.4,
    distance: 2,
  })
  assert.equal(motorbike.group.visible, false)
  assert.ok(motorbike.group.position.equals(parkedPosition))

  motorbike.dispose()
})

test('disposing the player motorbike removes its visual root and rider once', () => {
  const parent = new THREE.Group()
  const motorbike = new PlayerMotorbike({ parent })
  motorbike.setMounted(true)

  motorbike.dispose()
  motorbike.dispose()

  assert.equal(motorbike.disposed, true)
  assert.equal(motorbike.mounted, false)
  assert.equal(motorbike.group.parent, null)
  assert.equal(motorbike.rider.disposed, true)
})
