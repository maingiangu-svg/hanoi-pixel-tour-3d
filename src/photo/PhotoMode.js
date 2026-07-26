import * as THREE from 'three'

export const PHOTO_FOCAL_LENGTHS = Object.freeze([24, 35, 50, 85])
const DEFAULT_FOCAL_INDEX = 1
const SENSOR_HEIGHT_MM = 24
const FOV_DAMPING = 12

function getKeyCode(event) {
  if (event.code) return event.code
  if (event.key === ' ') return 'Space'
  if (event.key?.length === 1) return `Key${event.key.toUpperCase()}`
  return event.key
}

export function focalLengthToVerticalFov(
  focalLength,
  sensorHeight = SENSOR_HEIGHT_MM,
) {
  if (!Number.isFinite(focalLength) || focalLength <= 0) {
    throw new RangeError('Focal length must be a positive finite number')
  }
  return THREE.MathUtils.radToDeg(2 * Math.atan(sensorHeight / (2 * focalLength)))
}

export class PhotoMode {
  constructor({
    camera,
    input,
    capture,
    photoUi,
    gameUi,
    canOpen = () => true,
    isPointerLocked = () => true,
    onStateChange = () => {},
    onPhotoCaptured = async () => {},
    eventTarget = window,
    wheelTarget = window,
  }) {
    this.camera = camera
    this.input = input
    this.capture = capture
    this.photoUi = photoUi
    this.gameUi = gameUi
    this.canOpen = canOpen
    this.isPointerLocked = isPointerLocked
    this.onStateChange = onStateChange
    this.onPhotoCaptured = onPhotoCaptured
    this.eventTarget = eventTarget
    this.wheelTarget = wheelTarget
    this.active = false
    this.capturing = false
    this.disposed = false
    this.focalIndex = DEFAULT_FOCAL_INDEX
    this.savedFov = camera.fov
    this.targetFov = camera.fov

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleWheel = this.handleWheel.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown, true)
    this.wheelTarget.addEventListener('wheel', this.handleWheel, { passive: false })
    this.photoUi.setFocalLength(this.focalLength)
  }

  get focalLength() {
    return PHOTO_FOCAL_LENGTHS[this.focalIndex]
  }

  get lastPhoto() {
    return this.capture.lastCapture
  }

  isActive() {
    return this.active
  }

  open() {
    if (this.active || this.disposed || !this.canOpen()) return false

    this.savedFov = this.camera.fov
    this.targetFov = focalLengthToVerticalFov(this.focalLength)
    this.active = true
    this.input.setEnabled(false)
    this.input.reset?.()
    this.gameUi.setInteraction(null)
    this.photoUi.setFocalLength(this.focalLength)
    this.photoUi.setOpen(true)
    this.onStateChange(true)
    return true
  }

  close({ resumeInput = true } = {}) {
    if (!this.active) return false

    this.active = false
    this.capturing = false
    this.targetFov = this.savedFov
    this.camera.fov = this.savedFov
    this.camera.updateProjectionMatrix()
    this.photoUi.setCapturing(false)
    this.photoUi.setOpen(false)
    this.onStateChange(false)
    this.input.setEnabled(Boolean(resumeInput && this.isPointerLocked()))
    return true
  }

  update(deltaTime) {
    if (!this.active) return
    const delta = Math.min(Math.max(Number.isFinite(deltaTime) ? deltaTime : 0, 0), 0.1)
    const amount = 1 - Math.exp(-FOV_DAMPING * delta)
    const nextFov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, amount)
    if (Math.abs(nextFov - this.camera.fov) < 0.0001) return
    this.camera.fov = nextFov
    this.camera.updateProjectionMatrix()
  }

  setFocalIndex(index) {
    const nextIndex = THREE.MathUtils.clamp(
      Math.round(index),
      0,
      PHOTO_FOCAL_LENGTHS.length - 1,
    )
    if (nextIndex === this.focalIndex) return this.focalLength
    this.focalIndex = nextIndex
    this.targetFov = focalLengthToVerticalFov(this.focalLength)
    this.photoUi.setFocalLength(this.focalLength)
    return this.focalLength
  }

  stepZoom(direction) {
    if (!this.active || !Number.isFinite(direction) || direction === 0) {
      return this.focalLength
    }
    return this.setFocalIndex(this.focalIndex + Math.sign(direction))
  }

  async takePhoto() {
    if (!this.active || this.capturing) return null
    this.capturing = true
    this.photoUi.setCapturing(true)

    try {
      const photo = await this.capture.capture({ focalLength: this.focalLength })
      await this.onPhotoCaptured(photo)
      if (!this.disposed) {
        this.gameUi.flashPhoto()
        this.gameUi.showNotice(`Đã chụp ảnh · ${this.focalLength}mm`, 1500)
      }
      return photo
    } catch (error) {
      if (!this.disposed) this.gameUi.showNotice('Không thể chụp ảnh lúc này.', 1800)
      throw error
    } finally {
      this.capturing = false
      if (!this.disposed) this.photoUi.setCapturing(false)
    }
  }

  handleKeyDown(event) {
    if (this.disposed || event.repeat) return
    const code = getKeyCode(event)

    if (!this.active) {
      if (code !== 'KeyC') return
      if (this.open()) {
        event.preventDefault?.()
        event.stopImmediatePropagation?.()
      }
      return
    }

    const handled = ['KeyC', 'Escape', 'Space', 'KeyQ', 'KeyE', 'KeyM'].includes(code)
    if (!handled) return
    event.stopImmediatePropagation?.()
    if (code !== 'Escape') event.preventDefault?.()

    if (code === 'KeyC' || code === 'Escape') {
      this.close()
    } else if (code === 'Space') {
      void this.takePhoto().catch(() => {})
    } else if (code === 'KeyQ') {
      this.stepZoom(-1)
    } else if (code === 'KeyE') {
      this.stepZoom(1)
    }
  }

  handleWheel(event) {
    if (!this.active || this.disposed || event.deltaY === 0) return
    event.preventDefault?.()
    event.stopImmediatePropagation?.()
    this.stepZoom(event.deltaY < 0 ? 1 : -1)
  }

  dispose() {
    if (this.disposed) return
    this.close({ resumeInput: false })
    this.disposed = true
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown, true)
    this.wheelTarget.removeEventListener('wheel', this.handleWheel, { passive: false })
  }
}
