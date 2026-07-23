import * as THREE from 'three'
import { SpecialNpcActor } from '../../npcs/SpecialNpcActor.js'

const TALK_RADIUS = 2.35
const WALK_SPEED = 0.92
const OUTFIT_IDS = Object.freeze(['idle', 'church'])
const MAX_MODEL_YAW = Math.PI * 0.42

const OUTDOOR_POSITIONS = Object.freeze({
  courtyardIdle: [6.2, 0.07, -4.2],
  withChildren: [-5.3, 0.07, -1.5],
  walkingToChurch: [2.7, 0.07, -11.1],
  returningToPlaza: [6.2, 0.07, -4.2],
  dayStroll: [6.2, 0.07, -4.2],
})

const INTERIOR_POSITION = [4.75, 0.02, -11.5]

export class MoNpc {
  constructor({ parent, camera, colliders, position = [6.2, 0.07, -4.2] }) {
    this.camera = camera
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
    this.pose.name = 'Model 3D Mơ'
    this.group.add(this.pose)

    this.actor = new SpecialNpcActor({
      parent: this.pose,
      profile: 'mo',
      name: 'Mơ visual',
      position: [0, 0, 0],
      colliders: null,
      active: true,
      dialogueLines: null,
      castShadow: true,
    })
    this.actor.interaction.target = this
    this.visual = this.actor.visual
    this.headRoot = this.actor.headRoot
    this.headMesh = this.actor.headMesh
    this.contactShadow = this.actor.contactShadow

    this.elapsed = 0
    this.ready = false
    this.disabled = false
    this.dialogueActive = false
    this.debugLookFrozen = false
    this.debugHidden = false
    this.disposed = false
    this.currentOutfit = null
    this.desiredOutfit = 'idle'
    this.pendingOutfit = null
    this.outfitRequestVersion = 0
    this.outfitPromise = Promise.resolve(false)
    this.baseYaw = 0
    this.movementYaw = 0
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
      dynamic: true,
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

    this.readyPromise = this.#finishModelLoad()
  }

  async #finishModelLoad() {
    await this.actor.readyPromise
    if (this.disposed) return false
    this.ready = this.actor.ready
    this.disabled = this.actor.disabled
    this.currentOutfit = this.desiredOutfit
    this.actor.setOutfit(this.currentOutfit)
    this.#syncColliderState()
    this.group.visible = (
      this.ready &&
      !this.disabled &&
      this.areaName === this.lastActiveAreaName &&
      !this.dialogueActive &&
      !this.debugHidden
    )
    return this.ready
  }

  update(deltaTime, activeAreaName) {
    this.lastActiveAreaName = activeAreaName
    const clampedDelta = Math.min(Math.max(deltaTime, 0), 0.05)
    const walking = !this.dialogueActive && this.#updateScheduledMovement(clampedDelta)
    this.actor.setWalking(walking)
    const visible = (
      this.ready &&
      !this.disabled &&
      activeAreaName === this.areaName &&
      !this.dialogueActive &&
      !this.debugHidden
    )
    this.group.visible = visible
    if (!visible) return

    this.elapsed += clampedDelta
    if (!this.debugLookFrozen) {
      if (walking) {
        this.group.rotation.y = this.movementYaw
      } else {
        const offsetX = this.camera.position.x - this.position.x
        const offsetZ = this.camera.position.z - this.position.z
        const distanceSquared = offsetX * offsetX + offsetZ * offsetZ
        const near = distanceSquared <= TALK_RADIUS * TALK_RADIUS * 2.3
        const requestedYaw = Math.atan2(offsetX, offsetZ)
        const requestedFromBase = Math.atan2(
          Math.sin(requestedYaw - this.baseYaw),
          Math.cos(requestedYaw - this.baseYaw),
        )
        const targetYaw = this.baseYaw + THREE.MathUtils.clamp(
          requestedFromBase,
          -MAX_MODEL_YAW,
          MAX_MODEL_YAW,
        )
        const turnRate = near ? 4.2 : 1.35
        const yawDelta = Math.atan2(
          Math.sin(targetYaw - this.group.rotation.y),
          Math.cos(targetYaw - this.group.rotation.y),
        )
        this.group.rotation.y += yawDelta * (1 - Math.exp(-turnRate * clampedDelta))
      }
    }

    // SpecialNpcActor accepts a Vector3 directly. Passing the existing camera
    // position avoids allocating a short-lived context object every frame.
    this.actor.update(clampedDelta, this.camera.position)
    this.pose.rotation.z = 0
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

  setDebugLookFrozen(frozen) {
    this.debugLookFrozen = Boolean(frozen)
    this.actor.setDebugLookFrozen(frozen)
    if (this.debugLookFrozen) this.group.rotation.y = this.baseYaw
  }

  setDebugHidden(hidden) {
    this.debugHidden = Boolean(hidden)
    if (this.debugHidden) this.group.visible = false
  }

  getFocusPoint(target = new THREE.Vector3()) {
    return target.set(
      this.position.x,
      this.position.y + this.actor.profile.height * this.actor.profile.focusRatio,
      this.position.z,
    )
  }

  setDialogueActive(active) {
    const nextActive = Boolean(active)
    if (
      nextActive &&
      !this.dialogueActive &&
      this.currentOutfit &&
      this.desiredOutfit !== this.currentOutfit
    ) {
      this.pendingOutfit = this.desiredOutfit
      this.desiredOutfit = this.currentOutfit
      this.outfitRequestVersion += 1
    }

    this.dialogueActive = nextActive
    this.actor.setDialogueActive(nextActive)
    this.#syncColliderState()
    this.group.visible = (
      this.ready &&
      !this.disabled &&
      !nextActive &&
      this.areaName === this.lastActiveAreaName &&
      !this.debugHidden
    )
    if (!nextActive && this.pendingScheduleState) {
      const pending = this.pendingScheduleState
      this.pendingScheduleState = null
      this.setScheduleState(pending)
    }
    if (!nextActive && this.pendingOutfit) {
      const pending = this.pendingOutfit
      this.pendingOutfit = null
      this.setWorldOutfit(pending)
    }
  }

  setWorldOutfit(outfitId) {
    if (!OUTFIT_IDS.includes(outfitId)) {
      throw new RangeError(`Unknown Mơ world outfit: ${outfitId}`)
    }
    if (this.dialogueActive) {
      this.pendingOutfit = outfitId === this.currentOutfit ? null : outfitId
      return Promise.resolve(false)
    }

    this.pendingOutfit = null
    this.desiredOutfit = outfitId
    const requestVersion = ++this.outfitRequestVersion
    this.outfitPromise = this.readyPromise.then(() => {
      if (
        this.disposed ||
        requestVersion !== this.outfitRequestVersion ||
        outfitId !== this.desiredOutfit
      ) return false
      this.actor.setOutfit(outfitId)
      this.currentOutfit = outfitId
      return true
    })
    return this.outfitPromise
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
    if (this.areaName !== 'outdoor') return false
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
    if (distance < 0.025) return false
    this.movementYaw = Math.atan2(offsetX, offsetZ)
    const step = Math.min(distance, WALK_SPEED * deltaTime)
    this.position.x += (offsetX / distance) * step
    this.position.z += (offsetZ / distance) * step
    this.group.position.copy(this.position)
    this.#updateCollider()
    return true
  }

  #updateCollider() {
    const minX = this.position.x - 0.3
    const maxX = this.position.x + 0.3
    const minZ = this.position.z - 0.22
    const maxZ = this.position.z + 0.22

    this.outdoorCollider.minX = minX
    this.outdoorCollider.maxX = maxX
    this.outdoorCollider.minZ = minZ
    this.outdoorCollider.maxZ = maxZ

    this.interiorCollider.minX = minX
    this.interiorCollider.maxX = maxX
    this.interiorCollider.minZ = minZ
    this.interiorCollider.maxZ = maxZ
  }

  #syncColliderState() {
    const usable = this.ready && !this.disabled && !this.dialogueActive
    this.outdoorCollider.disabled = !usable || this.areaName !== 'outdoor'
    this.interiorCollider.disabled = !usable || this.areaName !== 'interior'
    this.#updateCollider()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const [list, collider] of [
      [this.outdoorColliders, this.outdoorCollider],
      [this.interiorColliders, this.interiorCollider],
    ]) {
      const index = list?.indexOf(collider) ?? -1
      if (index >= 0) list.splice(index, 1)
    }
    this.actor.dispose()
    this.group.removeFromParent()
  }
}
