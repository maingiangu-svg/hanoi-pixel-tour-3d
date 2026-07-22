export class DebugPanel {
  constructor(element, player, renderer, world, clock = null, dayNight = null) {
    this.element = element
    this.player = player
    this.renderer = renderer
    this.world = world
    this.clock = clock
    this.dayNight = dayNight
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
    const timeLine = this.clock
      ? `${this.clock.formatted} x${this.clock.speed} · ${this.dayNight?.phase ?? '—'}`
      : null
    const npcLine = this.world.getActiveNpcCount
      ? `${this.world.getActiveNpcCount()} NPC đang hoạt động`
      : null
    const scheduleLine = this.world.mo
      ? `Mơ ${this.world.mo.scheduleState}${
          this.world.mo.pendingScheduleState
            ? ` → ${this.world.mo.pendingScheduleState}`
            : ''
        } · ${this.world.mo.areaName}`
      : null
    const crowdLine = this.world.crowd?.lastChurchState
      ? `Nhà thờ · ${this.world.crowd.lastChurchState}`
      : null
    this.element.textContent = [
      `${fps} FPS · ${this.world.activeAreaName}`,
      `${renderInfo.calls} calls · ${renderInfo.triangles} tris`,
      timeLine,
      npcLine,
      scheduleLine,
      crowdLine,
      `X ${x.toFixed(1)} · Z ${z.toFixed(1)}`,
    ].filter(Boolean).join('\n')
    this.frames = 0
    this.elapsed = 0
  }
}
