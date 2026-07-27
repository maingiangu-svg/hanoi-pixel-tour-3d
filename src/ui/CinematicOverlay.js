export class CinematicOverlay {
  constructor(root) {
    this.root = root
    this.root.insertAdjacentHTML('beforeend', `
      <section
        class="cinematic-overlay"
        aria-label="Đoạn giới thiệu địa điểm"
        aria-hidden="true"
      >
        <div class="cinematic-overlay__letterbox cinematic-overlay__letterbox--top"></div>
        <div class="cinematic-overlay__letterbox cinematic-overlay__letterbox--bottom"></div>
        <header class="cinematic-overlay__title">
          <span class="cinematic-overlay__eyebrow">HÀ NỘI PIXEL TOUR</span>
          <h2></h2>
          <p></p>
        </header>
        <div class="cinematic-overlay__skip">
          <kbd>Esc</kbd> để bỏ qua
        </div>
        <div class="cinematic-overlay__fade" aria-hidden="true"></div>
      </section>
    `)

    this.element = this.root.querySelector('.cinematic-overlay')
    this.title = this.element.querySelector('h2')
    this.subtitle = this.element.querySelector('p')
    this.fade = this.element.querySelector('.cinematic-overlay__fade')
  }

  setOpen(open, { title = '', subtitle = '' } = {}) {
    this.title.textContent = title
    this.subtitle.textContent = subtitle
    this.element.classList.toggle('is-open', open)
    this.element.setAttribute('aria-hidden', String(!open))
    if (!open) this.setFade(0)
  }

  setFade(opacity) {
    this.fade.style.opacity = String(Math.max(0, Math.min(1, opacity)))
  }

  setTitleVisible(visible) {
    this.element.classList.toggle('is-title-visible', Boolean(visible))
  }

  dispose() {
    this.element.remove()
  }
}
