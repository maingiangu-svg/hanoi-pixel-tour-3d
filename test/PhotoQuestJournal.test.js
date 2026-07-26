import test from 'node:test'
import assert from 'node:assert/strict'
import { PhotoQuestJournal } from '../src/quests/PhotoQuestJournal.js'

function dispatchKey(target, code, repeat = false) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  })
  target.dispatchEvent(event)
  return event
}

function createHarness({ canOpen = true } = {}) {
  const eventTarget = new EventTarget()
  const calls = {
    enabled: [],
    reset: 0,
    interactions: [],
    resume: [],
    locked: [],
    unlocks: 0,
    locks: 0,
    open: [],
    renders: [],
  }
  const groups = [{ id: 'dawn', quests: [], totalCount: 0, completedCount: 0 }]
  const records = [{ id: 'photo-1' }]
  const ui = {
    setHandlers(handlers) { this.handlers = handlers },
    setOpen: (open) => calls.open.push(open),
    render: (nextGroups, nextRecords) => calls.renders.push({
      groupIds: nextGroups.map(({ id }) => id),
      recordIds: nextRecords.map(({ id }) => id),
    }),
  }
  const player = {
    controls: {
      isLocked: true,
      unlock() {
        calls.unlocks += 1
        player.controls.isLocked = false
      },
    },
    lock() {
      calls.locks += 1
      player.controls.isLocked = true
    },
  }
  const journal = new PhotoQuestJournal({
    questSystem: {
      subscribe(listener) {
        listener(groups)
        return () => {}
      },
    },
    photoStore: {
      subscribe(listener) {
        listener(records)
        return () => {}
      },
    },
    ui,
    input: {
      setEnabled: (enabled) => calls.enabled.push(enabled),
      reset: () => { calls.reset += 1 },
    },
    player,
    gameUi: {
      setInteraction: (label) => calls.interactions.push(label),
      setResumeMode: (resume) => calls.resume.push(resume),
      setLocked: (locked) => calls.locked.push(locked),
    },
    canOpen: () => canOpen,
    eventTarget,
  })
  return { journal, eventTarget, calls, player }
}

test('J opens the quest journal, locks gameplay and J resumes pointer lock', () => {
  const harness = createHarness()
  const openEvent = dispatchKey(harness.eventTarget, 'KeyJ')
  assert.equal(openEvent.defaultPrevented, true)
  assert.equal(harness.journal.isOpen, true)
  assert.equal(harness.calls.enabled.at(-1), false)
  assert.equal(harness.calls.reset, 1)
  assert.equal(harness.calls.unlocks, 1)
  assert.deepEqual(harness.calls.renders.at(-1), {
    groupIds: ['dawn'],
    recordIds: ['photo-1'],
  })

  dispatchKey(harness.eventTarget, 'KeyJ')
  assert.equal(harness.journal.isOpen, false)
  assert.equal(harness.calls.locks, 1)
  harness.journal.dispose()
})

test('Escape closes without relocking and blocked gameplay keys are swallowed', () => {
  const harness = createHarness()
  harness.journal.open()
  for (const code of ['KeyC', 'KeyM', 'KeyP', 'Space', 'KeyE', 'Digit1', 'Digit2']) {
    const event = dispatchKey(harness.eventTarget, code)
    assert.equal(event.defaultPrevented, true, `${code} should be blocked`)
  }
  dispatchKey(harness.eventTarget, 'Escape')
  assert.equal(harness.journal.isOpen, false)
  assert.equal(harness.calls.locks, 0)
  assert.equal(harness.calls.resume.at(-1), true)
  harness.journal.dispose()
})

test('journal cannot open behind camera, album, map or dialogue guards', () => {
  const harness = createHarness({ canOpen: false })
  const event = dispatchKey(harness.eventTarget, 'KeyJ')
  assert.equal(event.defaultPrevented, false)
  assert.equal(harness.journal.isOpen, false)
  harness.journal.dispose()
})

