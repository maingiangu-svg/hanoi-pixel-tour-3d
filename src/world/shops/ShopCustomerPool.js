import * as THREE from 'three'
import { getNpcPreset } from '../../npcs/npcPresets.js'
import { ShopCustomer } from './ShopCustomer.js'
import {
  getShopCustomerRule,
  getShopCustomerTarget,
} from './shopCustomerProfiles.js'

const AMBIENT_LINES = Object.freeze({
  ordering: Object.freeze({
    pho: 'Cho mình một bát phở nhé.',
    bun: 'Cho mình một bát bún nhé.',
    rice: 'Cho mình một suất cơm nhé.',
    cafe: 'Cho mình một cà phê nhé.',
    tea: 'Cho mình một ấm trà nhé.',
    bakery: 'Lấy giúp mình bánh này nhé.',
    drinks: 'Cho mình một chai nước nhé.',
  }),
  sitting: 'Ngồi bàn kia nhé.',
  eatingOrDrinking: Object.freeze({
    cafe: 'Cà phê ở đây thơm đấy.',
    tea: 'Trà ở đây thơm thật.',
    default: 'Quán này đông thật.',
  }),
  leaving: 'Tính tiền giúp mình.',
})

function localToWorld(origin, rotationY, localX, localZ) {
  const cosine = Math.cos(rotationY)
  const sine = Math.sin(rotationY)
  return new THREE.Vector3(
    origin[0] + localX * cosine + localZ * sine,
    origin[1],
    origin[2] - localX * sine + localZ * cosine,
  )
}

function seatedSlot(tableX, side, rotationY, activity) {
  return {
    role: 'seat',
    x: tableX + side * 0.58,
    z: -1.68,
    rotationY: rotationY - side * Math.PI / 2,
    tableX,
    tableSide: side,
    activity,
  }
}

export function createShopCustomerSlots(profileId, width, rotationY = 0) {
  const rule = getShopCustomerRule(profileId)
  if (rule.maxCustomers === 0) return []

  if (rule.layout === 'meal') {
    const leftTable = -width * 0.25
    const rightTable = width * 0.25
    return [
      { role: 'counter', x: width * 0.16, z: -1.24, rotationY, activity: 'meal' },
      seatedSlot(leftTable, -1, rotationY, 'meal'),
      seatedSlot(leftTable, 1, rotationY, 'meal'),
      seatedSlot(rightTable, -1, rotationY, 'meal'),
      seatedSlot(rightTable, 1, rotationY, 'meal'),
    ]
  }

  if (rule.layout === 'cafe') {
    const leftTable = -width * 0.27
    const rightTable = width * 0.27
    return [
      { role: 'counter', x: width * 0.16, z: -1.24, rotationY, activity: 'cafe' },
      seatedSlot(leftTable, -1, rotationY, 'cafe'),
      seatedSlot(leftTable, 1, rotationY, 'cafe'),
      seatedSlot(rightTable, -1, rotationY, 'cafe'),
    ]
  }

  return [
    { role: 'counter', x: -0.36, z: -1.28, rotationY, activity: 'counter' },
    { role: 'counter', x: 0.42, z: -1.48, rotationY, activity: 'counter' },
  ].slice(0, rule.maxCustomers)
}

export class ShopCustomerPool {
  constructor({
    shopId,
    profile,
    width,
    position,
    rotationY,
    variantIndex,
    actorParent,
    activityParent,
    kit,
    customerFactory = (options) => new ShopCustomer(options),
  }) {
    this.shopId = shopId
    this.profile = profile
    this.rule = getShopCustomerRule(profile.id)
    this.width = width
    this.position = position
    this.rotationY = rotationY
    this.variantIndex = variantIndex
    this.actorParent = actorParent
    this.activityParent = activityParent
    this.kit = kit
    this.customerFactory = customerFactory
    this.slots = createShopCustomerSlots(profile.id, width, rotationY)
    this.customers = []
    this.respawnTimers = []
    this.targetCount = 0
    this.detailed = false
    this.created = false
    this.ambientCooldown = 12 + (variantIndex % 4) * 2.3
  }

  update(deltaTime, {
    minutes,
    open,
    closingSoon,
    detailed,
  }) {
    this.targetCount = getShopCustomerTarget(this.profile.id, minutes, {
      shopVariant: this.variantIndex,
      open,
      closingSoon,
    })

    if (!open) {
      this.#clearAll()
      this.detailed = false
      return
    }
    if (!detailed) {
      if (this.detailed) this.#clearAll()
      this.detailed = false
      return
    }

    const firstDetailedFrame = !this.detailed
    this.detailed = true
    this.#ensureCreated()
    this.#syncTarget(firstDetailedFrame)

    this.customers.forEach((customer, index) => {
      if (this.respawnTimers[index] > 0) {
        this.respawnTimers[index] = Math.max(0, this.respawnTimers[index] - deltaTime)
        if (
          this.respawnTimers[index] === 0
          && index < this.targetCount
          && !customer.active
        ) {
          customer.stage()
        }
      }
      if (!customer.active) return
      customer.update(deltaTime)
      if (customer.completed && index < this.targetCount) {
        this.respawnTimers[index] = 2.2 + ((index + this.variantIndex) % 3) * 0.8
      }
    })

    this.#updateAmbient(deltaTime)
  }

  get activeCount() {
    return this.customers.reduce((count, customer) => count + (customer.active ? 1 : 0), 0)
  }

  dispose() {
    this.customers.forEach((customer) => customer.dispose())
    this.customers.length = 0
    this.respawnTimers.length = 0
  }

  #ensureCreated() {
    if (this.created || this.rule.maxCustomers === 0) return
    this.created = true
    const presets = this.rule.customerPresets

    this.slots.forEach((slot, index) => {
      const presetName = presets[(index + this.variantIndex) % presets.length]
      const station = localToWorld(this.position, this.rotationY, slot.x, slot.z)
      const entry = localToWorld(
        this.position,
        this.rotationY,
        slot.x,
        -2.72 - index * 0.07,
      )
      const customer = this.customerFactory({
        parent: this.actorParent,
        preset: getNpcPreset(presetName),
        station,
        entry,
        rotationY: slot.rotationY,
        role: slot.role,
        activity: slot.activity,
        animationOffset: this.variantIndex * 3.17 + index * 1.39,
      })
      const activityProp = this.#buildActivityProp(slot, index)
      customer.setActivityProp?.(activityProp)
      this.customers.push(customer)
      this.respawnTimers.push(0)
    })
  }

  #syncTarget(immediate) {
    this.customers.forEach((customer, index) => {
      if (index < this.targetCount) {
        if (!customer.active && this.respawnTimers[index] <= 0) {
          customer.stage({ immediate })
        }
      } else if (customer.active) {
        customer.beginLeaving()
      } else {
        this.respawnTimers[index] = 0
      }
    })
  }

  #clearAll() {
    this.customers.forEach((customer) => customer.clear())
    this.respawnTimers.fill(0)
  }

  #buildActivityProp(slot, index) {
    if (!this.kit || !this.activityParent || slot.role !== 'seat') return null
    const group = new THREE.Group()
    group.name = `Món ăn khách ${index + 1}`
    group.visible = false
    this.activityParent.add(group)
    const propX = slot.tableX + slot.tableSide * 0.16
    const propZ = slot.z

    if (slot.activity === 'cafe') {
      this.kit.cylinder(group, {
        name: 'Cốc của khách',
        radius: 0.075,
        height: 0.16,
        position: [propX, 0.75, propZ],
        material: index % 2 === 0 ? 'creamPaint' : 'greenDoor',
      })
      if (index % 2 === 0) {
        this.kit.box(group, {
          name: 'Điện thoại trên bàn',
          size: [0.09, 0.018, 0.18],
          position: [propX - slot.tableSide * 0.16, 0.704, propZ + 0.05],
          material: 'soot',
          receiveShadow: false,
        })
      }
    } else {
      this.kit.cylinder(group, {
        name: 'Bát thức ăn',
        radius: 0.135,
        height: 0.09,
        position: [propX, 0.73, propZ],
        material: index % 2 === 0 ? 'creamPaint' : 'oldYellow',
      })
      for (const offset of [-0.025, 0.025]) {
        const chopstick = this.kit.box(group, {
          name: 'Đũa',
          size: [0.018, 0.018, 0.28],
          position: [propX + offset, 0.79, propZ],
          material: 'darkWood',
          receiveShadow: false,
        })
        chopstick.rotation.y = 0.18
      }
      this.kit.cylinder(group, {
        name: 'Cốc nước của khách',
        radius: 0.05,
        height: 0.13,
        position: [propX - slot.tableSide * 0.2, 0.73, propZ + 0.08],
        material: 'greenDoor',
      })
    }
    return group
  }

  #updateAmbient(deltaTime) {
    if (this.activeCount === 0) return
    this.ambientCooldown -= deltaTime
    if (this.ambientCooldown > 0) return
    this.ambientCooldown = 17 + ((this.variantIndex + this.activeCount) % 5) * 2.4

    const speaker = this.customers.find((customer) => customer.active)
    if (!speaker) return
    const line = this.#getAmbientLine(speaker.state)
    if (line) speaker.say(line)
  }

  #getAmbientLine(state) {
    if (state === 'ordering') {
      return AMBIENT_LINES.ordering[this.profile.id] ?? AMBIENT_LINES.sitting
    }
    if (state === 'eatingOrDrinking') {
      return AMBIENT_LINES.eatingOrDrinking[this.profile.id]
        ?? AMBIENT_LINES.eatingOrDrinking.default
    }
    return AMBIENT_LINES[state] ?? null
  }
}
