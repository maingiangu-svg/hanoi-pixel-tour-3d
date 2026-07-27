import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CinematicManager } from '../src/cinematics/CinematicManager.js'
import { CinematicPoint } from '../src/cinematics/CinematicPoint.js'
import { CinematicTimeline } from '../src/cinematics/CinematicTimeline.js'

function dispatchKey(target, code) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: false },
  })
  target.dispatchEvent(event)
  return event
}

function createHarness() {
  const eventTarget = new EventTarget()
  const playerCamera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 150)
  playerCamera.position.set(0, 1.68, 6)
  playerCamera.rotation.set(0, Math.PI, 0)
  const controls = {
    isLocked: true,
    unlock() {
      this.isLocked = false
    },
  }
  const calls = {
    activeCameras: [],
    input: [],
    interactions: [],
    cinematic: [],
    open: [],
    fades: [],
    title: [],
    paused: [],
    resumed: [],
    locks: 0,
  }
  const player = {
    camera: playerCamera,
    controls,
    isMotorbikeMounted: false,
    lock() {
      calls.locks += 1
      controls.isLocked = true
    },
    getRenderCamera: () => playerCamera,
  }
  const manager = new CinematicManager({
    renderer: {
      setActiveCamera: (camera) => calls.activeCameras.push(camera),
    },
    player,
    input: {
      setEnabled: (enabled) => calls.input.push(enabled),
      reset: () => {},
    },
    gameUi: {
      setInteraction: (label) => calls.interactions.push(label),
      setCinematicActive: (active) => calls.cinematic.push(active),
      setLocked: () => {},
      setResumeMode: () => {},
    },
    overlay: {
      setOpen: (open) => calls.open.push(open),
      setFade: (fade) => calls.fades.push(fade),
      setTitleVisible: (visible) => calls.title.push(visible),
      dispose: () => {},
    },
    world: {
      activeAreaName: 'outdoor',
      getActiveDistrictNames: () => ['churchDistrict'],
    },
    clock: {
      pause: (reason) => calls.paused.push(reason),
      resume: (reason) => calls.resumed.push(reason),
    },
    eventTarget,
  })
  manager.registerPoint(new CinematicPoint({
    id: 'test-church',
    region: 'churchDistrict',
    position: { x: 0, z: 6 },
    radius: 3,
    title: 'Nhà thờ',
    timeline: ({ playerPose }) => new CinematicTimeline({
      shots: [
        {
          position: { x: 0, y: 3, z: 12 },
          target: { x: 0, y: 4, z: 0 },
          duration: 0.05,
          holdTime: 0.05,
          fov: 55,
        },
        {
          position: playerPose.position,
          target: { x: 0, y: 1.68, z: 0 },
          duration: 0.05,
          holdTime: 0,
          fov: playerPose.fov,
        },
      ],
    }),
  }))
  return { manager, player, playerCamera, controls, eventTarget, calls }
}

test('cinematic point only exposes its E interaction near the matching region', () => {
  const harness = createHarness()
  const interactions = harness.manager.getNearbyInteractions(
    harness.playerCamera.position,
  )
  assert.equal(interactions.length, 1)
  assert.equal(interactions[0].label, 'Xem đoạn giới thiệu')

  harness.playerCamera.position.x = 10
  assert.deepEqual(
    harness.manager.getNearbyInteractions(harness.playerCamera.position),
    [],
  )
  harness.manager.dispose()
})

test('starting a cinematic swaps camera, locks gameplay and exits pointer lock', () => {
  const harness = createHarness()
  const originalPosition = harness.playerCamera.position.clone()
  const originalQuaternion = harness.playerCamera.quaternion.clone()

  assert.equal(harness.manager.startPoint('test-church'), true)
  assert.equal(harness.manager.isActive(), true)
  assert.equal(harness.controls.isLocked, false)
  assert.equal(harness.calls.activeCameras.at(-1), harness.manager.camera)
  assert.equal(harness.calls.input.at(-1), false)
  assert.equal(harness.calls.cinematic.at(-1), true)
  assert.deepEqual(harness.calls.paused, ['cinematic'])
  assert.ok(harness.playerCamera.position.equals(originalPosition))
  assert.ok(harness.playerCamera.quaternion.equals(originalQuaternion))
  harness.manager.dispose()
})

test('Space skips without jumping and restores the exact player camera and FOV', () => {
  const harness = createHarness()
  const savedPosition = harness.playerCamera.position.clone()
  const savedQuaternion = harness.playerCamera.quaternion.clone()
  const savedFov = harness.playerCamera.fov
  harness.manager.startPoint('test-church')

  const event = dispatchKey(harness.eventTarget, 'Space')
  assert.equal(event.defaultPrevented, true)

  assert.equal(harness.manager.isActive(), false)
  assert.ok(harness.playerCamera.position.equals(savedPosition))
  assert.ok(harness.playerCamera.quaternion.equals(savedQuaternion))
  assert.equal(harness.playerCamera.fov, savedFov)
  assert.equal(harness.calls.activeCameras.at(-1), harness.playerCamera)
  assert.equal(harness.calls.cinematic.at(-1), false)
  assert.deepEqual(harness.calls.resumed, ['cinematic'])
  assert.equal(harness.calls.locks, 1)
  harness.manager.dispose()
})

test('timeline completion cleans up and the replayable point can run again', () => {
  const harness = createHarness()
  harness.manager.startPoint('test-church')
  for (let index = 0; index < 20; index += 1) harness.manager.update(0.05)
  assert.equal(harness.manager.isActive(), false)

  assert.equal(harness.manager.startPoint('test-church'), true)
  dispatchKey(harness.eventTarget, 'Escape')
  assert.equal(harness.manager.isActive(), false)
  harness.manager.dispose()
})
