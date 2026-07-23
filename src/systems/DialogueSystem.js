import * as THREE from 'three'

export const MO_INTRO_DIALOGUE = Object.freeze([
  { expression: 'surprised', text: 'Ơ, bạn đến từ lúc nào vậy?' },
  { expression: 'smile', text: 'Mình là Mơ. Chiều xuống, khoảng sân này đẹp hơn hẳn.' },
  { expression: 'worried', text: 'Bạn đang tìm đường, hay chỉ muốn đi dạo quanh đây?' },
  { expression: 'sad', text: 'Nếu vào trong Nhà thờ, nhớ để ý bậc cửa nhé.' },
  { expression: 'smile', text: 'Mình không giữ bạn nữa. Gặp lại nhé.' },
])

const FOCUS_DURATION = 0.28
const RETURN_DURATION = 0.24

export class DialogueSystem {
  constructor({
    player,
    input,
    gameUi,
    dialogueUi,
    eventTarget = window,
    lines = MO_INTRO_DIALOGUE,
    reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  }) {
    this.player = player
    this.camera = player.camera
    this.input = input
    this.gameUi = gameUi
    this.dialogueUi = dialogueUi
    this.eventTarget = eventTarget
    this.lines = lines
    this.activeLines = lines
    this.dialogueContext = { speaker: 'Mơ', portrait: true }
    this.reducedMotion = reducedMotion
    this.phase = 'idle'
    this.phaseElapsed = 0
    this.lineIndex = 0
    this.npc = null

    this.savedPosition = new THREE.Vector3()
    this.savedQuaternion = new THREE.Quaternion()
    this.focusPosition = new THREE.Vector3()
    this.focusQuaternion = new THREE.Quaternion()
    this.returnPosition = new THREE.Vector3()
    this.returnQuaternion = new THREE.Quaternion()
    this.direction = new THREE.Vector3()
    this.focusPoint = new THREE.Vector3()
    this.cameraHelper = new THREE.PerspectiveCamera()

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown)
  }

  isActive() {
    return this.phase !== 'idle'
  }

  isChoosingAnswer() {
    return this.isActive() && Boolean(this.dialogueUi.isChoosingAnswer?.())
  }

  start(npc) {
    const npcLines = npc?.getDialogueLines?.() ?? npc?.dialogueLines ?? this.lines
    if (
      this.isActive() ||
      !Array.isArray(npcLines) ||
      !npcLines.length ||
      !npc?.ready ||
      npc.disabled ||
      npc.active === false
    ) return false

    this.npc = npc
    this.activeLines = npcLines
    this.dialogueContext = {
      speaker: npc.dialogueName ?? 'Mơ',
      portrait: npc.dialoguePortrait !== false,
    }
    this.lineIndex = 0
    this.phase = 'focus'
    this.phaseElapsed = 0
    this.savedPosition.copy(this.camera.position)
    this.savedQuaternion.copy(this.camera.quaternion)

    npc.getFocusPoint(this.focusPoint)
    this.direction.subVectors(this.focusPoint, this.savedPosition)
    this.direction.y = 0
    const distance = this.direction.length()
    if (distance > 0.001) this.direction.divideScalar(distance)
    const cameraShift = Math.min(0.24, Math.max(0, distance - 1.55) * 0.18)
    this.focusPosition.copy(this.savedPosition).addScaledVector(this.direction, cameraShift)

    this.cameraHelper.position.copy(this.focusPosition)
    this.cameraHelper.up.copy(this.camera.up)
    this.cameraHelper.lookAt(this.focusPoint)
    this.focusQuaternion.copy(this.cameraHelper.quaternion)

    this.gameUi.setDialogueActive(true)
    this.gameUi.setLocked(false)
    this.input.setEnabled(false)
    this.npc.setDialogueActive(true)
    this.dialogueUi.showLine(
      this.activeLines[0],
      0,
      this.activeLines.length,
      this.dialogueContext,
    )
    this.dialogueUi.setTransitioning(true)
    this.dialogueUi.setOpen(true)
    if (this.player.controls.isLocked) this.player.controls.unlock()
    if (this.reducedMotion) {
      this.phase = 'active'
      this.dialogueUi.setTransitioning(false)
    }
    return true
  }

  update(deltaTime) {
    if (this.phase === 'idle' || this.phase === 'active') return

    this.phaseElapsed += Math.min(deltaTime, 0.05)
    if (this.phase === 'focus') {
      const progress = Math.min(1, this.phaseElapsed / FOCUS_DURATION)
      const eased = progress * progress * (3 - 2 * progress)
      this.camera.position.lerpVectors(this.savedPosition, this.focusPosition, eased)
      this.camera.quaternion.slerpQuaternions(
        this.savedQuaternion,
        this.focusQuaternion,
        eased,
      )
      if (progress === 1) {
        this.phase = 'active'
        this.dialogueUi.setTransitioning(false)
      }
      return
    }

    const progress = Math.min(1, this.phaseElapsed / RETURN_DURATION)
    const eased = progress * progress * (3 - 2 * progress)
    this.camera.position.lerpVectors(this.returnPosition, this.savedPosition, eased)
    this.camera.quaternion.slerpQuaternions(
      this.returnQuaternion,
      this.savedQuaternion,
      eased,
    )
    if (progress === 1) this.#completeReturn()
  }

  advance() {
    if (this.phase !== 'active') return
    if (this.lineIndex >= this.activeLines.length - 1) {
      this.finish()
      return
    }

    this.lineIndex += 1
    this.dialogueUi.showLine(
      this.activeLines[this.lineIndex],
      this.lineIndex,
      this.activeLines.length,
      this.dialogueContext,
    )
  }

  finish() {
    if (!this.isActive() || this.phase === 'return') return
    this.returnPosition.copy(this.camera.position)
    this.returnQuaternion.copy(this.camera.quaternion)
    this.phase = 'return'
    this.phaseElapsed = 0
    this.dialogueUi.setTransitioning(true)
    this.dialogueUi.setOpen(false)
    if (this.reducedMotion) this.#completeReturn()
  }

  cancel({ restoreCamera = true } = {}) {
    if (!this.isActive()) return false
    if (restoreCamera) {
      this.camera.position.copy(this.savedPosition)
      this.camera.quaternion.copy(this.savedQuaternion)
    }
    this.npc?.setDialogueActive(false)
    this.npc = null
    this.activeLines = this.lines
    this.dialogueContext = { speaker: 'Mơ', portrait: true }
    this.phase = 'idle'
    this.phaseElapsed = 0
    this.dialogueUi.setOpen(false)
    this.dialogueUi.setTransitioning(false)
    this.gameUi.setDialogueActive(false)
    this.gameUi.setResumeMode(true)
    this.input.setEnabled(false)
    return true
  }

  handleKeyDown(event) {
    if (!this.isActive() || event.repeat) return
    if (event.code === 'Escape') {
      event.preventDefault()
      this.finish()
      return
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault()
      this.advance()
    }
  }

  #completeReturn() {
    this.camera.position.copy(this.savedPosition)
    this.camera.quaternion.copy(this.savedQuaternion)
    this.npc?.setDialogueActive(false)
    this.npc = null
    this.activeLines = this.lines
    this.dialogueContext = { speaker: 'Mơ', portrait: true }
    this.phase = 'idle'
    this.phaseElapsed = 0
    this.gameUi.setResumeMode(true)
    this.gameUi.setDialogueActive(false)
    this.dialogueUi.setTransitioning(false)
    this.input.setEnabled(false)
  }

  dispose() {
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown)
    this.cancel()
    this.dialogueUi.setOpen(false)
  }
}
