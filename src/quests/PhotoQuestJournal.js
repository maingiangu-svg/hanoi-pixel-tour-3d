const BLOCKED_WHILE_OPEN = new Set([
  'KeyC',
  'KeyJ',
  'KeyM',
  'KeyP',
  'Space',
  'KeyE',
  'Digit1',
  'Digit2',
])

function getKeyCode(event) {
  if (event.code) return event.code
  if (event.key === ' ') return 'Space'
  if (/^\d$/.test(event.key ?? '')) return `Digit${event.key}`
  if (event.key?.length === 1) return `Key${event.key.toUpperCase()}`
  return event.key
}

export class PhotoQuestJournal {
  constructor({
    questSystem,
    photoStore,
    ui,
    input,
    player,
    gameUi,
    canOpen = () => true,
    eventTarget = window,
  }) {
    this.questSystem = questSystem
    this.photoStore = photoStore
    this.ui = ui
    this.input = input
    this.player = player
    this.gameUi = gameUi
    this.canOpen = canOpen
    this.eventTarget = eventTarget
    this.isOpen = false
    this.resumePointerLock = false
    this.disposed = false
    this.groups = []
    this.records = []

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.ui.setHandlers({
      close: () => this.close({ resumePointerLock: true }),
    })
    this.unsubscribeQuests = this.questSystem.subscribe((groups) => {
      this.groups = groups
      if (this.isOpen) this.ui.render(this.groups, this.records)
    })
    this.unsubscribePhotos = this.photoStore.subscribe((records) => {
      this.records = records
      if (this.isOpen) this.ui.render(this.groups, this.records)
    })
    this.eventTarget.addEventListener('keydown', this.handleKeyDown, true)
  }

  open() {
    if (this.isOpen || this.disposed || !this.canOpen()) return false
    this.resumePointerLock = Boolean(this.player.controls.isLocked)
    this.isOpen = true
    this.input.setEnabled(false)
    this.input.reset?.()
    this.gameUi.setInteraction(null)
    this.ui.render(this.groups, this.records)
    this.ui.setOpen(true)
    if (this.player.controls.isLocked) this.player.controls.unlock()
    return true
  }

  close({ resumePointerLock = true } = {}) {
    if (!this.isOpen) return false
    const shouldRelock = resumePointerLock && this.resumePointerLock
    this.isOpen = false
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

  handleKeyDown(event) {
    if (this.disposed || event.repeat) return
    const code = getKeyCode(event)
    if (!this.isOpen) {
      if (code !== 'KeyJ') return
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
    if (code === 'KeyJ') this.close({ resumePointerLock: true })
  }

  dispose() {
    if (this.disposed) return
    this.close({ resumePointerLock: false })
    this.disposed = true
    this.unsubscribeQuests?.()
    this.unsubscribePhotos?.()
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown, true)
  }
}

