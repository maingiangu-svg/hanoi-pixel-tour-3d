import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { FirstPersonPlayer } from '../src/player/FirstPersonPlayer.js'

function createPlayer(running) {
  const player = Object.create(FirstPersonPlayer.prototype)
  player.camera = new THREE.PerspectiveCamera()
  player.camera.position.set(0, 8, 0)
  player.camera.up.set(0, 1, 0)
  player.controls = { isLocked: true }
  player.input = {
    getMovement: () => ({ forward: 1, right: 0, running }),
  }
  player.collision = {
    move: (position, displacement) => position.add(displacement),
  }
  player.forward = new THREE.Vector3()
  player.right = new THREE.Vector3()
  player.displacement = new THREE.Vector3()
  return player
}

test('movement is delta-time based and keeps the eye on the ground plane', () => {
  const player = createPlayer(false)

  player.update(1 / 60)

  assert.ok(Math.abs(player.camera.position.z + 0.06) < 0.0001)
  assert.equal(player.camera.position.y, 1.68)
})

test('Shift run is faster than walking but remains bounded', () => {
  const walker = createPlayer(false)
  const runner = createPlayer(true)

  walker.update(0.05)
  runner.update(0.05)

  const walkDistance = Math.abs(walker.camera.position.z)
  const runDistance = Math.abs(runner.camera.position.z)
  assert.ok(runDistance > walkDistance)
  assert.ok(runDistance < 0.3)
})

test('large frame gaps are clamped to prevent collision tunnelling', () => {
  const player = createPlayer(true)

  player.update(2)

  assert.ok(Math.abs(player.camera.position.z) <= 0.2901)
})
