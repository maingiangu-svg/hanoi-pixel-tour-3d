import * as THREE from 'three'
import { MomentSystem } from './MomentSystem.js'
import { HOAN_KIEM_SCENE_MOMENTS } from './HoanKiemSceneMoments.js'

const EMPTY_LIST = Object.freeze([])
const EMPTY_CONTEXT = Object.freeze({
  active: false,
  available: false,
  sceneMomentId: null,
  region: null,
  landmarkId: null,
  angleMatched: false,
  timeMatched: false,
  lightingMatched: false,
  landmarkVisible: false,
  inClimax: false,
  climaxProgress: 0,
  timingBonus: 0,
  photoType: 'scene-scene',
  moments: EMPTY_LIST,
})

const DURATIONS = Object.freeze({
  preparing: 1.5,
  starting: 2,
  active: 5,
  climax: 3,
  ending: 2,
})

function normalizeMinutes(value) {
  return ((value % 1440) + 1440) % 1440
}

function timeMatches(minutes, window) {
  if (!Number.isFinite(minutes)) return false
  const current = normalizeMinutes(minutes)
  if (window.start === window.end) return true
  if (window.start < window.end) {
    return current >= window.start && current <= window.end
  }
  return current >= window.start || current <= window.end
}

function climaxProgress(moment) {
  if (moment?.state !== 'climax') return 0
  const duration = moment.durations?.climax ?? 0
  if (duration <= 0) return 1
  return THREE.MathUtils.clamp(moment.stateElapsed / duration, 0, 1)
}

export class SceneMomentSystem {
  constructor({
    effects = null,
    profiles = HOAN_KIEM_SCENE_MOMENTS,
  } = {}) {
    this.effects = effects
    this.profiles = Object.freeze([...profiles])
    this.profileById = new Map(this.profiles.map((profile) => [profile.id, profile]))
    this.system = new MomentSystem({
      maxConcurrent: 2,
      scanInterval: 0.35,
    })
    this.cameraDirection = new THREE.Vector3()
    this.targetDirection = new THREE.Vector3()
    this.registeredDefinitions = this.profiles.map((profile) => (
      this.#createDefinition(profile)
    ))
    this.registeredDefinitions.forEach((definition) => {
      this.system.registerMoment(definition)
    })
  }

  get size() {
    return this.system.size
  }

  update(deltaTime, context) {
    return this.system.update(deltaTime, context)
  }

  getActiveMoments() {
    return this.system.getActiveMoments()
  }

  getMomentState(id) {
    return this.system.getMomentState(id)
  }

  getDebugSnapshot() {
    return this.system.getDebugSnapshot()
  }

  getPhotoContext({
    camera,
    gameMinutes,
    lightingPhase,
    visibleLandmarkIds = EMPTY_LIST,
  } = {}) {
    if (!camera?.isCamera) return EMPTY_CONTEXT
    camera.getWorldDirection(this.cameraDirection)
    const activeById = new Map(
      this.system.getActiveMoments().map((moment) => [moment.id, moment]),
    )
    const visible = new Set(visibleLandmarkIds)
    const candidates = []

    for (const profile of this.profiles) {
      const dx = camera.position.x - profile.position[0]
      const dz = camera.position.z - profile.position[2]
      const distance = Math.hypot(dx, dz)
      if (distance > profile.captureRadius) continue

      this.targetDirection.set(
        profile.target[0] - camera.position.x,
        profile.target[1] - camera.position.y,
        profile.target[2] - camera.position.z,
      ).normalize()
      const facingDot = THREE.MathUtils.clamp(
        this.cameraDirection.dot(this.targetDirection),
        -1,
        1,
      )
      const minimumDot = Math.cos(THREE.MathUtils.degToRad(profile.angleTolerance))
      const angleMatched = facingDot >= minimumDot
      const matchedTime = timeMatches(gameMinutes, profile.time)
      const lightingMatched = lightingPhase === profile.time.lightingPhase
      const activeMoment = activeById.get(profile.id) ?? null
      const inClimax = activeMoment?.state === 'climax'
      const progress = climaxProgress(activeMoment)
      const correctCapture = angleMatched && matchedTime && lightingMatched
      candidates.push(Object.freeze({
        id: profile.id,
        name: profile.name,
        region: profile.region,
        landmarkId: profile.landmarkId,
        distance,
        captureRadius: profile.captureRadius,
        angleMatched,
        facingAlignment: Math.max(0, facingDot),
        timeMatched: matchedTime,
        lightingMatched,
        requiredLightingPhase: profile.time.lightingPhase,
        landmarkVisible: visible.has(profile.landmarkId),
        state: activeMoment?.state ?? 'inactive',
        active: Boolean(activeMoment),
        inClimax,
        climaxProgress: progress,
        climaxWindow: Object.freeze({
          state: 'climax',
          duration: DURATIONS.climax,
        }),
        timingBonus: correctCapture && inClimax
          ? profile.timingBonus * (0.8 + Math.sin(Math.PI * progress) * 0.2)
          : 0,
        photoType: profile.photoType,
      }))
    }

    if (!candidates.length) return EMPTY_CONTEXT
    candidates.sort((left, right) => (
      Number(right.angleMatched) - Number(left.angleMatched)
      || Number(right.timeMatched && right.lightingMatched)
        - Number(left.timeMatched && left.lightingMatched)
      || Number(right.inClimax) - Number(left.inClimax)
      || left.distance / left.captureRadius - right.distance / right.captureRadius
    ))
    const lead = candidates[0]
    return Object.freeze({
      active: candidates.some((candidate) => candidate.active),
      available: true,
      sceneMomentId: lead.id,
      region: lead.region,
      landmarkId: lead.landmarkId,
      angleMatched: lead.angleMatched,
      facingAlignment: lead.facingAlignment,
      timeMatched: lead.timeMatched,
      lightingMatched: lead.lightingMatched,
      requiredLightingPhase: lead.requiredLightingPhase,
      landmarkVisible: lead.landmarkVisible,
      state: lead.state,
      inClimax: lead.inClimax,
      climaxProgress: lead.climaxProgress,
      climaxWindow: lead.climaxWindow,
      timingBonus: lead.timingBonus,
      photoType: 'scene-scene',
      moments: Object.freeze(candidates),
    })
  }

  dispose() {
    this.system.dispose()
    this.effects?.reset?.()
  }

  #createDefinition(profile) {
    const matchesCaptureWindow = (context) => (
      timeMatches(context.gameMinutes, profile.time)
      && context.lightingPhase === profile.time.lightingPhase
    )
    const setEffect = (active) => {
      if (profile.effectId) this.effects?.setActive(profile.effectId, active)
    }
    return Object.freeze({
      id: profile.id,
      region: profile.region,
      area: 'outdoor',
      position: profile.position,
      triggerRadius: profile.captureRadius,
      pauseDistance: profile.captureRadius + 5,
      cleanupDistance: profile.captureRadius + 11,
      timeWindow: profile.time,
      durations: DURATIONS,
      cooldown: 35,
      maxRepeats: Infinity,
      priority: profile.priority,
      exclusionRadius: 0,
      metadata: Object.freeze({
        official: true,
        sceneMoment: true,
        name: profile.name,
        region: profile.region,
        landmarkId: profile.landmarkId,
        lightingPhase: profile.time.lightingPhase,
        captureRadius: profile.captureRadius,
        angleTolerance: profile.angleTolerance,
        target: profile.target,
        climaxWindow: DURATIONS.climax,
        timingBonus: profile.timingBonus,
        photoType: profile.photoType,
        effectId: profile.effectId,
      }),
      hooks: Object.freeze({
        shouldCancel: (_moment, context) => (
          matchesCaptureWindow(context)
            ? false
            : 'capture-window-ended'
        ),
        onStateChange: (moment, context) => setEffect(
          !['inactive', 'cooldown'].includes(moment.state)
          && matchesCaptureWindow(context),
        ),
        onPause: () => setEffect(false),
        onResume: (_moment, context) => setEffect(matchesCaptureWindow(context)),
        onCleanup: () => setEffect(false),
      }),
    })
  }
}
