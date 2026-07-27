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
    this.fromQuaternion = new THREE.Quaternion()
    this.fromFov = 60
    this.index = 0
    this.phase = 'idle'
    this.elapsed = 0
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

  start(camera) {
    this.index = 0
    this.phase = 'transition'
    this.elapsed = 0
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
      this.totalElapsed += consumed
      remaining -= consumed

      if (this.phase === 'transition') {
        const progress = applyCinematicEasing(shot.easing, this.elapsed / phaseDuration)
        camera.position.lerpVectors(this.fromPosition, shot.position, progress)
        camera.quaternion.slerpQuaternions(
          this.fromQuaternion,
          shot.quaternion,
          progress,
        )
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
      camera.position.copy(shot.position)
      camera.quaternion.copy(shot.quaternion)
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
    this.#captureFrom(camera)
  }

  #captureFrom(camera) {
    this.fromPosition.copy(camera.position)
    this.fromQuaternion.copy(camera.quaternion)
    this.fromFov = camera.fov
  }
}
