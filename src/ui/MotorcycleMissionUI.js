/**
 * MotorcycleMissionUI — In-game HUD element showing active motorcycle mission,
 * countdown timer, target destination, and completion dialogs.
 */

export class MotorcycleMissionUI {
  constructor({
    missionSystem = null,
    gameUi = null,
    player = null,
    input = null,
    parent = document.body,
  } = {}) {
    this.missionSystem = missionSystem
    this.gameUi = gameUi
    this.player = player
    this.input = input
    this.parent = parent
    this.isOpen = false
    this.resumePointerLock = false

    this.hudElement = null
    this.modalElement = null
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this._initElements()

    if (this.missionSystem) {
      this.unsubscribe = this.missionSystem.subscribe((event, data) => {
        this.render()
      })
    }

    window.addEventListener('keydown', this.handleKeyDown, true)
  }

  _initElements() {
    // HUD panel
    this.hudElement = document.createElement('div')
    this.hudElement.className = 'motorcycle-mission-hud'
    this.hudElement.style.cssText = `
      position: absolute;
      top: 70px;
      right: 20px;
      width: 260px;
      background: rgba(20, 24, 33, 0.85);
      border: 1px solid rgba(255, 168, 64, 0.5);
      border-radius: 8px;
      padding: 12px;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      pointer-events: auto;
    `
    this.parent.appendChild(this.hudElement)

    // Modal dialog for selecting missions (Includes backdrop)
    this.modalElement = document.createElement('div')
    this.modalElement.className = 'motorcycle-mission-modal-wrapper'
    this.modalElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: none;
      justify-content: center;
      align-items: center;
    `
    this.parent.appendChild(this.modalElement)

    // Close modal on backdrop click
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hideMissionPicker()
      }
    })
  }

  handleKeyDown(event) {
    if (!this.isOpen) return
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.hideMissionPicker()
    }
  }

  showMissionPicker() {
    if (this.isOpen || !this.missionSystem) return
    const missions = this.missionSystem.getMissions()
    const active = this.missionSystem.getActiveMission()

    this.isOpen = true
    this.resumePointerLock = Boolean(this.player?.controls?.isLocked)
    if (this.player?.controls?.isLocked) {
      this.player.controls.unlock()
    }
    this.input?.setEnabled?.(false)
    this.gameUi?.setMissionPickerActive?.(true)

    let html = `
      <div class="motorcycle-mission-box" style="
        width: 400px;
        max-width: 90vw;
        background: rgba(18, 22, 30, 0.96);
        border: 2px solid #FFA840;
        border-radius: 12px;
        padding: 20px;
        color: #f0f0f0;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; color:#FFA840; font-size:1.1rem; display:flex; align-items:center; gap:6px;">
            <span>🏍️</span> Nhiệm Vụ Xe Máy Hà Nội
          </h3>
          <button id="close-mission-modal" style="background:none; border:none; color:#aaa; font-size:1.3rem; cursor:pointer; padding:4px 8px;">✕</button>
        </div>
        <p style="font-size:0.85rem; color:#bbb; margin-bottom:16px;">Chọn một nhiệm vụ chở khách hoặc ship đồ ăn để nhận thưởng:</p>
        <div style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px;">
    `

    for (const m of missions) {
      const isCompleted = this.missionSystem.isMissionCompleted(m.id)
      const isActive = active?.id === m.id
      html += `
        <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1; padding-right:12px;">
            <div style="font-weight:600; font-size:0.9rem; color:${isActive ? '#4CAF50' : '#fff'}">
              ${m.name} ${isCompleted ? '✅' : ''}
            </div>
            <div style="font-size:0.78rem; color:#aaa; margin-top:4px; line-height:1.3;">${m.description}</div>
            <div style="font-size:0.75rem; color:#FFA840; margin-top:6px; display:flex; gap:10px;">
              <span>⏱️ ${m.timeLimit}s</span>
              <span>🪙 +${m.rewardCoins} xu</span>
            </div>
          </div>
          <button class="start-mission-btn" data-id="${m.id}" ${isActive || isCompleted ? 'disabled' : ''} style="
            background: ${isActive ? '#4CAF50' : isCompleted ? '#555' : '#FFA840'};
            color: #000;
            border: none;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 0.85rem;
            cursor: ${isActive || isCompleted ? 'default' : 'pointer'};
            white-space: nowrap;
          ">
            ${isActive ? 'Đang chạy' : isCompleted ? 'Đã xong' : 'Nhận'}
          </button>
        </div>
      `
    }

    html += `</div></div>`
    this.modalElement.innerHTML = html
    this.modalElement.style.display = 'flex'

    this.modalElement.querySelector('#close-mission-modal')?.addEventListener('click', () => {
      this.hideMissionPicker()
    })

    const buttons = this.modalElement.querySelectorAll('.start-mission-btn')
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id')
        if (id) {
          this.missionSystem.startMission(id)
          this.hideMissionPicker()
        }
      })
    })
  }

  hideMissionPicker() {
    if (!this.isOpen) return
    this.isOpen = false
    this.modalElement.style.display = 'none'
    this.gameUi?.setMissionPickerActive?.(false)

    if (this.resumePointerLock) {
      if (!this.player?.controls?.isLocked) {
        this.player?.lock?.()
      }
      this.gameUi?.setLocked?.(true)
      this.input?.setEnabled?.(true)
    } else {
      this.gameUi?.setResumeMode?.(true)
    }
    this.resumePointerLock = false
  }

  render() {
    const active = this.missionSystem?.getActiveMission()
    if (!active) {
      this.hudElement.style.display = 'none'
      return
    }

    const mins = Math.floor(Math.max(0, active.timeRemaining) / 60)
    const secs = Math.floor(Math.max(0, active.timeRemaining) % 60).toString().padStart(2, '0')
    const distText = active.currentDistance !== undefined
      ? `${Math.round(active.currentDistance)}m`
      : '...'

    this.hudElement.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:6px; margin-bottom:8px;">
        <span style="font-weight:bold; color:#FFA840; font-size:0.85rem;">🏍️ NHIỆM VỤ</span>
        <span style="font-family:monospace; font-weight:bold; color:${active.timeRemaining < 15 ? '#FF5252' : '#FFD700'}; font-size:0.95rem;">⏱️ ${mins}:${secs}</span>
      </div>
      <div style="font-size:0.85rem; font-weight:600; color:#fff; margin-bottom:4px;">${active.name}</div>
      <div style="font-size:0.8rem; color:#ddd;">📍 Điểm đến: <span style="color:#FFA840;">${active.targetName}</span></div>
      <div style="font-size:0.8rem; color:#aaa; margin-top:4px;">📏 Khoảng cách: <b style="color:#fff;">${distText}</b></div>
    `
    this.hudElement.style.display = 'block'
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown, true)
    if (this.unsubscribe) this.unsubscribe()
    if (this.hudElement?.parentElement) this.hudElement.parentElement.removeChild(this.hudElement)
    if (this.modalElement?.parentElement) this.modalElement.parentElement.removeChild(this.modalElement)
  }
}
