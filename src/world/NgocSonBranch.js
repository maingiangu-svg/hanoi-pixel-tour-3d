import * as THREE from 'three'
import { createNoticePoint, createPhotoPoint } from './interactions/WorldActionPoints.js'

export class NgocSonBranch {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.colliders = colliders
    this.group = new THREE.Group()
    this.group.name = 'Cầu Thê Húc và Đền Ngọc Sơn'
    parent.add(this.group)
    this.lights = []
    this.interactions = []

    this.#buildBridge()
    this.#buildIsland()
    this.#buildTemple()
    this.#buildInteractions()
  }

  #buildBridge() {
    const segmentCount = 11
    for (let index = 0; index < segmentCount; index += 1) {
      const progress = index / (segmentCount - 1)
      const z = 33.7 + progress * 11.3
      const archHeight = Math.sin(progress * Math.PI) * 0.24
      this.kit.box(this.group, {
        name: 'Ván Cầu Thê Húc',
        size: [3.45, 0.18, 1.18],
        position: [119, 0.14 + archHeight, z],
        material: 'bridgeRed',
        castShadow: index === 5,
      })
    }
    for (const side of [-1, 1]) {
      const x = 119 + side * 1.68
      this.kit.box(this.group, {
        name: 'Tay vịn Cầu Thê Húc',
        size: [0.12, 0.12, 11.6],
        position: [x, 1.18, 39.35],
        material: 'bridgeRed',
      })
      const posts = []
      for (let z = 34; z <= 45; z += 1.15) {
        const progress = (z - 34) / 11
        posts.push({
          size: [0.12, 0.92, 0.12],
          position: [x, 0.68 + Math.sin(progress * Math.PI) * 0.22, z],
        })
      }
      this.kit.instancedBoxes(this.group, {
        name: 'Trụ lan can Cầu Thê Húc',
        material: 'bridgeRed',
        instances: posts,
      })
      this.kit.addCollider(this.colliders, x, 39.35, 0.18, 11.8, 'Lan can Cầu Thê Húc')
    }
  }

  #buildIsland() {
    this.kit.box(this.group, {
      name: 'Đảo Ngọc Sơn',
      size: [18, 0.28, 15],
      position: [119, 0.02, 51.5],
      material: 'plaza',
      receiveShadow: true,
    })
    for (const [x, z, width, depth, name] of [
      [109.9, 51.5, 0.2, 15, 'Mép tây đảo Ngọc Sơn'],
      [128.1, 51.5, 0.2, 15, 'Mép đông đảo Ngọc Sơn'],
      [119, 59.1, 18.2, 0.2, 'Mép sau đảo Ngọc Sơn'],
      [113.4, 44.1, 6.8, 0.2, 'Mép trước đảo Ngọc Sơn'],
      [124.6, 44.1, 6.8, 0.2, 'Mép trước đảo Ngọc Sơn'],
    ]) {
      this.kit.box(this.group, {
        name,
        size: [width, 0.75, depth],
        position: [x, 0.36, z],
        material: 'stoneDark',
      })
      this.kit.addCollider(this.colliders, x, z, width, depth, name)
    }

    for (const [x, z, scale] of [[112, 47, 0.8], [126, 48, 0.9], [111.8, 56.5, 0.72], [126.2, 57, 0.78]]) {
      this.kit.cylinder(this.group, {
        name: 'Thân cây đảo Ngọc Sơn', radius: 0.22 * scale, height: 3.6 * scale,
        position: [x, 1.8 * scale, z], material: 'wood',
      })
      this.kit.sphere(this.group, {
        name: 'Tán cây đảo Ngọc Sơn', scale: [1.25 * scale, 1.15 * scale, 1.3 * scale],
        position: [x, 3.85 * scale, z], material: 'foliageDark',
      })
      this.kit.addCollider(this.colliders, x, z, 0.58, 0.58, 'Cây đảo Ngọc Sơn')
    }
  }

  #buildTemple() {
    for (const side of [-1, 1]) {
      this.kit.box(this.group, {
        name: 'Trụ cổng Đền Ngọc Sơn',
        size: [0.8, 3.2, 0.8],
        position: [119 + side * 2, 1.6, 46.25],
        material: 'templeWall',
        collision: true,
        colliders: this.colliders,
      })
      this.kit.cone(this.group, {
        name: 'Mái trụ cổng Đền', sides: 4, radius: 0.72, height: 0.55,
        position: [119 + side * 2, 3.48, 46.25], material: 'tileRed', rotationY: Math.PI / 4,
      })
    }
    this.kit.box(this.group, {
      name: 'Biển cổng Đền Ngọc Sơn',
      size: [4.9, 0.75, 0.46],
      position: [119, 3.18, 46.25],
      material: 'bridgeRed',
    })
    this.kit.sign(this.group, {
      text: 'ĐỀN NGỌC SƠN', width: 3.7, height: 0.58,
      position: [119, 3.18, 45.98], rotation: [0, Math.PI, 0],
      background: '#8f3b33', foreground: '#f1d792',
    })

    this.kit.box(this.group, {
      name: 'Chính điện Đền Ngọc Sơn',
      size: [9.2, 4.5, 6],
      position: [119, 2.25, 53.6],
      material: 'templeWall',
      collision: true,
      colliders: this.colliders,
      castShadow: true,
    })
    this.kit.box(this.group, {
      name: 'Chân tường chính điện',
      size: [9.7, 0.48, 6.5],
      position: [119, 0.24, 53.6],
      material: 'stoneDark',
    })
    this.kit.gable(this.group, {
      name: 'Mái Đền Ngọc Sơn',
      width: 11,
      height: 1.45,
      depth: 7.3,
      position: [119, 4.46, 53.6],
      material: 'tileRed',
      castShadow: true,
    })
    this.kit.arch(this.group, {
      name: 'Cửa chính Đền Ngọc Sơn', width: 2.2, height: 2.8,
      position: [119, 0.25, 50.52], material: 'darkWood', rotationY: Math.PI,
    })
    for (const x of [115.6, 122.4]) {
      this.kit.arch(this.group, {
        name: 'Cửa sổ vòm Đền Ngọc Sơn', width: 1.25, height: 1.8,
        position: [x, 1.25, 50.5], material: 'warmGlass', rotationY: Math.PI,
      })
    }
    const templeLight = new THREE.PointLight(0xf2b768, 6.2, 11, 2)
    templeLight.name = 'Ánh sáng Đền Ngọc Sơn'
    templeLight.position.set(119, 3.2, 49.2)
    this.group.add(templeLight)
    this.lights.push(templeLight)
  }

  #buildInteractions() {
    this.interactions.push(
      createPhotoPoint({
        position: [119, 0, 39], radius: 2,
        lookAt: [103, 2.1, 0],
        message: 'Đã chụp Tháp Rùa từ Cầu Thê Húc.',
      }),
      createNoticePoint({
        position: [119, 0, 48.5], radius: 2.1,
        label: 'Ngắm Đền Ngọc Sơn',
        message: 'Đền Ngọc Sơn nằm trên đảo, nối với bờ bằng Cầu Thê Húc đỏ.',
        lookAt: [119, 2.7, 53.6],
      }),
    )
  }
}
