import * as THREE from 'three'
import {
  createNoticePoint,
  createPhotoPoint,
  createSeatPoint,
} from './interactions/WorldActionPoints.js'

const TOWER_POSITION = Object.freeze({ x: 103, y: 0, z: 0 })
export const HOAN_KIEM_WATER_COLLIDERS = Object.freeze([
  Object.freeze({ x: 102, z: 0, width: 60, depth: 66, name: 'Mặt nước Hồ Gươm' }),
  Object.freeze({ x: 107, z: 42.5, width: 6, depth: 21, name: 'Mặt nước phía tây đảo Ngọc Sơn' }),
  Object.freeze({ x: 131, z: 42.5, width: 6, depth: 21, name: 'Mặt nước phía đông đảo Ngọc Sơn' }),
  Object.freeze({ x: 113.55, z: 38.5, width: 7.1, depth: 11, name: 'Mặt nước cạnh tây Cầu Thê Húc' }),
  Object.freeze({ x: 124.45, z: 38.5, width: 7.1, depth: 11, name: 'Mặt nước cạnh đông Cầu Thê Húc' }),
])

export class HoanKiemDistrict {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.colliders = colliders
    this.group = new THREE.Group()
    this.group.name = 'Khu Hồ Gươm'
    parent.add(this.group)
    this.lights = []
    this.interactions = []

    this.#buildTerrain()
    this.#buildLakeEdge()
    this.#buildTurtleTower()
    this.#buildTrees()
    this.#buildBenches()
    this.#buildLamps()
    this.#buildLakefront()
    this.#buildInteractions()
  }

  #buildTerrain() {
    this.kit.box(this.group, {
      name: 'Nền khu Hồ Gươm',
      size: [76, 0.32, 100],
      position: [102, -0.24, 7],
      material: 'stoneDark',
      receiveShadow: true,
    })
    this.kit.box(this.group, {
      name: 'Mặt nước Hồ Gươm',
      size: [60, 0.1, 66],
      position: [102, -0.035, 0],
      material: 'lakeWater',
      receiveShadow: false,
    })
    this.kit.box(this.group, {
      name: 'Mặt nước nhánh Đền Ngọc Sơn',
      size: [30, 0.1, 21],
      position: [119, -0.035, 42.5],
      material: 'lakeWater',
      receiveShadow: false,
    })

    for (const collider of HOAN_KIEM_WATER_COLLIDERS) {
      this.kit.addCollider(
        this.colliders,
        collider.x,
        collider.z,
        collider.width,
        collider.depth,
        collider.name,
      )
    }

    for (const [x, z, width, depth] of [
      [68, 0, 7.2, 74],
      [102, -36.5, 68, 7],
      [102, 36.5, 68, 7],
      [135.5, 0, 7, 74],
    ]) {
      this.kit.box(this.group, {
        name: 'Lối đi bộ ven Hồ Gươm',
        size: [width, 0.18, depth],
        position: [x, 0.04, z],
        material: 'plaza',
        receiveShadow: true,
      })
    }
  }

  #buildLakeEdge() {
    this.kit.box(this.group, {
      name: 'Bó đá bờ tây Hồ Gươm',
      size: [0.36, 0.38, 66],
      position: [71.85, 0.12, 0],
      material: 'stoneLight',
    })
    this.kit.box(this.group, {
      name: 'Lan can bờ tây Hồ Gươm',
      size: [0.1, 0.1, 66],
      position: [71.72, 0.92, 0],
      material: 'metal',
    })
    const westPosts = []
    for (let z = -31; z <= 31; z += 3.2) {
      westPosts.push({ size: [0.1, 0.88, 0.1], position: [71.72, 0.48, z] })
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Trụ lan can bờ tây',
      material: 'metal',
      instances: westPosts,
    })

    for (const [x, width] of [[92, 40], [127, 10]]) {
      this.kit.box(this.group, {
        name: 'Bó đá bờ bắc Hồ Gươm',
        size: [width, 0.38, 0.36],
        position: [x, 0.12, 33.05],
        material: 'stoneLight',
      })
      this.kit.box(this.group, {
        name: 'Lan can bờ bắc Hồ Gươm',
        size: [width, 0.1, 0.1],
        position: [x, 0.92, 33.18],
        material: 'metal',
      })
    }
    this.kit.box(this.group, {
      name: 'Bó đá bờ nam Hồ Gươm',
      size: [60, 0.38, 0.36],
      position: [102, 0.12, -33.05],
      material: 'stoneLight',
    })
  }

  #buildTurtleTower() {
    const tower = new THREE.Group()
    tower.name = 'Tháp Rùa'
    tower.position.set(TOWER_POSITION.x, 0, TOWER_POSITION.z)
    this.group.add(tower)

    this.kit.cylinder(tower, {
      name: 'Đảo Tháp Rùa',
      radius: 4.2,
      height: 0.32,
      position: [0, 0.11, 0],
      material: 'stoneWarm',
      receiveShadow: true,
    })
    const tiers = [
      { y: 1.05, size: [5.5, 1.8, 4.2] },
      { y: 2.55, size: [4.35, 1.25, 3.3] },
      { y: 3.72, size: [2.75, 1.1, 2.15] },
    ]
    tiers.forEach((tier, index) => {
      this.kit.box(tower, {
        name: `Tầng ${index + 1} Tháp Rùa`,
        size: tier.size,
        position: [0, tier.y, 0],
        material: index === 0 ? 'stoneLight' : 'stoneWarm',
        castShadow: true,
      })
      const frontZ = -tier.size[2] / 2 - 0.025
      const openings = index === 0 ? [-1.65, 0, 1.65] : index === 1 ? [-1.15, 1.15] : [0]
      openings.forEach((x) => {
        this.kit.arch(tower, {
          name: 'Cửa vòm Tháp Rùa',
          width: index === 2 ? 0.65 : 0.78,
          height: index === 2 ? 0.82 : 1.05,
          position: [x, tier.y - tier.size[1] * 0.33, frontZ],
          material: 'warmGlass',
        })
      })
      this.kit.box(tower, {
        name: 'Gờ tầng Tháp Rùa',
        size: [tier.size[0] + 0.45, 0.2, tier.size[2] + 0.45],
        position: [0, tier.y + tier.size[1] / 2 + 0.04, 0],
        material: 'stoneDark',
      })
    })
    this.kit.gable(tower, {
      name: 'Mái chính Tháp Rùa',
      width: 3.4,
      height: 0.82,
      depth: 2.8,
      position: [0, 4.32, 0],
      material: 'tileRed',
      castShadow: true,
    })
    this.kit.box(tower, {
      name: 'Đỉnh Tháp Rùa',
      size: [0.3, 0.55, 0.3],
      position: [0, 5.15, 0],
      material: 'stoneLight',
    })

    for (const x of [-1.8, 1.8]) {
      const light = new THREE.PointLight(0xf4c77a, 5.4, 12, 2)
      light.name = 'Ánh sáng Tháp Rùa'
      light.position.set(x, 2.3, -2.7)
      tower.add(light)
      this.lights.push(light)
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Phản chiếu Tháp Rùa trên mặt hồ',
      material: 'waterReflection',
      instances: [
        { size: [0.22, 0.018, 5.8], position: [101.8, 0.026, -4.2] },
        { size: [0.14, 0.018, 4.6], position: [103.1, 0.028, -3.2] },
        { size: [0.32, 0.018, 3.4], position: [104.1, 0.03, -2.5] },
        { size: [0.18, 0.018, 2.7], position: [100.6, 0.03, -2] },
      ],
      receiveShadow: false,
    })
  }

  #buildTrees() {
    const trees = [
      [65.2, -31, 1.15], [66, -23, 0.9], [65.2, -13, 1.08],
      [66.1, -3, 0.82], [65, 8, 1.12], [66.2, 18, 0.92], [65.1, 29, 1.18],
      [77, 38.8, 0.9], [87, 39.5, 1.12], [99, 39.1, 0.86],
      [130, -37.8, 0.94], [119, -39, 1.08], [105, -38.7, 0.82], [89, -39, 1.1],
    ]
    trees.forEach(([x, z, scale], index) => {
      this.kit.cylinder(this.group, {
        name: 'Thân cây ven Hồ Gươm',
        radius: 0.28 * scale,
        height: 4.4 * scale,
        position: [x, 2.2 * scale, z],
        material: 'wood',
        castShadow: index % 5 === 0,
      })
      this.kit.sphere(this.group, {
        name: 'Tán cây ven Hồ Gươm',
        scale: [1.8 * scale, 1.55 * scale, 1.55 * scale],
        position: [x - 0.3 * scale, 4.65 * scale, z],
        material: index % 3 === 0 ? 'foliageLight' : 'foliage',
        castShadow: index % 5 === 0,
      })
      this.kit.sphere(this.group, {
        name: 'Tán cây phụ ven Hồ Gươm',
        scale: [1.25 * scale, 1.15 * scale, 1.35 * scale],
        position: [x + 1.05 * scale, 4.25 * scale, z + 0.45 * scale],
        material: index % 2 === 0 ? 'foliageDark' : 'foliage',
      })
      this.kit.addCollider(this.colliders, x, z, 0.65 * scale, 0.65 * scale, 'Cây ven Hồ Gươm')
    })
  }

  #buildBenches() {
    for (const [z, facing] of [[-25, 1], [-11, 1], [7, 1], [22, 1]]) {
      const bench = new THREE.Group()
      bench.name = 'Ghế đá ven Hồ Gươm'
      bench.position.set(68.2, 0, z)
      bench.rotation.y = Math.PI / 2 * facing
      this.group.add(bench)
      this.kit.box(bench, {
        name: 'Mặt ghế đá', size: [2.15, 0.16, 0.52], position: [0, 0.58, 0], material: 'stoneLight',
      })
      this.kit.box(bench, {
        name: 'Lưng ghế đá', size: [2.15, 0.78, 0.14], position: [0, 0.95, 0.25], material: 'stoneWarm',
      })
      for (const x of [-0.78, 0.78]) {
        this.kit.box(bench, {
          name: 'Chân ghế đá', size: [0.18, 0.55, 0.45], position: [x, 0.27, 0], material: 'stoneDark',
        })
      }
      this.kit.addCollider(this.colliders, 68.2, z, 0.9, 2.35, 'Ghế đá ven hồ')
    }
  }

  #buildLamps() {
    const lamps = [
      [69.6, -30], [69.6, -18], [69.6, -7.5], [69.6, 12], [69.6, 27],
      [82, 35], [101, 35], [129, 35], [122, -35], [94, -35],
    ]
    lamps.forEach(([x, z], index) => {
      this.kit.cylinder(this.group, {
        name: 'Cột đèn ven Hồ Gươm', radius: 0.1, height: 4.2,
        position: [x, 2.1, z], material: 'metal',
      })
      this.kit.sphere(this.group, {
        name: 'Đèn ven Hồ Gươm', scale: [0.23, 0.2, 0.23],
        position: [x, 4.08, z], material: 'lampGlow',
      })
      this.kit.addCollider(this.colliders, x, z, 0.3, 0.3, 'Cột đèn ven Hồ Gươm')
      if (index % 2 === 0) {
        const light = new THREE.PointLight(0xf1b86f, 5.2, 10, 2)
        light.name = 'Ánh sáng lối đi Hồ Gươm'
        light.position.set(x, 3.95, z)
        this.group.add(light)
        this.lights.push(light)
      }
    })
  }

  #buildLakefront() {
    this.kit.box(this.group, {
      name: 'Quán cà phê ven Hồ Gươm', size: [8, 8.8, 10],
      position: [60.2, 4.4, -27], material: 'oldYellow',
      collision: true, colliders: this.colliders, castShadow: true,
    })
    this.kit.box(this.group, {
      name: 'Cửa kính quán ven hồ', size: [0.12, 2.7, 6.2],
      position: [64.25, 1.55, -27], material: 'warmGlass',
    })
    this.kit.sign(this.group, {
      text: 'CÀ PHÊ BỜ HỒ', width: 4.8, height: 0.7,
      position: [64.34, 3.45, -27], rotation: [0, -Math.PI / 2, 0],
      background: '#76433a', foreground: '#f5dfae',
    })
    const cafeLight = new THREE.PointLight(0xf0ad63, 7, 10, 2)
    cafeLight.name = 'Ánh sáng quán ven Hồ Gươm'
    cafeLight.position.set(65.2, 2.6, -27)
    this.group.add(cafeLight)
    this.lights.push(cafeLight)

    const skyline = [
      [139, -27, 12, 'plaster'], [139, -14, 9, 'oldYellow'],
      [139, -2, 14, 'sage'], [139, 12, 10, 'brick'], [139, 25, 13, 'plaster'],
    ]
    skyline.forEach(([x, z, height, material], index) => {
      this.kit.box(this.group, {
        name: 'Nhà phố xa bờ đông', size: [7, height, 11],
        position: [x, height / 2, z], material,
        collision: true, colliders: this.colliders,
      })
      for (const y of [3.2, 6.2].filter((level) => level < height - 1)) {
        this.kit.box(this.group, {
          name: 'Cửa sổ phố xa', size: [0.12, 1.2, 2.8],
          position: [135.45, y, z], material: (index + Math.round(y)) % 2 === 0 ? 'warmGlass' : 'glass',
        })
      }
    })
  }

  #buildInteractions() {
    this.interactions.push(
      createNoticePoint({
        position: [68, 0, -3], radius: 2.5, label: 'Ngắm Tháp Rùa',
        message: 'Tháp Rùa hiện ra giữa mặt hồ — điểm kết của tuyến đi bộ từ Nhà thờ.',
        lookAt: [TOWER_POSITION.x, 2.2, TOWER_POSITION.z],
      }),
      createPhotoPoint({
        position: [68, 0, 4], radius: 2.25,
        lookAt: [TOWER_POSITION.x, 2.2, TOWER_POSITION.z],
        message: 'Đã chụp góc Tháp Rùa từ lối đi bộ Hồ Gươm.',
      }),
      createSeatPoint({
        position: [67.2, 0, -11], seatPosition: [67.15, 0, -11],
        lookAt: [TOWER_POSITION.x, 2.2, TOWER_POSITION.z],
      }),
      createNoticePoint({
        position: [67.5, 0, -18], radius: 2.1,
        label: 'Xem biển Lê Thái Tổ',
        message: 'Phố Lê Thái Tổ — trục đi bộ ôm bờ tây Hồ Gươm.',
        lookAt: [65.5, 2.5, -18],
      }),
    )
    this.kit.box(this.group, {
      name: 'Cột biển Lê Thái Tổ', size: [0.1, 2.5, 0.1],
      position: [65.5, 1.25, -18], material: 'metal',
    })
    this.kit.sign(this.group, {
      text: 'PHỐ LÊ THÁI TỔ', width: 2.65, height: 0.56,
      position: [65.55, 2.35, -18], rotation: [0, Math.PI / 2, 0],
      background: '#315c55', foreground: '#f5e9c9',
    })
  }
}
