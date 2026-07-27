import * as THREE from 'three'
import {
  CINEMATIC_TRIGGER_TYPES,
  CinematicDefinition,
} from './CinematicDefinition.js'
import { CinematicMarkerLayer } from './CinematicMarker.js'
import { CinematicPoint } from './CinematicPoint.js'

const INTRO_FADE_DURATION = 0.42
const EXIT_FADE_DURATION = 0.28
const TITLE_VISIBLE_DURATION = 4.6

function getKeyCode(event) {
  if (event.code) return event.code
  if (event.key === ' ') return 'Space'
  return event.key
}

export class CinematicManager {
  constructor({
    renderer,
    player,
    input,
    gameUi,
    overlay,
    world,
    audio = null,
    canStart = () => true,
    allowUnlockedPreview = false,
    eventTarget = window,
  }) {
    this.renderer = renderer
    this.player = player
    this.input = input
    this.gameUi = gameUi
    this.overlay = overlay
    this.world = world
    this.audio = audio
    this.canStart = canStart
    this.allowUnlockedPreview = Boolean(allowUnlockedPreview)
    this.eventTarget = eventTarget
    this.definitions = new Map()
    this.points = new Map()
    this.interactions = new Map()
    this.queue = []
    this.activeDefinition = null
    this.activePoint = null
    this.timeline = null
    this.active = false
    this.stopping = false
    this.elapsed = 0
    this.exitElapsed = 0
    this.resumePointerLock = false
    this.stopReason = null
    this.currentTimeScale = 1
    this.lastShotId = null
    this.disposed = false

    const sourceCamera = player.camera
    this.camera = new THREE.PerspectiveCamera(
      sourceCamera.fov,
      sourceCamera.aspect,
      sourceCamera.near,
      sourceCamera.far,
    )
    this.camera.rotation.order = 'YXZ'
    this.savedPosition = new THREE.Vector3()
    this.savedQuaternion = new THREE.Quaternion()
    this.savedFov = sourceCamera.fov
    this.markerLayer = new CinematicMarkerLayer(renderer.scene)

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown, true)
  }

  isActive() {
    return this.active
  }

  isCinematicPlaying() {
    return this.active
  }

  getSimulationTimeScale() {
    return this.active ? this.currentTimeScale : 1
  }

  registerCinematic(definition) {
    let normalized = definition
    if (!(definition instanceof CinematicDefinition)) {
      normalized = definition?.triggerType === CINEMATIC_TRIGGER_TYPES.INTERACTION
        ? new CinematicPoint(definition)
        : new CinematicDefinition(definition)
    }
    if (this.definitions.has(normalized.id)) {
      throw new Error(`Duplicate cinematic: ${normalized.id}`)
    }

    this.definitions.set(normalized.id, normalized)
    if (normalized instanceof CinematicPoint) {
      this.points.set(normalized.id, normalized)
      this.markerLayer.add(normalized)
      this.interactions.set(normalized.id, Object.freeze({
        id: `cinematic:${normalized.id}`,
        type: 'action',
        cinematicPointId: normalized.id,
        position: normalized.position,
        radius: normalized.radius,
        label: normalized.promptText,
        activate: () => this.startPoint(normalized.id),
      }))
    }
    return normalized
  }

  registerPoint(definition) {
    const point = definition instanceof CinematicPoint
      ? definition
      : new CinematicPoint(definition)
    return this.registerCinematic(point)
  }

  getNearbyInteractions(position) {
    if (
      this.active
      || this.disposed
      || (!this.player.controls.isLocked && !this.allowUnlockedPreview)
      || !this.canStart()
    ) return []

    const areaName = this.world.activeAreaName
    const regionIds = this.world.getActiveDistrictNames(position)
    const available = []
    for (const point of this.points.values()) {
      if (!point.isAvailable({ areaName, regionIds })) continue
      if (!point.isNear(position)) continue
      available.push(this.interactions.get(point.id))
    }
    return available
  }

  playCinematic(id, context = {}) {
    const definition = this.definitions.get(id)
    if (!definition || this.active || this.disposed || !this.canStart()) return false
    if (!definition.canPlay({
      ...context,
      world: this.world,
      manager: this,
    })) return false
    return this.#beginDefinition(definition, context)
  }

  playStoryCinematic(id, storyContext = {}) {
    const definition = this.definitions.get(id)
    if (definition?.triggerType !== CINEMATIC_TRIGGER_TYPES.STORY) return false
    return this.playCinematic(id, { storyContext, source: 'story' })
  }

  queueCinematic(id, {
    story = null,
    context = {},
  } = {}) {
    const definition = this.definitions.get(id)
    if (!definition || this.disposed) return false
    if (
      this.activeDefinition?.id === id
      || this.queue.some((entry) => entry.id === id)
    ) return false
    this.queue.push({
      id,
      story: story ?? definition.triggerType === CINEMATIC_TRIGGER_TYPES.STORY,
      context,
    })
    return true
  }

  startPoint(id) {
    const point = this.points.get(id)
    if (
      !point
      || this.active
      || this.disposed
      || !this.canStart()
      || !point.isNear(this.player.camera.position)
    ) return false

    const regionIds = this.world.getActiveDistrictNames(this.player.camera.position)
    if (!point.isAvailable({
      areaName: this.world.activeAreaName,
      regionIds,
    })) return false
    return this.#beginDefinition(point, { source: 'interaction' })
  }

  update(deltaTime) {
    const delta = Math.min(Math.max(Number(deltaTime) || 0, 0), 0.1)
    this.markerLayer.update(delta, {
      playerPosition: this.player.camera.position,
      areaName: this.world.activeAreaName,
      hidden: this.active,
    })

    if (!this.active) {
      this.#tryQueuedCinematic()
      return
    }

    if (this.stopping) {
      this.currentTimeScale = 1
      this.exitElapsed += delta
      this.overlay.setFade(this.exitElapsed / EXIT_FADE_DURATION)
      if (this.exitElapsed >= EXIT_FADE_DURATION) this.#completeStop()
      return
    }

    this.elapsed += delta
    this.overlay.setFade(1 - Math.min(1, this.elapsed / INTRO_FADE_DURATION))
    this.overlay.setTitleVisible(this.elapsed <= TITLE_VISIBLE_DURATION)
    const complete = this.timeline.update(delta, this.camera)
    this.currentTimeScale = this.timeline.simulationTimeScale
    this.#syncShotAudio()
    if (complete) this.stop('complete')
  }

  stop(reason = 'cancelled') {
    if (!this.active || this.stopping) return false
    this.stopping = true
    this.stopReason = reason
    this.exitElapsed = 0
    this.currentTimeScale = 1
    this.overlay.setTitleVisible(false)
    return true
  }

  skipCinematic() {
    if (!this.active) return false
    this.stopReason = 'skip-api'
    this.#completeStop()
    return true
  }

  cancel(reason = 'cancelled') {
    if (!this.active) return false
    this.stopReason = reason
    this.#completeStop()
    return true
  }

  handleKeyDown(event) {
    if (!this.active || event.repeat) return
    const code = getKeyCode(event)
    if (code !== 'Escape' && code !== 'Space') return
    event.preventDefault?.()
    event.stopImmediatePropagation?.()
    // Finish inside the trusted key gesture so Pointer Lock can be requested
    // again immediately. Natural completion keeps the authored fade-out.
    this.stopReason = code === 'Space' ? 'skip-space' : 'skip-escape'
    this.#completeStop()
  }

  dispose() {
    if (this.disposed) return
    this.resumePointerLock = false
    this.queue.length = 0
    this.cancel('dispose')
    this.disposed = true
    this.definitions.clear()
    this.points.clear()
    this.interactions.clear()
    this.markerLayer.dispose()
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown, true)
    this.overlay.dispose()
  }

  #beginDefinition(definition, context) {
    this.savedPosition.copy(this.player.camera.position)
    this.savedQuaternion.copy(this.player.camera.quaternion)
    this.savedFov = this.player.camera.fov
    this.resumePointerLock = Boolean(this.player.controls.isLocked)
    this.activeDefinition = definition
    this.activePoint = definition instanceof CinematicPoint ? definition : null
    this.timeline = definition.createTimeline({
      ...context,
      playerPose: {
        position: this.savedPosition.clone(),
        quaternion: this.savedQuaternion.clone(),
        fov: this.savedFov,
      },
      cinematic: definition,
      point: this.activePoint,
      world: this.world,
    })
    this.active = true
    this.stopping = false
    this.elapsed = 0
    this.exitElapsed = 0
    this.stopReason = null
    this.currentTimeScale = 1
    this.lastShotId = null
    definition.playCount += 1

    this.camera.aspect = this.player.camera.aspect
    this.camera.near = this.player.camera.near
    this.camera.far = this.player.camera.far
    this.timeline.start(this.camera)
    this.renderer.setActiveCamera(this.camera)
    this.input.setEnabled(false)
    this.input.reset?.()
    this.gameUi.setInteraction(null)
    this.gameUi.setCinematicActive(true)
    this.overlay.setOpen(true, {
      title: definition.title,
      subtitle: definition.subtitle,
    })
    this.overlay.setTitleVisible(true)
    this.overlay.setFade(1)
    this.audio?.beginCinematic({
      cue: definition.audioCue,
      ambientLevel: definition.ambientLevel,
    })
    this.#syncShotAudio()
    if (this.player.controls.isLocked) this.player.controls.unlock()
    return true
  }

  #syncShotAudio() {
    const shot = this.timeline?.currentShot
    if (!shot || shot.id === this.lastShotId) return
    this.lastShotId = shot.id
    if (!shot.audioCue) return
    this.audio?.setCinematicCue(shot.audioCue, {
      fadeIn: shot.audioFadeIn,
      fadeOut: shot.audioFadeOut,
    })
  }

  #tryQueuedCinematic() {
    if (!this.queue.length || !this.canStart()) return
    const entry = this.queue[0]
    const played = entry.story
      ? this.playStoryCinematic(entry.id, entry.context)
      : this.playCinematic(entry.id, entry.context)
    if (played || !this.definitions.has(entry.id)) this.queue.shift()
  }

  #completeStop() {
    const shouldRelock = this.resumePointerLock
    this.currentTimeScale = 1
    this.audio?.endCinematic()
    this.player.camera.position.copy(this.savedPosition)
    this.player.camera.quaternion.copy(this.savedQuaternion)
    this.player.camera.fov = this.savedFov
    this.player.camera.updateProjectionMatrix()
    this.renderer.setActiveCamera(this.player.getRenderCamera?.() ?? this.player.camera)
    this.overlay.setOpen(false)
    this.overlay.setTitleVisible(false)
    this.gameUi.setCinematicActive(false)

    this.active = false
    this.stopping = false
    this.resumePointerLock = false
    this.activeDefinition = null
    this.activePoint = null
    this.timeline = null
    this.lastShotId = null
    this.exitElapsed = 0
    this.input.setEnabled(false)

    if (shouldRelock) {
      if (this.player.controls.isLocked) {
        this.input.setEnabled(true)
        this.gameUi.setLocked(true)
      } else {
        this.player.lock()
        if (!this.player.controls.isLocked) this.gameUi.setResumeMode(true)
      }
    } else {
      this.gameUi.setResumeMode(true)
    }
  }
}
