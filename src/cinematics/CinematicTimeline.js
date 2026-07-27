import * as THREE from 'three'

const EPSILON = 1e-6

export function applyCinematicEasing(name, value) {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  if (typeof name === 'function') return THREE.MathUtils.clamp(name(t), 0, 1)
  if (name === 'linear') return t
  if (name === 'easeOut') return 1 - ((1 - t) ** 3)
  if (name === 'easeIn') return t ** 3
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2
}

function asVector3(value, label) {
  if (value?.isVector3) return value.clone()
  if (
    !Number.isFinite(value?.x)
    || !Number.isFinite(value?.y)
    || !Number.isFinite(value?.z)
  ) {
    throw new TypeError(`${label} requires finite x/y/z coordinates`)
  }
  return new THREE.Vector3(value.x, value.y, value.z)
}

function createCameraPath(path = {}, position, index) {
  const type = path.type ?? 'pan'
  if (type === 'orbit') {
    return {
      type,
      center: asVector3(path.center, `Cinematic shot ${index} orbit center`),
      startAngle: THREE.MathUtils.degToRad(Number(path.startAngle) || 0),
      endAngle: THREE.MathUtils.degToRad(Number(path.endAngle) || 0),
      startRadius: Math.max(0.1, Number(path.startRadius ?? path.radius) || 1),
      endRadius: Math.max(0.1, Number(path.endRadius ?? path.radius) || 1),
      startHeight: Number(path.startHeight) || position.y,
      endHeight: Number(path.endHeight) || position.y,
    }
  }
  if (type === 'curve') {
    const points = (path.points ?? []).map((point, pointIndex) => (
      asVector3(point, `Cinematic shot ${index} curve point ${pointIndex}`)
    ))
    if (points.length < 2) {
      throw new TypeError(`Cinematic shot ${index} curve requires at least two points`)
    }
    return {
      type,
      curve: new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    }
  }
  return {
    type,
    from: path.from
      ? asVector3(path.from, `Cinematic shot ${index} path start`)
      : null,
  }
}

function createShot(shot, index, helperCamera) {
  const position = asVector3(shot.position, `Cinematic shot ${index} position`)
  const target = asVector3(shot.target, `Cinematic shot ${index} target`)
  helperCamera.position.copy(position)
  helperCamera.up.set(0, 1, 0)
  helperCamera.lookAt(target)
  return {
    id: shot.id ?? `shot-${index + 1}`,
    position,
    target,
    quaternion: helperCamera.quaternion.clone(),
    duration: Math.max(0, Number(shot.duration) || 0),
    holdTime: Math.max(0, Number(shot.holdTime) || 0),
    fov: THREE.MathUtils.clamp(Number(shot.fov) || 60, 24, 100),
    easing: shot.easing ?? 'easeInOut',
    cameraPath: createCameraPath(shot.cameraPath, position, index),
    timeScale: Number(shot.timeScale) < 1
      ? THREE.MathUtils.clamp(Number(shot.timeScale), 0.35, 0.6)
      : 1,
    slowMotionStart: Math.max(0, Number(shot.slowMotionStart) || 0),
    slowMotionDuration: Math.max(0, Number(shot.slowMotionDuration) || 0),
    audioCue: shot.audioCue ?? null,
    audioFadeIn: Math.max(0.05, Number(shot.audioFadeIn) || 0.45),
    audioFadeOut: Math.max(0.05, Number(shot.audioFadeOut) || 0.45),
    foregroundParallax: Boolean(shot.foregroundParallax),
  }
}

export class CinematicTimeline {
  constructor({ shots = [] } = {}) {
    if (!Array.isArray(shots) || shots.length === 0) {
      throw new TypeError('Cinematic timeline requires at least one shot')
    }

    this.helperCamera = new THREE.PerspectiveCamera()
    this.shots = shots.map((shot, index) => createShot(shot, index, this.helperCamera))
    this.fromPosition = new THREE.Vector3()
    this.fromTarget = new THREE.Vector3()
    this.fromQuaternion = new THREE.Quaternion()
    this.fromFov = 60
    this.workingPosition = new THREE.Vector3()
    this.workingTarget = new THREE.Vector3()
    this.viewDirection = new THREE.Vector3()
    this.index = 0
    this.phase = 'idle'
    this.elapsed = 0
    this.shotElapsed = 0
    this.totalElapsed = 0
    this.duration = this.shots.reduce(
      (total, shot) => total + shot.duration + shot.holdTime,
      0,
    )
  }

  get currentShot() {
    return this.shots[Math.min(this.index, this.shots.length - 1)]
  }

  get progress() {
    if (this.duration <= EPSILON) return this.phase === 'complete' ? 1 : 0
    return THREE.MathUtils.clamp(this.totalElapsed / this.duration, 0, 1)
  }

  get remainingTime() {
    return Math.max(0, this.duration - this.totalElapsed)
  }

  get isComplete() {
    return this.phase === 'complete'
  }

  get simulationTimeScale() {
    if (this.phase === 'idle' || this.phase === 'complete') return 1
    const shot = this.currentShot
    if (shot.timeScale >= 1) return 1
    const shotDuration = shot.duration + shot.holdTime
    const slowDuration = shot.slowMotionDuration > EPSILON
      ? shot.slowMotionDuration
      : Math.max(EPSILON, shotDuration - shot.slowMotionStart)
    const slowStart = Math.min(shot.slowMotionStart, shotDuration)
    const slowEnd = Math.min(shotDuration, slowStart + slowDuration)
    const time = this.shotElapsed
    if (time < slowStart || time > slowEnd) return 1

    const ramp = Math.min(0.24, slowDuration * 0.22)
    if (ramp <= EPSILON) return shot.timeScale
    const fadeIn = THREE.MathUtils.clamp((time - slowStart) / ramp, 0, 1)
    const fadeOut = THREE.MathUtils.clamp((slowEnd - time) / ramp, 0, 1)
    const blend = Math.min(fadeIn, fadeOut)
    return THREE.MathUtils.lerp(1, shot.timeScale, applyCinematicEasing('easeInOut', blend))
  }

  start(camera) {
    this.index = 0
    this.phase = 'transition'
    this.elapsed = 0
    this.shotElapsed = 0
    this.totalElapsed = 0
    const first = this.currentShot
    // The first view is a concealed cut behind the cinematic fade. Later
    // shots always interpolate from the previous safe camera position.
    camera.position.copy(first.position)
    camera.quaternion.copy(first.quaternion)
    camera.fov = first.fov
    camera.updateProjectionMatrix()
    this.#captureFrom(camera)
    return first
  }

  update(deltaTime, camera) {
    if (this.phase === 'idle') this.start(camera)
    if (this.phase === 'complete') return true

    let remaining = Math.min(Math.max(Number(deltaTime) || 0, 0), 0.1)
    while (remaining > EPSILON && this.phase !== 'complete') {
      const shot = this.currentShot
      const phaseDuration = this.phase === 'transition'
        ? shot.duration
        : shot.holdTime

      if (phaseDuration <= EPSILON) {
        this.#advancePhase(camera)
        continue
      }

      const consumed = Math.min(remaining, phaseDuration - this.elapsed)
      this.elapsed += consumed
      this.shotElapsed += consumed
      this.totalElapsed += consumed
      remaining -= consumed

      if (this.phase === 'transition') {
        const progress = applyCinematicEasing(shot.easing, this.elapsed / phaseDuration)
        this.#applyCameraPath(camera, shot, progress)
        camera.fov = THREE.MathUtils.lerp(this.fromFov, shot.fov, progress)
        camera.updateProjectionMatrix()
      }

      if (this.elapsed >= phaseDuration - EPSILON) this.#advancePhase(camera)
    }
    return this.phase === 'complete'
  }

  #advancePhase(camera) {
    const shot = this.currentShot
    if (this.phase === 'transition') {
      this.#applyCameraPath(camera, shot, 1)
      camera.fov = shot.fov
      camera.updateProjectionMatrix()
      this.phase = 'hold'
      this.elapsed = 0
      if (shot.holdTime > EPSILON) return
    }

    if (this.index >= this.shots.length - 1) {
      this.phase = 'complete'
      this.elapsed = 0
      this.totalElapsed = this.duration
      return
    }

    this.index += 1
    this.phase = 'transition'
    this.elapsed = 0
    this.shotElapsed = 0
    this.#captureFrom(camera)
  }

  #captureFrom(camera) {
    this.fromPosition.copy(camera.position)
    this.fromQuaternion.copy(camera.quaternion)
    this.fromFov = camera.fov
    camera.getWorldDirection(this.viewDirection)
    this.fromTarget.copy(camera.position).addScaledVector(this.viewDirection, 10)
  }

  #applyCameraPath(camera, shot, progress) {
    const path = shot.cameraPath
    if (path.type === 'orbit') {
      const angle = THREE.MathUtils.lerp(path.startAngle, path.endAngle, progress)
      const radius = THREE.MathUtils.lerp(path.startRadius, path.endRadius, progress)
      this.workingPosition.set(
        path.center.x + Math.sin(angle) * radius,
        THREE.MathUtils.lerp(path.startHeight, path.endHeight, progress),
        path.center.z + Math.cos(angle) * radius,
      )
    } else if (path.type === 'curve') {
      path.curve.getPoint(progress, this.workingPosition)
    } else {
      this.workingPosition.lerpVectors(
        path.from ?? this.fromPosition,
        shot.position,
        progress,
      )
    }

    this.workingTarget.lerpVectors(this.fromTarget, shot.target, progress)
    camera.position.copy(this.workingPosition)
    camera.lookAt(this.workingTarget)
  }
}
