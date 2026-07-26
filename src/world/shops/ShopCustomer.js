import * as THREE from 'three'
import { NpcActor } from '../../npcs/NpcActor.js'
import { ShopAmbientBubble } from './ShopAmbientBubble.js'
import { SHOP_CUSTOMER_STATES } from './shopCustomerProfiles.js'

const MOVING_STATES = new Set(['entering', 'leaving'])
const SEATED_STATES = new Set(['sitting', 'eatingOrDrinking'])

function durationFor(seed, minimum, spread) {
  return minimum + ((seed * 7.13) % 1) * spread
}

export class ShopCustomer extends NpcActor {
  constructor({
    preset,
    parent,
    station,
    entry,
    rotationY,
    role,
    activity = 'meal',
    animationOffset = 0,
  }) {
    super({
      parent,
      preset,
      name: 'Khách của quán',
      position: entry,
      rotationY,
      behavior: 'standing',
      colliders: null,
      active: false,
      castShadow: false,
      dialogueLines: [],
      animationOffset,
    })
    this.station = station.clone()
    this.entry = entry.clone()
    this.stationRotationY = rotationY
    this.role = role
    this.activity = activity
    this.seed = animationOffset + 1
    this.state = 'entering'
    this.stateElapsed = 0
    this.stateDuration = 0
    this.completed = false
    this.activityProp = null
    this.bubble = new ShopAmbientBubble(this.group)
  }

  stage({ immediate = false } = {}) {
    this.completed = false
    this.setActive(true)
    if (immediate) {
      this.setPosition(this.station)
      this.#enterStationState()
      return
    }
    this.setPosition(this.entry)
    this.#setState('entering', Infinity)
  }

  beginLeaving() {
    if (!this.active || this.state === 'leaving') return
    this.#setState('leaving', Infinity)
    this.bubble.hide()
  }

  clear() {
    this.completed = false
    this.activityProp && (this.activityProp.visible = false)
    this.bubble.hide()
    this.setActive(false)
  }

  update(deltaTime, context = null) {
    if (!this.active) return
    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    super.update(delta, null)
    this.bubble.update(delta)

    if (MOVING_STATES.has(this.state)) {
      const target = this.state === 'entering' ? this.station : this.entry
      if (this.#moveToward(target, delta)) {
        if (this.state === 'entering') this.#enterStationState()
        else {
          this.completed = true
          this.activityProp && (this.activityProp.visible = false)
          this.bubble.hide()
          this.setActive(false)
        }
      }
    } else {
      this.group.rotation.y = this.stationRotationY
      this.stateElapsed += delta
      if (this.stateElapsed >= this.stateDuration) this.#advanceState()
    }

    if (!this.activityController.isControllingPose) this.#applyActivityPose()
  }

  say(text) {
    if (this.active) this.bubble.show(text)
  }

  setActivityProp(object) {
    this.activityProp = object
    this.#syncActivityProp()
  }

  dispose() {
    this.bubble.dispose()
    super.dispose()
  }

  #setState(state, duration) {
    if (!SHOP_CUSTOMER_STATES.includes(state)) {
      throw new RangeError(`Unknown shop customer state: ${state}`)
    }
    this.state = state
    this.stateElapsed = 0
    this.stateDuration = duration
    const seated = SEATED_STATES.has(state) && this.role === 'seat'
    this.setBehavior(seated ? 'seated' : 'standing')
    this.#syncActivityProp()
  }

  #enterStationState() {
    this.position.copy(this.station)
    this.group.rotation.y = this.stationRotationY
    if (this.role === 'seat') {
      this.#setState('sitting', durationFor(this.seed, 2.8, 2.4))
    } else {
      this.#setState('ordering', durationFor(this.seed, 4.5, 3.5))
    }
  }

  #advanceState() {
    if (this.state === 'ordering') {
      this.#setState('waiting', durationFor(this.seed + 0.3, 3.5, 3.8))
    } else if (this.state === 'waiting') {
      if (this.role === 'seat') {
        this.#setState('sitting', durationFor(this.seed + 0.7, 2.5, 2))
      } else {
        this.beginLeaving()
      }
    } else if (this.state === 'sitting') {
      this.#setState('eatingOrDrinking', durationFor(this.seed + 1.1, 13, 12))
    } else if (this.state === 'eatingOrDrinking') {
      this.beginLeaving()
    }
  }

  #moveToward(target, delta) {
    const offsetX = target.x - this.position.x
    const offsetZ = target.z - this.position.z
    const distance = Math.hypot(offsetX, offsetZ)
    if (distance <= 0.045) {
      this.position.x = target.x
      this.position.z = target.z
      return true
    }

    const targetYaw = Math.atan2(offsetX, offsetZ)
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - this.group.rotation.y),
      Math.cos(targetYaw - this.group.rotation.y),
    )
    this.group.rotation.y += yawDelta * (1 - Math.exp(-7 * delta))
    const step = Math.min(distance, 0.62 * delta)
    this.position.x += (offsetX / distance) * step
    this.position.z += (offsetZ / distance) * step
    return false
  }

  #syncActivityProp() {
    if (!this.activityProp) return
    this.activityProp.visible = (
      this.active
      && this.role === 'seat'
      && (this.state === 'sitting' || this.state === 'eatingOrDrinking')
    )
  }

  #applyActivityPose() {
    if (this.state === 'ordering') {
      this.rightArm.rotation.x = -0.58 + Math.sin(this.elapsed * 1.7) * 0.08
      this.rightElbow.rotation.x = -0.32
      return
    }
    if (this.state !== 'eatingOrDrinking' || this.role !== 'seat') return

    const gesture = 0.5 + Math.sin(this.elapsed * 2.1) * 0.5
    if (this.activity === 'cafe') {
      this.rightArm.rotation.x = -0.72 - gesture * 0.36
      this.rightElbow.rotation.x = -0.42 - gesture * 0.2
      this.leftArm.rotation.x = -0.42
    } else {
      this.leftArm.rotation.x = -0.76 - gesture * 0.3
      this.rightArm.rotation.x = -0.76 - gesture * 0.3
      this.leftElbow.rotation.x = -0.52
      this.rightElbow.rotation.x = -0.52
    }
    this.headRig.rotation.x = 0.08 + gesture * 0.035
  }
}
