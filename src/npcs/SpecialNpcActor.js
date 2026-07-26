import * as THREE from 'three'
import { ActivityController } from './ActivityController.js'
import { getSharedNpcResources } from './NpcResources.js'
import {
  getSpecialNpcProfile,
  SPECIAL_NPC_CANONICAL_HEIGHT,
} from './specialNpcProfiles.js'

const PARKED_COLLIDER_POSITION = 1000000
const EMPTY_DIALOGUE = Object.freeze([])

function readPosition(position) {
  if (Array.isArray(position)) {
    return { x: position[0] ?? 0, y: position[1] ?? 0, z: position[2] ?? 0 }
  }
  return { x: position?.x ?? 0, y: position?.y ?? 0, z: position?.z ?? 0 }
}

function createContactShadow() {
  const geometry = new THREE.PlaneGeometry(0.92, 0.58)
  const material = new THREE.MeshBasicMaterial({
    color: 0x101311,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    toneMapped: false,
  })
  const shadow = new THREE.Mesh(geometry, material)
  shadow.name = 'Special.ContactShadow'
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.008
  return shadow
}

export class SpecialNpcActor {
  constructor({
    parent = null,
    profile = 'gymmer',
    name = null,
    position = [0, 0, 0],
    rotationY = 0,
    colliders = null,
    active = true,
    faceLoader = null,
    dialogueLines = EMPTY_DIALOGUE,
    dialogueName = null,
    dialoguePortrait = false,
    interactionRadius = 2.35,
    interactionLabel = null,
    hideDuringDialogue = true,
    castShadow = true,
    animationOffset = 0,
    allowPhotoFace = typeof window === 'undefined',
  } = {}) {
    this.profile = typeof profile === 'string' ? getSpecialNpcProfile(profile) : profile
    this.name = name ?? this.profile.label
    this.dialogueLines = dialogueLines
    this.dialogueName = dialogueName ?? this.name
    this.dialoguePortrait = dialoguePortrait
    this.hideDuringDialogue = hideDuringDialogue
    this.castShadow = castShadow
    this.colliders = colliders
    this.colliderRadius = this.profile.colliderRadius
    this.colliderDepth = this.profile.colliderDepth
    this.active = Boolean(active)
    this.disabled = false
    this.dialogueActive = false
    this.disposed = false
    this.ready = false
    this.walking = false
    this.debugLookFrozen = false
    this.elapsed = Number.isFinite(animationOffset) ? animationOffset : 0
    this.currentOutfit = this.profile.defaultOutfit
    this.ownedGeometries = new Set()
    this.ownedMaterials = new Set()
    this.shadowMeshes = []

    this.group = new THREE.Group()
    this.group.name = `NPC ${this.name}`
    const start = readPosition(position)
    this.group.position.set(start.x, start.y, start.z)
    this.group.rotation.y = rotationY
    this.position = this.group.position
    parent?.add(this.group)

    this.visual = new THREE.Group()
    this.visual.name = 'Special.Visual'
    this.group.add(this.visual)
    this.bodyScale = this.profile.height / SPECIAL_NPC_CANONICAL_HEIGHT
    this.visual.scale.setScalar(this.bodyScale)
    this.leftHandAnchor = null
    this.rightHandAnchor = null

    this.contactShadow = createContactShadow()
    this.ownedGeometries.add(this.contactShadow.geometry)
    this.ownedMaterials.add(this.contactShadow.material)
    this.group.add(this.contactShadow)

    this.materials = this.#createMaterials()
    this.#buildBody()
    this.#applyProfilePose()
    this.basePose = {
      leftArm: this.leftArm.rotation.clone(),
      rightArm: this.rightArm.rotation.clone(),
      leftElbow: this.leftElbow.rotation.clone(),
      rightElbow: this.rightElbow.rotation.clone(),
      leftLeg: this.leftLeg.rotation.clone(),
      rightLeg: this.rightLeg.rotation.clone(),
    }
    this.activityController = new ActivityController({
      actor: this,
      rig: {
        visual: this.visual,
        head: this.headRig,
        leftArm: this.leftArm,
        rightArm: this.rightArm,
        leftElbow: this.leftElbow,
        rightElbow: this.rightElbow,
        leftLeg: this.leftLeg,
        rightLeg: this.rightLeg,
        leftKnee: this.leftKnee,
        rightKnee: this.rightKnee,
      },
      anchors: {
        left: this.leftHandAnchor,
        right: this.rightHandAnchor,
      },
      resources: getSharedNpcResources(),
      bodyScale: this.bodyScale,
    })
    this.headRoot = this.headRig
    this.faceDetails = this.fallbackFace

    this.collider = {
      name: `NPC ${this.name}`,
      dynamic: true,
      disabled: true,
      minX: PARKED_COLLIDER_POSITION,
      maxX: PARKED_COLLIDER_POSITION + 0.01,
      minZ: PARKED_COLLIDER_POSITION,
      maxZ: PARKED_COLLIDER_POSITION + 0.01,
    }
    this.colliders?.push(this.collider)
    this.interaction = {
      type: 'dialogue',
      position: this.position,
      radius: interactionRadius,
      label: interactionLabel ?? `Nói chuyện với ${this.name}`,
      target: this,
    }

    this.group.visible = false
    this.readyPromise = this.#loadFace(allowPhotoFace ? faceLoader : null)
  }

  async #loadFace(faceLoader) {
    let texture = null
    try {
      texture = faceLoader ? await faceLoader(this.profile.id) : null
    } catch {
      texture = null
    }
    if (this.disposed) return false

    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.needsUpdate = true
      this.faceCard.material.map = texture
      this.faceCard.material.needsUpdate = true
      this.faceCard.visible = true
      this.fallbackFace.visible = false
    }

    // A procedural face remains available if the texture cannot load, so an
    // NPC never disappears because of a recoverable image failure.
    this.ready = true
    this.#refreshState()
    return Boolean(texture)
  }

  #createMaterials() {
    const lambert = (color, options = {}) => {
      const material = new THREE.MeshLambertMaterial({
        color,
        flatShading: true,
        ...options,
      })
      this.ownedMaterials.add(material)
      return material
    }
    const basic = (color, options = {}) => {
      const material = new THREE.MeshBasicMaterial({ color, ...options })
      this.ownedMaterials.add(material)
      return material
    }

    return {
      skin: lambert(this.profile.skinColor),
      skinShade: lambert(new THREE.Color(this.profile.skinColor).multiplyScalar(0.82)),
      hair: lambert(this.profile.hairColor),
      black: lambert(0x17191c),
      charcoal: lambert(0x292d33),
      denim: lambert(0x536777),
      cream: lambert(0xece5d8),
      white: lambert(0xf2eee5),
      orange: lambert(0xc9692c),
      red: lambert(0xa83c36),
      backpack: lambert(0x465348),
      metal: lambert(0x74797d),
      face: basic(0xffffff, {
        transparent: true,
        alphaTest: 0.1,
        depthWrite: true,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    }
  }

  #geometry(type) {
    let geometry
    switch (type) {
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, false)
        break
      case 'tapered':
        geometry = new THREE.CylinderGeometry(0.4, 0.5, 1, 8, 1, false)
        break
      case 'sphere':
        geometry = new THREE.IcosahedronGeometry(0.5, 1)
        break
      case 'head':
        geometry = new THREE.DodecahedronGeometry(0.5, 1)
        break
      case 'plane':
        geometry = new THREE.PlaneGeometry(1, 1)
        break
      case 'torus':
        geometry = new THREE.TorusGeometry(0.5, 0.018, 4, 16)
        break
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1)
        break
    }
    this.ownedGeometries.add(geometry)
    return geometry
  }

  #mesh(name, geometryType, material, parent, {
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    castShadow = this.castShadow,
  } = {}) {
    const mesh = new THREE.Mesh(this.#geometry(geometryType), material)
    mesh.name = name
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.rotation.set(...rotation)
    mesh.castShadow = castShadow
    if (castShadow) this.shadowMeshes.push(mesh)
    mesh.receiveShadow = false
    parent.add(mesh)
    return mesh
  }

  #buildBody() {
    this.body = new THREE.Group()
    this.body.name = 'Special.Body'
    this.visual.add(this.body)

    const isGymmer = this.profile.id === 'gymmer'
    const isBasketball = this.profile.id === 'basketball'
    const width = this.profile.bodyWidth
    const bulk = this.profile.limbBulk

    const torsoMaterial = isBasketball ? this.materials.black : this.materials.skin
    this.torso = this.#mesh('Special.Torso', 'tapered', torsoMaterial, this.body, {
      position: [0, 1.04, 0],
      scale: [0.52 * width, 0.62, 0.32 * Math.max(0.92, width * 0.84)],
    })
    this.hips = this.#mesh(
      'Special.Hips',
      'box',
      this.materials.black,
      this.body,
      {
        position: [0, 0.71, 0],
        scale: [0.4 * width, 0.18, 0.27 * Math.max(0.92, width)],
      },
    )
    this.#mesh('Special.Neck', 'cylinder', this.materials.skin, this.body, {
      position: [0, 1.35, 0],
      scale: [0.17, 0.14, 0.17],
    })

    this.headRig = new THREE.Group()
    this.headRig.name = 'Special.HeadRig'
    this.headRig.position.set(0, 1.53, 0)
    this.body.add(this.headRig)
    this.headMesh = this.#mesh('Special.HeadBacking', 'head', this.materials.skin, this.headRig, {
      scale: [0.34, 0.39, 0.32],
    })
    this.#mesh('Special.HairBacking', 'sphere', this.materials.hair, this.headRig, {
      position: [0, 0.095, -0.06],
      scale: [0.4, 0.24, 0.38],
    })

    this.faceCard = this.#mesh(
      'Special.FaceCard',
      'plane',
      this.materials.face,
      this.headRig,
      {
        position: [0, this.profile.faceCenterY - 1.53, 0.205],
        scale: [this.profile.faceWidth, this.profile.faceHeight, 1],
        castShadow: false,
      },
    )
    this.faceCard.renderOrder = 3
    this.faceCard.visible = false
    this.#buildFallbackFace()

    this.leftArm = this.#buildArm('L', -1, bulk, isBasketball)
    this.rightArm = this.#buildArm('R', 1, bulk, isBasketball)
    this.leftLeg = this.#buildLeg('L', -1, width, bulk, isBasketball)
    this.rightLeg = this.#buildLeg('R', 1, width, bulk, isBasketball)

    if (isGymmer) this.#buildGymmerDetails()
    if (isBasketball) this.#buildBasketballDetails()
  }

  #buildFallbackFace() {
    this.fallbackFace = new THREE.Group()
    this.fallbackFace.name = 'Special.FallbackFace'
    this.headRig.add(this.fallbackFace)
    for (const side of [-1, 1]) {
      this.#mesh(
        `Special.FallbackEye.${side < 0 ? 'L' : 'R'}`,
        'sphere',
        this.materials.black,
        this.fallbackFace,
        {
          position: [side * 0.105, 0.025, 0.18],
          scale: [0.038, 0.05, 0.025],
          castShadow: false,
        },
      )
    }
    this.#mesh('Special.FallbackMouth', 'box', this.materials.red, this.fallbackFace, {
      position: [0, -0.1, 0.19],
      scale: [0.12, 0.025, 0.018],
      castShadow: false,
    })
  }

  #buildArm(label, side, bulk, shirtSleeve) {
    const shoulder = new THREE.Group()
    shoulder.name = `Special.Shoulder.${label}`
    shoulder.position.set(side * 0.29 * this.profile.bodyWidth, 1.25, 0)
    this.body.add(shoulder)

    const upperMaterial = shirtSleeve ? this.materials.black : this.materials.skin
    this.#mesh(`Special.UpperArm.${label}`, 'cylinder', upperMaterial, shoulder, {
      position: [0, -0.15, 0],
      scale: [0.15 * bulk, 0.3, 0.15 * bulk],
    })

    const elbow = new THREE.Group()
    elbow.name = `Special.Elbow.${label}`
    elbow.position.y = -0.3
    shoulder.add(elbow)
    this.#mesh(`Special.Forearm.${label}`, 'cylinder', this.materials.skin, elbow, {
      position: [0, -0.145, 0],
      scale: [0.13 * bulk, 0.29, 0.13 * bulk],
    })
    this.#mesh(`Special.Hand.${label}`, 'sphere', this.materials.skin, elbow, {
      position: [0, -0.31, 0],
      scale: [0.11 * bulk, 0.118 * bulk, 0.105 * bulk],
    })

    const handAnchor = new THREE.Group()
    handAnchor.name = `Special.HandAnchor.${label}`
    handAnchor.position.set(0, -0.31, 0.02)
    elbow.add(handAnchor)
    if (side < 0) {
      this.leftElbow = elbow
      this.leftHandAnchor = handAnchor
    } else {
      this.rightElbow = elbow
      this.rightHandAnchor = handAnchor
    }
    return shoulder
  }

  #buildLeg(label, side, width, bulk, longPants) {
    const hip = new THREE.Group()
    hip.name = `Special.Hip.${label}`
    hip.position.set(side * 0.15 * Math.max(0.9, width), 0.7, 0)
    this.body.add(hip)
    const legMaterial = longPants ? this.materials.black : this.materials.skin
    this.#mesh(`Special.Thigh.${label}`, 'cylinder', legMaterial, hip, {
      position: [0, -0.16, 0],
      scale: [0.19 * bulk, 0.32, 0.2 * bulk],
    })

    const knee = new THREE.Group()
    knee.name = `Special.Knee.${label}`
    knee.position.y = -0.32
    hip.add(knee)
    this.#mesh(`Special.Shin.${label}`, 'cylinder', legMaterial, knee, {
      position: [0, -0.15, 0],
      scale: [0.165 * bulk, 0.3, 0.175 * bulk],
    })

    const shoe = new THREE.Group()
    shoe.name = `Special.Shoe.${label}`
    shoe.position.set(0, -0.32, 0.055)
    knee.add(shoe)
    const shoeMaterial = longPants ? this.materials.white : this.materials.charcoal
    this.#mesh(`Special.ShoeBase.${label}`, 'box', shoeMaterial, shoe, {
      scale: [0.2 * bulk, 0.11, 0.34],
    })
    if (longPants) {
      this.#mesh(`Special.ShoeSole.${label}`, 'box', this.materials.orange, shoe, {
        position: [0, -0.07, 0.015],
        scale: [0.215 * bulk, 0.045, 0.37],
      })
      this.#mesh(`Special.ShoeCuff.${label}`, 'box', this.materials.black, shoe, {
        position: [0, 0.105, -0.045],
        scale: [0.205 * bulk, 0.18, 0.24],
      })
      this.#mesh(`Special.ShoePanel.${label}`, 'box', this.materials.red, shoe, {
        position: [side * 0.11, 0.015, 0.11],
        scale: [0.02, 0.08, 0.16],
      })
    }

    if (side < 0) this.leftKnee = knee
    else this.rightKnee = knee
    return hip
  }

  #buildGymmerDetails() {
    for (const side of [-1, 1]) {
      this.#mesh(
        `Special.Gym.Chest.${side < 0 ? 'L' : 'R'}`,
        'sphere',
        this.materials.skinShade,
        this.body,
        {
          position: [side * 0.19, 1.19, 0.2],
          scale: [0.25, 0.17, 0.12],
        },
      )
    }
    const rows = [1.055, 0.93, 0.805]
    let index = 1
    for (const y of rows) {
      for (const side of [-1, 1]) {
        this.#mesh(`Special.Gym.Abs.${index}`, 'sphere', this.materials.skinShade, this.body, {
          position: [side * 0.105, y, 0.205],
          scale: [0.115, 0.075, 0.055],
        })
        index += 1
      }
    }
    for (const side of [-1, 1]) {
      this.#mesh(
        `Special.Outfit.Shorts.${side < 0 ? 'L' : 'R'}`,
        'box',
        this.materials.black,
        this.body,
        {
          position: [side * 0.17, 0.63, 0],
          scale: [0.33, 0.26, 0.35],
        },
      )
    }
  }

  #buildBasketballDetails() {
    const backpack = new THREE.Group()
    backpack.name = 'Special.Accessory.Backpack.Elite'
    backpack.position.set(0, 1.03, -0.25)
    this.body.add(backpack)
    this.#mesh('Special.Accessory.Backpack.Body', 'box', this.materials.backpack, backpack, {
      position: [0, 0, -0.08],
      scale: [0.43, 0.55, 0.24],
    })
    this.#mesh('Special.Accessory.Backpack.Flap', 'box', this.materials.charcoal, backpack, {
      position: [0, 0.2, 0.055],
      scale: [0.4, 0.15, 0.04],
    })
    this.#mesh('Special.Accessory.Backpack.EliteBadge', 'box', this.materials.red, backpack, {
      position: [0, 0.05, -0.205],
      scale: [0.22, 0.13, 0.025],
    })
    for (const side of [-1, 1]) {
      this.#mesh(
        `Special.Accessory.Backpack.Strap.${side < 0 ? 'L' : 'R'}`,
        'box',
        this.materials.backpack,
        this.body,
        {
          position: [side * 0.2, 1.1, 0.19],
          scale: [0.07, 0.48, 0.045],
          rotation: [0, 0, side * -0.09],
        },
      )
    }

    this.ball = new THREE.Group()
    this.ball.name = 'Special.Accessory.Ball'
    this.ball.position.set(0.39, 0.88, 0.34)
    this.body.add(this.ball)
    this.#mesh('Special.Accessory.Ball.Surface', 'sphere', this.materials.orange, this.ball, {
      scale: [0.23, 0.23, 0.23],
    })
    const seamRotations = [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]
    seamRotations.forEach((rotation, index) => {
      this.#mesh(`Special.Accessory.Ball.Seam.${index + 1}`, 'torus', this.materials.black, this.ball, {
        scale: [0.465, 0.465, 0.465],
        rotation,
        castShadow: false,
      })
    })
  }

  #applyProfilePose() {
    this.leftArm.rotation.set(0, 0, -0.06)
    this.rightArm.rotation.set(0, 0, 0.06)
    this.leftElbow.rotation.set(0, 0, 0)
    this.rightElbow.rotation.set(0, 0, 0)

    if (this.profile.id === 'gymmer') {
      this.leftArm.rotation.z = -1.9
      this.rightArm.rotation.z = 1.9
      this.leftElbow.rotation.z = -1.55
      this.rightElbow.rotation.z = 1.55
    } else if (this.profile.id === 'basketball') {
      this.leftArm.rotation.set(-0.12, 0, -0.05)
      this.leftElbow.rotation.set(-0.18, 0, 0.08)
      this.rightArm.rotation.set(-0.62, 0, 0.16)
      this.rightElbow.rotation.set(-0.78, 0, -0.52)
    }
  }

  update(deltaTime, context = null) {
    if (!this.ready || this.disabled || !this.active || this.dialogueActive) return
    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    this.elapsed += delta
    const playerPosition = context?.isVector3 ? context : context?.playerPosition
    let playerDistanceSquared = Infinity
    if (playerPosition) {
      const dx = playerPosition.x - this.position.x
      const dz = playerPosition.z - this.position.z
      playerDistanceSquared = dx * dx + dz * dz
      if (
        !this.activityController.isControllingPose
        && !this.debugLookFrozen
        && playerDistanceSquared < 16
      ) {
        const targetYaw = Math.atan2(dx, dz)
        const yawDelta = Math.atan2(
          Math.sin(targetYaw - this.group.rotation.y),
          Math.cos(targetYaw - this.group.rotation.y),
        )
        this.group.rotation.y += yawDelta * (1 - Math.exp(-2.8 * delta))
      }
    }

    this.activityController.update(
      delta,
      !playerPosition || playerDistanceSquared <= 144,
    )
    if (!this.activityController.isControllingPose) {
      const breath = Math.sin(this.elapsed * 1.35) * 0.004
      this.visual.scale.set(
        this.bodyScale * (1 + breath * 0.35),
        this.bodyScale * (1 + breath),
        this.bodyScale * (1 + breath * 0.35),
      )
      this.#updateWalkingPose(delta)
    }
    this.#syncCollider()
  }

  #updateWalkingPose(delta) {
    if (!this.walking) return
    const blend = 1 - Math.exp(-10 * delta)
    const stride = this.walking ? Math.sin(this.elapsed * 6.4) * 0.34 : 0
    const armSwing = this.walking ? Math.sin(this.elapsed * 6.4) * 0.2 : 0
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(
      this.leftLeg.rotation.x,
      this.basePose.leftLeg.x + stride,
      blend,
    )
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(
      this.rightLeg.rotation.x,
      this.basePose.rightLeg.x - stride,
      blend,
    )
    this.leftArm.rotation.x = THREE.MathUtils.lerp(
      this.leftArm.rotation.x,
      this.basePose.leftArm.x - armSwing,
      blend,
    )
    this.rightArm.rotation.x = THREE.MathUtils.lerp(
      this.rightArm.rotation.x,
      this.basePose.rightArm.x + armSwing,
      blend,
    )
  }

  setActive(active) {
    this.active = Boolean(active)
    this.#refreshState()
  }

  setShadowDetail(detailed) {
    const enabled = this.castShadow && Boolean(detailed)
    for (const mesh of this.shadowMeshes) mesh.castShadow = enabled
  }

  activate() {
    this.setActive(true)
  }

  deactivate() {
    this.setActive(false)
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled)
    this.#refreshState()
  }

  setPosition(x, y, z) {
    if (x?.isVector3) this.position.copy(x)
    else this.position.set(x, y, z)
    this.#syncCollider()
  }

  setOutfit(outfitId) {
    this.currentOutfit = outfitId
    return true
  }

  setWalking(walking) {
    this.walking = Boolean(walking)
  }

  setDebugLookFrozen(frozen) {
    this.debugLookFrozen = Boolean(frozen)
  }

  getInteraction() {
    const hasDialogue = this.dialogueLines === null || (
      Array.isArray(this.dialogueLines) && this.dialogueLines.length > 0
    )
    if (
      !hasDialogue ||
      !this.ready ||
      this.disabled ||
      !this.active ||
      this.dialogueActive
    ) return null
    return this.interaction
  }

  getFocusPoint(target = new THREE.Vector3()) {
    return target.set(
      this.position.x,
      this.position.y + this.profile.height * this.profile.focusRatio,
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

  playActivity(activity, options = {}) {
    return this.activityController.playActivity(activity, options)
  }

  queueActivity(activity, options = {}) {
    return this.activityController.queueActivity(activity, options)
  }

  stopActivity(options = {}) {
    return this.activityController.stopActivity(options)
  }

  attachProp(type, options = {}) {
    return this.activityController.attachProp(type, options)
  }

  detachProp(idOrType) {
    return this.activityController.detachProp(idOrType)
  }

  transferProp(idOrType, recipient, options = {}) {
    return this.activityController.transferProp(idOrType, recipient, options)
  }

  getActivityState() {
    return this.activityController.getState()
  }

  resetMomentState() {
    this.activityController.stopActivity({
      clearQueue: true,
      detachProps: true,
      transitionDuration: 0,
    })
    this.walking = false
    this.#applyProfilePose()
    this.activityController.captureDefaultPose()
    return true
  }

  releaseMomentLock() {
    return this.resetMomentState()
  }

  faceToward(target, deltaTime, speed = 3.5) {
    if (!target) return
    const targetYaw = Math.atan2(
      target.x - this.position.x,
      target.z - this.position.z,
    )
    this.faceYaw(targetYaw, deltaTime, speed)
  }

  faceYaw(yaw, deltaTime, speed = 3.5) {
    if (!Number.isFinite(yaw)) return
    const yawDelta = Math.atan2(
      Math.sin(yaw - this.group.rotation.y),
      Math.cos(yaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-speed * deltaTime))
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

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.ready = false
    this.disabled = true
    this.activityController.dispose()
    if (this.colliders) {
      const index = this.colliders.indexOf(this.collider)
      if (index >= 0) this.colliders.splice(index, 1)
    }
    this.ownedGeometries.forEach((geometry) => geometry.dispose())
    this.ownedMaterials.forEach((material) => material.dispose())
    this.ownedGeometries.clear()
    this.ownedMaterials.clear()
    this.group.removeFromParent()
  }
}
