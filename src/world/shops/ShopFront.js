import * as THREE from 'three'
import { ShopSeller } from './ShopSeller.js'
import { ShopCustomerPool } from './ShopCustomerPool.js'
import {
  getMinutesUntilShopCloses,
  getShopScheduleLabel,
} from './shopSchedules.js'

const SHOP_FLOOR_Y = 0.1

function localToWorld(position, rotationY, x, y, z, target = new THREE.Vector3()) {
  const cosine = Math.cos(rotationY)
  const sine = Math.sin(rotationY)
  return target.set(
    position[0] + x * cosine + z * sine,
    position[1] + y,
    position[2] - x * sine + z * cosine,
  )
}

function hierarchyVisible(object) {
  let node = object
  while (node) {
    if (!node.visible) return false
    node = node.parent
  }
  return true
}

export class ShopFront {
  constructor({
    id,
    kit,
    parent,
    actorParent,
    colliders,
    profile,
    sellerPreset,
    sign,
    width,
    position,
    rotationY = 0,
    variantIndex = 0,
  }) {
    this.id = id
    this.kit = kit
    this.profile = profile
    this.sign = sign
    this.width = Math.max(3.2, Math.min(width, 6.2))
    this.position = position
    this.rotationY = rotationY
    this.variantIndex = variantIndex
    this.colliders = colliders
    this.isOpen = false
    this.pendingOpenState = null
    this.customerDetailed = false
    this.lights = []

    this.group = new THREE.Group()
    this.group.name = `Mặt tiền hoạt động · ${sign}`
    this.group.position.set(position[0], position[1], position[2])
    this.group.rotation.y = rotationY
    parent.add(this.group)

    this.openGroup = new THREE.Group()
    this.openGroup.name = 'Cửa hàng đang mở'
    this.openGroup.userData.dynamicVisibility = true
    this.closedGroup = new THREE.Group()
    this.closedGroup.name = 'Cửa hàng đang đóng'
    this.closedGroup.userData.dynamicVisibility = true
    this.group.add(this.openGroup, this.closedGroup)

    this.#buildArchitecture()
    this.#addCounterCollider(colliders)
    this.#buildProps()
    this.#buildClosedShutter()

    // Keep the seller just outside the legacy closed facade. The old building
    // mesh remains the collision wall, while the new counter visually masks
    // the seller's lower body and leaves the face unobstructed.
    const sellerPosition = localToWorld(position, rotationY, 0, 0, -0.24)
    this.seller = new ShopSeller({
      profile,
      preset: sellerPreset,
      shopId: id,
      position: sellerPosition,
      rotationY: rotationY + Math.PI,
      parent: actorParent,
      animationOffset: variantIndex * 1.71,
    })

    this.customerPool = new ShopCustomerPool({
      shopId: id,
      profile,
      width: this.width,
      position,
      rotationY,
      variantIndex,
      actorParent,
      activityParent: this.openGroup,
      kit,
    })

    this.interactionPosition = localToWorld(position, rotationY, 0, 0, -1.75)
    this.focusPoint = localToWorld(position, rotationY, 0, 2.05, -0.15)
    this.closedInteraction = {
      type: 'action',
      position: this.interactionPosition,
      radius: 2.4,
      label: 'Cửa hàng hiện đang đóng.',
      activate: ({ ui }) => {
        ui.showNotice?.(
          `Cửa hàng hiện đang đóng. Giờ mở cửa: ${getShopScheduleLabel(profile.scheduleId)}.`,
        )
      },
    }
    this.setOpen(false)
  }

  #buildArchitecture() {
    const frontageWidth = this.width - 0.18
    this.kit.box(this.openGroup, {
      name: 'Hốc tối tầng một',
      size: [frontageWidth, 3.05, 0.16],
      position: [0, 1.62, 0.04],
      material: 'soot',
      receiveShadow: false,
    })
    this.kit.box(this.openGroup, {
      name: 'Ánh sáng trong cửa hàng',
      size: [frontageWidth - 0.28, 2.72, 0.08],
      position: [0, 1.57, -0.08],
      material: 'shopInterior',
      receiveShadow: false,
    })
    for (const side of [-1, 1]) {
      this.kit.box(this.openGroup, {
        name: 'Khung cửa tầng một',
        size: [0.16, 3.08, 0.2],
        position: [side * (frontageWidth / 2 - 0.08), 1.62, -0.08],
        material: 'darkWood',
      })
      this.kit.box(this.openGroup, {
        name: 'Mặt kính tầng một',
        size: [Math.max(0.45, frontageWidth * 0.18), 2.42, 0.06],
        position: [side * frontageWidth * 0.34, 1.48, -0.18],
        material: 'shopGlass',
        receiveShadow: false,
      })
    }
    this.kit.box(this.openGroup, {
      name: 'Ngưỡng cửa hàng',
      size: [frontageWidth, 0.16, 1.25],
      position: [0, SHOP_FLOOR_Y, -0.52],
      material: 'stoneWarm',
      receiveShadow: true,
    })
    this.kit.box(this.openGroup, {
      name: 'Quầy bán hàng',
      size: [frontageWidth * 0.58, 0.96, 0.58],
      position: [0, 0.58, -0.58],
      material: this.profile.counterMaterial,
      castShadow: true,
    })
    this.kit.box(this.openGroup, {
      name: 'Mặt quầy',
      size: [frontageWidth * 0.62, 0.1, 0.7],
      position: [0, 1.1, -0.62],
      material: 'stoneLight',
    })

    const awning = this.kit.box(this.openGroup, {
      name: 'Mái hiên cửa hàng',
      size: [frontageWidth + 0.12, 0.16, 1.42],
      position: [0, 3.32, -0.66],
      material: this.profile.awningMaterial,
      castShadow: true,
    })
    awning.rotation.x = -0.13
    const stripeWidth = frontageWidth / 7
    const stripeInstances = [0, 2, 4, 6].map((index) => ({
      size: [stripeWidth * 0.65, 0.035, 1.28],
      position: [-frontageWidth / 2 + stripeWidth * (index + 0.5), 3.4, -0.68],
      rotation: [-0.13, 0, 0],
    }))
    this.kit.instancedBoxes(this.openGroup, {
      name: 'Sọc mái hiên',
      material: 'creamPaint',
      instances: stripeInstances,
      receiveShadow: false,
    })
    const light = new THREE.PointLight(
      this.profile.lightColor,
      this.profile.lightIntensity,
      8,
      2,
    )
    light.name = `Ánh sáng tầng một · ${this.sign}`
    light.position.set(0, 2.25, -1.15)
    this.group.add(light)
    this.lights.push(light)

    this.kit.cylinder(this.openGroup, {
      name: 'Vệt sáng hắt ra vỉa hè',
      radius: Math.min(2.2, frontageWidth * 0.4),
      height: 0.018,
      position: [0, 0.115, -1.55],
      material: 'lampPool',
      receiveShadow: false,
    })
  }

  #buildProps() {
    if (this.profile.propSet === 'noodle' || this.profile.propSet === 'rice') {
      this.kit.cylinder(this.openGroup, {
        name: 'Nồi bán hàng',
        radius: 0.28,
        height: 0.42,
        position: [-this.width * 0.18, 1.34, -0.58],
        material: 'metal',
      })
      this.kit.cylinder(this.openGroup, {
        name: 'Nắp nồi',
        radius: 0.3,
        height: 0.06,
        position: [-this.width * 0.18, 1.58, -0.58],
        material: 'stoneLight',
      })
      for (const x of [0.02, 0.32]) {
        this.kit.cylinder(this.openGroup, {
          name: 'Tô trên quầy',
          radius: 0.13,
          height: 0.09,
          position: [x, 1.2, -0.58],
          material: x > 0.2 ? 'oldYellow' : 'creamPaint',
        })
      }
      if (this.profile.propSet === 'rice') {
        for (const x of [-0.2, 0.1, 0.4]) {
          this.kit.box(this.openGroup, {
            name: 'Khay thức ăn',
            size: [0.25, 0.08, 0.22],
            position: [x, 1.18, -0.58],
            material: x < 0 ? 'terracotta' : 'oldYellow',
          })
        }
      }
      this.#buildSmallTable(-this.width * 0.25, -1.68, 'darkWood')
      this.#buildSmallTable(this.width * 0.25, -1.68, 'darkWood')
    } else if (this.profile.propSet === 'cafe' || this.profile.propSet === 'tea') {
      this.kit.cylinder(this.openGroup, {
        name: this.profile.propSet === 'cafe' ? 'Máy pha cà phê' : 'Bình trà',
        radius: 0.22,
        height: 0.42,
        position: [-this.width * 0.17, 1.36, -0.58],
        material: this.profile.propSet === 'cafe' ? 'metal' : 'oldYellow',
      })
      for (const x of [0.04, 0.26, 0.48]) {
        this.kit.cylinder(this.openGroup, {
          name: 'Cốc trên quầy',
          radius: 0.075,
          height: 0.17,
          position: [x, 1.26, -0.58],
          material: x === 0.26 ? 'greenDoor' : 'creamPaint',
        })
      }
      if (this.profile.id !== 'drinks') {
        this.#buildSmallTable(-this.width * 0.27, -1.68, 'darkWood')
        this.#buildSmallTable(this.width * 0.27, -1.68, 'darkWood')
      }
    } else if (this.profile.propSet === 'bakery') {
      this.kit.box(this.openGroup, {
        name: 'Tủ bánh kính',
        size: [this.width * 0.38, 0.68, 0.44],
        position: [0, 1.42, -0.56],
        material: 'shopGlass',
      })
      for (const x of [-0.42, -0.14, 0.14, 0.42]) {
        this.kit.sphere(this.openGroup, {
          name: 'Ổ bánh trưng bày',
          scale: [0.12, 0.07, 0.08],
          position: [x, 1.55, -0.81],
          material: 'oldYellow',
        })
      }
    } else {
      for (const x of [-0.36, 0, 0.36]) {
        this.kit.box(this.openGroup, {
          name: 'Hàng hóa trưng bày',
          size: [0.24, 0.44 + Math.abs(x) * 0.22, 0.22],
          position: [x, 1.36, -0.58],
          material: x < 0 ? 'oldYellow' : x > 0 ? 'sage' : 'terracotta',
        })
      }
    }
  }

  #addCounterCollider(colliders) {
    if (!colliders) return
    const center = localToWorld(this.position, this.rotationY, 0, 0, -0.58)
    const quarterTurn = Math.abs(Math.sin(this.rotationY)) > 0.5
    const counterWidth = this.width * 0.58
    this.kit.addCollider(
      colliders,
      center.x,
      center.z,
      quarterTurn ? 0.58 : counterWidth,
      quarterTurn ? counterWidth : 0.58,
      `Quầy bán hàng · ${this.sign}`,
    )
  }

  #buildSmallTable(x, z, material) {
    this.kit.cylinder(this.openGroup, {
      name: 'Bàn nhỏ trước quán',
      radius: 0.38,
      height: 0.08,
      position: [x, 0.62, z],
      material,
    })
    this.kit.cylinder(this.openGroup, {
      name: 'Chân bàn nhỏ',
      radius: 0.07,
      height: 0.58,
      position: [x, 0.31, z],
      material: 'metal',
    })
    for (const side of [-1, 1]) {
      this.kit.box(this.openGroup, {
        name: 'Ghế thấp trước quán',
        size: [0.32, 0.34, 0.32],
        position: [x + side * 0.58, 0.22, z],
        material: side < 0 ? 'bridgeRed' : 'greenDoor',
      })
    }
    if (this.colliders) {
      const center = localToWorld(this.position, this.rotationY, x, 0, z)
      this.kit.addCollider(
        this.colliders,
        center.x,
        center.z,
        0.76,
        0.76,
        `Bàn khách · ${this.sign}`,
      )
    }
  }

  #buildClosedShutter() {
    this.kit.box(this.closedGroup, {
      name: 'Cửa cuốn đóng',
      size: [this.width - 0.22, 2.9, 0.18],
      position: [0, 1.55, -0.15],
      material: 'metal',
    })
    this.kit.instancedBoxes(this.closedGroup, {
      name: 'Nan cửa cuốn đóng',
      material: 'stoneLight',
      instances: Array.from({ length: 10 }, (_, index) => ({
        size: [this.width - 0.4, 0.032, 0.06],
        position: [0, 0.38 + index * 0.27, -0.26],
      })),
      receiveShadow: false,
    })
  }

  setOpen(open) {
    this.isOpen = Boolean(open)
    this.openGroup.visible = this.isOpen
    this.closedGroup.visible = !this.isOpen
    this.lights.forEach((light) => {
      light.visible = this.isOpen
    })
    this.seller?.setActive(this.isOpen && this.seller.active)
  }

  syncOpenState(open) {
    if (!open && this.seller.dialogueActive) {
      this.pendingOpenState = false
      return
    }
    if (this.pendingOpenState !== null && !this.seller.dialogueActive) {
      open = this.pendingOpenState
      this.pendingOpenState = null
    }
    if (this.isOpen !== open) this.setOpen(open)
  }

  setActorsActive(active, { customerDetailed = false } = {}) {
    const shouldShow = Boolean(active) && this.isOpen
    this.seller.setActive(shouldShow)
    this.customerDetailed = shouldShow && Boolean(customerDetailed)
  }

  updateActors(deltaTime, playerPosition, minutes) {
    this.seller.update(deltaTime, { playerPosition })
    const minutesUntilClose = getMinutesUntilShopCloses(
      this.profile.scheduleId,
      minutes,
    )
    this.customerPool.update(deltaTime, {
      minutes,
      open: this.isOpen,
      closingSoon: this.isOpen && minutesUntilClose <= 20,
      detailed: this.customerDetailed,
    })
  }

  getInteraction() {
    if (!hierarchyVisible(this.group)) return null
    if (this.isOpen) return this.seller.getInteraction()
    return this.closedInteraction
  }

  get isDialogueActive() {
    return this.seller.dialogueActive
  }

  get visibleInWorld() {
    return hierarchyVisible(this.group)
  }

  dispose() {
    this.seller.dispose()
    this.customerPool.dispose()
    this.group.removeFromParent()
  }
}
