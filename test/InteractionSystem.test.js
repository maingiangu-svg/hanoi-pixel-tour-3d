import test from 'node:test'
import assert from 'node:assert/strict'
import { InteractionSystem } from '../src/systems/InteractionSystem.js'

function createHarness({ playerX = 0, playerZ = 0 } = {}) {
  const target = new EventTarget()
  const timers = []
  const calls = {
    enabled: [],
    fade: [],
    labels: [],
    transitions: 0,
    collisionWorld: null,
    teleport: null,
  }
  const destination = {
    colliders: [{ minX: 1, maxX: 2, minZ: 1, maxZ: 2 }],
    bounds: { minX: -3, maxX: 3, minZ: -4, maxZ: 4 },
    spawn: { x: 0, z: 2, yaw: Math.PI },
  }
  const player = {
    controls: { isLocked: true },
    camera: { position: { x: playerX, z: playerZ } },
    teleport: (spawn, yaw) => { calls.teleport = { spawn, yaw } },
  }
  const system = new InteractionSystem({
    player,
    input: { setEnabled: (value) => calls.enabled.push(value) },
    collision: { setWorld: (world) => { calls.collisionWorld = world } },
    world: {
      getActivePortal: () => ({
        position: { x: 0, z: 0 },
        radius: 2,
        label: 'Vào Nhà thờ',
        target: 'interior',
      }),
      transition: () => {
        calls.transitions += 1
        return destination
      },
    },
    ui: {
      setInteraction: (label) => calls.labels.push(label),
      setFading: (value) => calls.fade.push(value),
    },
    eventTarget: target,
    setTimer: (callback) => {
      timers.push(callback)
      return timers.length
    },
    clearTimer: () => {},
  })
  return { system, target, timers, calls, destination }
}

function dispatchInteraction(target, repeat = false) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: 'KeyE' },
    repeat: { value: repeat },
  })
  target.dispatchEvent(event)
}

test('interaction prompt only appears inside the portal radius', () => {
  const near = createHarness()
  near.system.update()
  assert.equal(near.calls.labels.at(-1), 'Vào Nhà thờ')
  near.system.dispose()

  const far = createHarness({ playerX: 3 })
  far.system.update()
  assert.equal(far.calls.labels.at(-1), null)
  far.system.dispose()
})

test('E fades, swaps collision world and teleports exactly once', () => {
  const harness = createHarness()
  harness.system.update()
  dispatchInteraction(harness.target)
  dispatchInteraction(harness.target)

  assert.deepEqual(harness.calls.fade, [true])
  assert.equal(harness.calls.transitions, 0)
  assert.equal(harness.timers.length, 1)

  harness.timers.shift()()
  assert.equal(harness.calls.transitions, 1)
  assert.equal(harness.calls.collisionWorld, harness.destination)
  assert.deepEqual(harness.calls.teleport, {
    spawn: harness.destination.spawn,
    yaw: Math.PI,
  })

  harness.timers.shift()()
  assert.deepEqual(harness.calls.fade, [true, false])
  assert.deepEqual(harness.calls.enabled, [false, true])
  assert.equal(harness.system.transitioning, false)
  harness.system.dispose()
})

test('held E does not trigger a transition', () => {
  const harness = createHarness()
  harness.system.update()
  dispatchInteraction(harness.target, true)

  assert.equal(harness.timers.length, 0)
  assert.equal(harness.calls.transitions, 0)
  harness.system.dispose()
})

test('nearest NPC interaction uses E without triggering the church portal', () => {
  const target = new EventTarget()
  const npc = { name: 'Mơ' }
  const calls = { dialogueTarget: null, transitioned: 0, label: null }
  const system = new InteractionSystem({
    player: {
      controls: { isLocked: true },
      camera: { position: { x: 1, z: 1 } },
    },
    input: { setEnabled: () => {} },
    collision: { setWorld: () => {} },
    world: {
      getActiveInteractions: () => [
        {
          type: 'portal',
          position: { x: 1.5, z: 1.5 },
          radius: 2,
          label: 'Vào Nhà thờ',
          target: 'interior',
        },
        {
          type: 'dialogue',
          position: { x: 1.1, z: 1.1 },
          radius: 2,
          label: 'Nói chuyện với Mơ',
          target: npc,
        },
      ],
      transition: () => {
        calls.transitioned += 1
      },
    },
    ui: {
      setInteraction: (label) => { calls.label = label },
      setFading: () => {},
    },
    dialogue: {
      isActive: () => false,
      start: (targetNpc) => { calls.dialogueTarget = targetNpc },
    },
    eventTarget: target,
    setTimer: () => 1,
    clearTimer: () => {},
  })

  system.update()
  assert.equal(calls.label, 'Nói chuyện với Mơ')
  dispatchInteraction(target)
  assert.equal(calls.dialogueTarget, npc)
  assert.equal(calls.transitioned, 0)
  system.dispose()
})
