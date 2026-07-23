import { NpcActor } from '../../npcs/NpcActor.js'

const ONE_LINE_DIALOGUE = (text) => Object.freeze([{ text }])

/**
 * A stationary shopkeeper built on the shared low-poly NPC rig.
 * The purchase API is deliberately inert in this phase, but gives a future
 * economy system one stable place to attach without changing interactions.
 */
export class ShopSeller extends NpcActor {
  constructor({
    profile,
    preset,
    shopId,
    position,
    rotationY,
    parent,
    animationOffset = 0,
  }) {
    super({
      parent,
      preset,
      name: preset.label,
      position,
      rotationY,
      behavior: 'standing',
      colliders: null,
      active: false,
      castShadow: false,
      dialogueLines: ONE_LINE_DIALOGUE(profile.dialogue),
      dialogueName: preset.label,
      dialoguePortrait: false,
      interactionRadius: 2.65,
      interactionLabel: 'Nói chuyện với người bán',
      hideDuringDialogue: false,
      animationOffset,
    })
    this.shopId = shopId
    this.shopProfile = profile
    this.poseStyle = preset.pose
    this.catalog = Object.freeze([])
    this.purchaseEnabled = false
  }

  update(deltaTime, context = null) {
    super.update(deltaTime, context)
    if (!this.ready || this.disabled || !this.active || this.dialogueActive) return

    const slowCycle = this.elapsed * 0.72
    const gesture = Math.max(0, Math.sin(slowCycle)) ** 5
    const wipe = Math.sin(this.elapsed * 1.8) * 0.16

    if (this.poseStyle === 'wipe') {
      this.rightArm.rotation.x = -0.48 - gesture * 0.34
      this.rightElbow.rotation.x = -0.42
      this.rightArm.rotation.z = 0.12 + wipe
    } else if (this.poseStyle === 'pour') {
      this.leftArm.rotation.x = -0.52 - gesture * 0.28
      this.rightArm.rotation.x = -0.38
      this.leftElbow.rotation.x = -0.54
      this.rightElbow.rotation.x = -0.36
    } else if (this.poseStyle === 'welcome') {
      this.rightArm.rotation.x = -gesture * 0.58
      this.rightArm.rotation.z = 0.08 + gesture * 0.2
      this.rightElbow.rotation.x = -gesture * 0.38
    } else {
      this.leftArm.rotation.x = -0.22 - gesture * 0.34
      this.rightArm.rotation.x = -0.2 - gesture * 0.28
      this.leftElbow.rotation.x = -0.32
      this.rightElbow.rotation.x = -0.28
    }

    this.headRig.rotation.y = Math.sin(this.elapsed * 0.37) * 0.045
  }

  getShopApi() {
    return Object.freeze({
      shopId: this.shopId,
      profileId: this.shopProfile.id,
      purchaseEnabled: this.purchaseEnabled,
      catalog: this.catalog,
    })
  }
}
