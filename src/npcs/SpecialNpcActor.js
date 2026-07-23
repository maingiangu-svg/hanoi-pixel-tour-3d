import * as THREE from 'three'
import { getSpecialNpcProfile } from './specialNpcProfiles.js'
import { createLowPolyHead } from './SpecialNpcHead.js'
import { getSharedSpecialNpcResources } from './SpecialNpcResources.js'

const PARKED_COLLIDER_POSITION = 1000000
const EMPTY_DIALOGUE = Object.freeze([])
const TEMP_LOCAL_TARGET = new THREE.Vector3()

function readPosition(position) {
  if (Array.isArray(position)) {
    return { x: position[0] ?? 0, y: position[1] ?? 0, z: position[2] ?? 0 }
  }
  return { x: position?.x ?? 0, y: position?.y ?? 0, z: position?.z ?? 0 }
}

function easeInOut(value) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function celebrationAmount(elapsed, celebration) {
  if (!celebration?.enabled) return 0
  const cycleLength = celebration.cycleLength ?? 9
  const raiseStart = celebration.raiseStart ?? 5.4
  const holdStart = celebration.holdStart ?? 6
  const lowerStart = celebration.lowerStart ?? 6.9
  const end = celebration.end ?? 7.6
  const cycle = elapsed % cycleLength
  if (cycle < raiseStart || cycle > end) return 0
  if (cycle < holdStart) {
    return easeInOut((cycle - raiseStart) / Math.max(0.001, holdStart - raiseStart))
  }
  if (cycle < lowerStart) return 1
  return 1 - easeInOut((cycle - lowerStart) / Math.max(0.001, end - lowerStart))
}

export class SpecialNpcActor {
  constructor({
    parent = null,
    resources = getSharedSpecialNpcResources(),
    profile = 'gymmer',
    name = null,
    position = [0, 0, 0],
    rotationY = 0,
    colliders = null,
    active = true,
    faceLoader = null,
    faceMode = null,
    dialogueLines = EMPTY_DIALOGUE,
    dialogueName = null,
    dialoguePortrait = false,
    interactionRadius = 2.35,
    interactionLabel = null,
    hideDuringDialogue = true,
    castShadow = true,
    animationOffset = 0,
  } = {}) {
    this.resources = resources
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
    this.outfitPresets = this.#createOutfitPresets()
    this.outfitMaterialSets = this.#createOutfitMaterialSets()
    this.outfitMeshes = new Map()
    this.activeOutfit = this.outfitPresets[this.currentOutfit]
    this.faceMode = faceMode ?? (faceLoader ? 'wrappedTexture' : this.profile.face.mode)

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

    this.body = new THREE.Group()
    this.body.name = 'Special.Body'
    this.visual.add(this.body)
    this.#buildBody()
    this.#applyBasePose()
    this.#normalizeVisualHeight()

    this.contactShadow = this.#mesh({
      name: 'Special.ContactShadow',
      geometry: 'contactShadow',
      color: 0x101311,
      parent: this.group,
      position: [0, 0.008, 0],
      scale: [this.colliderRadius * 2.5, this.colliderDepth * 2.5, 1],
      rotation: [-Math.PI / 2, 0, 0],
      castShadow: false,
      materialOptions: {
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        roughness: 1,
      },
    })

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
    this.readyPromise = this.#initializeFace(faceLoader)
  }

  async #initializeFace(faceLoader) {
    let texture = null
    if (this.faceMode === 'wrappedTexture' && faceLoader) {
      try {
        texture = await faceLoader(this.profile.id)
      } catch {
        texture = null
      }
    }
    if (this.disposed) return false
    const wrapped = texture ? this.headVisual.setFaceTexture(texture) : false
    if (!wrapped) this.headVisual.setFaceTexture(null)
    this.ready = true
    this.#refreshState()
    return wrapped
  }

  #material(color, options = {}) {
    return this.resources.getMaterial(color, options)
  }

  #mesh({
    name,
    geometry = 'box',
    color,
    material = null,
    parent,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    castShadow = false,
    materialOptions = {},
    outfitSlot = null,
  }) {
    const mesh = new THREE.Mesh(
      this.resources.getGeometry(geometry),
      material ?? this.#material(color, materialOptions),
    )
    mesh.name = name
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.rotation.set(...rotation)
    mesh.castShadow = castShadow
    mesh.receiveShadow = false
    parent.add(mesh)
    if (outfitSlot) {
      if (!this.outfitMeshes.has(outfitSlot)) this.outfitMeshes.set(outfitSlot, [])
      this.outfitMeshes.get(outfitSlot).push(mesh)
    }
    return mesh
  }

  #createOutfitPresets() {
    const presets = {
      [this.profile.defaultOutfit]: this.profile.outfit,
      ...(this.profile.outfitVariants ?? {}),
    }
    for (const alias of this.profile.outfit.aliases ?? []) {
      if (!presets[alias]) presets[alias] = this.profile.outfit
    }
    return Object.freeze(presets)
  }

  #createOutfitMaterialSets() {
    const materialSets = new Map()
    for (const [outfitId, outfit] of Object.entries(this.outfitPresets)) {
      const top = outfit.top
      const bottom = outfit.bottom
      const shoes = outfit.shoes
      materialSets.set(outfitId, Object.freeze({
        top: this.#material(top.color),
        topShade: this.#material(top.shadeColor ?? top.color),
        topStrap: this.#material(top.strapColor ?? top.color),
        topLayer: this.#material(top.layers?.[1]?.color ?? top.color),
        bottom: this.#material(bottom.color),
        bottomShade: this.#material(bottom.shadeColor ?? bottom.color),
        shoes: this.#material(shoes.color),
        shoeSole: this.#material(shoes.soleColor ?? shoes.color),
        shoePanel: this.#material(shoes.panelColor ?? shoes.color),
        shoeAccent: this.#material(shoes.accentColor ?? shoes.panelColor ?? shoes.color),
      }))
    }
    return materialSets
  }

  #outfitMaterial(slot) {
    return this.outfitMaterialSets.get(this.currentOutfit)?.[slot]
  }

  #buildBody() {
    const { proportions, head } = this.profile
    const outfit = this.activeOutfit
    const sleeveless = outfit.top.sleeveless ?? outfit.top.style === 'camisole'
    const bareLegs = outfit.bottom.bareLegs ?? outfit.bottom.length === 'short'
    const skinColor = head.skinColor

    this.torso = this.#mesh({
      name: 'Special.Torso',
      geometry: 'tapered',
      material: this.#outfitMaterial('top'),
      parent: this.body,
      position: [0, 1.04, 0],
      scale: [
        0.52 * proportions.torsoWidth * proportions.bodyWidth,
        0.62,
        0.32 * proportions.torsoDepth,
      ],
      castShadow: this.castShadow,
      outfitSlot: 'top',
    })
    this.hips = this.#mesh({
      name: 'Special.Hips',
      material: this.#outfitMaterial('bottom'),
      parent: this.body,
      position: [0, 0.71, 0],
      scale: [0.39 * proportions.hipWidth, 0.18, 0.27],
      outfitSlot: 'bottom',
    })
    this.neck = this.#mesh({
      name: 'Special.Neck',
      geometry: 'cylinder',
      color: skinColor,
      parent: this.body,
      position: head.neck.position,
      scale: head.neck.scale,
    })

    this.headVisual = createLowPolyHead({
      profile: this.profile,
      resources: this.resources,
      parent: this.body,
      castShadow: this.castShadow,
    })
    this.headRoot = this.headVisual.headRoot
    this.headRig = this.headRoot
    this.headMesh = this.headVisual.headMesh
    this.faceDetails = this.headVisual.faceDetails
    this.hairGroup = this.headVisual.hairGroup
    this.glassesGroup = this.headVisual.glassesGroup

    const shoulderHalf = 0.265 * Math.max(1, proportions.shoulderWidth)
    this.leftArm = this.#buildArm('L', -1, shoulderHalf, sleeveless)
    this.rightArm = this.#buildArm('R', 1, shoulderHalf, sleeveless)
    this.leftLeg = this.#buildLeg('L', -1, bareLegs)
    this.rightLeg = this.#buildLeg('R', 1, bareLegs)

    this.#buildOutfitDetails()
    this.#buildAccessories()
  }

  #buildArm(label, side, shoulderHalf, sleeveless) {
    const { proportions, head } = this.profile
    const upperLength = 0.28 * proportions.armLength
    const lowerLength = 0.27 * proportions.armLength
    const shoulder = new THREE.Group()
    shoulder.name = `Special.Shoulder.${label}`
    shoulder.position.set(side * shoulderHalf, 1.25, 0)
    this.body.add(shoulder)

    this.#mesh({
      name: `Special.UpperArm.${label}`,
      geometry: 'cylinder',
      material: sleeveless
        ? this.#material(head.skinColor)
        : this.#outfitMaterial('top'),
      parent: shoulder,
      position: [0, -upperLength * 0.5, 0],
      scale: [0.145 * proportions.limbBulk, upperLength, 0.145 * proportions.limbBulk],
      outfitSlot: sleeveless ? null : 'top',
    })

    const elbow = new THREE.Group()
    elbow.name = `Special.Elbow.${label}`
    elbow.position.y = -upperLength
    shoulder.add(elbow)
    this.#mesh({
      name: `Special.Forearm.${label}`,
      geometry: 'cylinder',
      color: head.skinColor,
      parent: elbow,
      position: [0, -lowerLength * 0.5, 0],
      scale: [0.125 * proportions.limbBulk, lowerLength, 0.125 * proportions.limbBulk],
    })

    const handAnchor = new THREE.Group()
    handAnchor.name = `Special.HandAnchor.${label}`
    handAnchor.position.y = -lowerLength
    elbow.add(handAnchor)
    this.#mesh({
      name: `Special.Hand.${label}`,
      geometry: 'sphereLow',
      color: head.skinColor,
      parent: handAnchor,
      scale: [
        0.145 * proportions.handScale,
        0.155 * proportions.handScale,
        0.135 * proportions.handScale,
      ],
    })

    if (side < 0) {
      this.leftElbow = elbow
      this.leftHandAnchor = handAnchor
    } else {
      this.rightElbow = elbow
      this.rightHandAnchor = handAnchor
    }
    return shoulder
  }

  #buildLeg(label, side, bareLeg) {
    const { proportions, head } = this.profile
    const outfit = this.activeOutfit
    const upperLength = 0.32 * proportions.legLength
    const lowerLength = 0.3 * proportions.legLength
    const hip = new THREE.Group()
    hip.name = `Special.Hip.${label}`
    hip.position.set(side * 0.145 * proportions.hipWidth, 0.7, 0)
    this.body.add(hip)

    this.#mesh({
      name: `Special.Thigh.${label}`,
      geometry: 'cylinder',
      material: bareLeg
        ? this.#material(head.skinColor)
        : this.#outfitMaterial('bottom'),
      parent: hip,
      position: [0, -upperLength * 0.5, 0],
      scale: [0.185 * proportions.limbBulk, upperLength, 0.19 * proportions.limbBulk],
      outfitSlot: bareLeg ? null : 'bottom',
    })
    const knee = new THREE.Group()
    knee.name = `Special.Knee.${label}`
    knee.position.y = -upperLength
    hip.add(knee)
    this.#mesh({
      name: `Special.Shin.${label}`,
      geometry: 'cylinder',
      material: bareLeg
        ? this.#material(head.skinColor)
        : this.#outfitMaterial('bottom'),
      parent: knee,
      position: [0, -lowerLength * 0.5, 0],
      scale: [0.16 * proportions.limbBulk, lowerLength, 0.17 * proportions.limbBulk],
      outfitSlot: bareLeg ? null : 'bottom',
    })

    const shoe = new THREE.Group()
    shoe.name = `Special.Shoe.${label}`
    shoe.position.set(0, -lowerLength - 0.02, 0.055)
    knee.add(shoe)
    const footScale = proportions.footScale
    this.#mesh({
      name: `Special.ShoeBase.${label}`,
      material: this.#outfitMaterial('shoes'),
      parent: shoe,
      scale: [0.19 * footScale[0], 0.09 * footScale[1], 0.31 * footScale[2]],
      outfitSlot: 'shoes',
    })
    this.#mesh({
      name: `Special.ShoeSole.${label}`,
      material: this.#outfitMaterial('shoeSole'),
      parent: shoe,
      position: [0, -0.055, 0.012],
      scale: [0.2 * footScale[0], 0.035, 0.33 * footScale[2]],
      outfitSlot: 'shoeSole',
    })
    if (outfit.shoes.style === 'basketballHighTop') {
      this.#mesh({
        name: `Special.ShoeCuff.${label}`,
        material: this.#outfitMaterial('shoePanel'),
        parent: shoe,
        position: [0, 0.095, -0.04],
        scale: [0.19 * footScale[0], 0.16, 0.22],
        outfitSlot: 'shoePanel',
      })
      this.#mesh({
        name: `Special.ShoePanel.${label}`,
        material: this.#outfitMaterial('shoeAccent'),
        parent: shoe,
        position: [side * 0.095, 0.015, 0.1],
        scale: [0.018, 0.075, 0.15],
        outfitSlot: 'shoeAccent',
      })
    }

    if (side < 0) {
      this.leftKnee = knee
      this.leftShoe = shoe
    } else {
      this.rightKnee = knee
      this.rightShoe = shoe
    }
    return hip
  }

  #buildOutfitDetails() {
    const { proportions } = this.profile
    const outfit = this.activeOutfit
    if (outfit.top.style === 'shortSleeveShirt') {
      this.#mesh({
        name: 'Special.Outfit.Collar.L',
        material: this.#outfitMaterial('topShade'),
        parent: this.body,
        position: [-0.085, 1.29, 0.26],
        scale: [0.16, 0.055, 0.025],
        rotation: [0, 0, -0.32],
        outfitSlot: 'topShade',
      })
      this.#mesh({
        name: 'Special.Outfit.Collar.R',
        material: this.#outfitMaterial('topShade'),
        parent: this.body,
        position: [0.085, 1.29, 0.26],
        scale: [0.16, 0.055, 0.025],
        rotation: [0, 0, 0.32],
        outfitSlot: 'topShade',
      })
    }

    if (outfit.top.style === 'layeredAthletic') {
      for (const side of [-1, 1]) {
        this.#mesh({
          name: `Special.Outfit.Layer.${side < 0 ? 'L' : 'R'}`,
          material: this.#outfitMaterial('topLayer'),
          parent: this.body,
          position: [side * 0.135, 1.04, 0.29],
          scale: [0.23, 0.54, 0.028],
          rotation: [0, 0, side * -0.04],
          outfitSlot: 'topLayer',
        })
      }
    }

    if (outfit.top.style === 'camisole') {
      this.#mesh({
        name: 'Special.Outfit.Top',
        geometry: 'tapered',
        material: this.#outfitMaterial('top'),
        parent: this.body,
        position: [0, 1.05, 0.018],
        scale: [0.43 * proportions.torsoWidth, 0.38, 0.29],
        outfitSlot: 'top',
      })
      for (const side of [-1, 1]) {
        this.#mesh({
          name: `Special.Outfit.Strap.${side < 0 ? 'L' : 'R'}`,
          material: this.#outfitMaterial('topStrap'),
          parent: this.body,
          position: [side * 0.155, 1.29, 0.155],
          scale: [outfit.top.strapWidth, 0.26, 0.04],
          rotation: [0, 0, side * -0.055],
          outfitSlot: 'topStrap',
        })
      }
    }

    if (outfit.bottom.style === 'shorts') {
      for (const side of [-1, 1]) {
        this.#mesh({
          name: `Special.Outfit.Shorts.${side < 0 ? 'L' : 'R'}`,
          material: this.#outfitMaterial('bottom'),
          parent: this.body,
          position: [side * 0.142, 0.625, 0],
          scale: [0.265, 0.235, 0.285],
          outfitSlot: 'bottom',
        })
      }
    }
  }

  #buildAccessories() {
    const { backpack, ball } = this.profile.accessories ?? {}
    if (backpack?.enabled) this.#buildBackpack(backpack)
    if (ball?.enabled) this.#buildHeldBall(ball)
  }

  #buildBackpack(backpack) {
    this.backpack = new THREE.Group()
    this.backpack.name = 'Special.Accessory.Backpack.Elite'
    this.backpack.position.set(...backpack.position)
    this.body.add(this.backpack)
    this.#mesh({
      name: 'Special.Accessory.Backpack.Body',
      color: backpack.color,
      parent: this.backpack,
      position: [0, 0, -0.07],
      scale: backpack.scale,
      castShadow: this.castShadow,
    })
    this.#mesh({
      name: 'Special.Accessory.Backpack.Flap',
      color: backpack.trimColor,
      parent: this.backpack,
      position: [0, 0.19, 0.055],
      scale: [0.4, 0.14, 0.035],
    })
    this.#mesh({
      name: 'Special.Accessory.Backpack.EliteBadge',
      color: backpack.badgeColor,
      parent: this.backpack,
      position: [0, 0.04, -0.205],
      scale: [0.21, 0.13, 0.022],
    })
    for (const side of [-1, 1]) {
      this.#mesh({
        name: `Special.Accessory.Backpack.Strap.${side < 0 ? 'L' : 'R'}`,
        color: backpack.strapColor,
        parent: this.body,
        position: [side * 0.19, 1.1, 0.325],
        scale: [0.06, 0.46, 0.025],
        rotation: [0, 0, side * -0.08],
      })
    }
  }

  #buildHeldBall(ball) {
    const handAnchor = ball.heldBy === 'leftHand'
      ? this.leftHandAnchor
      : this.rightHandAnchor
    this.ball = new THREE.Group()
    this.ball.name = 'Special.Accessory.Ball'
    this.ball.position.set(...ball.handOffset)
    handAnchor.add(this.ball)
    this.#mesh({
      name: 'Special.Accessory.Ball.Surface',
      geometry: ball.geometry ?? 'sphere',
      color: ball.color,
      parent: this.ball,
      scale: [ball.radius, ball.radius, ball.radius],
      castShadow: this.castShadow,
    })
    const seamRotations = [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]
    seamRotations.slice(0, ball.seamCount ?? seamRotations.length).forEach((rotation, index) => {
      this.#mesh({
        name: `Special.Accessory.Ball.Seam.${index + 1}`,
        geometry: 'torus',
        color: ball.seamColor,
        parent: this.ball,
        scale: [ball.radius, ball.radius, ball.radius],
        rotation,
      })
    })
  }

  #normalizeVisualHeight() {
    this.visual.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(this.visual)
    const unscaledHeight = Math.max(0.001, bounds.max.y - bounds.min.y)
    this.visual.position.y -= bounds.min.y
    this.bodyScale = this.profile.height / unscaledHeight
    this.visual.scale.setScalar(this.bodyScale)
  }

  #applyBasePose() {
    this.leftArm.rotation.set(0, 0, -0.075)
    this.rightArm.rotation.set(0, 0, 0.075)
    this.leftElbow.rotation.set(-0.12, 0, 0.08)
    this.rightElbow.rotation.set(-0.14, 0, -0.08)
    this.leftLeg.rotation.set(0, 0, 0.02)
    this.rightLeg.rotation.set(0, 0, -0.02)
    this.leftKnee.rotation.set(0, 0, 0)
    this.rightKnee.rotation.set(0, 0, 0)

    const armPose = this.profile.animation.armPose
    if (armPose) {
      this.leftArm.rotation.set(...armPose.leftShoulder)
      this.rightArm.rotation.set(...armPose.rightShoulder)
      this.leftElbow.rotation.set(...armPose.leftElbow)
      this.rightElbow.rotation.set(...armPose.rightElbow)
    }
    this.basePose = {
      leftArm: this.leftArm.rotation.clone(),
      rightArm: this.rightArm.rotation.clone(),
      leftElbow: this.leftElbow.rotation.clone(),
      rightElbow: this.rightElbow.rotation.clone(),
      leftLeg: this.leftLeg.rotation.clone(),
      rightLeg: this.rightLeg.rotation.clone(),
      leftKnee: this.leftKnee.rotation.clone(),
      rightKnee: this.rightKnee.rotation.clone(),
      leftShoePosition: this.leftShoe.position.clone(),
      rightShoePosition: this.rightShoe.position.clone(),
    }
  }

  update(deltaTime, context = null) {
    if (!this.ready || this.disabled || !this.active || this.dialogueActive) return
    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    this.elapsed += delta
    const playerPosition = context?.isVector3 ? context : context?.playerPosition
    this.#animateHead(delta, playerPosition)
    this.#animateBody()
    this.#syncCollider()
  }

  #animateHead(delta, playerPosition) {
    let targetYaw = 0
    if (playerPosition && !this.debugLookFrozen) {
      TEMP_LOCAL_TARGET.copy(playerPosition)
      this.body.worldToLocal(TEMP_LOCAL_TARGET)
      const distanceSquared = TEMP_LOCAL_TARGET.x ** 2 + TEMP_LOCAL_TARGET.z ** 2
      const radius = this.profile.animation.lookAt.radius
      if (distanceSquared <= radius * radius) {
        targetYaw = THREE.MathUtils.clamp(
          Math.atan2(TEMP_LOCAL_TARGET.x, TEMP_LOCAL_TARGET.z),
          -this.profile.animation.lookAt.maxYaw,
          this.profile.animation.lookAt.maxYaw,
        )
      }
    }
    this.headRoot.rotation.y += (
      targetYaw - this.headRoot.rotation.y
    ) * (1 - Math.exp(-this.profile.animation.lookAt.turnSpeed * delta))
    this.headRoot.rotation.z = Math.sin(this.elapsed * 0.63) * 0.012
  }

  #animateBody() {
    const breathing = this.profile.animation.breathing
    const breath = Math.sin(this.elapsed * breathing.speed) * breathing.amplitude
    this.visual.scale.set(
      this.bodyScale * (1 + breath * 0.3),
      this.bodyScale * (1 + breath),
      this.bodyScale * (1 + breath * 0.3),
    )

    const celebration = this.profile.animation.celebration
    if (celebration?.enabled) {
      const celebrate = celebrationAmount(this.elapsed, celebration)
      this.leftArm.rotation.z = THREE.MathUtils.lerp(
        this.basePose.leftArm.z,
        celebration.leftShoulderZ ?? -1.45,
        celebrate,
      )
      this.rightArm.rotation.z = THREE.MathUtils.lerp(
        this.basePose.rightArm.z,
        celebration.rightShoulderZ ?? 1.45,
        celebrate,
      )
      this.leftElbow.rotation.z = THREE.MathUtils.lerp(
        this.basePose.leftElbow.z,
        celebration.leftElbowZ ?? -1.05,
        celebrate,
      )
      this.rightElbow.rotation.z = THREE.MathUtils.lerp(
        this.basePose.rightElbow.z,
        celebration.rightElbowZ ?? 1.05,
        celebrate,
      )
    }

    const walk = this.profile.animation.walk
    if (this.walking && walk.enabled) {
      const cycle = Math.sin(this.elapsed * walk.strideSpeed)
      const stride = cycle * walk.stride
      const leftLiftAmount = Math.max(0, -cycle)
      const rightLiftAmount = Math.max(0, cycle)
      const footLift = walk.footLift ?? 0
      const kneeBend = walk.kneeBend ?? 0.28
      this.leftLeg.rotation.x = stride
      this.rightLeg.rotation.x = -stride
      this.leftKnee.rotation.x = this.basePose.leftKnee.x + leftLiftAmount * kneeBend
      this.rightKnee.rotation.x = this.basePose.rightKnee.x + rightLiftAmount * kneeBend
      this.leftShoe.position.y = this.basePose.leftShoePosition.y + leftLiftAmount * footLift
      this.rightShoe.position.y = this.basePose.rightShoePosition.y + rightLiftAmount * footLift
      this.leftArm.rotation.x = this.basePose.leftArm.x - stride * walk.armSwing
      this.rightArm.rotation.x = this.basePose.rightArm.x + stride * walk.armSwing
      return
    }
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(
      this.leftLeg.rotation.x,
      this.basePose.leftLeg.x,
      0.18,
    )
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(
      this.rightLeg.rotation.x,
      this.basePose.rightLeg.x,
      0.18,
    )
    this.leftKnee.rotation.x = THREE.MathUtils.lerp(
      this.leftKnee.rotation.x,
      this.basePose.leftKnee.x,
      0.18,
    )
    this.rightKnee.rotation.x = THREE.MathUtils.lerp(
      this.rightKnee.rotation.x,
      this.basePose.rightKnee.x,
      0.18,
    )
    this.leftShoe.position.y = THREE.MathUtils.lerp(
      this.leftShoe.position.y,
      this.basePose.leftShoePosition.y,
      0.18,
    )
    this.rightShoe.position.y = THREE.MathUtils.lerp(
      this.rightShoe.position.y,
      this.basePose.rightShoePosition.y,
      0.18,
    )
    this.leftArm.rotation.x = this.basePose.leftArm.x + Math.sin(this.elapsed * 0.8) * 0.012
    this.rightArm.rotation.x = this.basePose.rightArm.x - Math.sin(this.elapsed * 0.8) * 0.012
  }

  setWalking(walking) {
    this.walking = Boolean(walking)
  }

  setDebugLookFrozen(frozen) {
    this.debugLookFrozen = Boolean(frozen)
    if (this.debugLookFrozen) this.headRoot.rotation.y = 0
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
    this.disabled = Boolean(disabled)
    this.#refreshState()
  }

  setPosition(x, y, z) {
    if (x?.isVector3) this.position.copy(x)
    else this.position.set(x, y, z)
    this.#syncCollider()
  }

  setOutfit(outfitId) {
    const materialSet = this.outfitMaterialSets.get(outfitId)
    const outfit = this.outfitPresets[outfitId]
    if (!materialSet || !outfit) return false
    for (const [slot, meshes] of this.outfitMeshes) {
      const material = materialSet[slot]
      if (!material) continue
      for (const mesh of meshes) mesh.material = material
    }
    this.currentOutfit = outfitId
    this.activeOutfit = outfit
    return true
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
    if (this.colliders) {
      const index = this.colliders.indexOf(this.collider)
      if (index >= 0) this.colliders.splice(index, 1)
    }
    this.headVisual.dispose()
    this.group.removeFromParent()
  }
}
