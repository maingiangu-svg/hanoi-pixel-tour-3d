import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHURCH_FACADE_LOOK_AT,
  CHURCH_PLAZA_SPAWN,
  isDebugChurchTeleportHotkey,
  performChurchDebugTeleport,
} from '../src/debug/DebugTeleport.js'
import {
  colliderContainsPoint,
  createChurchColliderSpecs,
} from '../src/world/buildings/church/ChurchColliders.js'

function createHarness({
  areaName = 'outdoor',
  mapOpen = false,
  dialogueOpen = false,
  transitioning = false,
  pointerLocked = true,
} = {}) {
  const calls = {
    closeMap: 0,
    dialogueCancel: [],
    transitionCancel: 0,
    transitions: [],
    collisionWorld: null,
    teleports: [],
    lookAt: [],
    worldUpdates: [],
    dayNight: [],
    input: [],
    locked: [],
    resume: [],
    interactions: [],
    notices: [],
  }
  const destination = {
    name: 'outdoor',
    colliders: [],
    bounds: { minX: -20, maxX: 20, minZ: -100, maxZ: 30 },
    groundHeight: 0,
    ceilingHeight: Infinity,
    spawn: { ...CHURCH_PLAZA_SPAWN },
  }
  const player = {
    controls: { isLocked: pointerLocked },
    teleport: (spawn, yaw) => calls.teleports.push({ spawn, yaw }),
    lookAt: (target) => calls.lookAt.push(target),
  }
  const world = {
    activeAreaName: areaName,
    transition: (target) => {
      calls.transitions.push(target)
      world.activeAreaName = 'outdoor'
      return destination
    },
    update: (delta, clock) => calls.worldUpdates.push({ delta, clock }),
  }
  const clock = { minutes: 17 * 60 + 30 }
  const harness = {
    player,
    input: { setEnabled: (value) => calls.input.push(value) },
    collision: { setWorld: (value) => { calls.collisionWorld = value } },
    world,
    ui: {
      setLocked: (value) => calls.locked.push(value),
      setResumeMode: (value) => calls.resume.push(value),
      setInteraction: (value) => calls.interactions.push(value),
      showNotice: (value) => calls.notices.push(value),
    },
    dialogue: {
      isActive: () => dialogueOpen,
      cancel: (options) => calls.dialogueCancel.push(options),
    },
    interactions: {
      transitioning,
      cancelTransition: () => {
        calls.transitionCancel += 1
        return transitioning
      },
    },
    mapUi: { isOpen: mapOpen },
    closeMap: () => {
      calls.closeMap += 1
      harness.mapUi.isOpen = false
    },
    dayNight: {
      update: (value) => calls.dayNight.push(value),
    },
    clock,
  }
  return { harness, calls, destination, clock }
}

test('Digit1 is development-only and yields to numbered dialogue choices', () => {
  const digitOne = { code: 'Digit1', repeat: false }
  assert.equal(isDebugChurchTeleportHotkey(digitOne, { enabled: true }), true)
  assert.equal(isDebugChurchTeleportHotkey(digitOne, { enabled: false }), false)
  assert.equal(isDebugChurchTeleportHotkey(
    digitOne,
    { enabled: true, choosingDialogueAnswer: true },
  ), false)
  assert.equal(isDebugChurchTeleportHotkey(
    { ...digitOne, repeat: true },
    { enabled: true },
  ), false)
})

test('church debug spawn is clear and looks toward the cathedral facade', () => {
  const blocked = createChurchColliderSpecs().some((collider) => (
    colliderContainsPoint(collider, CHURCH_PLAZA_SPAWN, 0.36)
  ))
  assert.equal(blocked, false)
  assert.equal(CHURCH_PLAZA_SPAWN.x, CHURCH_FACADE_LOOK_AT.x)
  assert.ok(CHURCH_FACADE_LOOK_AT.z < CHURCH_PLAZA_SPAWN.z)
})

for (const sourceArea of ['outdoor', 'baDinh', 'longBien', 'interior']) {
  test(`debug teleport reuses the player from ${sourceArea} and activates Hoàn Kiếm`, () => {
    const { harness, calls, destination, clock } = createHarness({
      areaName: sourceArea,
    })
    performChurchDebugTeleport(harness)

    assert.deepEqual(calls.transitions, ['hoanKiem'])
    assert.equal(calls.collisionWorld, destination)
    assert.deepEqual(calls.teleports, [{
      spawn: CHURCH_PLAZA_SPAWN,
      yaw: CHURCH_PLAZA_SPAWN.yaw,
    }])
    assert.deepEqual(calls.lookAt, [CHURCH_FACADE_LOOK_AT])
    assert.deepEqual(calls.worldUpdates, [{ delta: 0, clock }])
    assert.deepEqual(calls.dayNight, ['outdoor'])
    assert.deepEqual(calls.notices, ['Đã dịch chuyển về Nhà thờ Lớn'])
    assert.equal(harness.player, harness.player)
    assert.equal(clock.minutes, 17 * 60 + 30)
  })
}

test('map, dialogue and an in-flight portal transition are cleaned before teleport', () => {
  const { harness, calls } = createHarness({
    mapOpen: true,
    dialogueOpen: true,
    transitioning: true,
    pointerLocked: false,
  })
  performChurchDebugTeleport(harness)

  assert.equal(calls.closeMap, 1)
  assert.deepEqual(calls.dialogueCancel, [{ restoreCamera: false }])
  assert.equal(calls.transitionCancel, 1)
  assert.deepEqual(calls.input.at(-1), false)
  assert.deepEqual(calls.locked.at(-1), false)
  assert.deepEqual(calls.resume.at(-1), true)
})

