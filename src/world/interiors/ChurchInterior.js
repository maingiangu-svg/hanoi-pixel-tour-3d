import * as THREE from 'three'
import { mapCoordinates } from '../map/MapCoordinateSystem.js'
import { MAP_REGISTRY } from '../map/MapRegistry.js'
import { churchInteriorMapData } from '../map/data/churchInteriorMapData.js'
import { createFullCoverageRecord } from '../map/mapCoverage.js'
import {
  buildNonWalkableColliders,
  buildStaticColliders,
} from '../shared/collisionHelpers.js'

export class ChurchInterior {
  constructor({ kit, parent }) {
    this.kit = kit
    this.mapData = churchInteriorMapData
    this.group = new THREE.Group()
    this.group.name = 'Interior Nhà thờ · layout 2D đầy đủ'
    this.group.visible = false
    this.bounds = { ...MAP_REGISTRY.churchInterior.bounds }
    this.spawn = { ...MAP_REGISTRY.churchInterior.spawn }
    this.exits = MAP_REGISTRY.churchInterior.exits.map((exit) => ({
      ...exit,
      position: new THREE.Vector3(exit.position.x, exit.position.y, exit.position.z),
    }))
    this.interactions = [...this.exits]
    this.coverage = createFullCoverageRecord('churchInterior')
    this.sourceColliders = buildStaticColliders(churchInteriorMapData)
    this.colliders = [
      ...this.sourceColliders,
      ...buildNonWalkableColliders(churchInteriorMapData),
    ]
    this.lighting = {
      ambient: null,
      pendantLights: [],
      altarLight: null,
    }
    parent.add(this.group)

    this.#buildFloor()
    this.#buildShell()
    this.#buildPews()
    this.#buildColumns()
    this.#buildAltar()
    this.#buildWindows()
    this.#buildLighting()
  }

  #buildFloor() {
    const floor = mapCoordinates.rect('churchInterior', churchInteriorMapData.groundPatches[0])
    this.kit.box(this.group, {
      name: 'Sàn Nhà thờ',
      size: [floor.width, 0.24, floor.depth],
      position: [floor.x, -0.12, floor.z],
      material: 'plaza',
      receiveShadow: true,
    })

    const aisle = mapCoordinates.rect('churchInterior', churchInteriorMapData.layout.aisle)
    this.kit.box(this.group, {
      name: 'Thảm lối đi giữa',
      size: [aisle.width, 0.035, aisle.depth],
      position: [aisle.x, 0.025, aisle.z],
      material: 'bridgeRed',
      receiveShadow: true,
    })
  }

  #buildShell() {
    const shellIds = new Set([
      'shell-top',
      'shell-left',
      'shell-right',
      'shell-bottom-left',
      'shell-bottom-right',
    ])
    churchInteriorMapData.collisionBlocks
      .filter((block) => shellIds.has(block.id))
      .forEach((block, index) => {
        const world = mapCoordinates.rect('churchInterior', block)
        this.kit.box(this.group, {
          name: `Tường Nhà thờ ${block.id}`,
          size: [world.width, 10, world.depth],
          position: [world.x, 5, world.z],
          material: index % 2 === 0 ? 'stone' : 'stoneAged',
          castShadow: index === 0,
          receiveShadow: true,
        })
      })

    const floor = mapCoordinates.rect('churchInterior', churchInteriorMapData.groundPatches[0])
    const leftRoof = this.kit.box(this.group, {
      name: 'Mái trong bên trái',
      size: [floor.width * 0.58, 0.5, floor.depth],
      position: [floor.x - floor.width * 0.24, 11.35, floor.z],
      material: 'darkWood',
    })
    leftRoof.rotation.z = -0.42
    const rightRoof = this.kit.box(this.group, {
      name: 'Mái trong bên phải',
      size: [floor.width * 0.58, 0.5, floor.depth],
      position: [floor.x + floor.width * 0.24, 11.35, floor.z],
      material: 'darkWood',
    })
    rightRoof.rotation.z = 0.42

    const door = mapCoordinates.rect('churchInterior', churchInteriorMapData.layout.interiorDoor)
    this.kit.arch(this.group, {
      name: 'Viền cửa ra',
      width: Math.max(3.2, door.width + 0.5),
      height: 5.8,
      position: [door.x, 0.2, door.z + door.depth / 2 + 0.02],
      material: 'stoneLight',
      rotationY: Math.PI,
    })
    this.kit.arch(this.group, {
      name: 'Cửa chính bên trong',
      width: Math.max(2.7, door.width),
      height: 5.2,
      position: [door.x, 0.35, door.z + door.depth / 2 - 0.08],
      material: 'darkWood',
      rotationY: Math.PI,
    })
  }

  #buildPews() {
    churchInteriorMapData.layout.pews.forEach((pew, index) => {
      const world = mapCoordinates.rect('churchInterior', pew)
      const group = new THREE.Group()
      group.name = `Ghế Nhà thờ ${pew.id}`
      group.userData.sourceRef = `churchInterior:${pew.id}`
      this.group.add(group)
      this.kit.box(group, {
        name: 'Mặt ghế Nhà thờ',
        size: [world.width, 0.18, Math.max(0.6, world.depth)],
        position: [world.x, 0.64, world.z],
        material: 'pew',
        castShadow: index % 4 === 0,
      })
      this.kit.box(group, {
        name: 'Lưng ghế Nhà thờ',
        size: [world.width, 1.15, 0.16],
        position: [world.x, 1.03, world.z + world.depth * 0.35],
        material: 'pew',
      })
      for (const offset of [-world.width * 0.38, world.width * 0.38]) {
        this.kit.box(group, {
          name: 'Chân ghế Nhà thờ',
          size: [0.16, 0.65, Math.max(0.55, world.depth)],
          position: [world.x + offset, 0.33, world.z],
          material: 'darkWood',
        })
      }
    })
  }

  #buildColumns() {
    churchInteriorMapData.layout.columns.forEach((column, index) => {
      const point = mapCoordinates.point('churchInterior', column)
      this.kit.cylinder(this.group, {
        name: `Cột Nhà thờ ${column.id}`,
        radius: 0.46,
        height: 9.4,
        position: [point.x, 4.7, point.z],
        material: 'stoneLight',
        castShadow: index % 3 === 0,
      })
      this.kit.cylinder(this.group, {
        name: 'Chân cột Nhà thờ',
        radius: 0.66,
        height: 0.34,
        position: [point.x, 0.17, point.z],
        material: 'stoneDark',
      })
    })
  }

  #buildAltar() {
    const sanctuary = mapCoordinates.rect('churchInterior', churchInteriorMapData.layout.sanctuary)
    const altar = mapCoordinates.rect('churchInterior', churchInteriorMapData.layout.altar)
    this.kit.box(this.group, {
      name: 'Bậc cung thánh',
      size: [sanctuary.width, 0.32, sanctuary.depth],
      position: [sanctuary.x, 0.16, sanctuary.z],
      material: 'stoneLight',
    })
    this.kit.box(this.group, {
      name: 'Bàn thờ',
      size: [altar.width, 1.35, Math.max(1.5, altar.depth)],
      position: [altar.x, 0.98, altar.z],
      material: 'altar',
      castShadow: true,
    })
    const backZ = sanctuary.minZ + 0.12
    this.kit.arch(this.group, {
      name: 'Hậu cung',
      width: 6.6,
      height: 8.1,
      position: [sanctuary.x, 0.5, backZ],
      material: 'stone',
    })
    this.kit.arch(this.group, {
      name: 'Kính màu hậu cung',
      width: 4.5,
      height: 6.7,
      position: [sanctuary.x, 0.85, backZ + 0.12],
      material: 'blueGlass',
    })
    this.kit.box(this.group, {
      name: 'Thánh giá bàn thờ dọc',
      size: [0.22, 2.7, 0.18],
      position: [sanctuary.x, 5.7, backZ + 0.2],
      material: 'altar',
    })
    this.kit.box(this.group, {
      name: 'Thánh giá bàn thờ ngang',
      size: [1.4, 0.2, 0.18],
      position: [sanctuary.x, 6.25, backZ + 0.2],
      material: 'altar',
    })
  }

  #buildWindows() {
    churchInteriorMapData.layout.windows.forEach((window, index) => {
      const point = mapCoordinates.point('churchInterior', window)
      const left = window.x < churchInteriorMapData.width / 2
      const rotationY = left ? Math.PI / 2 : -Math.PI / 2
      this.kit.arch(this.group, {
        name: `Viền cửa sổ ${window.id}`,
        width: 1.8,
        height: 4.2,
        position: [point.x, 3.2, point.z],
        material: 'stoneLight',
        rotationY,
      })
      this.kit.arch(this.group, {
        name: `Kính màu ${window.id}`,
        width: 1.35,
        height: 3.65,
        position: [point.x + (left ? -0.08 : 0.08), 3.4, point.z],
        material: index % 2 === 0 ? 'redGlass' : 'blueGlass',
        rotationY,
      })
    })
  }

  #buildLighting() {
    const ambient = new THREE.AmbientLight(0x9299a2, 1.18)
    this.lighting.ambient = ambient
    this.group.add(ambient)
    for (const sourceY of [760, 590, 420, 250]) {
      const point = mapCoordinates.point('churchInterior', 700, sourceY)
      const light = new THREE.PointLight(0xe7aa66, 9, 12, 2)
      light.position.set(point.x, 6.8, point.z)
      this.group.add(light)
      this.lighting.pendantLights.push(light)
      this.kit.sphere(this.group, {
        name: 'Đèn treo Nhà thờ',
        scale: [0.18, 0.28, 0.18],
        position: [point.x, 6.65, point.z],
        material: 'warmGlass',
      })
    }
    const altar = mapCoordinates.rect('churchInterior', churchInteriorMapData.layout.altar)
    const altarLight = new THREE.SpotLight(0xf3c27f, 20, 24, Math.PI / 5, 0.7, 1.2)
    altarLight.position.set(altar.x, 8, altar.z + 6)
    altarLight.target.position.set(altar.x, 1.4, altar.z)
    this.group.add(altarLight, altarLight.target)
    this.lighting.altarLight = altarLight
  }
}
