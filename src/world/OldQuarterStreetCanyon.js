import * as THREE from 'three'
import { getFacadeKit, getSignFamily } from './style/HanoiVisualTokens.js'
import {
  OLD_QUARTER_CANYON_BACKGROUND,
  OLD_QUARTER_CANYON_BUILDINGS,
  OLD_QUARTER_CANYON_PROPS,
  OLD_QUARTER_NORTH_ROOFTOP_EXTENSIONS,
} from './map/oldQuarterStreetCanyonLayout.js'

const CENTER = Object.freeze([254, -90])
const ACTIVATION_RADIUS = 104

function append(target, material, instance) {
  if (!target.has(material)) target.set(material, [])
  target.get(material).push(instance)
}

export class OldQuarterStreetCanyon {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.colliders = colliders
    this.group = new THREE.Group()
    this.group.name = 'Street canyon Phố Cổ'
    this.group.userData.centralHanoiLayer = 'old-quarter-street-canyon'
    parent.add(this.group)

    this.customResources = []
    this.#buildGroundEdge()
    this.#buildSouthRow()
    this.#buildRetainedNorthFacadeLayer()
    this.#buildBackgroundLayers()
    this.#buildStreetProps()
    this.#buildOverheadWires()
  }

  updateVisibility(playerPosition, active = true) {
    if (!active || !playerPosition) {
      this.group.visible = Boolean(active)
      return
    }
    const dx = playerPosition.x - CENTER[0]
    const dz = playerPosition.z - CENTER[1]
    const threshold = ACTIVATION_RADIUS + (this.group.visible ? 10 : 0)
    this.group.visible = dx * dx + dz * dz <= threshold * threshold
  }

  dispose() {
    this.customResources.forEach((resource) => resource.dispose())
    this.group.removeFromParent()
  }

  #buildGroundEdge() {
    this.kit.box(this.group, {
      name: 'Vỉa hè sát mặt tiền street canyon',
      size: [90, 0.12, 3.6],
      position: [254, 0.025, -89.65],
      material: 'sidewalk',
      receiveShadow: true,
    })
    this.kit.box(this.group, {
      name: 'Bó vỉa street canyon',
      size: [91, 0.17, 0.24],
      position: [254, 0.07, -87.78],
      material: 'curb',
      receiveShadow: true,
    })
  }

  #buildSouthRow() {
    const bodies = new Map()
    const details = new Map()
    const signs = []

    OLD_QUARTER_CANYON_BUILDINGS.forEach((building, index) => {
      append(bodies, building.material, {
        size: [building.width, building.height, building.depth],
        position: [building.x, building.height / 2, building.z],
      })
      this.kit.addCollider(
        this.colliders,
        building.x,
        building.z,
        building.width,
        building.depth,
        `Nhà street canyon ${building.id}`,
      )
      this.#appendFacade(details, signs, building, index)
    })

    bodies.forEach((instances, material) => {
      this.kit.instancedBoxes(this.group, {
        name: `Thân nhà street canyon · ${material}`,
        material,
        instances,
        castShadow: false,
      })
    })
    details.forEach((instances, material) => {
      this.kit.instancedBoxes(this.group, {
        name: `Chi tiết street canyon · ${material}`,
        material,
        instances,
        castShadow: false,
      })
    })
    signs.forEach((sign) => this.kit.sign(this.group, sign))
  }

  #appendFacade(details, signs, building, index) {
    const facade = getFacadeKit(index + 2)
    const signFamily = getSignFamily(index)
    const frontZ = building.z + building.depth / 2
    const floorCount = Math.max(3, Math.min(7, Math.floor((building.height - 1.5) / 2.85)))
    const bayCount = facade.bayCount

    append(details, 'stoneDark', {
      size: [building.width + 0.3, 0.28, building.depth + 0.3],
      position: [building.x, building.height + 0.04, building.z],
    })
    append(details, 'stoneDark', {
      size: [building.width - 0.45, 3.15, 0.16],
      position: [building.x, 1.75, frontZ + 0.03],
    })
    append(details, building.door === 'glass' ? 'premiumGlass' : (
      building.door === 'wood' ? 'darkWood' : building.door === 'green' ? 'greenDoor' : 'metal'
    ), {
      size: [building.width - 0.9, 2.72, 0.13],
      position: [building.x, 1.66, frontZ + 0.13],
    })

    for (const edge of [-1, 1]) {
      append(details, 'stoneLight', {
        size: [0.2, building.height - 0.7, 0.32],
        position: [
          building.x + edge * (building.width / 2 - 0.15),
          building.height / 2 + 0.1,
          frontZ + 0.1,
        ],
      })
    }

    for (let floor = 1; floor < floorCount; floor += 1) {
      const y = 3.4 + floor * 2.72
      if (y > building.height - 0.75) break
      for (let bay = 0; bay < bayCount; bay += 1) {
        const x = building.x
          + (bay - (bayCount - 1) / 2) * (building.width * 0.68 / Math.max(1, bayCount - 0.15))
        append(details, 'stoneDark', {
          size: [Math.min(1.65, building.width / (bayCount + 0.8)), 1.72, 0.14],
          position: [x, y, frontZ + 0.08],
        })
        append(details, (index + floor + bay) % 4 === 0 ? 'cityWindow' : 'glass', {
          size: [Math.min(1.38, building.width / (bayCount + 1.15)), 1.42, 0.13],
          position: [x, y, frontZ + 0.17],
        })
      }

      const balcony = facade.balcony === 'stacked'
        || facade.balcony === 'alternating' && (floor + index) % 2 === 0
        || facade.balcony === 'single' && floor === 1
      if (balcony) {
        append(details, 'stoneDark', {
          size: [building.width * 0.72, 0.14, 0.84],
          position: [building.x, y - 1, frontZ + 0.43],
        })
        for (const offset of [-0.28, -0.14, 0, 0.14, 0.28]) {
          append(details, 'metal', {
            size: [0.045, 0.54, 0.045],
            position: [building.x + offset * building.width, y - 0.69, frontZ + 0.78],
          })
        }
      }

      if ((floor + index) % 3 === 1) {
        append(details, 'metal', {
          size: [0.86, 0.52, 0.36],
          position: [building.x + building.width * 0.31, y - 0.72, frontZ + 0.28],
        })
        append(details, 'soot', {
          size: [0.6, 0.05, 0.38],
          position: [building.x + building.width * 0.31, y - 0.72, frontZ + 0.48],
        })
      }
    }

    if (building.awning) {
      append(details, index % 3 === 0 ? 'bridgeRed' : 'greenDoor', {
        size: [building.width * 0.78, 0.16, 1.35],
        position: [building.x, 3.32, frontZ + 0.58],
        rotation: [0.08, 0, 0],
      })
    }
    append(details, 'signGlow', {
      size: [building.width * 0.8, 0.76, 0.15],
      position: [building.x, 3.92, frontZ + 0.16],
    })
    if (index % 2 === 0) {
      signs.push({
        text: building.sign,
        width: building.width * 0.72,
        height: 0.58,
        position: [building.x, 3.93, frontZ + 0.25],
        rotation: [0, 0, 0],
        background: signFamily.background,
        foreground: signFamily.foreground,
      })
    } else {
      append(details, 'signGlow', {
        size: [0.52, 2.35, 0.92],
        position: [building.x - building.width * 0.38, 4.9, frontZ + 0.52],
      })
    }

    append(details, 'metal', {
      size: [0.09, Math.min(7.5, building.height - 1.4), 0.11],
      position: [building.x + building.width * 0.43, Math.min(4.5, building.height / 2), frontZ + 0.25],
    })
  }

  #buildBackgroundLayers() {
    const backgrounds = new Map()
    OLD_QUARTER_CANYON_BACKGROUND.forEach((entry) => {
      append(backgrounds, entry.material, {
        size: entry.size,
        position: entry.position,
      })
    })
    OLD_QUARTER_NORTH_ROOFTOP_EXTENSIONS.forEach((entry) => {
      append(backgrounds, entry.material, {
        size: entry.size,
        position: entry.position,
      })
    })
    backgrounds.forEach((instances, material) => {
      this.kit.instancedBoxes(this.group, {
        name: `Lớp nhà cao street canyon · ${material}`,
        material,
        instances,
        castShadow: false,
      })
    })
  }

  #buildRetainedNorthFacadeLayer() {
    const fronts = [
      { x: 216.1, width: 6.8, material: 'cityWindow' },
      { x: 241.4, width: 7.3, material: 'premiumGlass' },
      { x: 251.3, width: 7.3, material: 'cityWindow' },
      { x: 261.1, width: 7.3, material: 'premiumGlass' },
      { x: 271, width: 7.3, material: 'cityWindow' },
    ]
    const windowsByMaterial = new Map()
    const frames = []
    const awnings = []
    const bladeSigns = []
    const lightPools = []

    fronts.forEach((front, index) => {
      append(windowsByMaterial, front.material, {
        size: [front.width - 0.75, 2.55, 0.13],
        position: [front.x, 1.58, -82.62],
      })
      for (const side of [-1, 0, 1]) {
        frames.push({
          size: [0.1, 2.76, 0.17],
          position: [front.x + side * (front.width - 0.75) / 2, 1.58, -82.72],
        })
      }
      awnings.push({
        size: [front.width * 0.82, 0.15, 1.22],
        position: [front.x, 3.18, -83.08],
        rotation: [-0.08, 0, 0],
      })
      lightPools.push({
        size: [front.width * 0.86, 0.012, 2.35],
        position: [front.x, 0.057, -84.05],
      })
      if (index > 0) {
        bladeSigns.push({
          size: [0.14, 1.75 + index % 2 * 0.45, 1.35],
          position: [front.x - front.width * 0.43, 4.45, -83.18],
        })
      }
    })

    windowsByMaterial.forEach((instances, material) => {
      this.kit.instancedBoxes(this.group, {
        name: `Cửa shop dãy bắc street canyon · ${material}`,
        material,
        instances,
        receiveShadow: false,
      })
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Khung cửa dãy bắc street canyon',
      material: 'metal',
      instances: frames,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Mái hiên dãy bắc street canyon',
      material: 'bridgeRed',
      instances: awnings,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Biển dọc nhìn dọc phố',
      material: 'signGlow',
      instances: bladeSigns,
      receiveShadow: false,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Vùng sáng shop dãy bắc',
      material: 'cityLightPool',
      instances: lightPools,
      receiveShadow: false,
    })
  }

  #buildStreetProps() {
    const { planters, chairs, motorbikes } = OLD_QUARTER_CANYON_PROPS
    this.kit.instancedBoxes(this.group, {
      name: 'Chậu cây sát tường Phố Cổ',
      material: 'terracotta',
      instances: planters.map(([x, z]) => ({
        size: [0.48, 0.48, 0.48],
        position: [x, 0.24, z],
      })),
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Tán cây chậu Phố Cổ',
      material: 'foliage',
      instances: planters.map(([x, z], index) => ({
        size: [0.62 + index % 2 * 0.12, 0.76, 0.62],
        position: [x, 0.82, z],
      })),
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Ghế nhựa thấp Phố Cổ',
      material: 'bridgeRed',
      instances: chairs.flatMap(([x, z]) => [
        { size: [0.42, 0.1, 0.42], position: [x, 0.42, z] },
        { size: [0.08, 0.4, 0.08], position: [x - 0.15, 0.2, z - 0.15] },
        { size: [0.08, 0.4, 0.08], position: [x + 0.15, 0.2, z - 0.15] },
        { size: [0.08, 0.4, 0.08], position: [x - 0.15, 0.2, z + 0.15] },
        { size: [0.08, 0.4, 0.08], position: [x + 0.15, 0.2, z + 0.15] },
      ]),
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Thân xe máy sát tường Phố Cổ',
      material: 'greenDoor',
      instances: motorbikes.map(([x, z, rotationY]) => ({
        size: [0.44, 0.6, 1.18],
        position: [x, 0.65, z],
        rotation: [0, rotationY, 0],
      })),
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Bánh xe máy sát tường Phố Cổ',
      material: 'soot',
      instances: motorbikes.flatMap(([x, z, rotationY]) => [-0.48, 0.48].map((offset) => ({
        size: [0.38, 0.42, 0.15],
        position: [
          x + Math.sin(rotationY) * offset,
          0.28,
          z + Math.cos(rotationY) * offset,
        ],
        rotation: [0, rotationY, 0],
      }))),
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Vùng sáng shop street canyon',
      material: 'cityLightPool',
      instances: OLD_QUARTER_CANYON_BUILDINGS.map((building, index) => ({
        size: [building.width * 0.82, 0.012, index % 3 === 0 ? 3.2 : 2.4],
        position: [building.x, 0.058, -89.2],
      })),
      receiveShadow: false,
    })
  }

  #buildOverheadWires() {
    const vertices = []
    const segment = (from, to) => vertices.push(...from, ...to)
    for (const z of [-90.55, -90.9]) {
      for (let x = 210; x < 300; x += 15) {
        segment([x, 7.6 + (x % 30) * 0.015, z], [x + 15, 7.25 + (x % 20) * 0.01, z])
      }
    }
    for (const x of [229, 258, 286]) {
      segment([x, 8.1, -90.65], [x + 1.8, 7.45, -82.75])
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.LineBasicMaterial({
      color: 0x2c3132,
      transparent: true,
      opacity: 0.86,
      toneMapped: true,
    })
    const wires = new THREE.LineSegments(geometry, material)
    wires.name = 'Dây điện street canyon Phố Cổ'
    wires.frustumCulled = true
    this.group.add(wires)
    this.customResources.push(geometry, material)
  }
}
