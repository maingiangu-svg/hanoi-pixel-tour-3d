export const GAME_SAVE_VERSION = 1
const AUTOSAVE_INTERVAL_MS = 30000
const SAVE_DEBOUNCE_MS = 900

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

export class GameSaveSystem {
  constructor({
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
    eventTarget = globalThis.window,
    setIntervalFn = globalThis.setInterval?.bind(globalThis),
    clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    onStatus = () => {},
    enabled = true,
  }) {
    this.storage = storage
    this.clock = clock
    this.player = player
    this.collision = collision
    this.world = world
    this.dayNight = dayNight
    this.photoStore = photoStore
    this.questSystem = questSystem
    this.albumCatalog = albumCatalog
    this.audioSystem = audioSystem
    this.eventTarget = eventTarget
    this.setIntervalFn = setIntervalFn
    this.clearIntervalFn = clearIntervalFn
    this.setTimeoutFn = setTimeoutFn
    this.clearTimeoutFn = clearTimeoutFn
    this.onStatus = onStatus
    this.enabled = enabled
    this.dirty = true
    this.photosDirty = true
    this.revision = 0
    this.photoRevision = 0
    this.restoring = false
    this.saving = null
    this.disposed = false
    this.autosaveTimer = null
    this.debounceTimer = null
    this.handlePageHide = () => {
      void this.save({ force: true }).catch(() => {})
    }
    this.unsubscribePhotos = null
    this.unsubscribeQuests = null
    this.unsubscribeAlbum = null
    if (this.enabled) {
      this.unsubscribePhotos = this.photoStore.subscribe(() => {
        if (!this.restoring) this.markDirty({ photos: true })
      })
      this.unsubscribeQuests = this.questSystem.subscribe(() => {
        if (!this.restoring) this.markDirty()
      })
      this.unsubscribeAlbum = this.albumCatalog.subscribe(() => {
        if (!this.restoring) this.markDirty()
      })
      this.eventTarget?.addEventListener?.('pagehide', this.handlePageHide)
      this.autosaveTimer = this.setIntervalFn?.(() => {
        this.markDirty()
        void this.save().catch(() => {})
      }, AUTOSAVE_INTERVAL_MS)
    }
  }

  markDirty({ photos = false } = {}) {
    if (!this.enabled || this.disposed || this.restoring) return
    this.dirty = true
    this.revision += 1
    if (photos) {
      this.photosDirty = true
      this.photoRevision += 1
    }
  }

  saveSoon({ photos = false } = {}) {
    this.markDirty({ photos })
    if (!this.setTimeoutFn) return
    if (this.debounceTimer !== null) this.clearTimeoutFn?.(this.debounceTimer)
    this.debounceTimer = this.setTimeoutFn(() => {
      this.debounceTimer = null
      void this.save().catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  async save({ force = false } = {}) {
    if (!this.enabled || this.disposed || (!force && !this.dirty)) return false
    if (this.saving) return this.saving
    const photosDirty = this.photosDirty
    const savedRevision = this.revision
    const savedPhotoRevision = this.photoRevision
    const payload = this.#createPayload()
    this.saving = this.storage.save(payload, { photosDirty })
      .then(() => {
        if (this.revision === savedRevision) this.dirty = false
        if (photosDirty && this.photoRevision === savedPhotoRevision) {
          this.photosDirty = false
        }
        this.onStatus('Đã lưu tiến trình')
        return true
      })
      .finally(() => {
        this.saving = null
        if (this.dirty && !this.disposed) this.saveSoon({ photos: this.photosDirty })
      })
    return this.saving
  }

  async restore() {
    if (!this.enabled || this.disposed) return false
    const payload = await this.storage.load()
    if (this.disposed) return false
    if (!payload?.state || payload.state.version !== GAME_SAVE_VERSION) return false
    this.restoring = true
    try {
      this.photoStore.restoreState(payload.photos ?? [])
      this.questSystem.restoreState(payload.state.quests)
      this.albumCatalog.restoreState(
        payload.state.album,
        this.photoStore.getAll(),
      )
      this.clock.setMinutes(finite(payload.state.clock?.minutes, this.clock.minutes))
      if (Number.isFinite(payload.state.clock?.speed)) {
        try {
          this.clock.setSpeed(payload.state.clock.speed)
        } catch {
          this.clock.resetSpeed()
        }
      }
      this.audioSystem.restoreState(payload.state.audio)
      this.#restorePlayer(payload.state.player)
      this.world.update(0, this.clock)
      this.dayNight.update(this.world.activeAreaName)
      this.dirty = false
      this.photosDirty = false
      this.onStatus('Đã khôi phục tiến trình')
      return true
    } finally {
      this.restoring = false
    }
  }

  getDebugSnapshot() {
    return Object.freeze({
      dirty: this.dirty,
      photosDirty: this.photosDirty,
      saving: Boolean(this.saving),
      photoCount: this.photoStore.size,
      version: GAME_SAVE_VERSION,
    })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribePhotos?.()
    this.unsubscribeQuests?.()
    this.unsubscribeAlbum?.()
    this.eventTarget?.removeEventListener?.('pagehide', this.handlePageHide)
    if (this.autosaveTimer !== null) this.clearIntervalFn?.(this.autosaveTimer)
    if (this.debounceTimer !== null) this.clearTimeoutFn?.(this.debounceTimer)
    if (this.saving) {
      void this.saving.finally(() => this.storage.close?.())
    } else {
      this.storage.close?.()
    }
  }

  #createPayload() {
    const camera = this.player.camera
    return {
      state: {
        version: GAME_SAVE_VERSION,
        savedAt: new Date().toISOString(),
        clock: {
          minutes: this.clock.minutes,
          speed: this.clock.speed,
        },
        player: {
          mapId: this.world.activeMapId,
          areaName: this.world.activeAreaName,
          position: {
            x: camera.position.x,
            z: camera.position.z,
          },
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
          motorbikeMounted: this.player.isMotorbikeMounted,
        },
        quests: this.questSystem.exportState(),
        album: this.albumCatalog.exportState(),
        audio: this.audioSystem.getState(),
      },
      photos: this.photoStore.exportState(),
    }
  }

  #restorePlayer(saved = {}) {
    let destination
    try {
      destination = this.world.transition(saved.mapId ?? 'hoanKiem')
    } catch {
      destination = this.world.transition('hoanKiem')
    }
    this.collision.setWorld(destination)
    const position = {
      x: finite(saved.position?.x, destination.spawn.x),
      z: finite(saved.position?.z, destination.spawn.z),
    }
    this.collision.move(position, { x: 0, z: 0 })
    this.player.teleport(position, finite(saved.yaw, destination.spawn.yaw ?? 0))
    this.player.camera.rotation.x = Math.max(
      -1.3,
      Math.min(1.3, finite(saved.pitch, 0)),
    )
    if (saved.motorbikeMounted && this.world.activeAreaName !== 'interior') {
      this.player.setMotorbikeMounted(true)
    }
  }
}
