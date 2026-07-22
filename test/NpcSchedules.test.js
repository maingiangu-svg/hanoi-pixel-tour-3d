import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAmbientDensity,
  getChurchCrowdState,
  getMoScheduleState,
} from '../src/npcs/npcSchedules.js'

test('Mơ follows the evening church schedule without boundary gaps', () => {
  assert.equal(getMoScheduleState(17 * 60 + 49), 'withChildren')
  assert.equal(getMoScheduleState(17 * 60 + 50), 'walkingToChurch')
  assert.equal(getMoScheduleState(18 * 60), 'insideChurch')
  assert.equal(getMoScheduleState(18 * 60 + 59), 'insideChurch')
  assert.equal(getMoScheduleState(19 * 60), 'returningToPlaza')
})

test('church visitors arrive, attend, and leave in distinct phases', () => {
  assert.equal(getChurchCrowdState(17 * 60 + 39), 'quiet')
  assert.equal(getChurchCrowdState(17 * 60 + 40), 'arriving')
  assert.equal(getChurchCrowdState(18 * 60), 'service')
  assert.equal(getChurchCrowdState(19 * 60), 'leaving')
  assert.equal(getChurchCrowdState(19 * 60 + 25), 'postService')
})

test('the plaza is denser during the evening window', () => {
  assert.equal(getAmbientDensity(12 * 60), 'day')
  assert.equal(getAmbientDensity(18 * 60 + 30), 'busy')
  assert.equal(getAmbientDensity(2 * 60), 'quiet')
})
