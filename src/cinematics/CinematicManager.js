import * as THREE from 'three'
import { CinematicPoint } from './CinematicPoint.js'

const INTRO_FADE_DURATION = 0.42
const EXIT_FADE_DURATION = 0.24
const TITLE_VISIBLE_DURATION = 4.2

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
    clock = null,
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
    this.clock = clock
    this.canStart = canStart
    this.allowUnlockedPreview = Boolean(allowUnlockedPreview)
    this.eventTarget = eventTarget
    this.points = new Map()
    this.interactions = new Map()
    this.activePoint = null
    this.timeline = null
    this.active = false
    this.stopping = false
    this.elapsed = 0
    this.exitElapsed = 0
    this.resumePointerLock = false
    this.stopReason = null
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

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown, true)
  }

  isActive() {
    return this.active
  }

  registerPoint(definition) {
    const point = definition instanceof CinematicPoint
      ? definition
      : new CinematicPoint(definition)
    if (this.points.has(point.id)) {
      throw new Error(`Duplicate cinematic point: ${point.id}`)
    }
    this.points.set(point.id, point)
    this.interactions.set(point.id, Object.freeze({
      id: `cinematic:${point.id}`,
      type: 'action',
      cinematicPointId: point.id,
      position: point.position,
      radius: point.radius,
      label: point.promptText,
      activate: () => this.startPoint(point.id),
    }))
    return point
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

    this.savedPosition.copy(this.player.camera.position)
    this.savedQuaternion.copy(this.player.camera.quaternion)
    this.savedFov = this.player.camera.fov
    this.resumePointerLock = Boolean(this.player.controls.isLocked)
    this.activePoint = point
    this.timeline = point.createTimeline({
      playerPose: {
        position: this.savedPosition.clone(),
        quaternion: this.savedQuaternion.clone(),
        fov: this.savedFov,
      },
      point,
      world: this.world,
    })
    this.active = true
    this.stopping = false
    this.elapsed = 0
    this.exitElapsed = 0
    this.stopReason = null
    point.playCount += 1

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
      title: point.title,
      subtitle: point.subtitle,
    })
    this.overlay.setTitleVisible(true)
    this.overlay.setFade(1)
    this.clock?.pause('cinematic')
    if (this.player.controls.isLocked) this.player.controls.unlock()
    return true
  }

  update(deltaTime) {
    if (!this.active) return
    const delta = Math.min(Math.max(Number(deltaTime) || 0, 0), 0.1)

    if (this.stopping) {
      this.exitElapsed += delta
      this.overlay.setFade(this.exitElapsed / EXIT_FADE_DURATION)
      if (this.exitElapsed >= EXIT_FADE_DURATION) this.#completeStop()
      return
    }

    this.elapsed += delta
    this.overlay.setFade(1 - Math.min(1, this.elapsed / INTRO_FADE_DURATION))
    this.overlay.setTitleVisible(this.elapsed <= TITLE_VISIBLE_DURATION)
    const complete = this.timeline.update(delta, this.camera)
    if (complete) this.stop('complete')
  }

  stop(reason = 'cancelled') {
    if (!this.active || this.stopping) return false
    this.stopping = true
    this.stopReason = reason
    this.exitElapsed = 0
    this.overlay.setTitleVisible(false)
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
    // again immediately. Natural completion still keeps the short fade-out.
    this.stopReason = code === 'Space' ? 'skip-space' : 'skip-escape'
    this.#completeStop()
  }

  dispose() {
    if (this.disposed) return
    this.resumePointerLock = false
    this.cancel('dispose')
    this.disposed = true
    this.points.clear()
    this.interactions.clear()
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown, true)
    this.overlay.dispose()
  }

  #completeStop() {
    const shouldRelock = this.resumePointerLock
    this.player.camera.position.copy(this.savedPosition)
    this.player.camera.quaternion.copy(this.savedQuaternion)
    this.player.camera.fov = this.savedFov
    this.player.camera.updateProjectionMatrix()
    this.renderer.setActiveCamera(this.player.getRenderCamera?.() ?? this.player.camera)
    this.clock?.resume('cinematic')
    this.overlay.setOpen(false)
    this.overlay.setTitleVisible(false)
    this.gameUi.setCinematicActive(false)

    this.active = false
    this.stopping = false
    this.resumePointerLock = false
    this.activePoint = null
    this.timeline = null
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
