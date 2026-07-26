const BLOCKED_WHILE_OPEN = new Set([
  'KeyC',
  'KeyM',
  'KeyP',
  'Space',
  'KeyE',
  'Digit1',
])

function getKeyCode(event) {
  if (event.code) return event.code
  if (event.key === ' ') return 'Space'
  if (/^\d$/.test(event.key ?? '')) return `Digit${event.key}`
  if (event.key?.length === 1) return `Key${event.key.toUpperCase()}`
  return event.key
}

export class PhotoAlbum {
  constructor({
    store,
    ui,
    input,
    player,
    gameUi,
    canOpen = () => true,
    eventTarget = window,
  }) {
    this.store = store
    this.ui = ui
    this.input = input
    this.player = player
    this.gameUi = gameUi
    this.canOpen = canOpen
    this.eventTarget = eventTarget
    this.isOpen = false
    this.selectedId = null
    this.resumePointerLock = false
    this.disposed = false
    this.records = []

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.ui.setHandlers({
      close: () => this.close({ resumePointerLock: true }),
      select: (id) => this.select(id),
      delete: (id) => this.delete(id),
      back: () => this.back(),
    })
    this.unsubscribe = this.store.subscribe((records) => {
      this.records = records
      if (this.selectedId && !this.store.get(this.selectedId)) {
        this.selectedId = null
      }
      if (this.isOpen) this.ui.render(records, this.selectedId)
    })
    this.eventTarget.addEventListener('keydown', this.handleKeyDown, true)
  }

  open() {
    if (this.isOpen || this.disposed || !this.canOpen()) return false
    this.resumePointerLock = Boolean(this.player.controls.isLocked)
    this.selectedId = null
    this.isOpen = true
    this.input.setEnabled(false)
    this.input.reset?.()
    this.gameUi.setInteraction(null)
    this.ui.render(this.records, null)
    this.ui.setOpen(true)
    if (this.player.controls.isLocked) this.player.controls.unlock()
    return true
  }

  close({ resumePointerLock = true } = {}) {
    if (!this.isOpen) return false
    const shouldRelock = resumePointerLock && this.resumePointerLock
    this.isOpen = false
    this.selectedId = null
    this.resumePointerLock = false
    this.ui.setOpen(false)

    if (!shouldRelock) {
      this.input.setEnabled(false)
      this.gameUi.setResumeMode(true)
    } else if (this.player.controls.isLocked) {
      this.input.setEnabled(true)
      this.gameUi.setLocked(true)
    } else {
      this.player.lock()
    }
    return true
  }

  select(id) {
    if (!this.isOpen || !this.store.get(id)) return false
    this.selectedId = id
    this.ui.render(this.records, id)
    return true
  }

  back() {
    if (!this.isOpen || !this.selectedId) return false
    this.selectedId = null
    this.ui.render(this.records, null)
    return true
  }

  delete(id = this.selectedId) {
    if (!this.isOpen || !id) return false
    this.selectedId = null
    return this.store.delete(id)
  }

  handleKeyDown(event) {
    if (this.disposed || event.repeat) return
    const code = getKeyCode(event)
    if (!this.isOpen) {
      if (code !== 'KeyP') return
      if (this.open()) {
        event.preventDefault?.()
        event.stopImmediatePropagation?.()
      }
      return
    }

    if (code === 'Escape') {
      event.stopImmediatePropagation?.()
      this.close({ resumePointerLock: false })
      return
    }
    if (!BLOCKED_WHILE_OPEN.has(code)) return
    event.preventDefault?.()
    event.stopImmediatePropagation?.()
    if (code === 'KeyP') {
      this.close({ resumePointerLock: true })
    }
  }

  dispose() {
    if (this.disposed) return
    this.close({ resumePointerLock: false })
    this.disposed = true
    this.unsubscribe?.()
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown, true)
  }
}
