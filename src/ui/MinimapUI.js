/**
 * MinimapUI — small corner minimap showing player position and nearby landmarks.
 *
 * Uses the existing MapOverlay data but renders a compact version.
 */

const MINIMAP_SIZE = 160
const MINIMAP_MARGIN = 16

export class MinimapUI {
  constructor(container) {
    this.container = container
    this.visible = true
    this.playerX = 0
    this.playerZ = 0
    this.playerAngle = 0
    this.landmarks = []
    this.collectibles = []

    this.element = document.createElement('div')
    this.element.className = 'minimap'
    this.element.innerHTML = `
      <canvas class="minimap-canvas" width="${MINIMAP_SIZE}" height="${MINIMAP_SIZE}"></canvas>
      <div class="minimap-label">Hồ Gươm</div>
    `
    container.append(this.element)

    this.canvas = this.element.querySelector('.minimap-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.label = this.element.querySelector('.minimap-label')

    this.#applyStyles()
  }

  setVisible(visible) {
    this.visible = visible
    this.element.style.display = visible ? 'block' : 'none'
  }

  toggle() {
    this.setVisible(!this.visible)
  }

  /**
   * Update minimap with current player state and optional active mission target.
   */
  update(playerX, playerZ, playerAngle, landmarks = [], collectibles = [], missionTarget = null) {
    this.playerX = playerX
    this.playerZ = playerZ
    this.playerAngle = playerAngle
    this.landmarks = landmarks
    this.collectibles = collectibles
    this.missionTarget = missionTarget
    this.#render()
  }

  dispose() {
    this.element.remove()
  }

  // ─── Private ───────────────────────────────────

  #applyStyles() {
    const style = document.createElement('style')
    style.textContent = `
      .minimap {
        position: fixed;
        bottom: ${MINIMAP_MARGIN}px;
        right: ${MINIMAP_MARGIN}px;
        width: ${MINIMAP_SIZE}px;
        height: ${MINIMAP_SIZE + 24}px;
        z-index: 100;
        pointer-events: none;
        opacity: 0.85;
        transition: opacity 0.3s;
      }
      .minimap:hover {
        opacity: 1;
      }
      .minimap-canvas {
        width: 100%;
        height: ${MINIMAP_SIZE}px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.3);
        background: rgba(20, 25, 35, 0.8);
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      }
      .minimap-label {
        text-align: center;
        color: rgba(255,255,255,0.8);
        font-size: 11px;
        font-family: 'Segoe UI', sans-serif;
        margin-top: 4px;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      }
    `
    document.head.append(style)
  }

  #render() {
    const ctx = this.ctx
    const w = MINIMAP_SIZE
    const h = MINIMAP_SIZE
    const cx = w / 2
    const cy = h / 2
    const scale = 0.7 // pixels per world unit

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = 'rgba(20, 25, 35, 0.9)'
    ctx.beginPath()
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw Hoan Kiem Lake (approximate)
    ctx.fillStyle = 'rgba(40, 100, 120, 0.6)'
    ctx.beginPath()
    const lakeX = cx + (102 - this.playerX) * scale
    const lakeZ = cy + (0 - this.playerZ) * scale
    ctx.ellipse(lakeX, lakeZ, 30 * scale, 33 * scale, 0, 0, Math.PI * 2)
    ctx.fill()

    // Draw landmarks
    for (const lm of this.landmarks) {
      const lx = cx + (lm.x - this.playerX) * scale
      const lz = cy + (lm.z - this.playerZ) * scale

      // Skip if outside minimap
      const dist = Math.sqrt((lx - cx) ** 2 + (lz - cy) ** 2)
      if (dist > w / 2 - 10) continue

      ctx.fillStyle = lm.color ?? '#e74c3c'
      ctx.beginPath()
      ctx.arc(lx, lz, 4, 0, Math.PI * 2)
      ctx.fill()

      // Label
      if (lm.label) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(lm.label, lx, lz - 6)
      }
    }

    // Draw collectibles
    for (const c of this.collectibles) {
      const cx2 = cx + (c.x - this.playerX) * scale
      const cz2 = cy + (c.z - this.playerZ) * scale
      const dist = Math.sqrt((cx2 - cx) ** 2 + (cz2 - cy) ** 2)
      if (dist > w / 2 - 10) continue

      ctx.fillStyle = c.color ?? '#ffd700'
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.003) * 0.3
      ctx.beginPath()
      ctx.arc(cx2, cz2, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Active Mission target
    if (this.missionTarget && Number.isFinite(this.missionTarget.x) && Number.isFinite(this.missionTarget.z)) {
      const tx = cx + (this.missionTarget.x - this.playerX) * scale
      const tz = cy + (this.missionTarget.z - this.playerZ) * scale
      const dist = Math.sqrt((tx - cx) ** 2 + (tz - cy) ** 2)

      // Clamp to minimap border if outside
      let renderX = tx
      let renderY = tz
      const maxR = w / 2 - 8
      if (dist > maxR) {
        const angle = Math.atan2(tz - cy, tx - cx)
        renderX = cx + Math.cos(angle) * maxR
        renderY = cy + Math.sin(angle) * maxR
      }

      ctx.fillStyle = '#FFA840'
      ctx.beginPath()
      ctx.arc(renderX, renderY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Player dot
    ctx.fillStyle = '#4fc3f7'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()

    // Direction triangle
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.playerAngle)
    ctx.fillStyle = '#81d4fa'
    ctx.beginPath()
    ctx.moveTo(0, -12)
    ctx.lineTo(-4, -4)
    ctx.lineTo(4, -4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }
}
