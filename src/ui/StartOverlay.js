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
        <div class="debug-panel" aria-live="off"></div>
      </main>
    `

    this.overlay = this.root.querySelector('.start-overlay')
    this.startButton = this.root.querySelector('.start-card')
    this.crosshair = this.root.querySelector('.crosshair')
    this.interactionPrompt = this.root.querySelector('.interaction-prompt')
    this.interactionLabel = this.interactionPrompt.querySelector('span')
    this.sceneFade = this.root.querySelector('.scene-fade')
    this.debugPanel = this.root.querySelector('.debug-panel')
    this.handleStart = () => onStart()
    this.overlay.addEventListener('click', this.handleStart)
  }

  setLocked(locked) {
    this.overlay.classList.toggle('is-hidden', locked)
    this.crosshair.classList.toggle('is-visible', locked)
    this.overlay.setAttribute('aria-hidden', String(locked))
    this.startButton.tabIndex = locked ? -1 : 0
    if (!locked) this.setInteraction(null)
  }

  setInteraction(label) {
    this.interactionLabel.textContent = label ?? ''
    this.interactionPrompt.classList.toggle('is-visible', Boolean(label))
  }

  setFading(fading) {
    this.sceneFade.classList.toggle('is-visible', fading)
  }

  dispose() {
    this.overlay.removeEventListener('click', this.handleStart)
    this.root.replaceChildren()
  }
}
