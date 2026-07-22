import * as THREE from 'three'

const NPC_HEIGHT = 1.72
const TALK_RADIUS = 2.35
const WALK_SPEED = 0.92

const OUTDOOR_POSITIONS = Object.freeze({
  courtyardIdle: [6.2, 0.07, -4.2],
  withChildren: [-5.3, 0.07, -1.5],
  walkingToChurch: [2.7, 0.07, -11.1],
  returningToPlaza: [6.2, 0.07, -4.2],
  dayStroll: [6.2, 0.07, -4.2],
})

const INTERIOR_POSITION = [4.75, 0.02, -11.5]

export class MoNpc {
  constructor({ parent, camera, assetLoader, colliders, position = [6.2, 0.07, -4.2] }) {
    this.camera = camera
    this.assetLoader = assetLoader
    this.outdoorColliders = colliders
    this.interiorColliders = null
    this.outdoorParent = parent
    this.interiorParent = null
    this.areaName = 'outdoor'
    this.lastActiveAreaName = 'outdoor'
    this.scheduleState = 'courtyardIdle'
    this.pendingScheduleState = null
    this.walkElapsed = 0
    this.position = new THREE.Vector3(...position)
    this.targetPosition = this.position.clone()
    this.group = new THREE.Group()
    this.group.name = 'NPC Mơ'
    this.group.position.copy(this.position)
    this.group.visible = false
    parent.add(this.group)

    this.pose = new THREE.Group()
    this.pose.name = 'Idle Mơ'
    this.group.add(this.pose)

    this.billboard = null
    this.elapsed = 0
    this.ready = false
    this.disabled = false
    this.dialogueActive = false
    this.disposed = false
    this.interaction = {
      type: 'dialogue',
      position: this.position,
      radius: TALK_RADIUS,
      label: 'Nói chuyện với Mơ',
      target: this,
    }
    this.dialogueName = 'Mơ'
    this.dialoguePortrait = true
    this.outdoorCollider = {
      name: 'NPC Mơ',
      minX: this.position.x - 0.3,
      maxX: this.position.x + 0.3,
      minZ: this.position.z - 0.22,
      maxZ: this.position.z + 0.22,
      disabled: true,
    }
    this.interiorCollider = {
      ...this.outdoorCollider,
      name: 'NPC Mơ (interior)',
    }
    this.collider = this.outdoorCollider
    this.outdoorColliders.push(this.outdoorCollider)

    this.readyPromise = this.#loadBillboard()
  }

  async #loadBillboard() {
    const texture = await this.assetLoader.getFullbody()
    if (this.disposed || !texture) {
      this.disabled = true
      return
    }

    const image = texture.image
    const aspect = image?.naturalWidth && image?.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : 2 / 3
    const geometry = new THREE.PlaneGeometry(NPC_HEIGHT * aspect, NPC_HEIGHT)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.14,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.billboard = new THREE.Mesh(geometry, material)
    this.billboard.name = 'Billboard Mơ'
    this.billboard.position.y = NPC_HEIGHT / 2
    this.billboard.renderOrder = 1
    this.pose.add(this.billboard)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.43, 18),
      new THREE.MeshBasicMaterial({
        color: 0x1c211f,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    shadow.name = 'Bóng chân Mơ'
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.set(1, 0.52, 1)
    shadow.position.y = 0.008
    this.group.add(shadow)

    this.ready = true
    this.#syncColliderState()
    this.group.visible = this.areaName === this.lastActiveAreaName && !this.dialogueActive
  }

  update(deltaTime, activeAreaName) {
    this.lastActiveAreaName = activeAreaName
    const clampedDelta = Math.min(deltaTime, 0.05)
    if (!this.dialogueActive) this.#updateScheduledMovement(clampedDelta)
    const visible = this.ready && activeAreaName === this.areaName && !this.dialogueActive
    this.group.visible = visible
    if (!visible) return

    this.elapsed += clampedDelta
    const offsetX = this.camera.position.x - this.position.x
    const offsetZ = this.camera.position.z - this.position.z
    const distanceSquared = offsetX * offsetX + offsetZ * offsetZ
    const near = distanceSquared <= TALK_RADIUS * TALK_RADIUS * 2.3
    const targetYaw = Math.atan2(offsetX, offsetZ)
    const turnRate = near ? 4.2 : 1.35
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - this.group.rotation.y),
      Math.cos(targetYaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-turnRate * deltaTime))

    const breath = Math.sin(this.elapsed * 1.45) * 0.006
    this.pose.scale.set(1 + breath * 0.28, 1 + breath, 1)

    const tiltCycle = this.elapsed % 13
    const tiltWave = tiltCycle > 9.4 && tiltCycle < 11.8
      ? Math.sin(((tiltCycle - 9.4) / 2.4) * Math.PI)
      : 0
    this.pose.rotation.z = tiltWave * 0.018
  }

  getInteraction() {
    if (
      !this.ready ||
      this.disabled ||
      this.dialogueActive ||
      this.areaName !== this.lastActiveAreaName
    ) return null
    return this.interaction
  }

  getFocusPoint(target = new THREE.Vector3()) {
    return target.set(this.position.x, this.position.y + 1.38, this.position.z)
  }

  setDialogueActive(active) {
    this.dialogueActive = active
    this.#syncColliderState()
    this.group.visible = this.ready && !active && this.areaName === this.lastActiveAreaName
    if (!active && this.pendingScheduleState) {
      const pending = this.pendingScheduleState
      this.pendingScheduleState = null
      this.setScheduleState(pending)
    }
  }

  setScheduleEnvironment({ outdoorParent, interiorParent, interiorColliders }) {
    this.outdoorParent = outdoorParent ?? this.outdoorParent
    this.interiorParent = interiorParent ?? this.interiorParent
    if (interiorColliders && !this.interiorColliders) {
      this.interiorColliders = interiorColliders
      this.interiorColliders.push(this.interiorCollider)
      this.#syncColliderState()
    }
  }

  setScheduleState(state) {
    if (!state || state === this.scheduleState) return true
    if (this.dialogueActive) {
      this.pendingScheduleState = state
      return false
    }

    this.scheduleState = state
    this.walkElapsed = 0
    if (state === 'insideChurch') {
      this.#moveToArea('interior', this.interiorParent, INTERIOR_POSITION)
      return true
    }

    if (this.areaName !== 'outdoor') {
      const returnPosition = state === 'returningToPlaza'
        ? OUTDOOR_POSITIONS.walkingToChurch
        : OUTDOOR_POSITIONS[state] ?? OUTDOOR_POSITIONS.courtyardIdle
      this.#moveToArea('outdoor', this.outdoorParent, returnPosition)
    }
    const target = OUTDOOR_POSITIONS[state] ?? OUTDOOR_POSITIONS.courtyardIdle
    this.targetPosition.set(target[0], target[1], target[2])
    return true
  }

  #moveToArea(areaName, parent, position) {
    if (!parent) return
    parent.add(this.group)
    this.areaName = areaName
    this.position.set(position[0], position[1], position[2])
    this.group.position.copy(this.position)
    this.targetPosition.copy(this.position)
    this.#syncColliderState()
    this.#updateCollider()
  }

  #updateScheduledMovement(deltaTime) {
    if (this.areaName !== 'outdoor') return
    this.walkElapsed += deltaTime

    if (this.scheduleState === 'dayStroll' && this.walkElapsed > 12) {
      this.walkElapsed = 0
      const useSecondPoint = this.targetPosition.x > 5.5
      this.targetPosition.set(
        useSecondPoint ? 3.8 : 6.2,
        0.07,
        useSecondPoint ? -2.6 : -4.2,
      )
    }

    const offsetX = this.targetPosition.x - this.position.x
    const offsetZ = this.targetPosition.z - this.position.z
    const distance = Math.hypot(offsetX, offsetZ)
    if (distance < 0.025) return
    const step = Math.min(distance, WALK_SPEED * deltaTime)
    this.position.x += (offsetX / distance) * step
    this.position.z += (offsetZ / distance) * step
    this.group.position.copy(this.position)
    this.#updateCollider()
  }

  #updateCollider() {
    for (const collider of [this.outdoorCollider, this.interiorCollider]) {
      collider.minX = this.position.x - 0.3
      collider.maxX = this.position.x + 0.3
      collider.minZ = this.position.z - 0.22
      collider.maxZ = this.position.z + 0.22
    }
  }

  #syncColliderState() {
    const usable = this.ready && !this.disabled && !this.dialogueActive
    this.outdoorCollider.disabled = !usable || this.areaName !== 'outdoor'
    this.interiorCollider.disabled = !usable || this.areaName !== 'interior'
    this.#updateCollider()
  }

  dispose() {
    this.disposed = true
    for (const [list, collider] of [
      [this.outdoorColliders, this.outdoorCollider],
      [this.interiorColliders, this.interiorCollider],
    ]) {
      const index = list?.indexOf(collider) ?? -1
      if (index >= 0) list.splice(index, 1)
    }
    this.group.traverse((object) => {
      if (!object.isMesh) return
      object.geometry.dispose()
      object.material.dispose()
    })
    this.group.removeFromParent()
  }
}
