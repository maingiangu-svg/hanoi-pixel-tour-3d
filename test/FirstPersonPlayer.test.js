import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  FirstPersonPlayer,
  PLAYER_JUMP_CONFIG,
} from '../src/player/FirstPersonPlayer.js'
import { PlayerCollision } from '../src/player/PlayerCollision.js'

function createPlayer(running = false) {
  const player = Object.create(FirstPersonPlayer.prototype)
  player.camera = new THREE.PerspectiveCamera()
  player.camera.position.set(0, 1.68, 0)
  player.camera.up.set(0, 1, 0)
  player.controls = { isLocked: true }
  let jumpQueued = false
  player.input = {
    getMovement: () => ({ forward: 1, right: 0, running }),
    consumeJump: () => {
      const queued = jumpQueued
      jumpQueued = false
      return queued
    },
    queueJump: () => {
      jumpQueued = true
    },
  }
  player.collision = new PlayerCollision({
    colliders: [],
    bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  })
  player.forward = new THREE.Vector3()
  player.right = new THREE.Vector3()
  player.displacement = new THREE.Vector3()
  player.verticalVelocity = 0
  player.grounded = true
  player.groundedDuration = Infinity
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

test('Space produces a low natural jump and lands without camera residue', () => {
  const player = createPlayer(false)
  player.input.getMovement = () => ({ forward: 0, right: 0, running: false })
  player.input.queueJump()
  let maxEyeY = player.camera.position.y

  for (let frame = 0; frame < 60; frame += 1) {
    player.update(1 / 60)
    maxEyeY = Math.max(maxEyeY, player.camera.position.y)
  }

  const jumpHeight = maxEyeY - 1.68
  assert.ok(jumpHeight >= 0.45 && jumpHeight <= 0.7)
  assert.equal(player.grounded, true)
  assert.equal(player.verticalVelocity, 0)
  assert.ok(Math.abs(player.camera.position.y - 1.68) < 0.0001)
  assert.ok(PLAYER_JUMP_CONFIG.expectedHeight >= 0.45)
})

test('a queued jump while airborne cannot reset vertical velocity', () => {
  const player = createPlayer(false)
  player.input.getMovement = () => ({ forward: 0, right: 0, running: false })
  player.input.queueJump()
  player.update(1 / 60)

  for (let frame = 0; frame < 5; frame += 1) player.update(1 / 60)
  const velocityBeforeSecondRequest = player.verticalVelocity
  player.input.queueJump()
  player.update(1 / 60)

  assert.equal(player.grounded, false)
  assert.ok(player.verticalVelocity < velocityBeforeSecondRequest)
})

test('landing requires a short grounded beat before another jump', () => {
  const player = createPlayer(false)
  player.input.getMovement = () => ({ forward: 0, right: 0, running: false })
  player.input.queueJump()
  player.update(1 / 60)
  while (!player.grounded) player.update(1 / 60)

  player.input.queueJump()
  player.update(1 / 60)
  assert.equal(player.grounded, true)

  for (let frame = 0; frame < 6; frame += 1) player.update(1 / 60)
  player.input.queueJump()
  player.update(1 / 60)
  assert.equal(player.grounded, false)
})

function simulateJumpAtFps(fps) {
  const player = createPlayer(false)
  player.input.getMovement = () => ({ forward: 0, right: 0, running: false })
  player.input.queueJump()
  let maxEyeY = player.camera.position.y
  for (let frame = 0; frame < fps; frame += 1) {
    player.update(1 / fps)
    maxEyeY = Math.max(maxEyeY, player.camera.position.y)
  }
  return { maxEyeY, finalY: player.camera.position.y, grounded: player.grounded }
}

test('jump trajectory is effectively identical at 30 and 60 FPS', () => {
  const thirty = simulateJumpAtFps(30)
  const sixty = simulateJumpAtFps(60)

  assert.ok(Math.abs(thirty.maxEyeY - sixty.maxEyeY) < 0.005)
  assert.ok(Math.abs(thirty.finalY - sixty.finalY) < 0.0001)
  assert.equal(thirty.grounded, true)
  assert.equal(sixty.grounded, true)
})

test('horizontal wall collision remains active for the whole jump', () => {
  const player = createPlayer(false)
  player.collision = new PlayerCollision({
    colliders: [{ minX: -2, maxX: 2, minZ: -1.2, maxZ: -1 }],
    bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  })
  player.input.queueJump()

  for (let frame = 0; frame < 30; frame += 1) player.update(1 / 60)

  assert.ok(player.camera.position.z >= -0.6401)
  assert.ok(player.camera.position.y >= 1.68)
})
