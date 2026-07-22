import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GAME_CLOCK_SPEEDS,
  GameClock,
  MAX_CLOCK_DELTA_SECONDS,
} from '../src/time/GameClock.js'

function dispatchClockKey(target, code, { repeat = false } = {}) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  })
  target.dispatchEvent(event)
  return event
}

test('one real second advances one game minute at x1 and wraps at midnight', () => {
  const clock = new GameClock({ initialHour: 23, initialMinute: 59.5, eventTarget: null })

  clock.update(1)

  assert.equal(clock.minutes, 0.5)
  assert.equal(clock.hour, 0)
  assert.equal(clock.minute, 0)
  assert.equal(clock.formatted, '00:00')
})

test('clock speed follows x1, x5, x15 and x60 keyboard levels', () => {
  const target = new EventTarget()
  const clock = new GameClock({ initialHour: 12, initialMinute: 0, eventTarget: target })

  assert.deepEqual(GAME_CLOCK_SPEEDS, [1, 5, 15, 60])
  for (const expectedSpeed of [5, 15, 60, 60]) {
    const event = dispatchClockKey(target, 'BracketRight')
    assert.equal(event.defaultPrevented, true)
    assert.equal(clock.speed, expectedSpeed)
  }

  clock.update(0.5)
  assert.equal(clock.minutes, 12 * 60 + 30)

  dispatchClockKey(target, 'BracketLeft')
  assert.equal(clock.speed, 15)
  dispatchClockKey(target, 'Backslash')
  assert.equal(clock.speed, 1)
  clock.dispose()
})

test('held clock keys do not change speed and dispose removes the listener', () => {
  const target = new EventTarget()
  const clock = new GameClock({ eventTarget: target })

  dispatchClockKey(target, 'BracketRight', { repeat: true })
  assert.equal(clock.speed, 1)

  clock.dispose()
  dispatchClockKey(target, 'BracketRight')
  assert.equal(clock.speed, 1)
})

test('debug setters normalize time and reject unsupported speeds', () => {
  const clock = new GameClock({ eventTarget: null })

  clock.setTime(25, 7)
  assert.equal(clock.formatted, '01:07')

  clock.setMinutes(-1)
  assert.equal(clock.formatted, '23:59')

  clock.setSpeed(15)
  assert.equal(clock.speed, 15)
  assert.throws(() => clock.setSpeed(2), RangeError)
  assert.throws(() => clock.setTime(Number.NaN), TypeError)
})

test('non-positive and invalid deltas leave time unchanged', () => {
  const clock = new GameClock({ initialHour: 8, initialMinute: 30, eventTarget: null })

  clock.update(0)
  clock.update(-1)
  clock.update(Number.NaN)

  assert.equal(clock.formatted, '08:30')
})

test('clock clamps long frame deltas and supports named pause reasons', () => {
  const clock = new GameClock({
    initialHour: 8,
    initialMinute: 0,
    eventTarget: null,
    visibilityTarget: null,
  })

  clock.update(20)
  assert.equal(MAX_CLOCK_DELTA_SECONDS, 2)
  assert.equal(clock.formatted, '08:02')

  clock.pause('dialogue').pause('menu')
  clock.update(1)
  assert.equal(clock.formatted, '08:02')
  clock.resume('dialogue')
  clock.update(1)
  assert.equal(clock.formatted, '08:02')
  clock.resume('menu')
  clock.update(1)
  assert.equal(clock.formatted, '08:03')
})

test('hidden documents pause time until the tab is visible again', () => {
  const visibilityTarget = new EventTarget()
  visibilityTarget.hidden = false
  const clock = new GameClock({
    initialHour: 9,
    initialMinute: 0,
    eventTarget: null,
    visibilityTarget,
  })

  visibilityTarget.hidden = true
  visibilityTarget.dispatchEvent(new Event('visibilitychange'))
  clock.update(1)
  assert.equal(clock.formatted, '09:00')

  visibilityTarget.hidden = false
  visibilityTarget.dispatchEvent(new Event('visibilitychange'))
  clock.update(1)
  assert.equal(clock.formatted, '09:01')
  clock.dispose()
})
