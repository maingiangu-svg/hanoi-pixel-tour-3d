import * as THREE from 'three'
import { NpcActor } from '../npcs/NpcActor.js'
import { getSharedNpcResources } from '../npcs/NpcResources.js'

const WHEEL_RADIUS = 0.34
const WHEEL_SPIN_PER_METER = 1 / WHEEL_RADIUS

export class PlayerMotorbike {
  constructor({
    parent = null,
    resources = getSharedNpcResources(),
  } = {}) {
    this.resources = resources
    this.disposed = false
    this.mounted = false
    this.wheelRotation = 0
    this.wheelSpins = []

    this.group = new THREE.Group()
    this.group.name = 'Xe máy của người chơi'
    this.group.visible = false
    parent?.add(this.group)

    this.bike = new THREE.Group()
    this.bike.name = 'Xe máy low-poly'
    this.group.add(this.bike)
    this.#buildBike()

    this.rider = new NpcActor({
      parent: this.group,
      resources,
      preset: 'motorbikeDriver',
      name: 'Nhân vật người chơi',
      behavior: 'seated',
      position: [0, 0.5, -0.06],
      colliders: null,
      active: true,
      castShadow: true,
    })
    this.rider.group.name = 'Nhân vật người chơi mặc định'
    this.rider.leftArm.rotation.set(-1.02, 0, -0.15)
    this.rider.rightArm.rotation.set(-1.02, 0, 0.15)
    this.rider.leftElbow.rotation.set(-0.55, 0, 0.08)
    this.rider.rightElbow.rotation.set(-0.55, 0, -0.08)
  }

  #mesh(name, geometry, material, parent, {
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    castShadow = true,
  } = {}) {
    const mesh = new THREE.Mesh(
      this.resources.getGeometry(geometry),
      this.resources.getMaterial(material),
    )
    mesh.name = name
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.rotation.set(...rotation)
    mesh.castShadow = castShadow
    mesh.receiveShadow = false
    parent.add(mesh)
    return mesh
  }

  #buildBike() {
    for (const [label, z] of [['Trước', 0.72], ['Sau', -0.68]]) {
      const spin = new THREE.Group()
      spin.name = `Trục bánh ${label}`
      spin.position.set(0, WHEEL_RADIUS, z)
      this.bike.add(spin)
      this.wheelSpins.push(spin)
      this.#mesh(`Lốp ${label}`, 'cylinder', 'charcoal', spin, {
        scale: [WHEEL_RADIUS, 0.17, WHEEL_RADIUS],
        rotation: [0, 0, Math.PI / 2],
      })
      this.#mesh(`Mâm ${label}`, 'cylinder', 'metal', spin, {
        scale: [0.21, 0.19, 0.21],
        rotation: [0, 0, Math.PI / 2],
      })
    }

    this.#mesh('Khung xe máy', 'box', 'charcoal', this.bike, {
      position: [0, 0.55, 0],
      scale: [0.16, 0.15, 1.22],
    })
    this.#mesh('Yếm xe máy', 'tapered', 'red', this.bike, {
      position: [0, 0.72, 0.23],
      scale: [0.48, 0.56, 0.5],
    })
    this.#mesh('Động cơ xe máy', 'box', 'metal', this.bike, {
      position: [0, 0.5, -0.1],
      scale: [0.43, 0.38, 0.48],
    })
    this.#mesh('Yên xe máy', 'box', 'black', this.bike, {
      position: [0, 0.87, -0.25],
      scale: [0.43, 0.16, 0.72],
      rotation: [-0.06, 0, 0],
    })
    this.#mesh('Cổ xe máy', 'cylinder', 'metal', this.bike, {
      position: [0, 0.84, 0.56],
      scale: [0.08, 0.64, 0.08],
      rotation: [-0.22, 0, 0],
    })
    this.#mesh('Tay lái', 'cylinder', 'metal', this.bike, {
      position: [0, 1.1, 0.63],
      scale: [0.07, 0.88, 0.07],
      rotation: [0, 0, Math.PI / 2],
    })
    for (const side of [-1, 1]) {
      this.#mesh(
        `Tay nắm ${side < 0 ? 'trái' : 'phải'}`,
        'box',
        'black',
        this.bike,
        {
          position: [side * 0.48, 1.1, 0.63],
          scale: [0.2, 0.1, 0.12],
        },
      )
      this.#mesh(
        `Gương ${side < 0 ? 'trái' : 'phải'}`,
        'sphere',
        'metal',
        this.bike,
        {
          position: [side * 0.43, 1.35, 0.62],
          scale: [0.17, 0.13, 0.08],
        },
      )
      this.#mesh(
        `Cần gương ${side < 0 ? 'trái' : 'phải'}`,
        'cylinder',
        'metal',
        this.bike,
        {
          position: [side * 0.35, 1.23, 0.62],
          scale: [0.025, 0.28, 0.025],
          rotation: [0, 0, side * -0.42],
        },
      )
      this.#mesh(
        `Gác chân ${side < 0 ? 'trái' : 'phải'}`,
        'box',
        'metal',
        this.bike,
        {
          position: [side * 0.34, 0.47, -0.04],
          scale: [0.34, 0.07, 0.16],
        },
      )
    }
    this.#mesh('Đèn trước', 'sphere', 'cream', this.bike, {
      position: [0, 0.94, 0.66],
      scale: [0.24, 0.2, 0.12],
      castShadow: false,
    })
    this.#mesh('Đèn hậu', 'box', 'red', this.bike, {
      position: [0, 0.72, -0.67],
      scale: [0.25, 0.16, 0.1],
      castShadow: false,
    })
    this.#mesh('Ống xả', 'cylinder', 'metal', this.bike, {
      position: [-0.28, 0.38, -0.3],
      scale: [0.07, 0.72, 0.07],
      rotation: [Math.PI / 2, 0, 0],
    })
  }

  setMounted(mounted) {
    this.mounted = Boolean(mounted)
    this.group.visible = this.mounted
  }

  update(deltaTime, {
    position,
    groundHeight = 0,
    heading = 0,
    distance = 0,
  }) {
    if (!this.mounted || this.disposed) return
    this.group.position.set(position.x, groundHeight, position.z)
    this.group.rotation.y = heading

    this.wheelRotation -= Math.max(0, distance) * WHEEL_SPIN_PER_METER
    for (const spin of this.wheelSpins) spin.rotation.x = this.wheelRotation
    this.rider.update(deltaTime)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.mounted = false
    this.rider.dispose()
    this.group.removeFromParent()
  }
}
