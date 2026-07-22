const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ShiftLeft',
  'ShiftRight',
])

export class Input {
  constructor(eventTarget = window) {
    this.eventTarget = eventTarget
    this.pressed = new Set()
    this.enabled = false

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
    this.reset = this.reset.bind(this)

    this.eventTarget.addEventListener('keydown', this.handleKeyDown)
    this.eventTarget.addEventListener('keyup', this.handleKeyUp)
    this.eventTarget.addEventListener('blur', this.reset)
  }

  handleKeyDown(event) {
    if (!this.enabled || !MOVEMENT_KEYS.has(event.code)) return
    event.preventDefault()
    this.pressed.add(event.code)
  }

  handleKeyUp(event) {
    if (!MOVEMENT_KEYS.has(event.code)) return
    this.pressed.delete(event.code)
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) this.reset()
  }

  isDown(...codes) {
    return codes.some((code) => this.pressed.has(code))
  }

  getMovement() {
    return {
      forward: Number(this.isDown('KeyW')) - Number(this.isDown('KeyS')),
      right: Number(this.isDown('KeyD')) - Number(this.isDown('KeyA')),
      running: this.isDown('ShiftLeft', 'ShiftRight'),
    }
  }

  reset() {
    this.pressed.clear()
  }

  dispose() {
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown)
    this.eventTarget.removeEventListener('keyup', this.handleKeyUp)
    this.eventTarget.removeEventListener('blur', this.reset)
  }
}
