export const GAME_MINUTES_PER_DAY = 24 * 60
export const GAME_CLOCK_SPEEDS = Object.freeze([1, 5, 15, 60])

const DEFAULT_HOUR = 17
const DEFAULT_MINUTE = 30

function wrapMinutes(value) {
  return ((value % GAME_MINUTES_PER_DAY) + GAME_MINUTES_PER_DAY) % GAME_MINUTES_PER_DAY
}

function defaultEventTarget() {
  return typeof window === 'undefined' ? null : window
}

export class GameClock {
  constructor({
    initialHour = DEFAULT_HOUR,
    initialMinute = DEFAULT_MINUTE,
    speed = GAME_CLOCK_SPEEDS[0],
    eventTarget = defaultEventTarget(),
  } = {}) {
    this._minutes = 0
    this._speedIndex = 0
    this.eventTarget = eventTarget
    this.handleKeyDown = this.handleKeyDown.bind(this)

    this.setTime(initialHour, initialMinute)
    this.setSpeed(speed)
    this.eventTarget?.addEventListener('keydown', this.handleKeyDown)
  }

  get minutes() {
    return this._minutes
  }

  get hour() {
    return Math.floor(this._minutes / 60)
  }

  get minute() {
    return Math.floor(this._minutes) % 60
  }

  get formatted() {
    return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`
  }

  get speed() {
    return GAME_CLOCK_SPEEDS[this._speedIndex]
  }

  update(deltaTime) {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return this._minutes

    this._minutes = wrapMinutes(this._minutes + deltaTime * this.speed)
    return this._minutes
  }

  setTime(hour, minute = 0) {
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      throw new TypeError('GameClock.setTime requires finite hour and minute values')
    }

    this._minutes = wrapMinutes(hour * 60 + minute)
    return this
  }

  setMinutes(minutes) {
    if (!Number.isFinite(minutes)) {
      throw new TypeError('GameClock.setMinutes requires a finite minute value')
    }

    this._minutes = wrapMinutes(minutes)
    return this
  }

  setSpeed(speed) {
    const speedIndex = GAME_CLOCK_SPEEDS.indexOf(speed)
    if (speedIndex === -1) {
      throw new RangeError(`Unsupported game clock speed: ${speed}`)
    }

    this._speedIndex = speedIndex
    return this
  }

  decreaseSpeed() {
    this._speedIndex = Math.max(0, this._speedIndex - 1)
    return this.speed
  }

  increaseSpeed() {
    this._speedIndex = Math.min(GAME_CLOCK_SPEEDS.length - 1, this._speedIndex + 1)
    return this.speed
  }

  resetSpeed() {
    this._speedIndex = 0
    return this.speed
  }

  handleKeyDown(event) {
    if (event.repeat) return

    const keyCode = event.code || event.key
    let handled = true
    if (keyCode === 'BracketLeft' || keyCode === '[') {
      this.decreaseSpeed()
    } else if (keyCode === 'BracketRight' || keyCode === ']') {
      this.increaseSpeed()
    } else if (keyCode === 'Backslash' || keyCode === '\\') {
      this.resetSpeed()
    } else {
      handled = false
    }

    if (handled) event.preventDefault()
  }

  dispose() {
    this.eventTarget?.removeEventListener('keydown', this.handleKeyDown)
    this.eventTarget = null
  }
}
