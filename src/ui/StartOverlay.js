export class StartOverlay {
  constructor(root, onStart) {
    this.root = root
    this.root.innerHTML = `
      <main class="game-shell">
        <section class="start-overlay" aria-labelledby="start-title">
          <button class="start-card" type="button">
            <span class="phase-label">KHU NHÀ THỜ LỚN</span>
            <span class="start-title" id="start-title">Nhấp để bắt đầu</span>
            <span class="start-rule" aria-hidden="true"></span>
            <span class="controls-list">
              <span><kbd>WASD</kbd> di chuyển</span>
              <span><kbd>Chuột</kbd> quan sát</span>
              <span><kbd>Shift</kbd> chạy</span>
              <span><kbd>E</kbd> tương tác</span>
              <span><kbd>M</kbd> bản đồ</span>
              <span><kbd>Esc</kbd> mở khóa chuột</span>
            </span>
          </button>
        </section>
        <div class="crosshair" aria-hidden="true"></div>
        <div class="interaction-prompt" role="status" aria-live="polite">
          <kbd>E</kbd>
          <span></span>
        </div>
        <div class="scene-fade" aria-hidden="true"></div>
        <div class="photo-flash" aria-hidden="true"></div>
        <div class="world-notice" role="status" aria-live="polite"></div>
        <div class="debug-panel" aria-live="off"></div>
      </main>
    `

    this.overlay = this.root.querySelector('.start-overlay')
    this.shell = this.root.querySelector('.game-shell')
    this.startButton = this.root.querySelector('.start-card')
    this.phaseLabel = this.root.querySelector('.phase-label')
    this.startTitle = this.root.querySelector('.start-title')
    this.crosshair = this.root.querySelector('.crosshair')
    this.interactionPrompt = this.root.querySelector('.interaction-prompt')
    this.interactionLabel = this.interactionPrompt.querySelector('span')
    this.sceneFade = this.root.querySelector('.scene-fade')
    this.photoFlash = this.root.querySelector('.photo-flash')
    this.worldNotice = this.root.querySelector('.world-notice')
    this.debugPanel = this.root.querySelector('.debug-panel')
    this.locked = false
    this.dialogueActive = false
    this.mapActive = false
    this.resumeMode = false
    this.noticeTimer = null
    this.flashTimer = null
    this.handleStart = () => onStart()
    this.overlay.addEventListener('click', this.handleStart)
  }

  setLocked(locked) {
    this.locked = locked
    if (locked) this.setResumeMode(false)
    this.#renderState()
    if (!locked) this.setInteraction(null)
  }

  setDialogueActive(active) {
    this.dialogueActive = active
    this.shell.classList.toggle('is-dialogue-active', active)
    if (active) this.setInteraction(null)
    this.#renderState()
  }

  setMapActive(active) {
    this.mapActive = active
    this.shell.classList.toggle('is-map-active', active)
    if (active) this.setInteraction(null)
    this.#renderState()
  }

  setResumeMode(resume) {
    this.resumeMode = resume
    this.phaseLabel.textContent = resume ? 'TRỞ LẠI KHU NHÀ THỜ' : 'KHU NHÀ THỜ LỚN'
    this.startTitle.textContent = resume ? 'Nhấp để tiếp tục' : 'Nhấp để bắt đầu'
  }

  setInteraction(label) {
    this.interactionLabel.textContent = label ?? ''
    this.interactionPrompt.classList.toggle('is-visible', Boolean(label))
  }

  setFading(fading) {
    this.sceneFade.classList.toggle('is-visible', fading)
  }

  showNotice(message, duration = 2300) {
    window.clearTimeout(this.noticeTimer)
    this.worldNotice.textContent = message ?? ''
    this.worldNotice.classList.toggle('is-visible', Boolean(message))
    if (message) {
      this.noticeTimer = window.setTimeout(() => {
        this.worldNotice.classList.remove('is-visible')
        this.noticeTimer = null
      }, duration)
    }
  }

  flashPhoto() {
    window.clearTimeout(this.flashTimer)
    this.photoFlash.classList.remove('is-visible')
    void this.photoFlash.offsetWidth
    this.photoFlash.classList.add('is-visible')
    this.flashTimer = window.setTimeout(() => {
      this.photoFlash.classList.remove('is-visible')
      this.flashTimer = null
    }, 220)
  }

  #renderState() {
    const overlayHidden = this.locked || this.dialogueActive || this.mapActive
    const crosshairVisible = this.locked && !this.dialogueActive && !this.mapActive
    this.overlay.classList.toggle('is-hidden', overlayHidden)
    this.crosshair.classList.toggle('is-visible', crosshairVisible)
    this.overlay.setAttribute('aria-hidden', String(overlayHidden))
    this.startButton.tabIndex = overlayHidden ? -1 : 0
  }

  dispose() {
    window.clearTimeout(this.noticeTimer)
    window.clearTimeout(this.flashTimer)
    this.overlay.removeEventListener('click', this.handleStart)
    this.root.replaceChildren()
  }
}
