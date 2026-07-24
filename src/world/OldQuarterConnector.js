import * as THREE from 'three'
import { createNoticePoint } from './interactions/WorldActionPoints.js'

const HOUSE_MATERIALS = ['oldYellow', 'plaster', 'brick', 'sage']
const SHOP_SIGNS = ['BÚN CHẢ', 'CÀ PHÊ NGÕ', 'ĐỒ THỦ CÔNG', 'HIỆU ẢNH', 'TẠP HÓA']

export class OldQuarterConnector {
  constructor({ kit, parent, colliders, shopManager = null }) {
    this.kit = kit
    this.colliders = colliders
    this.shopManager = shopManager
    this.group = new THREE.Group()
    this.group.name = 'Phố Nhà Chung và nhánh Phố Cổ'
    parent.add(this.group)
    this.lights = []
    this.interactions = []
    this.legacyHouseGroups = new Map()

    this.#buildRoutes()
    this.#buildStreetWalls()
    this.#buildOldQuarterBranch()
    this.#buildProps()
  }

  #buildRoutes() {
    this.kit.box(this.group, {
      name: 'Nền liên tục tuyến Nhà thờ tới Hồ Gươm',
      size: [36, 0.3, 72],
      position: [50, -0.24, 10],
      material: 'stoneDark',
      receiveShadow: true,
    })
    const roadSegments = [
      { size: [20, 0.12, 8], position: [43.5, -0.02, 13] },
      { size: [8, 0.12, 18], position: [51.5, -0.02, 5] },
      { size: [22, 0.12, 8], position: [61, -0.02, -4] },
      { size: [7, 0.12, 23], position: [44, -0.02, 28.5] },
      { size: [27, 0.12, 7], position: [56.5, -0.02, 36.5] },
    ]
    roadSegments.forEach(({ size, position }, index) => {
      this.kit.box(this.group, {
        name: index < 3 ? 'Tuyến phố Nhà Chung nối Hồ Gươm' : 'Nhánh Phố Cổ',
        size,
        position,
        material: 'asphalt',
        receiveShadow: true,
      })
    })

    for (const [x, z, width, depth] of [
      [43.5, 8.45, 20, 1.05], [43.5, 17.55, 20, 1.05],
      [46.95, 5, 1.05, 18], [56.05, 5, 1.05, 18],
      [61, -8.55, 22, 1.05], [61, 0.55, 22, 1.05],
      [39.95, 29, 1.05, 22], [48.05, 29, 1.05, 22],
      [56.5, 32.45, 27, 1.05], [56.5, 40.55, 27, 1.05],
    ]) {
      this.kit.box(this.group, {
        name: 'Vỉa hè tuyến nối',
        size: [width, 0.18, depth],
        position: [x, 0.04, z],
        material: 'sidewalk',
        receiveShadow: true,
      })
    }

    this.kit.sign(this.group, {
      text: 'PHỐ NHÀ CHUNG',
      width: 2.7,
      height: 0.58,
      position: [38.2, 2.55, 8.05],
      rotation: [0, Math.PI, 0],
      background: '#315c55',
      foreground: '#f5e9c9',
    })
  }

  #buildStreetWalls() {
    const houses = [
      { x: 38, z: 24, w: 6.2, d: 11.5, h: 10.5, side: -1, sign: 'BÚN CHẢ' },
      { x: 51, z: 25, w: 6.5, d: 12.5, h: 13.4, side: -1, sign: 'CÀ PHÊ NGÕ' },
      { x: 38.5, z: 2, w: 6.7, d: 10.5, h: 9.3, side: 1, sign: 'CƠM BÌNH DÂN' },
      { x: 45.5, z: 1.2, w: 6.5, d: 12, h: 11.8, side: 1, sign: null },
      { x: 59.5, z: 6.4, w: 7, d: 12.5, h: 13.8, side: 'west', sign: 'HIỆU ẢNH' },
      { x: 57.5, z: -14, w: 7.8, d: 11.5, h: 9.8, side: 1, sign: 'PHỞ BÒ' },
      { x: 65.7, z: -14, w: 8.2, d: 11.5, h: 12.7, side: 1, sign: 'CÀ PHÊ PHỐ' },
    ]
    houses.forEach((house, index) => this.#tubeHouse(house, index))
  }

  #buildOldQuarterBranch() {
    const houses = [
      { x: 36.2, z: 31, w: 6.2, d: 10, h: 12.2, side: 'east', sign: 'MAY ĐO' },
      { x: 51.5, z: 27.2, w: 6.2, d: 7.2, h: 9.2, side: 1, sign: 'ĐỒ THỦ CÔNG' },
      { x: 58, z: 27.2, w: 6.2, d: 7.2, h: 13.1, side: 1, sign: 'HÀNG BẠC' },
      { x: 65, z: 27.2, w: 7, d: 7.2, h: 10.8, side: 1, sign: 'CHÈ SEN' },
      { x: 53, z: 46, w: 8.5, d: 9.5, h: 12.6, side: -1, sign: 'LỤA HÀ NỘI' },
      { x: 62, z: 46, w: 8.5, d: 9.5, h: 9.6, side: -1, sign: 'GỐM VIỆT' },
    ]
    houses.forEach((house, index) => this.#tubeHouse(house, index + 7))

    this.interactions.push(createNoticePoint({
      position: [58, 0, 32.7],
      radius: 2.2,
      label: 'Xem biển Hàng Bạc',
      message: 'Phố Hàng Bạc — một nhánh Phố Cổ dẫn vòng về phía bờ hồ.',
      lookAt: [58, 2.8, 27.2],
    }))
  }

  #tubeHouse({ x, z, w, d, h, side, sign }, index) {
    const material = HOUSE_MATERIALS[index % HOUSE_MATERIALS.length]
    const legacyName = `Nhà ống tuyến Hồ Gươm ${index + 1}`
    const houseGroup = new THREE.Group()
    houseGroup.name = `Cụm ${legacyName}`
    houseGroup.userData.legacyColliderName = legacyName
    this.group.add(houseGroup)
    this.legacyHouseGroups.set(legacyName, houseGroup)

    this.kit.box(houseGroup, {
      name: legacyName,
      size: [w, h, d],
      position: [x, h / 2, z],
      material,
      collision: true,
      colliders: this.colliders,
      castShadow: index % 4 === 0,
    })
    this.kit.box(houseGroup, {
      name: 'Gờ mái nhà ống',
      size: [w + 0.3, 0.3, d + 0.3],
      position: [x, h + 0.04, z],
      material: 'stoneDark',
      castShadow: false,
    })

    const facade = this.#facadeTransform({ x, z, w, d, side })
    this.kit.box(houseGroup, {
      name: 'Cửa cuốn nhà ống',
      size: facade.horizontal ? [w * 0.62, 2.7, 0.14] : [0.14, 2.7, d * 0.62],
      position: [facade.x, 1.5, facade.z],
      material: index % 2 === 0 ? 'greenDoor' : 'metal',
    })
    for (const y of [4.8, 7.4].filter((level) => level < h - 1)) {
      this.kit.box(houseGroup, {
        name: 'Cửa sổ nhà ống',
        size: facade.horizontal ? [Math.min(2.8, w * 0.55), 1.5, 0.14] : [0.14, 1.5, Math.min(2.8, d * 0.55)],
        position: [facade.x, y, facade.z],
        material: (index + Math.round(y)) % 3 === 0 ? 'warmGlass' : 'glass',
      })
      this.kit.box(houseGroup, {
        name: 'Ban công nhà ống',
        size: facade.horizontal ? [Math.min(3.5, w * 0.7), 0.15, 0.75] : [0.75, 0.15, Math.min(3.5, d * 0.7)],
        position: [
          facade.x + (facade.horizontal ? 0 : facade.outwardX * 0.32),
          y - 1.02,
          facade.z + (facade.horizontal ? facade.outwardZ * 0.32 : 0),
        ],
        material: 'stoneDark',
        castShadow: false,
      })
    }
    if (sign) {
      this.kit.sign(houseGroup, {
        text: sign,
        width: Math.min(4.6, facade.horizontal ? w - 0.6 : d - 0.6),
        height: 0.68,
        position: [
          facade.x + facade.outwardX * 0.12,
          3.9,
          facade.z + facade.outwardZ * 0.12,
        ],
        rotation: facade.rotation,
        background: index % 2 === 0 ? '#8a463c' : '#315c55',
        foreground: '#f6e4b9',
      })
      const shopRotationY = Math.atan2(-facade.outwardX, -facade.outwardZ)
      this.shopManager?.addShop({
        parent: houseGroup,
        sign,
        width: Math.min(6.2, (facade.horizontal ? w : d) - 0.45),
        position: [facade.x + facade.outwardX * 0.08, 0, facade.z + facade.outwardZ * 0.08],
        rotationY: shopRotationY,
      })
    }
  }

  #facadeTransform({ x, z, w, d, side }) {
    if (side === 'west') {
      return { x: x - w / 2 - 0.08, z, horizontal: false, outwardX: -1, outwardZ: 0, rotation: [0, -Math.PI / 2, 0] }
    }
    if (side === 'east') {
      return { x: x + w / 2 + 0.08, z, horizontal: false, outwardX: 1, outwardZ: 0, rotation: [0, Math.PI / 2, 0] }
    }
    const outwardZ = side < 0 ? -1 : 1
    return {
      x,
      z: z + outwardZ * (d / 2 + 0.08),
      horizontal: true,
      outwardX: 0,
      outwardZ,
      rotation: [0, side < 0 ? Math.PI : 0, 0],
    }
  }

  #buildProps() {
    this.#lamp(42, 8.1, true)
    this.#lamp(52.2, -0.4, false)
    this.#lamp(64, 0.2, true)
    this.#motorbike(41, 18.4, 0.18)
    this.#motorbike(54, 32, -0.12)
    this.#motorbike(62.4, 32, 0.08)
  }

  #lamp(x, z, lit) {
    this.kit.cylinder(this.group, {
      name: 'Đèn phố tuyến nối',
      radius: 0.1,
      height: 4,
      position: [x, 2, z],
      material: 'metal',
    })
    this.kit.sphere(this.group, {
      name: 'Bóng đèn phố tuyến nối',
      scale: [0.2, 0.18, 0.2],
      position: [x, 3.9, z],
      material: 'lampGlow',
    })
    this.kit.addCollider(this.colliders, x, z, 0.3, 0.3, 'Cột đèn tuyến nối')
    if (lit) {
      const light = new THREE.PointLight(0xf1b86f, 4.5, 8, 2)
      light.position.set(x, 3.8, z)
      this.group.add(light)
      this.lights.push(light)
    }
  }

  #motorbike(x, z, rotationY) {
    const bike = new THREE.Group()
    bike.name = 'Xe máy đỗ Phố Cổ'
    bike.position.set(x, 0, z)
    bike.rotation.y = rotationY
    this.group.add(bike)
    for (const wheelZ of [-0.62, 0.62]) {
      this.kit.cylinder(bike, {
        name: 'Bánh xe', radius: 0.3, height: 0.14,
        position: [0, 0.31, wheelZ], material: 'soot', rotation: [0, 0, Math.PI / 2],
      })
    }
    this.kit.box(bike, {
      name: 'Thân xe', size: [0.46, 0.48, 1.1], position: [0, 0.67, 0],
      material: 'bridgeRed', castShadow: true,
    })
    this.kit.box(bike, {
      name: 'Yên xe', size: [0.4, 0.14, 0.66], position: [0, 0.98, 0.08], material: 'darkWood',
    })
    this.kit.addCollider(this.colliders, x, z, 0.8, 1.7, 'Xe máy Phố Cổ')
  }
}
