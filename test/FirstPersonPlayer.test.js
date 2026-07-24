import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  FirstPersonPlayer,
  PLAYER_JUMP_CONFIG,
  PLAYER_MOVEMENT_CONFIG,
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
  player.viewForward = new THREE.Vector3()
  player.thirdPersonTarget = new THREE.Vector3()
  player.thirdPersonLookAt = new THREE.Vector3()
  player.thirdPersonDesired = new THREE.Vector3()
  player.thirdPersonCamera = new THREE.PerspectiveCamera()
  player.motorbikeHeading = 0
  player.isMotorbikeMounted = false
  player.onViewCameraChange = null
  player.motorbike = {
    mounted: false,
    updates: [],
    setMounted(mounted) {
      this.mounted = Boolean(mounted)
    },
    update(deltaTime, state) {
      this.updates.push({
        deltaTime,
        position: state.position.clone(),
        groundHeight: state.groundHeight,
        heading: state.heading,
        distance: state.distance,
      })
    },
    dispose() {},
  }
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

test('motorbike movement is exactly five times normal walking speed', () => {
  const walker = createPlayer(false)
  const rider = createPlayer(false)
  rider.setMotorbikeMounted(true)

  walker.update(0.05)
  rider.update(0.05)

  const walkDistance = Math.abs(walker.camera.position.z)
  const motorbikeDistance = Math.abs(rider.camera.position.z)
  assert.equal(PLAYER_MOVEMENT_CONFIG.motorbikeMultiplier, 5)
  assert.equal(
    PLAYER_MOVEMENT_CONFIG.motorbikeSpeed,
    PLAYER_MOVEMENT_CONFIG.walkSpeed * 5,
  )
  assert.ok(Math.abs(motorbikeDistance / walkDistance - 5) < 0.000001)
})

test('Shift cannot stack running speed on top of the motorbike multiplier', () => {
  const normalRider = createPlayer(false)
  const shiftedRider = createPlayer(true)
  normalRider.setMotorbikeMounted(true)
  shiftedRider.setMotorbikeMounted(true)

  normalRider.update(0.05)
  shiftedRider.update(0.05)

  assert.ok(
    Math.abs(normalRider.camera.position.z - shiftedRider.camera.position.z) < 0.000001,
  )
})

test('mounting switches camera and visual state, then restores first person on dismount', () => {
  const player = createPlayer(false)
  const cameraChanges = []
  player.onViewCameraChange = (camera) => cameraChanges.push(camera)

  assert.equal(player.getRenderCamera(), player.camera)
  assert.equal(player.toggleMotorbike(), true)
  assert.equal(player.motorbike.mounted, true)
  assert.equal(player.getRenderCamera(), player.thirdPersonCamera)
  assert.equal(cameraChanges.at(-1), player.thirdPersonCamera)

  const horizontalCameraOffset = Math.hypot(
    player.thirdPersonCamera.position.x - player.camera.position.x,
    player.thirdPersonCamera.position.z - player.camera.position.z,
  )
  assert.ok(horizontalCameraOffset > 4.7)
  assert.ok(player.thirdPersonCamera.position.y > player.camera.position.y)
  assert.ok(player.motorbike.updates.length >= 1)
  assert.ok(player.motorbike.updates.at(-1).position.equals(player.camera.position))

  assert.equal(player.toggleMotorbike(), false)
  assert.equal(player.motorbike.mounted, false)
  assert.equal(player.getRenderCamera(), player.camera)
  assert.equal(cameraChanges.at(-1), player.camera)
})

test('third-person camera retracts before a wall behind the rider', () => {
  const player = createPlayer(false)
  player.collision = new PlayerCollision({
    colliders: [{ minX: -2, maxX: 2, minZ: 1.5, maxZ: 1.8 }],
    bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  })

  player.setMotorbikeMounted(true)

  assert.ok(player.thirdPersonCamera.position.z > 0)
  assert.ok(player.thirdPersonCamera.position.z < 1.28)
  assert.ok(player.thirdPersonCamera.position.y > player.camera.position.y)
})

test('third-person camera also retracts before visible geometry without a collider', () => {
  const player = createPlayer(false)
  player.scene = new THREE.Scene()
  player.thirdPersonRayOrigin = new THREE.Vector3()
  player.thirdPersonRayDirection = new THREE.Vector3()
  player.cameraRaycaster = new THREE.Raycaster()
  player.cameraIntersections = []
  const decorativeWall = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4, 0.3),
    new THREE.MeshBasicMaterial(),
  )
  decorativeWall.position.set(0, 1.7, 1.55)
  player.scene.add(decorativeWall)
  player.scene.updateMatrixWorld(true)

  player.setMotorbikeMounted(true)

  assert.ok(player.thirdPersonCamera.position.z > 0)
  assert.ok(player.thirdPersonCamera.position.z < 1.35)
  decorativeWall.geometry.dispose()
  decorativeWall.material.dispose()
})

test('Space is consumed but cannot launch the player while riding', () => {
  const player = createPlayer(false)
  player.input.getMovement = () => ({ forward: 0, right: 0, running: false })
  player.setMotorbikeMounted(true)
  player.input.queueJump()

  player.update(1 / 60)

  assert.equal(player.isMotorbikeMounted, true)
  assert.equal(player.grounded, true)
  assert.equal(player.verticalVelocity, 0)
  assert.ok(Math.abs(player.camera.position.y - 1.68) < 0.0001)
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
