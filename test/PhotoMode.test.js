import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Input } from '../src/core/Input.js'
import { PhotoCapture } from '../src/photo/PhotoCapture.js'
import {
  PHOTO_FOCAL_LENGTHS,
  PhotoMode,
  focalLengthToVerticalFov,
} from '../src/photo/PhotoMode.js'

function dispatchKey(target, code, repeat = false) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  })
  target.dispatchEvent(event)
  return event
}

function dispatchWheel(target, deltaY) {
  const event = new Event('wheel', { cancelable: true })
  Object.defineProperty(event, 'deltaY', { value: deltaY })
  target.dispatchEvent(event)
  return event
}

function createModeHarness({ canOpen = true, pointerLocked = true } = {}) {
  const eventTarget = new EventTarget()
  const wheelTarget = new EventTarget()
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 120)
  const input = new Input(eventTarget)
  input.setEnabled(true)
  const calls = {
    open: [],
    focal: [],
    capturing: [],
    interactions: [],
    flashes: 0,
    notices: [],
    states: [],
    captures: 0,
  }
  const capture = {
    lastCapture: null,
    capture: async ({ focalLength }) => {
      calls.captures += 1
      capture.lastCapture = { focalLength }
      return capture.lastCapture
    },
  }
  const mode = new PhotoMode({
    camera,
    input,
    capture,
    photoUi: {
      setOpen: (open) => calls.open.push(open),
      setFocalLength: (focal) => calls.focal.push(focal),
      setCapturing: (capturing) => calls.capturing.push(capturing),
    },
    gameUi: {
      setInteraction: (label) => calls.interactions.push(label),
      flashPhoto: () => { calls.flashes += 1 },
      showNotice: (message) => calls.notices.push(message),
    },
    canOpen: () => canOpen,
    isPointerLocked: () => pointerLocked,
    onStateChange: (active) => calls.states.push(active),
    eventTarget,
    wheelTarget,
  })
  return { mode, camera, input, eventTarget, wheelTarget, calls }
}

test('C toggles photo mode and restores the original first-person FOV', () => {
  const harness = createModeHarness()
  dispatchKey(harness.eventTarget, 'KeyC')

  assert.equal(harness.mode.isActive(), true)
  assert.equal(harness.input.enabled, false)
  assert.deepEqual(harness.calls.states, [true])
  assert.equal(harness.calls.open.at(-1), true)

  for (let index = 0; index < 20; index += 1) harness.mode.update(1 / 60)
  assert.ok(harness.camera.fov < 68)

  dispatchKey(harness.eventTarget, 'KeyC')
  assert.equal(harness.mode.isActive(), false)
  assert.equal(harness.input.enabled, true)
  assert.equal(harness.camera.fov, 68)
  assert.deepEqual(harness.calls.states, [true, false])
  harness.mode.dispose()
  harness.input.dispose()
})

test('Space captures without jumping in photo mode and jumps again after closing', async () => {
  const harness = createModeHarness()
  dispatchKey(harness.eventTarget, 'KeyC')
  dispatchKey(harness.eventTarget, 'Space')
  await Promise.resolve()

  assert.equal(harness.calls.captures, 1)
  assert.equal(harness.input.consumeJump(), false)
  assert.equal(harness.calls.flashes, 1)
  assert.match(harness.calls.notices.at(-1), /35mm/)

  dispatchKey(harness.eventTarget, 'KeyC')
  dispatchKey(harness.eventTarget, 'Space')
  assert.equal(harness.input.consumeJump(), true)
  harness.mode.dispose()
  harness.input.dispose()
})

test('Q, E and wheel select only the four supported focal lengths with smooth FOV targets', () => {
  const harness = createModeHarness()
  harness.mode.open()
  assert.deepEqual(PHOTO_FOCAL_LENGTHS, [24, 35, 50, 85])

  dispatchKey(harness.eventTarget, 'KeyQ')
  assert.equal(harness.mode.focalLength, 24)
  dispatchKey(harness.eventTarget, 'KeyE')
  assert.equal(harness.mode.focalLength, 35)
  dispatchKey(harness.eventTarget, 'KeyE')
  assert.equal(harness.mode.focalLength, 50)
  dispatchWheel(harness.wheelTarget, -1)
  assert.equal(harness.mode.focalLength, 85)
  dispatchWheel(harness.wheelTarget, -1)
  assert.equal(harness.mode.focalLength, 85)

  const before = harness.camera.fov
  harness.mode.update(1 / 60)
  assert.ok(harness.camera.fov < before)
  assert.ok(harness.camera.fov > focalLengthToVerticalFov(85))
  harness.mode.dispose()
  harness.input.dispose()
})

test('Escape exits photo mode and opening is rejected behind another overlay', () => {
  const blocked = createModeHarness({ canOpen: false })
  const blockedEvent = dispatchKey(blocked.eventTarget, 'KeyC')
  assert.equal(blocked.mode.isActive(), false)
  assert.equal(blockedEvent.defaultPrevented, false)
  blocked.mode.dispose()
  blocked.input.dispose()

  const harness = createModeHarness()
  harness.mode.open()
  dispatchKey(harness.eventTarget, 'Escape')
  assert.equal(harness.mode.isActive(), false)
  harness.mode.dispose()
  harness.input.dispose()
})

test('closing after pointer unlock does not reactivate gameplay input', () => {
  const harness = createModeHarness({ pointerLocked: false })
  harness.mode.open()
  harness.mode.close({ resumeInput: false })
  assert.equal(harness.input.enabled, false)
  harness.mode.dispose()
  harness.input.dispose()
})

test('PhotoCapture encodes the WebGL canvas directly and records temporary metadata', async () => {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 120)
  camera.position.set(12, 1.68, -8)
  camera.rotation.set(0, Math.PI / 2, 0)
  const calls = { renders: 0, blobs: 0, type: null }
  const canvas = {
    width: 1280,
    height: 720,
    toBlob: (callback, type) => {
      calls.blobs += 1
      calls.type = type
      callback(new Blob(['scene pixels'], { type: 'image/png' }))
    },
  }
  const capture = new PhotoCapture({
    renderer: {
      instance: { domElement: canvas },
      render: () => { calls.renders += 1 },
    },
    camera,
    clock: {
      minutes: 16 * 60 + 45,
      hour: 16,
      minute: 45,
      formatted: '16:45',
    },
    world: {
      activeAreaName: 'outdoor',
      activeMapId: 'hoanKiem',
    },
    dayNight: {
      getLightingPhase: () => 'goldenHour',
    },
    now: () => new Date('2026-07-24T09:45:00.000Z'),
  })

  const photo = await capture.capture({ focalLength: 50 })
  assert.equal(calls.renders, 1)
  assert.equal(calls.blobs, 1)
  assert.equal(calls.type, 'image/png')
  assert.equal(photo.image.type, 'image/png')
  assert.equal(photo.width, 1280)
  assert.equal(photo.height, 720)
  assert.equal(photo.timestamp, '2026-07-24T09:45:00.000Z')
  assert.deepEqual(photo.gameTime, {
    minutes: 1005,
    hour: 16,
    minute: 45,
    formatted: '16:45',
  })
  assert.deepEqual(photo.playerPosition, { x: 12, y: 1.68, z: -8 })
  assert.equal(photo.focalLength, 50)
  assert.equal(photo.area, 'outdoor')
  assert.equal(photo.mapId, 'hoanKiem')
  assert.equal(photo.lightingPhase, 'goldenHour')
  assert.equal(capture.lastCapture, photo)
})
