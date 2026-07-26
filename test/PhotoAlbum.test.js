import test from 'node:test'
import assert from 'node:assert/strict'
import { PhotoAlbum } from '../src/photo/PhotoAlbum.js'

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
  const records = [
    { id: 'photo-2', photo: { timestamp: 'newest' } },
    { id: 'photo-1', photo: { timestamp: 'oldest' } },
  ]
  let subscriber = () => {}
  const calls = {
    enabled: [],
    reset: 0,
    interactions: [],
    resume: [],
    locked: [],
    unlocks: 0,
    locks: 0,
    renders: [],
    open: [],
  }
  const store = {
    get: (id) => records.find((record) => record.id === id) ?? null,
    delete: (id) => {
      const index = records.findIndex((record) => record.id === id)
      if (index < 0) return false
      records.splice(index, 1)
      subscriber([...records])
      return true
    },
    subscribe: (listener) => {
      subscriber = listener
      listener([...records])
      return () => { subscriber = () => {} }
    },
  }
  const ui = {
    handlers: {},
    setHandlers(handlers) {
      this.handlers = handlers
    },
    setOpen: (open) => calls.open.push(open),
    render: (items, selectedId) => calls.renders.push({
      ids: items.map((item) => item.id),
      selectedId,
    }),
  }
  const player = {
    controls: {
      isLocked: true,
      unlock: () => {
        calls.unlocks += 1
        player.controls.isLocked = false
      },
    },
    lock: () => {
      calls.locks += 1
      player.controls.isLocked = true
    },
  }
  const album = new PhotoAlbum({
    store,
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
  return { album, eventTarget, records, ui, player, calls }
}

test('P opens the album, locks gameplay, selects/deletes, and P resumes pointer lock', () => {
  const harness = createHarness()
  const openEvent = dispatchKey(harness.eventTarget, 'KeyP')
  assert.equal(openEvent.defaultPrevented, true)
  assert.equal(harness.album.isOpen, true)
  assert.equal(harness.calls.enabled.at(-1), false)
  assert.equal(harness.calls.reset, 1)
  assert.equal(harness.calls.unlocks, 1)

  assert.equal(harness.album.select('photo-2'), true)
  assert.equal(harness.calls.renders.at(-1).selectedId, 'photo-2')
  assert.equal(harness.album.delete(), true)
  assert.deepEqual(harness.records.map((record) => record.id), ['photo-1'])

  dispatchKey(harness.eventTarget, 'KeyP')
  assert.equal(harness.album.isOpen, false)
  assert.equal(harness.calls.locks, 1)
  harness.album.dispose()
})

test('Escape closes the album without relocking and blocked overlays reject P', () => {
  const blocked = createHarness({ canOpen: false })
  assert.equal(dispatchKey(blocked.eventTarget, 'KeyP').defaultPrevented, false)
  assert.equal(blocked.album.isOpen, false)
  blocked.album.dispose()

  const harness = createHarness()
  harness.album.open()
  dispatchKey(harness.eventTarget, 'Escape')
  assert.equal(harness.album.isOpen, false)
  assert.equal(harness.calls.locks, 0)
  assert.equal(harness.calls.resume.at(-1), true)
  harness.album.dispose()
})

test('camera, map, jump, interaction and debug teleport keys are swallowed while open', () => {
  const harness = createHarness()
  harness.album.open()
  for (const code of ['KeyC', 'KeyM', 'Space', 'KeyE', 'Digit1']) {
    const event = dispatchKey(harness.eventTarget, code)
    assert.equal(event.defaultPrevented, true, `${code} should be blocked`)
  }
  assert.equal(harness.album.isOpen, true)
  harness.album.dispose()
})
