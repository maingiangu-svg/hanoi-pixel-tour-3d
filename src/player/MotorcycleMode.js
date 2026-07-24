export function isMotorcycleToggleHotkey(event) {
  if (
    !event
    || event.repeat
    || event.shiftKey
    || event.ctrlKey
    || event.altKey
    || event.metaKey
  ) return false
  return event.code === 'Digit2'
    || event.code === 'Numpad2'
    || (!event.code && event.key === '2')
}

export class MotorcycleMode {
  constructor({
    player,
    ui = null,
    canToggle = () => true,
    eventTarget = window,
  }) {
    this.player = player
    this.ui = ui
    this.canToggle = canToggle
    this.eventTarget = eventTarget
    this.disposed = false
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown)
  }

  handleKeyDown(event) {
    if (
      this.disposed
      || !isMotorcycleToggleHotkey(event)
      || !this.player.controls.isLocked
      || !this.canToggle()
    ) return

    event.preventDefault()
    const mounted = this.player.toggleMotorbike()
    this.ui?.showNotice(
      mounted
        ? 'Đã lên xe máy · tốc độ x5 · góc nhìn thứ ba'
        : 'Đã xuống xe · góc nhìn thứ nhất',
    )
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown)
  }
}
