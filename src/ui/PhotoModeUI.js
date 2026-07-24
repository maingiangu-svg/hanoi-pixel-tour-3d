export class PhotoModeUI {
  constructor(root) {
    this.root = root
    this.root.insertAdjacentHTML('beforeend', `
      <section class="photo-mode-ui" aria-label="Khung ngắm máy ảnh" aria-hidden="true">
        <div class="photo-viewfinder" aria-hidden="true">
          <span class="photo-grid-line photo-grid-line--v1"></span>
          <span class="photo-grid-line photo-grid-line--v2"></span>
          <span class="photo-grid-line photo-grid-line--h1"></span>
          <span class="photo-grid-line photo-grid-line--h2"></span>
          <span class="photo-focus-mark"></span>
        </div>
        <header class="photo-mode-ui__header">
          <span>PHOTO</span>
          <strong class="photo-mode-ui__focal">35mm</strong>
        </header>
        <footer class="photo-mode-ui__footer">
          <span><kbd>Q/E</kbd> hoặc cuộn để zoom</span>
          <span><kbd>Space</kbd> chụp</span>
          <span><kbd>C/Esc</kbd> thoát</span>
        </footer>
      </section>
    `)

    this.element = this.root.querySelector('.photo-mode-ui')
    this.focalLabel = this.element.querySelector('.photo-mode-ui__focal')
  }

  setOpen(open) {
    this.root.classList.toggle('is-photo-mode', open)
    this.element.classList.toggle('is-open', open)
    this.element.setAttribute('aria-hidden', String(!open))
  }

  setFocalLength(focalLength) {
    this.focalLabel.textContent = `${focalLength}mm`
  }

  setCapturing(capturing) {
    this.element.classList.toggle('is-capturing', capturing)
  }

  dispose() {
    this.root.classList.remove('is-photo-mode')
    this.element.remove()
  }
}
