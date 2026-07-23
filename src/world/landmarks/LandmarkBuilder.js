import * as THREE from 'three'
import { mapCoordinates } from '../map/MapCoordinateSystem.js'

export class LandmarkBuilder {
  constructor({
    kit,
    parent,
    mapData,
    colliders,
    coordinates = mapCoordinates,
    existingLandmarks = {},
  }) {
    this.kit = kit
    this.parent = parent
    this.mapData = mapData
    this.colliders = colliders
    this.coordinates = coordinates
    this.existingLandmarks = existingLandmarks
    this.groupsBySourceId = new Map()
  }

  build() {
    this.mapData.landmarks.forEach((landmark, index) => this.#buildLandmark(landmark, index))
    return this
  }

  #buildLandmark(landmark, index) {
    const sourceId = landmark.sourceId ?? landmark.id
    const existing = this.existingLandmarks[sourceId]
    if (existing) {
      existing.userData.sourceMapId = this.mapData.id
      existing.userData.sourceId = landmark.id
      existing.userData.sourceLandmarkId = sourceId
      existing.userData.sourceRef = `${this.mapData.id}:${landmark.id}`
      this.groupsBySourceId.set(sourceId, existing)
      return
    }

    const group = new THREE.Group()
    group.name = landmark.name
    group.userData.sourceMapId = this.mapData.id
    group.userData.sourceId = landmark.id
    group.userData.sourceLandmarkId = sourceId
    group.userData.sourceRef = `${this.mapData.id}:${landmark.id}`
    this.parent.add(group)

    switch (landmark.kind) {
      case 'lake':
      case 'riverLabel':
        this.#buildWaterLabel(group, landmark)
        break
      case 'temple':
        this.#buildTemple(group, landmark)
        break
      case 'redBridge':
        this.#buildRedBridge(group, landmark)
        break
      case 'oldQuarter':
        this.#buildOldQuarterMarker(group, landmark)
        break
      case 'cathedral':
        this.#buildCathedralProxy(group, landmark)
        break
      case 'plazaLabel':
        this.#buildPlaza(group, landmark)
        break
      case 'mausoleum':
        this.#buildMausoleum(group, landmark)
        break
      case 'onePillar':
        this.#buildOnePillarPagoda(group, landmark)
        break
      case 'citadel':
        this.#buildCitadel(group, landmark)
        break
      case 'gate':
        this.#buildVanMieu(group, landmark)
        break
      case 'longBridge':
        this.#buildLongBridge(group, landmark)
        break
      case 'market':
        this.#buildMarketMarker(group, landmark)
        break
      default:
        this.#buildGeneric(group, landmark, index)
        break
    }
    this.groupsBySourceId.set(sourceId, group)
  }

  #buildWaterLabel(group, landmark) {
    const point = this.coordinates.point(this.mapData.id, landmark.interactionPoint ?? {
      x: landmark.x + landmark.width / 2,
      y: landmark.y + landmark.height / 2,
    })
    this.#addLabel(group, landmark.name, point, '#245669')
  }

  #buildTemple(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const width = Math.min(13, rect.width * 0.78)
    const depth = Math.min(11, rect.depth * 0.72)
    this.kit.box(group, {
      name: 'Chính điện Đền Ngọc Sơn',
      size: [width, 5.4, depth],
      position: [rect.x, 2.7, rect.z],
      material: 'templeWall',
      castShadow: true,
    })
    this.kit.gable(group, {
      name: 'Mái Đền Ngọc Sơn',
      width: width + 1.4,
      height: 1.5,
      depth: depth + 1.4,
      position: [rect.x, 5.35, rect.z],
      material: 'tileRed',
      castShadow: true,
    })
    const frontZ = rect.z + depth / 2 + 0.02
    this.kit.arch(group, {
      name: 'Cửa Đền Ngọc Sơn',
      width: Math.min(2.6, width * 0.3),
      height: 3.2,
      position: [rect.x, 0.1, frontZ],
      material: 'darkWood',
    })
    this.#addLabel(group, landmark.name, { x: rect.x, z: frontZ + 1 }, '#873d35')
  }

  #buildRedBridge(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    this.kit.box(group, {
      name: 'Mặt Cầu Thê Húc',
      size: [rect.width, 0.24, rect.depth],
      position: [rect.x, 0.2, rect.z],
      material: 'bridgeRed',
      castShadow: true,
    })
    const horizontal = rect.width >= rect.depth
    // Rails protect only the span above water. Leaving the landfall open is
    // essential here: the source Ngọc Sơn plaza joins the bridge laterally at
    // its eastern end, between the island wall and the temple footprint.
    const sourceWater = this.mapData.water.find((water) => (
      landmark.x < water.x + water.width &&
      landmark.x + landmark.width > water.x &&
      landmark.y < water.y + water.height &&
      landmark.y + landmark.height > water.y
    ))
    const railSourceRect = sourceWater
      ? {
          x: horizontal ? Math.max(landmark.x, sourceWater.x) : landmark.x,
          y: horizontal ? landmark.y : Math.max(landmark.y, sourceWater.y),
          width: horizontal
            ? Math.min(landmark.x + landmark.width, sourceWater.x + sourceWater.width) -
              Math.max(landmark.x, sourceWater.x)
            : landmark.width,
          height: horizontal
            ? landmark.height
            : Math.min(landmark.y + landmark.height, sourceWater.y + sourceWater.height) -
              Math.max(landmark.y, sourceWater.y),
        }
      : landmark
    const railRect = this.coordinates.rect(this.mapData.id, railSourceRect)
    for (const side of [-1, 1]) {
      const x = horizontal ? railRect.x : railRect.x + side * (railRect.width / 2 - 0.12)
      const z = horizontal ? railRect.z + side * (railRect.depth / 2 - 0.12) : railRect.z
      this.kit.box(group, {
        name: 'Lan can Cầu Thê Húc',
        size: horizontal ? [railRect.width, 0.12, 0.12] : [0.12, 0.12, railRect.depth],
        position: [x, 1.05, z],
        material: 'bridgeRed',
      })
      this.kit.addCollider(
        this.colliders,
        x,
        z,
        horizontal ? railRect.width : 0.22,
        horizontal ? 0.22 : railRect.depth,
        'Lan can Cầu Thê Húc',
      )
    }
  }

  #buildOldQuarterMarker(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const corners = [
      [rect.minX, rect.minZ], [rect.maxX, rect.minZ],
      [rect.minX, rect.maxZ], [rect.maxX, rect.maxZ],
    ]
    corners.forEach(([x, z]) => {
      this.kit.cylinder(group, {
        name: 'Mốc Phố Cổ', radius: 0.12, height: 3.2,
        position: [x, 1.6, z], material: 'metal',
      })
    })
    const point = this.coordinates.point(this.mapData.id, landmark.interactionPoint)
    this.#addLabel(group, landmark.name, point, '#5f4427')
  }

  #buildCathedralProxy(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const width = Math.min(29, rect.width * 0.92)
    const depth = Math.min(19, rect.depth * 0.72)
    for (const side of [-1, 1]) {
      this.kit.box(group, {
        name: 'Tháp Nhà thờ Lớn blockout',
        size: [width * 0.27, 19, depth],
        position: [rect.x + side * width * 0.32, 9.5, rect.z],
        material: 'stoneAged',
        castShadow: true,
      })
    }
    this.kit.box(group, {
      name: 'Mặt tiền Nhà thờ Lớn blockout',
      size: [width * 0.45, 13, depth * 0.92],
      position: [rect.x, 6.5, rect.z],
      material: 'stoneWeathered',
    })
  }

  #buildPlaza(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const flagCount = 9
    for (let index = 0; index < flagCount; index += 1) {
      const x = rect.minX + rect.width * (index + 1) / (flagCount + 1)
      this.kit.cylinder(group, {
        name: 'Cột cờ Quảng trường Ba Đình', radius: 0.06, height: 4.2,
        position: [x, 2.1, rect.minZ + 2], material: 'metal',
      })
      this.kit.box(group, {
        name: 'Cờ Quảng trường Ba Đình', size: [0.95, 0.56, 0.05],
        position: [x + 0.48, 3.72, rect.minZ + 2], material: 'bridgeRed',
      })
    }
    this.#addLabel(group, landmark.name, { x: rect.x, z: rect.maxZ - 2 }, '#705d2c')
  }

  #buildMausoleum(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const width = Math.min(40, rect.width * 0.82)
    const depth = Math.min(17, rect.depth * 0.82)
    this.kit.box(group, {
      name: 'Khối Lăng Chủ tịch Hồ Chí Minh',
      size: [width, 9.2, depth],
      position: [rect.x, 4.6, rect.z],
      material: 'stone',
      castShadow: true,
    })
    this.kit.box(group, {
      name: 'Mái Lăng Bác', size: [width + 2, 1.2, depth + 2],
      position: [rect.x, 9.25, rect.z], material: 'stoneDark',
    })
    const frontZ = rect.z + depth / 2 + 0.04
    for (let index = -4; index <= 4; index += 1) {
      this.kit.box(group, {
        name: 'Cột Lăng Bác', size: [0.72, 6.4, 0.5],
        position: [rect.x + index * (width / 11), 4, frontZ], material: 'stoneLight',
      })
    }
    this.#addLabel(group, 'HỒ CHÍ MINH', { x: rect.x, z: frontZ + 0.7 }, '#43484e')
  }

  #buildOnePillarPagoda(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    this.kit.cylinder(group, {
      name: 'Cột Chùa Một Cột', radius: 0.72, height: 3.4,
      position: [rect.x, 1.7, rect.z], material: 'stoneDark',
    })
    this.kit.box(group, {
      name: 'Liên Hoa Đài', size: [6.2, 3.5, 6.2],
      position: [rect.x, 4.35, rect.z], material: 'templeWall', castShadow: true,
    })
    this.kit.gable(group, {
      name: 'Mái Chùa Một Cột', width: 7.8, height: 1.7, depth: 7.8,
      position: [rect.x, 6.05, rect.z], material: 'tileRed', castShadow: true,
    })
    this.#addLabel(group, landmark.name, { x: rect.x, z: rect.maxZ + 1 }, '#663338')
  }

  #buildCitadel(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const width = Math.min(48, rect.width * 0.8)
    const depth = Math.min(22, rect.depth * 0.74)
    this.kit.box(group, {
      name: 'Đoan Môn - Hoàng Thành', size: [width, 8.5, depth],
      position: [rect.x, 4.25, rect.z], material: 'terracotta', castShadow: true,
    })
    const frontZ = rect.z + depth / 2 + 0.02
    for (const xOffset of [-width * 0.28, 0, width * 0.28]) {
      this.kit.arch(group, {
        name: 'Cửa Đoan Môn', width: Math.min(5.2, width * 0.18), height: 5.7,
        position: [rect.x + xOffset, 0.08, frontZ], material: 'darkWood',
      })
    }
    this.kit.box(group, {
      name: 'Lầu Đoan Môn', size: [width * 0.46, 4.2, depth * 0.58],
      position: [rect.x, 10.6, rect.z], material: 'oldYellow',
    })
    this.kit.gable(group, {
      name: 'Mái lầu Đoan Môn', width: width * 0.54, height: 1.5, depth: depth * 0.7,
      position: [rect.x, 12.65, rect.z], material: 'tileRed',
    })
    this.#addLabel(group, landmark.name, { x: rect.x, z: frontZ + 1 }, '#6a351f')
  }

  #buildVanMieu(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const gateWidth = Math.min(25, rect.width * 0.34)
    const gateZ = rect.minZ + 5
    this.kit.box(group, {
      name: 'Văn Miếu Môn', size: [gateWidth, 6.8, 4.2],
      position: [rect.x, 3.4, gateZ], material: 'templeWall', castShadow: true,
    })
    for (const offset of [-gateWidth * 0.3, 0, gateWidth * 0.3]) {
      this.kit.arch(group, {
        name: 'Cổng Văn Miếu', width: gateWidth * 0.22, height: 4.5,
        position: [rect.x + offset, 0.05, gateZ + 2.13], material: 'darkWood',
      })
    }
    this.kit.gable(group, {
      name: 'Mái Văn Miếu Môn', width: gateWidth + 2, height: 1.25, depth: 6,
      position: [rect.x, 6.8, gateZ], material: 'tileRed',
    })
    const courtCount = 3
    for (let index = 1; index <= courtCount; index += 1) {
      const z = rect.minZ + rect.depth * index / (courtCount + 1)
      this.kit.box(group, {
        name: `Cổng sân Văn Miếu ${index}`, size: [rect.width * 0.28, 3.8, 2.4],
        position: [rect.x, 1.9, z], material: index % 2 ? 'terracotta' : 'oldYellow',
      })
    }
    this.#addLabel(group, landmark.name, { x: rect.x, z: rect.minZ + 1 }, '#6a351f')
  }

  #buildLongBridge(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const upperZone = this.mapData.walkZones.find((zone) => zone.kind === 'bridge')
    const deck = this.coordinates.rect(this.mapData.id, upperZone ?? landmark)
    const railZ = deck.z
    for (const offset of [-1.2, 1.2]) {
      this.kit.box(group, {
        name: 'Ray Cầu Long Biên', size: [deck.width * 0.96, 0.16, 0.12],
        position: [deck.x, 0.42, railZ + offset], material: 'metal',
      })
    }
    const sleeperCount = Math.max(24, Math.floor(deck.width / 2.8))
    const instances = []
    for (let index = 0; index < sleeperCount; index += 1) {
      const x = deck.minX + deck.width * (index + 0.5) / sleeperCount
      instances.push({ size: [0.3, 0.12, 3.4], position: [x, 0.3, railZ] })
    }
    this.kit.instancedBoxes(group, {
      name: 'Tà vẹt Cầu Long Biên', material: 'wood', instances,
    })
    this.#addLabel(group, landmark.name, { x: rect.minX + 8, z: rect.z }, '#6f2b26')
  }

  #buildMarketMarker(group, landmark) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    const frontZ = rect.z + rect.depth / 2 + 0.2
    this.#addLabel(group, landmark.name, { x: rect.x, z: frontZ }, '#6f2b26')
  }

  #buildGeneric(group, landmark, index) {
    const rect = this.coordinates.rect(this.mapData.id, landmark)
    this.kit.box(group, {
      name: landmark.name,
      size: [Math.max(2, rect.width), 4 + index % 4, Math.max(2, rect.depth)],
      position: [rect.x, 2 + index % 2, rect.z],
      material: 'stoneWarm',
    })
  }

  #addLabel(parent, text, point, background) {
    this.kit.sign(parent, {
      text,
      width: Math.min(12, Math.max(3.2, text.length * 0.45)),
      height: 0.68,
      position: [point.x, 2.8, point.z],
      background,
      foreground: '#f5e8c9',
    })
  }
}
