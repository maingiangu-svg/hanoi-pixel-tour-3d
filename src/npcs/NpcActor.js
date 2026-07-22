import * as THREE from 'three'
import { getSharedNpcResources } from './NpcResources.js'
import { getNpcPreset, NPC_BEHAVIORS } from './npcPresets.js'

const CANONICAL_HEIGHT = 1.745
const PARKED_COLLIDER_POSITION = 1000000
const EMPTY_DIALOGUE = Object.freeze([])

function readPosition(position) {
  if (Array.isArray(position)) {
    return { x: position[0] ?? 0, y: position[1] ?? 0, z: position[2] ?? 0 }
  }
  return { x: position?.x ?? 0, y: position?.y ?? 0, z: position?.z ?? 0 }
}

function readWaypoint(waypoint) {
  if (Array.isArray(waypoint)) return { x: waypoint[0] ?? 0, z: waypoint[2] ?? waypoint[1] ?? 0 }
  return { x: waypoint?.x ?? 0, z: waypoint?.z ?? 0 }
}

export class NpcActor {
  constructor({
    parent = null,
    resources = getSharedNpcResources(),
    preset = 'student',
    name = null,
    position = [0, 0, 0],
    rotationY = 0,
    behavior = null,
    waypoints = [],
    loopWaypoints = true,
    speed = null,
    pauseRadius = 1.6,
    resumeRadius = 2.05,
    colliderRadius = 0.24,
    colliders = null,
    active = true,
    castShadow = false,
    dialogueLines = EMPTY_DIALOGUE,
    dialogueName = null,
    dialoguePortrait = false,
    interactionRadius = 2.15,
    interactionLabel = null,
    hideDuringDialogue = true,
    animationOffset = 0,
  } = {}) {
    this.resources = resources
    this.preset = typeof preset === 'string' ? getNpcPreset(preset) : preset
    this.name = name ?? this.preset.label
    this.behavior = behavior ?? this.preset.defaultBehavior
    if (!NPC_BEHAVIORS.includes(this.behavior)) {
      throw new RangeError(`Unknown NPC behavior: ${this.behavior}`)
    }

    this.speed = speed ?? this.preset.walkSpeed
    this.pauseRadiusSquared = pauseRadius * pauseRadius
    this.resumeRadiusSquared = Math.max(resumeRadius, pauseRadius) ** 2
    this.colliderRadius = colliderRadius
    this.colliderDepth = Math.max(0.17, colliderRadius * 0.8)
    this.colliderList = colliders
    this.dialogueLines = dialogueLines?.length ? dialogueLines : EMPTY_DIALOGUE
    this.dialogueName = dialogueName ?? this.name
    this.dialoguePortrait = dialoguePortrait
    this.hideDuringDialogue = hideDuringDialogue
    this.castShadow = castShadow
    this.elapsed = Number.isFinite(animationOffset) ? animationOffset : 0
    this.ready = false
    this._disabled = false
    this.active = Boolean(active)
    this.dialogueActive = false
    this.pausedForPlayer = false
    this.walking = false
    this.disposed = false
    this.currentWaypointIndex = 0
    this.loopWaypoints = loopWaypoints
    this.pathComplete = false

    this.group = new THREE.Group()
    this.group.name = `NPC ${this.name}`
    const start = readPosition(position)
    this.group.position.set(start.x, start.y, start.z)
    this.group.rotation.y = rotationY
    this.position = this.group.position
    parent?.add(this.group)

    this.visual = new THREE.Group()
    this.visual.name = 'Procedural low-poly human'
    this.group.add(this.visual)

    this.bodyScale = this.preset.height / CANONICAL_HEIGHT
    this.headRig = null
    this.leftArm = null
    this.rightArm = null
    this.leftElbow = null
    this.rightElbow = null
    this.leftLeg = null
    this.rightLeg = null
    this.leftKnee = null
    this.rightKnee = null

    this.#buildBody()
    this.#applyStaticPose()
    this.visual.scale.setScalar(this.bodyScale)
    this.setWaypoints(waypoints)

    this.collider = {
      name: `NPC ${this.name}`,
      dynamic: true,
      disabled: false,
      minX: 0,
      maxX: 0,
      minZ: 0,
      maxZ: 0,
    }
    this.colliderList?.push(this.collider)
    this.interaction = {
      type: 'dialogue',
      position: this.position,
      radius: interactionRadius,
      label: interactionLabel ?? `Nói chuyện với ${this.name}`,
      target: this,
    }

    this.ready = true
    this.#refreshState()
  }

  get disabled() {
    return this._disabled
  }

  set disabled(value) {
    this._disabled = Boolean(value)
    if (this.collider) this.#refreshState()
  }

  update(deltaTime, context = null) {
    if (!this.ready || this.disabled || !this.active || this.dialogueActive) return

    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    this.elapsed += delta
    const playerPosition = context?.isVector3 ? context : context?.playerPosition ?? null
    let playerDistanceSquared = Infinity
    if (playerPosition) {
      const playerX = playerPosition.x - this.position.x
      const playerZ = playerPosition.z - this.position.z
      playerDistanceSquared = playerX * playerX + playerZ * playerZ
    }

    if (this.behavior === 'walker') {
      if (this.pausedForPlayer) {
        if (playerDistanceSquared > this.resumeRadiusSquared) this.pausedForPlayer = false
      } else if (playerDistanceSquared < this.pauseRadiusSquared) {
        this.pausedForPlayer = true
      }
      this.walking = !this.pausedForPlayer && this.#walk(delta)
    } else {
      this.walking = false
    }

    if ((!this.walking || this.behavior !== 'walker') && playerDistanceSquared < 11.56) {
      this.#turnToward(playerPosition.x, playerPosition.z, delta, 2.5)
    }

    this.#animatePose()
    this.#syncCollider()
  }

  setWaypoints(waypoints = []) {
    this.waypoints = waypoints.map(readWaypoint)
    this.currentWaypointIndex = 0
    this.pathComplete = false
    if (
      this.waypoints.length > 1 &&
      Math.hypot(
        this.waypoints[0].x - this.position.x,
        this.waypoints[0].z - this.position.z,
      ) < 0.08
    ) {
      this.currentWaypointIndex = 1
    }
  }

  setBehavior(behavior) {
    if (!NPC_BEHAVIORS.includes(behavior)) {
      throw new RangeError(`Unknown NPC behavior: ${behavior}`)
    }
    this.behavior = behavior
    this.walking = false
    this.pausedForPlayer = false
    this.#applyStaticPose()
  }

  setPosition(x, y, z) {
    if (x?.isVector3) this.position.copy(x)
    else this.position.set(x, y, z)
    this.#syncCollider()
  }

  setActive(active) {
    this.active = Boolean(active)
    this.#refreshState()
  }

  activate() {
    this.setActive(true)
  }

  deactivate() {
    this.setActive(false)
  }

  setDisabled(disabled) {
    this.disabled = disabled
  }

  getInteraction() {
    if (
      !this.ready ||
      this.disabled ||
      !this.active ||
      this.dialogueActive ||
      this.dialogueLines.length === 0
    ) return null
    return this.interaction
  }

  getFocusPoint(target = new THREE.Vector3()) {
    return target.set(
      this.position.x,
      this.position.y + this.preset.height * 0.82,
      this.position.z,
    )
  }

  setDialogueActive(active) {
    this.dialogueActive = Boolean(active)
    this.#refreshState()
  }

  getDialogueLines() {
    return this.dialogueLines
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.ready = false
    this._disabled = true
    if (this.colliderList) {
      const index = this.colliderList.indexOf(this.collider)
      if (index >= 0) this.colliderList.splice(index, 1)
    }
    this.group.removeFromParent()
  }

  #buildBody() {
    const skin = this.preset.skin
    const torso = this.#mesh('Thân', 'tapered', this.preset.top, this.visual)
    torso.position.set(0, 1.02, 0)
    torso.scale.set(0.52, 0.62, 0.32)
    torso.castShadow = this.castShadow

    const hips = this.#mesh('Hông', 'box', this.preset.bottom, this.visual)
    hips.position.set(0, 0.72, 0)
    hips.scale.set(0.38, 0.17, 0.25)

    const neck = this.#mesh('Cổ', 'cylinder', skin, this.visual)
    neck.position.set(0, 1.35, 0)
    neck.scale.set(0.17, 0.13, 0.17)

    this.headRig = new THREE.Group()
    this.headRig.name = 'Đầu'
    this.headRig.position.set(0, 1.53, 0)
    this.visual.add(this.headRig)
    const head = this.#mesh('Khuôn mặt', 'head', skin, this.headRig)
    head.scale.set(0.37, 0.43, 0.37)
    head.castShadow = this.castShadow
    this.#buildHair()

    this.leftArm = this.#buildArm('Trái', -1)
    this.rightArm = this.#buildArm('Phải', 1)
    this.leftLeg = this.#buildLeg('Trái', -1)
    this.rightLeg = this.#buildLeg('Phải', 1)
    this.#buildAccessory()
  }

  #buildArm(label, side) {
    const shoulder = new THREE.Group()
    shoulder.name = `Vai ${label}`
    shoulder.position.set(side * 0.31, 1.25, 0)
    this.visual.add(shoulder)

    const upperArm = this.#mesh(`Cánh tay ${label}`, 'cylinder', this.preset.top, shoulder)
    upperArm.position.y = -0.14
    upperArm.scale.set(0.15, 0.28, 0.15)

    const elbow = new THREE.Group()
    elbow.name = `Khuỷu ${label}`
    elbow.position.y = -0.28
    shoulder.add(elbow)
    const forearm = this.#mesh(`Cẳng tay ${label}`, 'cylinder', this.preset.skin, elbow)
    forearm.position.y = -0.135
    forearm.scale.set(0.13, 0.27, 0.13)
    const hand = this.#mesh(`Bàn tay ${label}`, 'sphere', this.preset.skin, elbow)
    hand.position.y = -0.295
    hand.scale.setScalar(0.15)

    if (side < 0) this.leftElbow = elbow
    else this.rightElbow = elbow
    return shoulder
  }

  #buildLeg(label, side) {
    const hip = new THREE.Group()
    hip.name = `Chân ${label}`
    hip.position.set(side * 0.15, 0.7, 0)
    this.visual.add(hip)

    const thigh = this.#mesh(`Đùi ${label}`, 'cylinder', this.preset.bottom, hip)
    thigh.position.y = -0.16
    thigh.scale.set(0.2, 0.32, 0.21)

    const knee = new THREE.Group()
    knee.name = `Gối ${label}`
    knee.position.y = -0.32
    hip.add(knee)
    const shin = this.#mesh(`Cẳng chân ${label}`, 'cylinder', this.preset.bottom, knee)
    shin.position.y = -0.15
    shin.scale.set(0.17, 0.3, 0.18)
    const shoe = this.#mesh(`Giày ${label}`, 'box', this.preset.shoes, knee)
    shoe.position.set(0, -0.33, 0.06)
    shoe.scale.set(0.19, 0.1, 0.33)

    if (side < 0) this.leftKnee = knee
    else this.rightKnee = knee
    return hip
  }

  #buildHair() {
    const hair = this.preset.hair
    const color = this.preset.hairColor
    if (hair === 'conicalHat') {
      const hat = this.#mesh('Nón lá', 'cone', 'straw', this.headRig)
      hat.position.y = 0.31
      hat.scale.set(0.58, 0.28, 0.58)
      return
    }

    const cap = this.#mesh('Tóc', 'sphere', color, this.headRig)
    cap.position.y = 0.13
    cap.scale.set(0.4, 0.23, 0.4)
    if (hair === 'bob') {
      const back = this.#mesh('Tóc sau', 'box', color, this.headRig)
      back.position.set(0, -0.05, -0.15)
      back.scale.set(0.39, 0.38, 0.13)
    } else if (hair === 'bun') {
      const bun = this.#mesh('Búi tóc', 'sphere', color, this.headRig)
      bun.position.set(0, 0.29, -0.08)
      bun.scale.setScalar(0.22)
    } else if (hair === 'cap') {
      cap.material = this.resources.getMaterial(this.preset.accent)
      const visor = this.#mesh('Lưỡi trai', 'box', this.preset.accent, this.headRig)
      visor.position.set(0, 0.12, 0.24)
      visor.scale.set(0.32, 0.06, 0.24)
    } else if (hair === 'helmet') {
      cap.material = this.resources.getMaterial(this.preset.accent)
      cap.position.y = 0.12
      cap.scale.set(0.43, 0.34, 0.43)
      const rim = this.#mesh('Vành mũ bảo hiểm', 'brim', 'charcoal', this.headRig)
      rim.position.set(0, -0.01, 0.03)
      rim.scale.set(0.39, 0.45, 0.39)
    }
  }

  #buildAccessory() {
    switch (this.preset.accessory) {
      case 'camera': {
        const camera = this.#mesh('Máy ảnh', 'box', 'charcoal', this.visual)
        camera.position.set(0, 1.06, 0.31)
        camera.scale.set(0.28, 0.2, 0.16)
        const lens = this.#mesh('Ống kính', 'cylinder', 'metal', this.visual)
        lens.position.set(0, 1.06, 0.41)
        lens.rotation.x = Math.PI / 2
        lens.scale.set(0.13, 0.18, 0.13)
        break
      }
      case 'cane': {
        const cane = this.#mesh('Gậy', 'cylinder', 'darkBrown', this.visual)
        cane.position.set(0.47, 0.45, 0.06)
        cane.scale.set(0.06, 0.88, 0.06)
        break
      }
      case 'basket': {
        const basket = this.#mesh('Thúng', 'cylinder', 'straw', this.visual)
        basket.position.set(0.45, 0.67, 0)
        basket.scale.set(0.48, 0.28, 0.48)
        break
      }
      case 'backpack': {
        const backpack = this.#mesh('Ba lô', 'box', this.preset.accent, this.visual)
        backpack.position.set(0, 1, -0.27)
        backpack.scale.set(0.36, 0.48, 0.22)
        break
      }
      case 'tote': {
        const bag = this.#mesh('Túi vải', 'box', this.preset.accent, this.visual)
        bag.position.set(-0.43, 0.72, 0.02)
        bag.scale.set(0.28, 0.38, 0.12)
        break
      }
      case 'collar': {
        const collar = this.#mesh('Cổ áo linh mục', 'box', 'white', this.visual)
        collar.position.set(0, 1.28, 0.28)
        collar.scale.set(0.16, 0.07, 0.05)
        break
      }
      default:
        break
    }
  }

  #mesh(name, geometry, material, parent) {
    const mesh = new THREE.Mesh(
      this.resources.getGeometry(geometry),
      this.resources.getMaterial(material),
    )
    mesh.name = name
    mesh.castShadow = false
    mesh.receiveShadow = false
    parent.add(mesh)
    return mesh
  }

  #applyStaticPose() {
    this.visual.position.y = this.behavior === 'seated' ? -0.29 : 0
    this.leftLeg.rotation.set(0, 0, 0)
    this.rightLeg.rotation.set(0, 0, 0)
    this.leftKnee.rotation.set(0, 0, 0)
    this.rightKnee.rotation.set(0, 0, 0)
    this.leftArm.rotation.set(0, 0, -0.06)
    this.rightArm.rotation.set(0, 0, 0.06)
    this.leftElbow.rotation.set(0, 0, 0)
    this.rightElbow.rotation.set(0, 0, 0)

    if (this.behavior === 'seated') {
      this.leftLeg.rotation.x = -1.34
      this.rightLeg.rotation.x = -1.34
      this.leftKnee.rotation.x = 1.34
      this.rightKnee.rotation.x = 1.34
      this.leftArm.rotation.x = -0.42
      this.rightArm.rotation.x = -0.42
    } else if (this.behavior === 'photographer') {
      this.leftArm.rotation.set(-1.12, 0, -0.22)
      this.rightArm.rotation.set(-1.12, 0, 0.22)
      this.leftElbow.rotation.x = -0.72
      this.rightElbow.rotation.x = -0.72
    }
  }

  #walk(delta) {
    if (this.waypoints.length === 0 || this.pathComplete) return false
    let waypoint = this.waypoints[this.currentWaypointIndex]
    let offsetX = waypoint.x - this.position.x
    let offsetZ = waypoint.z - this.position.z
    let distance = Math.hypot(offsetX, offsetZ)
    if (distance < 0.08) {
      const onLastWaypoint = this.currentWaypointIndex === this.waypoints.length - 1
      if (onLastWaypoint && !this.loopWaypoints) {
        this.position.x = waypoint.x
        this.position.z = waypoint.z
        this.pathComplete = true
        return false
      }
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length
      waypoint = this.waypoints[this.currentWaypointIndex]
      offsetX = waypoint.x - this.position.x
      offsetZ = waypoint.z - this.position.z
      distance = Math.hypot(offsetX, offsetZ)
    }
    if (distance < 0.001) return false

    const targetYaw = Math.atan2(offsetX, offsetZ)
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - this.group.rotation.y),
      Math.cos(targetYaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-4.2 * delta))
    const alignment = Math.max(0.18, Math.cos(yawDelta))
    const step = Math.min(distance, this.speed * alignment * delta)
    this.position.x += (offsetX / distance) * step
    this.position.z += (offsetZ / distance) * step
    return step > 0
  }

  #turnToward(x, z, delta, speed) {
    const targetYaw = Math.atan2(x - this.position.x, z - this.position.z)
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - this.group.rotation.y),
      Math.cos(targetYaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-speed * delta))
  }

  #animatePose() {
    const breath = Math.sin(this.elapsed * 1.4) * 0.004
    this.visual.scale.set(
      this.bodyScale * (1 + breath * 0.3),
      this.bodyScale * (1 + breath),
      this.bodyScale,
    )
    this.headRig.rotation.z = Math.sin(this.elapsed * 0.63) * 0.012

    if (this.behavior === 'photographer') {
      const photoCycle = this.elapsed % 10
      const poseAmount = photoCycle < 6
        ? 1
        : photoCycle < 7.2
          ? 1 - (photoCycle - 6) / 1.2
          : photoCycle < 8.8
            ? 0
            : (photoCycle - 8.8) / 1.2
      this.leftArm.rotation.x = -0.28 - poseAmount * 0.84
      this.rightArm.rotation.x = -0.28 - poseAmount * 0.84
      this.leftElbow.rotation.x = -0.18 - poseAmount * 0.54
      this.rightElbow.rotation.x = -0.18 - poseAmount * 0.54
      this.headRig.rotation.x = poseAmount * -0.08
      return
    }
    if (this.behavior === 'seated') return
    const stride = this.walking ? Math.sin(this.elapsed * 7.2) * 0.42 : 0
    const armSwing = this.walking ? stride * 0.62 : Math.sin(this.elapsed * 0.9) * 0.018
    this.leftLeg.rotation.x = stride
    this.rightLeg.rotation.x = -stride
    this.leftArm.rotation.x = -armSwing
    this.rightArm.rotation.x = armSwing
  }

  #refreshState() {
    const usable = this.ready && this.active && !this.disabled
    this.group.visible = usable && !(this.dialogueActive && this.hideDuringDialogue)
    this.collider.disabled = !usable || this.dialogueActive
    this.#syncCollider()
  }

  #syncCollider() {
    if (!this.collider) return
    if (this.collider.disabled) {
      this.collider.minX = PARKED_COLLIDER_POSITION
      this.collider.maxX = PARKED_COLLIDER_POSITION + 0.01
      this.collider.minZ = PARKED_COLLIDER_POSITION
      this.collider.maxZ = PARKED_COLLIDER_POSITION + 0.01
      return
    }
    this.collider.minX = this.position.x - this.colliderRadius
    this.collider.maxX = this.position.x + this.colliderRadius
    this.collider.minZ = this.position.z - this.colliderDepth
    this.collider.maxZ = this.position.z + this.colliderDepth
  }
}
