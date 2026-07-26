import test from 'node:test'
import assert from 'node:assert/strict'
import { GameSaveSystem, GAME_SAVE_VERSION } from '../src/save/GameSaveSystem.js'

function observableState(initial) {
  let state = structuredClone(initial)
  const listeners = new Set()
  return {
    get size() {
      return Array.isArray(state) ? state.length : 0
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    exportState() {
      return structuredClone(state)
    },
    restoreState(next) {
      state = structuredClone(next)
      for (const listener of listeners) listener(state)
    },
    getAll() {
      return Array.isArray(state) ? structuredClone(state) : []
    },
    read() {
      return structuredClone(state)
    },
  }
}

function createHarness(storage) {
  const clock = {
    minutes: 1080,
    speed: 15,
    setMinutes(value) { this.minutes = value },
    setSpeed(value) { this.speed = value },
    resetSpeed() { this.speed = 1 },
  }
  const player = {
    camera: {
      position: { x: 101, y: 1.7, z: 22 },
      rotation: { x: -0.1, y: 0.8 },
    },
    isMotorbikeMounted: false,
    teleport(position, yaw) {
      this.camera.position.x = position.x
      this.camera.position.z = position.z
      this.camera.rotation.y = yaw
    },
    setMotorbikeMounted(value) {
      this.isMotorbikeMounted = value
    },
  }
  const destination = {
    spawn: { x: 0, z: -18, yaw: 0 },
  }
  const world = {
    activeMapId: 'hoanKiem',
    activeAreaName: 'outdoor',
    transitionCalls: [],
    updateCalls: 0,
    transition(mapId) {
      this.activeMapId = mapId
      this.activeAreaName = 'outdoor'
      this.transitionCalls.push(mapId)
      return destination
    },
    update() { this.updateCalls += 1 },
  }
  const collision = {
    setWorldCalls: 0,
    moveCalls: 0,
    setWorld() { this.setWorldCalls += 1 },
    move(position) {
      this.moveCalls += 1
      position.x = Math.max(-220, Math.min(220, position.x))
      position.z = Math.max(-170, Math.min(170, position.z))
    },
  }
  const dayNight = {
    updateCalls: 0,
    update() { this.updateCalls += 1 },
  }
  const photoStore = observableState([{
    id: 'photo-1',
    fingerprint: 'fingerprint-1',
    photo: {
      image: new Blob(['full'], { type: 'image/png' }),
      metadata: {
        scoring: { total: 86, stars: 4 },
        location: { place: 'Hồ Gươm' },
      },
    },
    thumbnail: new Blob(['thumb'], { type: 'image/jpeg' }),
  }])
  const questSystem = observableState({
    unlockedGroupIds: ['hanoi-dawn'],
    completions: [['dawn-church-birds', {
      photoId: 'photo-1',
      score: 86,
    }]],
    usedPhotoIds: ['photo-1'],
  })
  const albumCatalog = observableState({
    entries: [['photo-1', {
      primaryThemeId: 'hanoi-light',
      themeIds: ['hanoi-light', 'secret-moments'],
      secretIds: ['secret-turtle-blue-mirror'],
    }]],
    unlockedSecrets: [['secret-turtle-blue-mirror', {
      id: 'secret-turtle-blue-mirror',
      photoId: 'photo-1',
    }]],
  })
  albumCatalog.restoreState = function restoreState(next) {
    this._restored = structuredClone(next)
  }
  albumCatalog.read = function read() {
    return structuredClone(this._restored ?? this.exportState())
  }
  const audioSystem = {
    state: { volume: 0.32, muted: true },
    getState() { return { ...this.state } },
    restoreState(next) { this.state = { ...next } },
  }
  const eventTarget = {
    addEventListener() {},
    removeEventListener() {},
  }
  const system = new GameSaveSystem({
    storage,
    clock,
    player,
    collision,
    world,
    dayNight,
    photoStore,
    questSystem,
    albumCatalog,
    audioSystem,
    eventTarget,
    setIntervalFn: null,
    clearIntervalFn: null,
    setTimeoutFn: null,
    clearTimeoutFn: null,
  })
  return {
    system,
    clock,
    player,
    collision,
    world,
    dayNight,
    photoStore,
    questSystem,
    albumCatalog,
    audioSystem,
  }
}

test('demo save restores photos, progress, secrets, clock, audio and player safely', async () => {
  let savedPayload = null
  const storage = {
    async save(payload) {
      savedPayload = structuredClone(payload)
    },
    async load() {
      return structuredClone(savedPayload)
    },
    close() {},
  }
  const source = createHarness(storage)
  await source.system.save({ force: true })

  assert.equal(savedPayload.state.version, GAME_SAVE_VERSION)
  assert.equal(savedPayload.photos.length, 1)
  assert.equal(savedPayload.state.quests.completions.length, 1)
  assert.equal(savedPayload.state.album.unlockedSecrets.length, 1)
  assert.deepEqual(savedPayload.state.audio, {
    volume: 0.32,
    muted: true,
  })

  const restored = createHarness(storage)
  restored.clock.setMinutes(60)
  restored.clock.setSpeed(1)
  restored.player.camera.position.x = -999
  restored.player.camera.position.z = -999
  restored.audioSystem.state = { volume: 1, muted: false }

  assert.equal(await restored.system.restore(), true)
  assert.equal(restored.clock.minutes, 1080)
  assert.equal(restored.clock.speed, 15)
  assert.equal(restored.player.camera.position.x, 101)
  assert.equal(restored.player.camera.position.z, 22)
  assert.equal(restored.photoStore.read()[0].photo.metadata.scoring.stars, 4)
  assert.equal(
    restored.questSystem.read().completions[0][1].photoId,
    'photo-1',
  )
  assert.equal(
    restored.albumCatalog.read().unlockedSecrets[0][0],
    'secret-turtle-blue-mirror',
  )
  assert.deepEqual(restored.audioSystem.state, {
    volume: 0.32,
    muted: true,
  })
  assert.equal(restored.collision.setWorldCalls, 1)
  assert.equal(restored.collision.moveCalls, 1)
  assert.equal(restored.world.updateCalls, 1)
  assert.equal(restored.dayNight.updateCalls, 1)

  source.system.dispose()
  restored.system.dispose()
})

test('changes made while a save is in flight remain dirty for the next save', async () => {
  let releaseSave
  const storage = {
    saves: 0,
    async save() {
      this.saves += 1
      await new Promise((resolve) => { releaseSave = resolve })
    },
    async load() { return null },
    close() {},
  }
  const harness = createHarness(storage)
  const save = harness.system.save({ force: true })
  harness.system.markDirty({ photos: true })
  releaseSave()
  await save

  assert.equal(harness.system.getDebugSnapshot().dirty, true)
  assert.equal(harness.system.getDebugSnapshot().photosDirty, true)
  harness.system.dispose()
})

test('development inspection mode cannot overwrite the player save', async () => {
  const storage = {
    saves: 0,
    loads: 0,
    async save() { this.saves += 1 },
    async load() {
      this.loads += 1
      return null
    },
    close() {},
  }
  const harness = createHarness(storage)
  harness.system.enabled = false

  harness.system.markDirty({ photos: true })
  assert.equal(await harness.system.save({ force: true }), false)
  assert.equal(await harness.system.restore(), false)
  assert.equal(storage.saves, 0)
  assert.equal(storage.loads, 0)
  harness.system.dispose()
})
