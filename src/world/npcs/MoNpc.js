import * as THREE from 'three'

const NPC_HEIGHT = 1.72
const TALK_RADIUS = 2.35
const WALK_SPEED = 0.92
const OUTFIT_IDS = Object.freeze(['idle', 'church'])
const MAX_BILLBOARD_YAW = Math.PI * 0.42

const OUTDOOR_POSITIONS = Object.freeze({
  courtyardIdle: [6.2, 0.07, -4.2],
  withChildren: [-5.3, 0.07, -1.5],
  walkingToChurch: [2.7, 0.07, -11.1],
  returningToPlaza: [6.2, 0.07, -4.2],
  dayStroll: [6.2, 0.07, -4.2],
})

const INTERIOR_POSITION = [4.75, 0.02, -11.5]

function textureAspect(texture) {
  const image = texture?.image
  const width = image?.naturalWidth ?? image?.videoWidth ?? image?.width
  const height = image?.naturalHeight ?? image?.videoHeight ?? image?.height
  return width && height ? width / height : 2 / 3
}

function billboardMetrics(texture) {
  const image = texture?.image
  const imageHeight = image?.naturalHeight ?? image?.videoHeight ?? image?.height ?? 1
  const metadata = texture?.userData?.moBillboard
  const contentHeight = metadata?.contentHeight ?? imageHeight
  const planeHeight = NPC_HEIGHT / Math.max(contentHeight / imageHeight, 0.01)
  return {
    planeHeight,
    planeWidth: planeHeight * textureAspect(texture),
    footOffset: planeHeight * ((metadata?.bottomPadding ?? 0) / imageHeight),
  }
}

function createContactShadow() {
  const geometry = new THREE.PlaneGeometry(0.86, 0.5)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      shadowColor: { value: new THREE.Color(0x101311) },
      shadowOpacity: { value: 0.3 },
    },
    vertexShader: `
      varying vec2 shadowUv;
      void main() {
        shadowUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 shadowColor;
      uniform float shadowOpacity;
      varying vec2 shadowUv;
      void main() {
        vec2 centered = (shadowUv - 0.5) * vec2(1.0, 1.7);
        float contact = 1.0 - smoothstep(0.08, 0.5, length(centered));
        gl_FragColor = vec4(shadowColor, contact * shadowOpacity);
      }
    `,
  })
  const shadow = new THREE.Mesh(geometry, material)
  shadow.name = 'Contact shadow Mơ'
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.008
  return shadow
}

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
    this.currentOutfit = null
    this.desiredOutfit = 'idle'
    this.pendingOutfit = null
    this.outfitRequestVersion = 0
    this.outfitPromise = Promise.resolve(false)
    this.billboardBaseMetrics = null
    this.baseYaw = 0
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
    let outfitId
    let texture
    do {
      outfitId = this.desiredOutfit
      texture = await this.assetLoader.getFullbody(outfitId)
    } while (!this.disposed && outfitId !== this.desiredOutfit)

    if (this.disposed || !texture) {
      this.disabled = true
      return
    }

    const metrics = billboardMetrics(texture)
    this.billboardBaseMetrics = metrics
    const geometry = new THREE.PlaneGeometry(metrics.planeWidth, metrics.planeHeight)
    geometry.translate(0, metrics.planeHeight / 2, 0)
    const material = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: true,
      emissive: 0x15120f,
      emissiveIntensity: 0.12,
    })
    this.billboard = new THREE.Mesh(geometry, material)
    this.billboard.name = 'Billboard Mơ'
    this.billboard.position.y = -metrics.footOffset
    this.billboard.renderOrder = 1
    this.pose.add(this.billboard)

    this.contactShadow = createContactShadow()
    this.group.add(this.contactShadow)

    this.currentOutfit = outfitId
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
    const requestedYaw = Math.atan2(offsetX, offsetZ)
    const requestedFromBase = Math.atan2(
      Math.sin(requestedYaw - this.baseYaw),
      Math.cos(requestedYaw - this.baseYaw),
    )
    const targetYaw = this.baseYaw + THREE.MathUtils.clamp(
      requestedFromBase,
      -MAX_BILLBOARD_YAW,
      MAX_BILLBOARD_YAW,
    )
    const turnRate = near ? 4.2 : 1.35
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - this.group.rotation.y),
      Math.cos(targetYaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-turnRate * clampedDelta))

    const breath = Math.sin(this.elapsed * 1.45) * 0.006
    this.pose.scale.set(1 + breath * 0.28, 1 + breath, 1)

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

  getFocusPoint(target = new THREE.Vector3()) {
    return target.set(this.position.x, this.position.y + 1.38, this.position.z)
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
    this.#syncColliderState()
    this.group.visible = this.ready && !nextActive && this.areaName === this.lastActiveAreaName
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
    if (outfitId === this.desiredOutfit && outfitId === this.currentOutfit) {
      return this.outfitPromise
    }

    this.desiredOutfit = outfitId
    if (!this.billboard) {
      this.outfitPromise = this.readyPromise.then(() => this.currentOutfit === outfitId)
      return this.outfitPromise
    }

    this.outfitPromise = this.#applyOutfitTexture(outfitId)
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

  async #applyOutfitTexture(outfitId) {
    const requestVersion = ++this.outfitRequestVersion
    const texture = await this.assetLoader.getFullbody(outfitId)
    if (
      this.disposed ||
      !texture ||
      requestVersion !== this.outfitRequestVersion ||
      outfitId !== this.desiredOutfit ||
      !this.billboard
    ) return false

    const metrics = billboardMetrics(texture)
    this.billboard.material.map = texture
    this.billboard.material.needsUpdate = true
    this.billboard.scale.set(
      metrics.planeWidth / this.billboardBaseMetrics.planeWidth,
      metrics.planeHeight / this.billboardBaseMetrics.planeHeight,
      1,
    )
    this.billboard.position.y = -metrics.footOffset
    this.currentOutfit = outfitId
    return true
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
