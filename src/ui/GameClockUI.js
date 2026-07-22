export class GameClockUI {
  constructor(root) {
    this.root = root
    this.root.insertAdjacentHTML('beforeend', `
      <aside class="game-clock" aria-label="Giờ trong game">
        <span class="game-clock__period">GIỜ HÀ NỘI</span>
        <time class="game-clock__time" datetime="17:20">17:20</time>
        <span class="game-clock__speed">x1</span>
      </aside>
    `)
    this.element = this.root.querySelector('.game-clock')
    this.time = this.element.querySelector('.game-clock__time')
    this.speed = this.element.querySelector('.game-clock__speed')
    this.lastTime = ''
    this.lastSpeed = ''
  }

  update(clock) {
    const formatted = clock.formatted
    const speed = `x${clock.speed}`
    if (formatted !== this.lastTime) {
      this.time.textContent = formatted
      this.time.dateTime = formatted
      this.lastTime = formatted
    }
    if (speed !== this.lastSpeed) {
      this.speed.textContent = speed
      this.speed.classList.toggle('is-accelerated', clock.speed > 1)
      this.lastSpeed = speed
    }
  }

  dispose() {
    this.element.remove()
  }
}
