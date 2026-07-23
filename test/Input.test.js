import test from 'node:test'
import assert from 'node:assert/strict'
import { Input } from '../src/core/Input.js'

function dispatchKey(target, type, code, repeat = false) {
  const event = new Event(type, { cancelable: true })
  Object.defineProperty(event, 'code', { value: code })
  Object.defineProperty(event, 'repeat', { value: repeat })
  target.dispatchEvent(event)
}

test('WASD maps to normalized movement intent', () => {
  const target = new EventTarget()
  const input = new Input(target)
  input.setEnabled(true)

  dispatchKey(target, 'keydown', 'KeyW')
  dispatchKey(target, 'keydown', 'KeyA')

  assert.deepEqual(input.getMovement(), {
    forward: 1,
    right: -1,
    running: false,
  })
  input.dispose()
})

test('either Shift key enables running and keyup clears it', () => {
  const target = new EventTarget()
  const input = new Input(target)
  input.setEnabled(true)

  dispatchKey(target, 'keydown', 'ShiftRight')
  assert.equal(input.getMovement().running, true)

  dispatchKey(target, 'keyup', 'ShiftRight')
  assert.equal(input.getMovement().running, false)
  input.dispose()
})

test('input resets when pointer lock is disabled', () => {
  const target = new EventTarget()
  const input = new Input(target)
  input.setEnabled(true)

  dispatchKey(target, 'keydown', 'KeyD')
  input.setEnabled(false)

  assert.deepEqual(input.getMovement(), {
    forward: 0,
    right: 0,
    running: false,
  })
  input.dispose()
})

test('Space queues one jump per physical key press and never repeats while held', () => {
  const target = new EventTarget()
  const input = new Input(target)
  input.setEnabled(true)

  dispatchKey(target, 'keydown', 'Space')
  assert.equal(input.consumeJump(), true)
  assert.equal(input.consumeJump(), false)

  dispatchKey(target, 'keydown', 'Space', true)
  dispatchKey(target, 'keydown', 'Space')
  assert.equal(input.consumeJump(), false)

  dispatchKey(target, 'keyup', 'Space')
  dispatchKey(target, 'keydown', 'Space')
  assert.equal(input.consumeJump(), true)
  input.dispose()
})

test('disabling gameplay clears a queued jump behind dialogue, map, or overlay UI', () => {
  const target = new EventTarget()
  const input = new Input(target)
  input.setEnabled(true)
  dispatchKey(target, 'keydown', 'Space')

  input.setEnabled(false)

  assert.equal(input.consumeJump(), false)
  input.dispose()
})
