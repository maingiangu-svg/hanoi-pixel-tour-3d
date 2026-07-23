import * as THREE from 'three'
import { mapCoordinates } from '../map/MapCoordinateSystem.js'
import { getNavigationOpenings, subtractSourceRects } from './collisionHelpers.js'

const FACADE_MATERIALS = ['oldYellow', 'plaster', 'brick', 'sage']

export class MapStructureBuilder {
  constructor({ kit, parent, mapData, coordinates = mapCoordinates }) {
    this.kit = kit
    this.parent = parent
    this.mapData = mapData
    this.coordinates = coordinates
    this.meshesBySourceId = new Map()
  }

  build() {
    this.mapData.buildings.forEach((building, index) => this.#buildBuilding(building, index))
    this.mapData.shops.forEach((shop, index) => this.#buildShop(shop, index, false))
    ;(this.mapData.vehicleShops ?? []).forEach((shop, index) => this.#buildShop(shop, index, true))
    return this
  }

  #buildBuilding(building, index) {
    const openings = getNavigationOpenings(this.mapData, building)
    const pieces = subtractSourceRects(building, openings)
    const group = new THREE.Group()
    group.name = `${building.kind} ${index + 1} · ${this.mapData.name}`
    group.userData.sourceMapId = this.mapData.id
    group.userData.sourceId = building.id
    group.userData.sourceRef = `${this.mapData.id}:${building.id}`
    this.parent.add(group)

    pieces.forEach((piece, pieceIndex) => {
      if (building.kind === 'wall') {
        this.#buildWallPiece(group, building, piece, pieceIndex)
      } else {
        this.#buildMass(group, building, piece, index)
      }
    })
    this.meshesBySourceId.set(building.id, group)
  }

  #buildMass(parent, building, sourceRect, index) {
    const world = this.coordinates.rect(this.mapData.id, sourceRect)
    const height = getWorldHeight(building, this.coordinates.get(this.mapData.id).scale)
    const material = getBuildingMaterial(building, index)
    const body = this.kit.box(parent, {
      name: building.sign ? `${building.kind} · ${building.sign}` : building.kind,
      size: [world.width, height, world.depth],
      position: [world.x, height / 2, world.z],
      material,
      receiveShadow: true,
      castShadow: index % 9 === 0,
    })
    body.userData.sourceRef = `${this.mapData.id}:${building.id}`

    const roofMaterial = building.kind === 'admin' || building.kind === 'marketHall'
      ? 'tileRed'
      : index % 3 === 0 ? 'tileRed' : 'stoneDark'
    this.kit.box(parent, {
      name: `Mái ${building.id}`,
      size: [world.width + 0.3, 0.28, world.depth + 0.3],
      position: [world.x, height + 0.05, world.z],
      material: roofMaterial,
      castShadow: true,
    })

    if (building.kind === 'tubeHouse' || building.kind === 'collective' || building.kind === 'apartment') {
      this.#addFacade(parent, building, world, height, index)
    }
    if (building.kind === 'admin') this.#addAdminFacade(parent, building, world, height)
    if (building.kind === 'marketHall') this.#addMarketFacade(parent, building, world, height)
    if (building.kind === 'cafeFront' || building.sign) this.#addSign(parent, building, world, height, index)
  }

  #buildWallPiece(parent, building, sourceRect, pieceIndex) {
    const world = this.coordinates.rect(this.mapData.id, sourceRect)
    const height = 2.5
    const body = this.kit.box(parent, {
      name: `Tường ${building.id} phần ${pieceIndex + 1}`,
      size: [world.width, height, world.depth],
      position: [world.x, height / 2, world.z],
      material: 'terracotta',
      castShadow: pieceIndex === 0,
    })
    body.userData.sourceRef = `${this.mapData.id}:${building.id}`
    this.kit.box(parent, {
      name: `Mũ tường ${building.id}`,
      size: [world.width + 0.12, 0.2, world.depth + 0.12],
      position: [world.x, height + 0.02, world.z],
      material: 'stoneWarm',
    })
  }

  #buildShop(shop, index, vehicle) {
    const world = this.coordinates.rect(this.mapData.id, shop)
    const height = vehicle ? 5.2 : 4.2
    const group = new THREE.Group()
    group.name = vehicle ? `Đại lý ${shop.name ?? shop.id}` : `Quầy ${shop.id}`
    group.userData.sourceMapId = this.mapData.id
    group.userData.sourceId = shop.id
    group.userData.sourceRef = `${this.mapData.id}:${shop.id}`
    this.parent.add(group)
    this.kit.box(group, {
      name: group.name,
      size: [world.width, height, world.depth],
      position: [world.x, height / 2, world.z],
      material: vehicle ? 'plaster' : index % 2 ? 'oldYellow' : 'terracotta',
      castShadow: index === 0,
    })
    this.kit.box(group, {
      name: 'Mái quầy',
      size: [world.width + 0.3, 0.24, world.depth + 0.3],
      position: [world.x, height + 0.04, world.z],
      material: vehicle ? 'roof' : 'tileRed',
    })
    this.kit.sign(group, {
      text: vehicle ? 'VINFAST' : shop.sign ?? shop.foodId?.toUpperCase?.() ?? 'QUÁN ĂN',
      width: Math.min(6.5, Math.max(2.4, world.width * 0.75)),
      height: 0.62,
      position: [world.x, 2.7, world.z + world.depth / 2 + 0.07],
      background: vehicle ? '#263b48' : '#82443b',
      foreground: '#f5e5bd',
    })
    this.meshesBySourceId.set(shop.id, group)
  }

  #addFacade(parent, building, world, height, index) {
    const frontZ = world.z + world.depth / 2 + 0.035
    const floorCount = Math.max(1, Math.floor((height - 2) / 2.6))
    for (let floor = 0; floor < floorCount; floor += 1) {
      const y = 2.2 + floor * 2.45
      const columns = Math.max(1, Math.min(3, Math.floor(world.width / 2.4)))
      for (let column = 0; column < columns; column += 1) {
        const x = world.x + (column - (columns - 1) / 2) * Math.min(2.4, world.width / columns)
        this.kit.box(parent, {
          name: `Cửa sổ ${building.id}`,
          size: [Math.min(1.1, world.width / (columns + 1)), 1.05, 0.1],
          position: [x, y, frontZ],
          material: (floor + column + index) % 3 === 0 ? 'warmGlass' : 'glass',
        })
      }
    }
    if (building.kind === 'tubeHouse' && world.width > 3) {
      this.kit.box(parent, {
        name: `Cửa cuốn ${building.id}`,
        size: [world.width * 0.58, 2, 0.11],
        position: [world.x, 1.02, frontZ + 0.015],
        material: index % 2 ? 'greenDoor' : 'metal',
      })
    }
  }

  #addAdminFacade(parent, building, world, height) {
    const frontZ = world.z + world.depth / 2 + 0.04
    const columns = Math.max(3, Math.min(8, Math.floor(world.width / 3.2)))
    for (let index = 0; index < columns; index += 1) {
      const x = world.x + (index - (columns - 1) / 2) * (world.width - 2) / columns
      this.kit.box(parent, {
        name: `Cột mặt tiền ${building.id}`,
        size: [0.36, height * 0.7, 0.3],
        position: [x, height * 0.46, frontZ],
        material: 'stoneLight',
      })
    }
  }

  #addMarketFacade(parent, building, world, height) {
    const frontZ = world.z + world.depth / 2 + 0.04
    for (const ratio of [-0.32, 0, 0.32]) {
      this.kit.arch(parent, {
        name: 'Cổng Chợ Đồng Xuân',
        width: Math.max(2.2, world.width * 0.22),
        height: height * 0.58,
        position: [world.x + world.width * ratio, 0.05, frontZ],
        material: 'darkWood',
      })
    }
    this.kit.sign(parent, {
      text: 'CHỢ ĐỒNG XUÂN',
      width: Math.min(12, world.width * 0.55),
      height: 0.78,
      position: [world.x, height * 0.75, frontZ + 0.04],
      background: '#943d34',
      foreground: '#f2dda3',
    })
  }

  #addSign(parent, building, world, height, index) {
    const text = building.sign ?? (building.kind === 'cafeFront' ? 'CÀ PHÊ' : null)
    if (!text) return
    this.kit.sign(parent, {
      text,
      width: Math.min(5.8, Math.max(2.1, world.width * 0.72)),
      height: 0.58,
      position: [world.x, Math.min(height - 0.7, 3.25), world.z + world.depth / 2 + 0.09],
      background: index % 2 ? '#315c55' : '#82443b',
      foreground: '#f5e5bd',
    })
  }
}

function getBuildingMaterial(building, index) {
  if (building.kind === 'admin') return 'stoneWarm'
  if (building.kind === 'marketHall') return 'oldYellow'
  if (building.kind === 'cafeFront') return 'oldYellow'
  if (building.kind === 'collective' || building.kind === 'apartment') return 'stone'
  return FACADE_MATERIALS[index % FACADE_MATERIALS.length]
}

function getWorldHeight(building, sourceScale) {
  if (building.kind === 'admin') return 9.5
  if (building.kind === 'marketHall') return 10.5
  if (building.kind === 'cafeFront') return 6.2
  if (building.kind === 'collective') return 12.5
  if (building.kind === 'apartment') return 15
  const sourceDepth = building.height * sourceScale
  return Math.min(14.5, Math.max(6.4, 5.2 + sourceDepth * 0.48))
}
