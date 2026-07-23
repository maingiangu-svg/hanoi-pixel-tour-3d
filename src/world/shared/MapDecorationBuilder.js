import * as THREE from 'three'
import { mapCoordinates } from '../map/MapCoordinateSystem.js'

const SMALL_PROP_MATERIAL = Object.freeze({
  bicycle: 'metal',
  crate: 'wood',
  electricBox: 'sage',
  motorbike: 'bridgeRed',
  planter: 'terracotta',
  plasticStools: 'bridgeRed',
  trashBin: 'greenDoor',
})

export class MapDecorationBuilder {
  constructor({ kit, parent, mapData, colliders, coordinates = mapCoordinates }) {
    this.kit = kit
    this.parent = parent
    this.mapData = mapData
    this.colliders = colliders
    this.coordinates = coordinates
    this.groupsBySourceId = new Map()
    this.lights = []
  }

  build() {
    this.mapData.decorations.forEach((decoration, index) => this.#buildDecoration(decoration, index))
    this.#buildBridgeSafety()
    return this
  }

  #buildDecoration(decoration, index) {
    const group = new THREE.Group()
    group.name = `${decoration.type} ${index + 1}`
    group.userData.sourceMapId = this.mapData.id
    group.userData.sourceId = decoration.id
    group.userData.sourceRef = `${this.mapData.id}:${decoration.id}`
    this.parent.add(group)
    const point = this.coordinates.point(this.mapData.id, decoration)

    switch (decoration.type) {
      case 'skyline': this.#skyline(group, decoration); break
      case 'pocketParking': this.#parking(group, decoration); break
      case 'alleyMouth': this.#alley(group, decoration); break
      case 'tree': this.#tree(group, point, index); break
      case 'lamp': this.#lamp(group, point, index); break
      case 'bench': this.#bench(group, point); break
      case 'flag': this.#flag(group, point); break
      case 'stall': this.#stall(group, point, decoration); break
      case 'planter': this.#smallProp(group, point, decoration, [1.2, 0.7, 0.72]); break
      case 'sign': this.#sign(group, point, decoration.text ?? 'i', '#9d7b36'); break
      case 'streetSign': this.#sign(group, point, decoration.text ?? 'PHỐ', '#315c55'); break
      case 'trafficSign': this.#trafficSign(group, point, decoration); break
      case 'trashBin': this.#smallProp(group, point, decoration, [0.72, 1.2, 0.72]); break
      case 'electricBox': this.#smallProp(group, point, decoration, [1, 1.4, 0.72]); break
      case 'bicycle': this.#bicycle(group, point); break
      case 'motorbike': this.#motorbike(group, point); break
      case 'crate': this.#smallProp(group, point, decoration, [0.9, 0.75, 0.9]); break
      case 'banner': this.#banner(group, point); break
      case 'rail': this.#rail(group, decoration); break
      case 'lakeRail': this.#lakeRail(group, decoration); break
      case 'lotus': this.#lotus(group, point); break
      case 'turtleTower': this.#turtleTower(group, point); break
      case 'powerPole': this.#powerPole(group, point); break
      case 'khueVanCac': this.#khueVanCac(group, point); break
      case 'stele': this.#stele(group, point); break
      case 'bridgeTruss': this.#bridgeTruss(group, decoration); break
      case 'teaCorner': this.#teaCorner(group, point); break
      case 'plasticStools': this.#stools(group, point); break
      case 'streetVendor': this.#stall(group, point, decoration); break
      case 'zebra': this.#zebra(group, decoration); break
      default: this.#smallProp(group, point, decoration, [0.7, 0.7, 0.7]); break
    }
    this.groupsBySourceId.set(decoration.id, group)
  }

  #skyline(group, decoration) {
    const rect = this.coordinates.rect(this.mapData.id, decoration)
    const count = Math.max(5, Math.floor(rect.width / 12))
    for (let index = 0; index < count; index += 1) {
      const width = rect.width / count * 0.86
      const height = 7 + (index * 7 % 9)
      const x = rect.minX + rect.width * (index + 0.5) / count
      this.kit.box(group, {
        name: 'Khối skyline',
        size: [width, height, Math.max(2, rect.depth * 0.42)],
        position: [x, height / 2, rect.z],
        material: ['stoneDark', 'brick', 'sage'][index % 3],
      })
    }
  }

  #parking(group, decoration) {
    const rect = this.coordinates.rect(this.mapData.id, decoration)
    this.kit.box(group, {
      name: 'Bãi đỗ nhỏ', size: [rect.width, 0.06, rect.depth],
      position: [rect.x, 0.025, rect.z], material: 'roadPatch', receiveShadow: true,
    })
    const bayCount = Math.max(2, Math.floor(rect.width / 4))
    const instances = []
    for (let index = 1; index < bayCount; index += 1) {
      instances.push({
        size: [0.08, 0.015, rect.depth * 0.72],
        position: [rect.minX + rect.width * index / bayCount, 0.07, rect.z],
      })
    }
    if (instances.length) this.kit.instancedBoxes(group, {
      name: 'Vạch bãi đỗ', material: 'whiteMarking', instances, receiveShadow: false,
    })
  }

  #alley(group, decoration) {
    const width = this.coordinates.distance(this.mapData.id, decoration.width ?? 100)
    const point = this.coordinates.point(this.mapData.id, decoration)
    this.kit.box(group, {
      name: 'Miệng ngõ', size: [width, 0.055, 3.4],
      position: [point.x - width / 2, 0.03, point.z + 1.7], material: 'stoneDark',
    })
    this.#sign(group, { x: point.x - width / 2, z: point.z }, decoration.text ?? 'NGÕ', '#315c55')
  }

  #tree(group, point, index) {
    this.kit.cylinder(group, {
      name: 'Thân cây', radius: 0.28, height: 4.2,
      position: [point.x, 2.1, point.z], material: 'wood', castShadow: index % 7 === 0,
    })
    this.kit.sphere(group, {
      name: 'Tán cây', scale: [1.65, 1.45, 1.55],
      position: [point.x, 4.55, point.z],
      material: index % 3 === 0 ? 'foliageLight' : 'foliage',
      castShadow: index % 7 === 0,
    })
    this.kit.addCollider(this.colliders, point.x, point.z, 0.68, 0.68, 'Cây đường phố')
  }

  #lamp(group, point, index) {
    this.kit.cylinder(group, {
      name: 'Cột đèn', radius: 0.1, height: 4.2,
      position: [point.x, 2.1, point.z], material: 'metal',
    })
    this.kit.sphere(group, {
      name: 'Bóng đèn', scale: [0.22, 0.2, 0.22],
      position: [point.x, 4.1, point.z], material: 'lampGlow',
    })
    this.kit.addCollider(this.colliders, point.x, point.z, 0.28, 0.28, 'Cột đèn')
    if (index % 6 === 0 && this.lights.length < 5) {
      const light = new THREE.PointLight(0xf0b76d, 4, 10, 2)
      light.position.set(point.x, 4, point.z)
      group.add(light)
      this.lights.push(light)
    }
  }

  #bench(group, point) {
    this.kit.box(group, {
      name: 'Mặt ghế', size: [2.4, 0.18, 0.58],
      position: [point.x, 0.62, point.z], material: 'wood', castShadow: true,
    })
    this.kit.box(group, {
      name: 'Lưng ghế', size: [2.4, 0.82, 0.14],
      position: [point.x, 1.02, point.z + 0.28], material: 'darkWood',
    })
    this.kit.addCollider(this.colliders, point.x, point.z, 2.55, 0.9, 'Ghế công cộng')
  }

  #flag(group, point) {
    this.kit.cylinder(group, {
      name: 'Cột cờ', radius: 0.06, height: 4.5,
      position: [point.x, 2.25, point.z], material: 'metal',
    })
    this.kit.box(group, {
      name: 'Cờ đỏ', size: [1.2, 0.72, 0.05],
      position: [point.x + 0.6, 3.95, point.z], material: 'bridgeRed',
    })
  }

  #stall(group, point, decoration) {
    this.kit.box(group, {
      name: decoration.text ?? 'Quầy hàng', size: [2.8, 1.2, 1.5],
      position: [point.x, 0.6, point.z], material: 'oldYellow',
    })
    this.kit.box(group, {
      name: 'Mái quầy', size: [3.2, 0.18, 1.9],
      position: [point.x, 1.45, point.z], material: 'bridgeRed',
    })
    this.kit.addCollider(this.colliders, point.x, point.z, 3, 1.7, 'Quầy hàng')
  }

  #smallProp(group, point, decoration, size) {
    this.kit.box(group, {
      name: decoration.type, size,
      position: [point.x, size[1] / 2, point.z],
      material: SMALL_PROP_MATERIAL[decoration.type] ?? 'stoneWarm',
      castShadow: false,
    })
  }

  #sign(group, point, text, background) {
    this.kit.cylinder(group, {
      name: 'Cột biển', radius: 0.055, height: 2.5,
      position: [point.x, 1.25, point.z], material: 'metal',
    })
    this.kit.sign(group, {
      text, width: Math.min(4.6, Math.max(1.8, text.length * 0.34)), height: 0.54,
      position: [point.x, 2.28, point.z], background, foreground: '#f5e9c9',
    })
  }

  #trafficSign(group, point, decoration) {
    this.#sign(group, point, decoration.direction === 'left' ? '←' : '→', '#315c55')
  }

  #bicycle(group, point) {
    for (const z of [-0.62, 0.62]) {
      this.kit.cylinder(group, {
        name: 'Bánh xe đạp', radius: 0.33, height: 0.08,
        position: [point.x, 0.35, point.z + z], material: 'soot', rotation: [0, 0, Math.PI / 2],
      })
    }
    this.kit.box(group, {
      name: 'Khung xe đạp', size: [0.12, 0.6, 1.1],
      position: [point.x, 0.65, point.z], material: 'metal',
    })
  }

  #motorbike(group, point) {
    for (const z of [-0.68, 0.68]) {
      this.kit.cylinder(group, {
        name: 'Bánh xe máy', radius: 0.32, height: 0.13,
        position: [point.x, 0.33, point.z + z], material: 'soot', rotation: [0, 0, Math.PI / 2],
      })
    }
    this.kit.box(group, {
      name: 'Thân xe máy', size: [0.5, 0.52, 1.2],
      position: [point.x, 0.7, point.z], material: 'bridgeRed',
    })
  }

  #banner(group, point) {
    for (const x of [-1.5, 1.5]) {
      this.kit.cylinder(group, {
        name: 'Cột banner', radius: 0.05, height: 3.5,
        position: [point.x + x, 1.75, point.z], material: 'metal',
      })
    }
    this.kit.box(group, {
      name: 'Banner', size: [3, 1.1, 0.06],
      position: [point.x, 2.7, point.z], material: 'bridgeRed',
    })
  }

  #rail(group, decoration) {
    const width = this.coordinates.distance(this.mapData.id, decoration.width ?? 80)
    const start = this.coordinates.point(this.mapData.id, decoration)
    const centerX = start.x - width / 2
    for (const y of [0.55, 1.2]) {
      this.kit.box(group, {
        name: 'Thanh lan can', size: [width, 0.12, 0.12],
        position: [centerX, y, start.z], material: 'metal',
      })
    }
    const postCount = Math.max(3, Math.floor(width / 3))
    const instances = []
    for (let index = 0; index <= postCount; index += 1) {
      instances.push({
        size: [0.12, 1.25, 0.12],
        position: [centerX - width / 2 + width * index / postCount, 0.62, start.z],
      })
    }
    this.kit.instancedBoxes(group, { name: 'Trụ lan can', material: 'metal', instances })
    this.kit.addCollider(this.colliders, centerX, start.z, width, 0.24, 'Lan can')
  }

  #lakeRail(group, decoration) {
    const rect = this.coordinates.rect(this.mapData.id, decoration)
    const bridge = this.mapData.walkZones.find((zone) => zone.kind === 'bridge')
    const bridgeRect = bridge ? this.coordinates.rect(this.mapData.id, bridge) : null
    for (const z of [rect.minZ, rect.maxZ]) {
      this.kit.box(group, {
        name: 'Lan can Hồ Gươm', size: [rect.width, 0.12, 0.12],
        position: [rect.x, 0.9, z], material: 'metal',
      })
    }
    const bridgeCrossesMinX = bridgeRect &&
      bridgeRect.minX <= rect.minX && bridgeRect.maxX > rect.minX
    const bridgeCrossesMaxX = bridgeRect &&
      bridgeRect.maxX >= rect.maxX && bridgeRect.minX < rect.maxX
    const openingX = bridgeCrossesMinX
      ? rect.minX
      : bridgeCrossesMaxX ? rect.maxX : null
    const closedX = openingX === rect.minX ? rect.maxX : rect.minX

    this.kit.box(group, {
      name: 'Lan can Hồ Gươm cạnh kín', size: [0.12, 0.12, rect.depth],
      position: [closedX, 0.9, rect.z], material: 'metal',
    })
    if (openingX !== null && bridgeRect.minZ < rect.maxZ && bridgeRect.maxZ > rect.minZ) {
      const northDepth = Math.max(0, bridgeRect.minZ - rect.minZ)
      const southDepth = Math.max(0, rect.maxZ - bridgeRect.maxZ)
      if (northDepth > 0) this.kit.box(group, {
        name: 'Lan can Hồ Gươm đông bắc', size: [0.12, 0.12, northDepth],
        position: [openingX, 0.9, rect.minZ + northDepth / 2], material: 'metal',
      })
      if (southDepth > 0) this.kit.box(group, {
        name: 'Lan can Hồ Gươm đông nam', size: [0.12, 0.12, southDepth],
        position: [openingX, 0.9, bridgeRect.maxZ + southDepth / 2], material: 'metal',
      })
    } else {
      this.kit.box(group, {
        name: 'Lan can Hồ Gươm cạnh còn lại', size: [0.12, 0.12, rect.depth],
        position: [rect.maxX, 0.9, rect.z], material: 'metal',
      })
    }
  }

  #lotus(group, point) {
    this.kit.sphere(group, {
      name: 'Hoa sen', scale: [0.34, 0.18, 0.34],
      position: [point.x, 0.18, point.z], material: 'redGlass',
    })
  }

  #turtleTower(group, point) {
    this.kit.cylinder(group, {
      name: 'Đảo Tháp Rùa', radius: 4, height: 0.3,
      position: [point.x, 0.12, point.z], material: 'stoneWarm',
    })
    const tiers = [[5.5, 1.8, 4.2], [4.3, 1.3, 3.3], [2.8, 1.1, 2.2]]
    let y = 0.3
    tiers.forEach((size, index) => {
      y += size[1] / 2
      this.kit.box(group, {
        name: `Tầng Tháp Rùa ${index + 1}`, size,
        position: [point.x, y, point.z], material: index ? 'stoneWarm' : 'stoneLight',
      })
      y += size[1] / 2
    })
    this.kit.gable(group, {
      name: 'Mái Tháp Rùa', width: 3.4, height: 0.8, depth: 2.8,
      position: [point.x, y + 0.2, point.z], material: 'tileRed',
    })
  }

  #powerPole(group, point) {
    this.kit.cylinder(group, {
      name: 'Cột điện', radius: 0.16, height: 6.2,
      position: [point.x, 3.1, point.z], material: 'wood',
    })
    this.kit.box(group, {
      name: 'Xà cột điện', size: [2.4, 0.16, 0.16],
      position: [point.x, 5.45, point.z], material: 'darkWood',
    })
    this.kit.addCollider(this.colliders, point.x, point.z, 0.42, 0.42, 'Cột điện')
  }

  #khueVanCac(group, point) {
    for (const x of [-2.2, 2.2]) {
      this.kit.box(group, {
        name: 'Trụ Khuê Văn Các', size: [0.65, 4.2, 0.65],
        position: [point.x + x, 2.1, point.z], material: 'terracotta',
      })
    }
    this.kit.box(group, {
      name: 'Gác Khuê Văn', size: [7.2, 3.6, 4.2],
      position: [point.x, 5.7, point.z], material: 'oldYellow',
    })
    this.kit.gable(group, {
      name: 'Mái Khuê Văn Các', width: 8.5, height: 1.6, depth: 5.3,
      position: [point.x, 7.45, point.z], material: 'tileRed',
    })
  }

  #stele(group, point) {
    this.kit.box(group, {
      name: 'Bia tiến sĩ', size: [1.15, 2.2, 0.42],
      position: [point.x, 1.35, point.z], material: 'stoneDark',
    })
    this.kit.sphere(group, {
      name: 'Rùa đội bia', scale: [0.9, 0.36, 0.75],
      position: [point.x, 0.35, point.z], material: 'stoneWarm',
    })
  }

  #bridgeTruss(group, decoration) {
    const width = this.coordinates.distance(this.mapData.id, decoration.width ?? 240)
    const start = this.coordinates.point(this.mapData.id, decoration)
    const centerX = start.x - width / 2
    for (const zOffset of [0, 0.9]) {
      this.kit.box(group, {
        name: 'Dầm dọc Cầu Long Biên', size: [width, 0.3, 0.2],
        position: [centerX, 4.8 + zOffset * 0.2, start.z + zOffset], material: 'bridgeRed',
      })
    }
    const postCount = Math.max(12, Math.floor(width / 9))
    for (let index = 0; index <= postCount; index += 1) {
      const x = centerX - width / 2 + width * index / postCount
      this.kit.box(group, {
        name: 'Trụ thép Cầu Long Biên', size: [0.26, 5, 0.26],
        position: [x, 2.5, start.z], material: 'bridgeRed',
      })
    }
  }

  #teaCorner(group, point) {
    this.kit.box(group, {
      name: 'Bàn trà đá', size: [1.1, 0.62, 0.82],
      position: [point.x, 0.31, point.z], material: 'wood',
    })
    this.#stools(group, { x: point.x + 1, z: point.z + 0.5 })
  }

  #stools(group, point) {
    for (const [x, z] of [[0, 0], [0.65, 0.3], [-0.55, 0.4]]) {
      this.kit.box(group, {
        name: 'Ghế nhựa', size: [0.42, 0.42, 0.42],
        position: [point.x + x, 0.21, point.z + z], material: 'bridgeRed',
      })
    }
  }

  #zebra(group, decoration) {
    const rect = this.coordinates.rect(this.mapData.id, decoration)
    const vertical = decoration.direction === 'vertical'
    const count = 7
    const instances = []
    for (let index = 0; index < count; index += 1) {
      const ratio = (index + 0.5) / count - 0.5
      instances.push({
        size: vertical ? [rect.width * 0.72, 0.015, rect.depth / count * 0.46] : [rect.width / count * 0.46, 0.015, rect.depth * 0.72],
        position: vertical
          ? [rect.x, 0.075, rect.z + ratio * rect.depth]
          : [rect.x + ratio * rect.width, 0.075, rect.z],
      })
    }
    this.kit.instancedBoxes(group, { name: 'Vạch qua đường', material: 'whiteMarking', instances })
  }

  #buildBridgeSafety() {
    const safety = this.mapData.bridgeSafety
    if (!safety) return
    safety.fallEdges
      .filter((edge) => edge.side === 'north' || edge.side === 'south' || edge.side === 'east')
      .forEach((edge) => {
        const start = this.coordinates.point(this.mapData.id, edge.x1, edge.y1)
        const end = this.coordinates.point(this.mapData.id, edge.x2, edge.y2)
        const horizontal = Math.abs(start.x - end.x) >= Math.abs(start.z - end.z)
        const width = horizontal ? Math.abs(start.x - end.x) : 0.32
        const depth = horizontal ? 0.32 : Math.abs(start.z - end.z)
        const x = (start.x + end.x) / 2
        const z = (start.z + end.z) / 2
        this.kit.box(this.parent, {
          name: `Lan can an toàn ${edge.id}`,
          size: [Math.max(0.32, width), 1.25, Math.max(0.32, depth)],
          position: [x, 0.62, z], material: 'metal',
        })
        const collider = {
          x, z,
          width: Math.max(0.32, width),
          depth: Math.max(0.32, depth),
          minX: x - Math.max(0.32, width) / 2,
          maxX: x + Math.max(0.32, width) / 2,
          minZ: z - Math.max(0.32, depth) / 2,
          maxZ: z + Math.max(0.32, depth) / 2,
          name: `Lan can an toàn Cầu Long Biên ${edge.id}`,
          kind: 'bridgeSafety',
          sourceMapId: this.mapData.id,
          sourceId: edge.id,
        }
        this.colliders.push(collider)
      })
  }
}
