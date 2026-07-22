export class DialogueUI {
  constructor(root, assetLoader, onAdvance) {
    this.root = root
    this.assetLoader = assetLoader
    this.onAdvance = onAdvance
    this.root.insertAdjacentHTML('beforeend', `
      <section class="dialogue-layer" aria-label="Hội thoại" aria-hidden="true">
        <div class="dialogue-backdrop" aria-hidden="true"></div>
        <div class="dialogue-stage">
          <figure class="dialogue-portrait-frame" aria-hidden="true">
            <img class="dialogue-portrait" alt="" draggable="false">
            <span class="dialogue-portrait-fallback">Mơ</span>
          </figure>
          <article class="dialogue-panel" aria-live="polite">
            <header class="dialogue-header">
              <strong class="dialogue-name">Mơ</strong>
              <span class="dialogue-progress"></span>
            </header>
            <p class="dialogue-text"></p>
            <button class="dialogue-advance" type="button">
              <span>Tiếp</span>
              <kbd>Enter</kbd>
            </button>
          </article>
        </div>
      </section>
    `)

    this.element = this.root.querySelector('.dialogue-layer')
    this.stage = this.root.querySelector('.dialogue-stage')
    this.portraitFrame = this.root.querySelector('.dialogue-portrait-frame')
    this.portrait = this.root.querySelector('.dialogue-portrait')
    this.portraitFallback = this.root.querySelector('.dialogue-portrait-fallback')
    this.name = this.root.querySelector('.dialogue-name')
    this.text = this.root.querySelector('.dialogue-text')
    this.progress = this.root.querySelector('.dialogue-progress')
    this.advanceButton = this.root.querySelector('.dialogue-advance')
    this.advanceLabel = this.advanceButton.querySelector('span')
    this.fallbackAttempted = false
    this.advanceButton.tabIndex = -1

    this.handleAdvance = () => this.onAdvance()
    this.handlePortraitError = () => this.#usePortraitFallback()
    this.advanceButton.addEventListener('click', this.handleAdvance)
    this.portrait.addEventListener('error', this.handlePortraitError)
  }

  setOpen(open) {
    this.element.classList.toggle('is-open', open)
    this.element.setAttribute('aria-hidden', String(!open))
    this.advanceButton.tabIndex = open ? 0 : -1
    if (open) this.advanceButton.focus({ preventScroll: true })
    else this.advanceButton.blur()
  }

  showLine(
    { expression = 'idle', text },
    index,
    total,
    { speaker = 'Mơ', portrait = true } = {},
  ) {
    this.name.textContent = speaker
    this.element.setAttribute('aria-label', `Hội thoại với ${speaker}`)
    this.stage.classList.toggle('is-portraitless', !portrait)
    this.portraitFrame.hidden = !portrait
    this.fallbackAttempted = false
    this.portrait.hidden = !portrait
    this.portraitFallback.classList.remove('is-visible')
    this.portraitFallback.textContent = speaker
    if (portrait) {
      this.portrait.dataset.expression = expression
      const portraitUrl = this.assetLoader.getPortraitUrl(expression)
      if (portraitUrl) this.portrait.src = portraitUrl
      else {
        this.portrait.removeAttribute('src')
        this.portrait.hidden = true
        this.portraitFallback.classList.add('is-visible')
      }
    }
    this.text.textContent = text
    this.progress.textContent = `${index + 1}/${total}`
    this.advanceLabel.textContent = index === total - 1 ? 'Kết thúc' : 'Tiếp'
    this.advanceButton.disabled = false
  }

  setTransitioning(transitioning) {
    this.advanceButton.disabled = transitioning
  }

  #usePortraitFallback() {
    const idleUrl = this.assetLoader.getPortraitUrl('idle')
    if (!this.fallbackAttempted && idleUrl && this.portrait.src !== idleUrl) {
      this.fallbackAttempted = true
      this.portrait.dataset.expression = 'idle'
      this.portrait.src = idleUrl
      return
    }
    this.portrait.hidden = true
    this.portraitFallback.classList.add('is-visible')
  }

  dispose() {
    this.advanceButton.removeEventListener('click', this.handleAdvance)
    this.portrait.removeEventListener('error', this.handlePortraitError)
    this.element.remove()
  }
}
