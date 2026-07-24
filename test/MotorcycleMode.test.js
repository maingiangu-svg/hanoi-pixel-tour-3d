import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isMotorcycleToggleHotkey,
  MotorcycleMode,
} from '../src/player/MotorcycleMode.js'

function dispatchKey(target, {
  code = 'Digit2',
  key,
  repeat = false,
  ctrlKey = false,
  altKey = false,
  metaKey = false,
  shiftKey = false,
} = {}) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    key: { value: key },
    repeat: { value: repeat },
    ctrlKey: { value: ctrlKey },
    altKey: { value: altKey },
    metaKey: { value: metaKey },
    shiftKey: { value: shiftKey },
  })
  target.dispatchEvent(event)
  return event
}

function createHarness({
  locked = true,
  canToggle = true,
} = {}) {
  const eventTarget = new EventTarget()
  const notices = []
  const player = {
    controls: { isLocked: locked },
    isMotorbikeMounted: false,
    toggleCalls: 0,
    toggleMotorbike() {
      this.toggleCalls += 1
      this.isMotorbikeMounted = !this.isMotorbikeMounted
      return this.isMotorbikeMounted
    },
  }
  const mode = new MotorcycleMode({
    player,
    eventTarget,
    canToggle: () => canToggle,
    ui: { showNotice: (message) => notices.push(message) },
  })
  return { eventTarget, mode, notices, player }
}

test('Digit2, Numpad2, and key fallback identify the motorcycle toggle', () => {
  assert.equal(isMotorcycleToggleHotkey({ code: 'Digit2' }), true)
  assert.equal(isMotorcycleToggleHotkey({ code: 'Numpad2' }), true)
  assert.equal(isMotorcycleToggleHotkey({ code: '', key: '2' }), true)
  assert.equal(isMotorcycleToggleHotkey({ code: 'Digit1' }), false)
})

test('held or modified Digit2 presses cannot toggle the motorcycle', () => {
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey', 'shiftKey']) {
    assert.equal(
      isMotorcycleToggleHotkey({ code: 'Digit2', [modifier]: true }),
      false,
      `${modifier} + Digit2 must not toggle gameplay mode`,
    )
  }
  assert.equal(isMotorcycleToggleHotkey({ code: 'Digit2', repeat: true }), false)
})

test('Digit2 toggles mount state in both directions and prevents the handled key', () => {
  const harness = createHarness()

  const mountEvent = dispatchKey(harness.eventTarget)
  assert.equal(mountEvent.defaultPrevented, true)
  assert.equal(harness.player.isMotorbikeMounted, true)
  assert.equal(harness.player.toggleCalls, 1)
  assert.equal(harness.notices.length, 1)

  const dismountEvent = dispatchKey(harness.eventTarget)
  assert.equal(dismountEvent.defaultPrevented, true)
  assert.equal(harness.player.isMotorbikeMounted, false)
  assert.equal(harness.player.toggleCalls, 2)
  assert.equal(harness.notices.length, 2)

  harness.mode.dispose()
})

test('toggle is ignored while pointer lock is released or gameplay guard rejects it', () => {
  const unlocked = createHarness({ locked: false })
  const unlockedEvent = dispatchKey(unlocked.eventTarget)
  assert.equal(unlockedEvent.defaultPrevented, false)
  assert.equal(unlocked.player.toggleCalls, 0)
  unlocked.mode.dispose()

  const blocked = createHarness({ canToggle: false })
  const blockedEvent = dispatchKey(blocked.eventTarget)
  assert.equal(blockedEvent.defaultPrevented, false)
  assert.equal(blocked.player.toggleCalls, 0)
  blocked.mode.dispose()
})

test('repeat presses are ignored and dispose removes the keyboard listener', () => {
  const harness = createHarness()

  const repeated = dispatchKey(harness.eventTarget, { repeat: true })
  assert.equal(repeated.defaultPrevented, false)
  assert.equal(harness.player.toggleCalls, 0)

  harness.mode.dispose()
  const afterDispose = dispatchKey(harness.eventTarget)
  assert.equal(afterDispose.defaultPrevented, false)
  assert.equal(harness.player.toggleCalls, 0)
})
