export class DebugPanel {
  constructor(element, player, renderer, world) {
    this.element = element
    this.player = player
    this.renderer = renderer
    this.world = world
    this.frames = 0
    this.elapsed = 0
    this.element.classList.add('is-visible')
  }

  update(deltaTime) {
    this.frames += 1
    this.elapsed += deltaTime
    if (this.elapsed < 0.5) return

    const fps = Math.round(this.frames / this.elapsed)
    const { x, z } = this.player.camera.position
    const renderInfo = this.renderer.instance.info.render
    this.element.textContent = `${fps} FPS · ${this.world.activeAreaName}\n${renderInfo.calls} calls · ${renderInfo.triangles} tris\nX ${x.toFixed(1)} · Z ${z.toFixed(1)}`
    this.frames = 0
    this.elapsed = 0
  }
}
