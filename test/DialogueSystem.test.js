import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { DialogueSystem } from '../src/systems/DialogueSystem.js'

function createHarness() {
  const target = new EventTarget()
  const calls = {
    unlocked: 0,
    input: [],
    dialogueActive: [],
    locked: [],
    resume: [],
    npcActive: [],
    open: [],
    transitioning: [],
    lines: [],
    motorbike: [],
  }
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 120)
  camera.position.set(1, 1.68, 2)
  camera.rotation.set(0.08, 0.35, 0)
  const player = {
    camera,
    setMotorbikeMounted: (mounted) => calls.motorbike.push(mounted),
    controls: {
      isLocked: true,
      unlock: () => {
        calls.unlocked += 1
        player.controls.isLocked = false
      },
    },
  }
  const npc = {
    ready: true,
    disabled: false,
    getFocusPoint: (point) => point.set(1.5, 1.4, -1.5),
    setDialogueActive: (active) => calls.npcActive.push(active),
  }
  const system = new DialogueSystem({
    player,
    input: { setEnabled: (enabled) => calls.input.push(enabled) },
    gameUi: {
      setDialogueActive: (active) => calls.dialogueActive.push(active),
      setLocked: (locked) => calls.locked.push(locked),
      setResumeMode: (resume) => calls.resume.push(resume),
    },
    dialogueUi: {
      showLine: (...args) => calls.lines.push(args),
      setTransitioning: (value) => calls.transitioning.push(value),
      setOpen: (open) => calls.open.push(open),
    },
    eventTarget: target,
    lines: [
      { expression: 'surprised', text: 'Xin chào.' },
      { expression: 'smile', text: 'Gặp lại nhé.' },
    ],
  })
  return { system, player, camera, npc, calls, target }
}

function runFrames(system, count) {
  for (let frame = 0; frame < count; frame += 1) system.update(0.05)
}

test('dialogue unlocks controls, eases the camera, then restores it exactly', () => {
  const harness = createHarness()
  const startPosition = harness.camera.position.clone()
  const startQuaternion = harness.camera.quaternion.clone()

  assert.equal(harness.system.start(harness.npc), true)
  assert.equal(harness.calls.unlocked, 1)
  assert.deepEqual(harness.calls.input, [false])
  assert.deepEqual(harness.calls.motorbike, [false])
  assert.deepEqual(harness.calls.dialogueActive, [true])
  assert.deepEqual(harness.calls.npcActive, [true])

  runFrames(harness.system, 6)
  assert.notDeepEqual(harness.camera.position.toArray(), startPosition.toArray())
  harness.system.advance()
  harness.system.advance()
  runFrames(harness.system, 5)

  assert.equal(harness.system.isActive(), false)
  assert.ok(harness.camera.position.distanceTo(startPosition) < 0.000001)
  assert.ok(1 - Math.abs(harness.camera.quaternion.dot(startQuaternion)) < 0.000001)
  assert.deepEqual(harness.calls.npcActive, [true, false])
  assert.deepEqual(harness.calls.resume, [true])
  assert.deepEqual(harness.calls.dialogueActive, [true, false])
  harness.system.dispose()
})

test('Escape safely closes dialogue during its camera focus transition', () => {
  const harness = createHarness()
  const startPosition = harness.camera.position.clone()
  harness.system.start(harness.npc)
  runFrames(harness.system, 2)

  const event = new Event('keydown', { cancelable: true })
  Object.defineProperty(event, 'code', { value: 'Escape' })
  harness.target.dispatchEvent(event)
  runFrames(harness.system, 5)

  assert.equal(harness.system.isActive(), false)
  assert.ok(harness.camera.position.distanceTo(startPosition) < 0.000001)
  assert.equal(harness.calls.open.at(-1), false)
  harness.system.dispose()
})

test('debug cleanup can cancel dialogue without restoring over the teleport camera', () => {
  const harness = createHarness()
  harness.system.start(harness.npc)
  runFrames(harness.system, 2)
  const focusedPosition = harness.camera.position.clone()

  assert.equal(harness.system.cancel({ restoreCamera: false }), true)
  assert.equal(harness.system.isActive(), false)
  assert.ok(harness.camera.position.distanceTo(focusedPosition) < 0.000001)
  assert.deepEqual(harness.calls.npcActive, [true, false])
  assert.equal(harness.calls.open.at(-1), false)
  harness.system.dispose()
})

test('an ambient NPC can supply portraitless dialogue without changing Mơ defaults', () => {
  const harness = createHarness()
  harness.npc.dialogueName = 'Cô trà đá'
  harness.npc.dialoguePortrait = false
  harness.npc.getDialogueLines = () => [
    { text: 'Uống cốc trà không cháu?' },
    { text: 'Tối ở đây lúc nào cũng đông.' },
  ]

  assert.equal(harness.system.start(harness.npc), true)
  assert.deepEqual(harness.calls.lines[0][3], {
    speaker: 'Cô trà đá',
    portrait: false,
  })
  harness.system.dispose()
})
