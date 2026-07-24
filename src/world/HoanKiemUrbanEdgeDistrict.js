import * as THREE from 'three'
import {
  getUrbanBuildingFootprint,
  HOAN_KIEM_URBAN_CLUSTERS,
  HOAN_KIEM_URBAN_PROPS,
  HOAN_KIEM_URBAN_SIDE_ROADS,
} from './map/hoanKiemUrbanEdgeLayout.js'

const FRONT_SPECS = Object.freeze({
  negativeZ: Object.freeze({
    outward: Object.freeze([0, -1]),
    tangent: Object.freeze([1, 0]),
    shopRotationY: 0,
    signRotationY: Math.PI,
  }),
  positiveZ: Object.freeze({
    outward: Object.freeze([0, 1]),
    tangent: Object.freeze([1, 0]),
    shopRotationY: Math.PI,
    signRotationY: 0,
  }),
  negativeX: Object.freeze({
    outward: Object.freeze([-1, 0]),
    tangent: Object.freeze([0, 1]),
    shopRotationY: Math.PI / 2,
    signRotationY: -Math.PI / 2,
  }),
  positiveX: Object.freeze({
    outward: Object.freeze([1, 0]),
    tangent: Object.freeze([0, 1]),
    shopRotationY: -Math.PI / 2,
    signRotationY: Math.PI / 2,
  }),
})

export class HoanKiemUrbanEdgeDistrict {
  constructor({ kit, parent, colliders, shopManager = null }) {
    this.kit = kit
    this.colliders = colliders
    this.shopManager = shopManager
    this.group = new THREE.Group()
    this.group.name = 'Dãy phố và cảnh quan Hoàn Kiếm mở rộng'
    parent.add(this.group)

    this.clusterGroups = []
    this.colliderSpecs = createUrbanEdgeColliderSpecs()
    this.colliders.push(...this.colliderSpecs)

    this.#buildSideRoads()
    HOAN_KIEM_URBAN_CLUSTERS.forEach((layout) => this.#buildCluster(layout))
    this.#buildSharedStreetProps()
    this.#buildStreetNameSigns()
  }

  updateVisibility(playerPosition, active = true) {
    for (const entry of this.clusterGroups) {
      if (!active || !playerPosition) {
        entry.group.visible = Boolean(active)
        continue
      }
      const dx = playerPosition.x - entry.center[0]
      const dz = playerPosition.z - entry.center[1]
      const threshold = entry.activationRadius + (entry.group.visible ? 10 : 0)
      entry.group.visible = dx * dx + dz * dz <= threshold ** 2
    }
    this.propsGroup.visible = Boolean(active)
    this.roadGroup.visible = Boolean(active)
  }

  #buildSideRoads() {
    this.roadGroup = new THREE.Group()
    this.roadGroup.name = 'Ngõ và đường phụ Hoàn Kiếm mở rộng'
    this.group.add(this.roadGroup)

    const curbs = []
    HOAN_KIEM_URBAN_SIDE_ROADS.forEach((road) => {
      this.kit.box(this.roadGroup, {
        name: road.name,
        size: [road.width, 0.07, road.depth],
        position: [road.x, 0.012, road.z],
        material: 'asphalt',
        receiveShadow: true,
      })
      const horizontal = road.orientation === 'horizontal'
      for (const side of [-1, 1]) {
        curbs.push({
          size: horizontal
            ? [road.width, 0.16, 0.28]
            : [0.28, 0.16, road.depth],
          position: horizontal
            ? [road.x, 0.09, road.z + side * (road.depth / 2 + 0.18)]
            : [road.x + side * (road.width / 2 + 0.18), 0.09, road.z],
        })
      }
    })
    this.kit.instancedBoxes(this.roadGroup, {
      name: 'Bó vỉa ngõ và đường phụ mở rộng',
      material: 'curb',
      instances: curbs,
    })
  }

  #buildCluster(layout) {
    const group = new THREE.Group()
    group.name = layout.name
    group.userData.urbanClusterId = layout.id
    this.group.add(group)
    this.clusterGroups.push({ ...layout, group })

    const details = new Map()
    layout.buildings.forEach((building, index) => {
      this.#buildHouse(group, details, building, index)
    })

    details.forEach((instances, material) => {
      this.kit.instancedBoxes(group, {
        name: `${layout.name} · chi tiết ${material}`,
        material,
        instances,
        receiveShadow: true,
      })
    })
  }

  #buildHouse(parent, details, building, localIndex) {
    const footprint = getUrbanBuildingFootprint(building)
    const front = getFacade(building)

    this.kit.box(parent, {
      name: building.name,
      size: [footprint.width, building.height, footprint.depth],
      position: [building.x, building.height / 2, building.z],
      material: building.material,
      castShadow: localIndex === 0,
    })
    this.kit.box(parent, {
      name: `Chân tường · ${building.id}`,
      size: [footprint.width + 0.08, 0.48, footprint.depth + 0.08],
      position: [building.x, 0.24, building.z],
      material: 'stoneDark',
    })
    this.kit.box(parent, {
      name: `Gờ mái · ${building.id}`,
      size: [footprint.width + 0.34, 0.3, footprint.depth + 0.34],
      position: [building.x, building.height + 0.05, building.z],
      material: 'stoneDark',
      castShadow: localIndex === 0,
    })

    this.#pushFacadeBox(details, 'stoneDark', building, {
      tangentLength: 0.2,
      height: building.height - 0.65,
      normalDepth: 0.22,
      tangentOffset: -building.width / 2 + 0.18,
      y: building.height / 2 + 0.16,
      outwardOffset: 0.06,
    })
    this.#pushFacadeBox(details, 'stoneDark', building, {
      tangentLength: 0.2,
      height: building.height - 0.65,
      normalDepth: 0.22,
      tangentOffset: building.width / 2 - 0.18,
      y: building.height / 2 + 0.16,
      outwardOffset: 0.06,
    })
    this.#pushFacadeBox(details, 'stoneDark', building, {
      tangentLength: building.width + 0.12,
      height: 0.22,
      normalDepth: 0.3,
      y: 4.14,
      outwardOffset: 0.08,
    })

    const floors = Math.max(1, Math.floor((building.height - 3.9) / 2.55))
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 5.15 + floor * 2.48
      if (y > building.height - 0.9) break
      for (const side of [-1, 1]) {
        const tangentOffset = side * Math.min(building.width * 0.25, 3.6)
        this.#pushFacadeBox(details, 'stoneDark', building, {
          tangentLength: 1.78,
          height: 1.78,
          normalDepth: 0.13,
          tangentOffset,
          y,
          outwardOffset: 0.075,
        })
        this.#pushFacadeBox(
          details,
          (floor + localIndex + side) % 4 === 0 ? 'warmGlass' : 'glass',
          building,
          {
            tangentLength: 1.48,
            height: 1.48,
            normalDepth: 0.1,
            tangentOffset,
            y,
            outwardOffset: 0.15,
          },
        )
        this.#pushFacadeBox(details, 'stoneLight', building, {
          tangentLength: 1.9,
          height: 0.12,
          normalDepth: 0.34,
          tangentOffset,
          y: y - 0.93,
          outwardOffset: 0.14,
        })
      }

      if ((floor + localIndex) % 2 === 0) {
        this.#addBalconyDetails(details, building, y - 0.98)
      } else {
        this.#pushFacadeBox(details, 'stoneLight', building, {
          tangentLength: 1.02,
          height: 0.58,
          normalDepth: 0.38,
          tangentOffset: building.width * 0.31,
          y: y - 0.55,
          outwardOffset: 0.23,
        })
        for (const offset of [-0.3, -0.1, 0.1, 0.3]) {
          this.#pushFacadeBox(details, 'stoneDark', building, {
            tangentLength: 0.045,
            height: 0.42,
            normalDepth: 0.04,
            tangentOffset: building.width * 0.31 + offset,
            y: y - 0.55,
            outwardOffset: 0.44,
          })
        }
      }
    }
    this.#addSideWallDetails(details, building, floors, localIndex)

    if (!building.sign) {
      this.#pushFacadeBox(details, 'greenDoor', building, {
        tangentLength: 1.55,
        height: 2.72,
        normalDepth: 0.14,
        tangentOffset: -building.width * 0.22,
        y: 1.5,
        outwardOffset: 0.12,
      })
      this.#pushFacadeBox(details, 'glass', building, {
        tangentLength: Math.max(1.9, building.width * 0.34),
        height: 1.92,
        normalDepth: 0.14,
        tangentOffset: building.width * 0.18,
        y: 1.65,
        outwardOffset: 0.12,
      })
      if (building.variant === 'awning') {
        this.#pushFacadeBox(details, 'greenDoor', building, {
          tangentLength: building.width * 0.76,
          height: 0.15,
          normalDepth: 1.24,
          y: 3.28,
          outwardOffset: 0.55,
        })
      }
    } else {
      const signPosition = [
        front.x + front.outward[0] * 0.24,
        3.78,
        front.z + front.outward[1] * 0.24,
      ]
      this.kit.sign(parent, {
        text: building.sign,
        width: Math.min(6, building.width - 0.7),
        height: 0.72,
        position: signPosition,
        rotation: [0, front.signRotationY, 0],
        background: building.signColor,
        foreground: '#f5e5bd',
      })
      this.shopManager?.addShop({
        id: `urban-${building.id}`,
        parent,
        sign: building.sign,
        width: Math.min(6.2, building.width - 0.45),
        position: [
          front.x + front.outward[0] * 0.08,
          0,
          front.z + front.outward[1] * 0.08,
        ],
        rotationY: front.shopRotationY,
      })
    }

    if (building.roof === 'tile') {
      const roof = this.kit.gable(parent, {
        name: `Mái ngói · ${building.id}`,
        width: building.width + 0.5,
        height: 1.3,
        depth: building.depth + 0.5,
        position: [building.x, building.height + 0.18, building.z],
        material: 'brick',
        castShadow: localIndex === 0,
      })
      if (front.outward[0] !== 0) roof.rotation.y = Math.PI / 2
    } else {
      for (const side of [-1, 1]) {
        const alongX = front.outward[0] === 0
        this.kit.box(parent, {
          name: `Tường sân thượng · ${building.id}`,
          size: alongX
            ? [0.2, 0.72, footprint.depth]
            : [footprint.width, 0.72, 0.2],
          position: alongX
            ? [building.x + side * (footprint.width / 2 - 0.1), building.height + 0.42, building.z]
            : [building.x, building.height + 0.42, building.z + side * (footprint.depth / 2 - 0.1)],
          material: building.material,
        })
      }
    }
  }

  #addBalconyDetails(details, building, y) {
    const balconyWidth = Math.min(building.width - 1, 6.4)
    this.#pushFacadeBox(details, 'stoneDark', building, {
      tangentLength: balconyWidth,
      height: 0.16,
      normalDepth: 0.92,
      y,
      outwardOffset: 0.43,
    })
    this.#pushFacadeBox(details, 'metal', building, {
      tangentLength: balconyWidth,
      height: 0.08,
      normalDepth: 0.08,
      y: y + 0.82,
      outwardOffset: 0.88,
    })
    for (let offset = -balconyWidth / 2; offset <= balconyWidth / 2; offset += 0.62) {
      this.#pushFacadeBox(details, 'metal', building, {
        tangentLength: 0.05,
        height: 0.76,
        normalDepth: 0.05,
        tangentOffset: offset,
        y: y + 0.42,
        outwardOffset: 0.88,
      })
    }
  }

  #addSideWallDetails(details, building, floors, localIndex) {
    const facade = getFacade(building)
    const tangentIsX = facade.tangent[0] !== 0
    const visibleFloorCount = Math.min(3, floors)
    for (const side of [-1, 1]) {
      for (let floor = 0; floor < visibleFloorCount; floor += 1) {
        const y = 5.15 + floor * 2.48
        if (y > building.height - 0.9) continue
        for (const normalOffset of [-building.depth * 0.22, building.depth * 0.2]) {
          const frame = {
            size: tangentIsX ? [0.13, 1.7, 1.72] : [1.72, 1.7, 0.13],
            position: [
              building.x
                + facade.tangent[0] * side * (building.width / 2 + 0.055)
                + facade.outward[0] * normalOffset,
              y,
              building.z
                + facade.tangent[1] * side * (building.width / 2 + 0.055)
                + facade.outward[1] * normalOffset,
            ],
          }
          const glass = {
            size: tangentIsX ? [0.1, 1.4, 1.42] : [1.42, 1.4, 0.1],
            position: [
              frame.position[0] + facade.tangent[0] * side * 0.075,
              y,
              frame.position[2] + facade.tangent[1] * side * 0.075,
            ],
          }
          const frameBucket = details.get('stoneDark') ?? []
          frameBucket.push(frame)
          details.set('stoneDark', frameBucket)
          const glassMaterial = (floor + localIndex + side) % 5 === 0
            ? 'warmGlass'
            : 'glass'
          const glassBucket = details.get(glassMaterial) ?? []
          glassBucket.push(glass)
          details.set(glassMaterial, glassBucket)
        }
      }

      const band = {
        size: tangentIsX
          ? [0.18, 0.2, building.depth + 0.08]
          : [building.depth + 0.08, 0.2, 0.18],
        position: [
          building.x + facade.tangent[0] * side * (building.width / 2 + 0.075),
          4.14,
          building.z + facade.tangent[1] * side * (building.width / 2 + 0.075),
        ],
      }
      const bandBucket = details.get('stoneDark') ?? []
      bandBucket.push(band)
      details.set('stoneDark', bandBucket)
    }
  }

  #pushFacadeBox(details, material, building, options) {
    const facade = getFacade(building)
    const facesXAxis = facade.outward[0] !== 0
    const instance = {
      size: facesXAxis
        ? [options.normalDepth, options.height, options.tangentLength]
        : [options.tangentLength, options.height, options.normalDepth],
      position: [
        facade.x
          + facade.tangent[0] * (options.tangentOffset ?? 0)
          + facade.outward[0] * options.outwardOffset,
        options.y,
        facade.z
          + facade.tangent[1] * (options.tangentOffset ?? 0)
          + facade.outward[1] * options.outwardOffset,
      ],
    }
    const bucket = details.get(material) ?? []
    bucket.push(instance)
    details.set(material, bucket)
  }

  #buildSharedStreetProps() {
    this.propsGroup = new THREE.Group()
    this.propsGroup.name = 'Cảnh quan có chủ đích quanh Hoàn Kiếm'
    this.group.add(this.propsGroup)

    this.#buildTrees()
    this.#buildBenches()
    this.#buildLamps()
    this.#buildBollards()
    this.#buildMotorbikes()
    this.#buildBinsAndPlanters()
  }

  #buildTrees() {
    const trunks = HOAN_KIEM_URBAN_PROPS.trees.map(([x, z, scale]) => ({
      position: [x, 2.15 * scale, z],
      scale: [0.27 * scale, 4.3 * scale, 0.27 * scale],
    }))
    const lightCanopies = []
    const darkCanopies = []
    HOAN_KIEM_URBAN_PROPS.trees.forEach(([x, z, scale], index) => {
      const target = index % 2 === 0 ? lightCanopies : darkCanopies
      target.push(
        { position: [x - 0.35 * scale, 4.8 * scale, z], scale: [1.5 * scale, 1.35 * scale, 1.4 * scale] },
        { position: [x + 0.85 * scale, 4.45 * scale, z + 0.3 * scale], scale: [1.08 * scale, 1.02 * scale, 1.12 * scale] },
      )
    })
    this.#addInstancedPrimitive('Thân cây dãy phố mở rộng', 'cylinder', 'wood', trunks)
    this.#addInstancedPrimitive('Tán cây sáng dãy phố mở rộng', 'sphere', 'foliageLight', lightCanopies)
    this.#addInstancedPrimitive('Tán cây tối dãy phố mở rộng', 'sphere', 'foliage', darkCanopies)
  }

  #buildBenches() {
    const seats = []
    const backs = []
    const legs = []
    HOAN_KIEM_URBAN_PROPS.benches.forEach(([x, z, rotationY]) => {
      seats.push({ size: [2.35, 0.15, 0.56], position: [x, 0.57, z], rotation: [0, rotationY, 0] })
      const back = rotateOffset(0, 0.25, rotationY)
      backs.push({ size: [2.35, 0.7, 0.13], position: [x + back.x, 0.98, z + back.z], rotation: [0, rotationY, 0] })
      for (const side of [-1, 1]) {
        const leg = rotateOffset(side * 0.82, 0, rotationY)
        legs.push({ size: [0.16, 0.52, 0.42], position: [x + leg.x, 0.28, z + leg.z], rotation: [0, rotationY, 0] })
      }
    })
    this.kit.instancedBoxes(this.propsGroup, { name: 'Mặt ghế dãy phố mở rộng', material: 'wood', instances: seats })
    this.kit.instancedBoxes(this.propsGroup, { name: 'Lưng ghế dãy phố mở rộng', material: 'wood', instances: backs })
    this.kit.instancedBoxes(this.propsGroup, { name: 'Chân ghế dãy phố mở rộng', material: 'metal', instances: legs })
  }

  #buildLamps() {
    this.#addInstancedPrimitive(
      'Cột đèn dãy phố mở rộng',
      'cylinder',
      'metal',
      HOAN_KIEM_URBAN_PROPS.lamps.map(([x, z]) => ({
        position: [x, 2.15, z],
        scale: [0.1, 4.3, 0.1],
      })),
    )
    this.#addInstancedPrimitive(
      'Bóng đèn dãy phố mở rộng',
      'sphere',
      'lampGlow',
      HOAN_KIEM_URBAN_PROPS.lamps.map(([x, z]) => ({
        position: [x, 4.22, z],
        scale: [0.23, 0.2, 0.23],
      })),
    )
    this.kit.instancedBoxes(this.propsGroup, {
      name: 'Vệt sáng đèn dãy phố mở rộng',
      material: 'lampPool',
      instances: HOAN_KIEM_URBAN_PROPS.lamps.map(([x, z]) => ({
        size: [3.2, 0.012, 3.2],
        position: [x, 0.075, z],
      })),
      receiveShadow: false,
    })
  }

  #buildBollards() {
    this.#addInstancedPrimitive(
      'Cọc chắn xe quảng trường Cầu Thê Húc',
      'cylinder',
      'metal',
      HOAN_KIEM_URBAN_PROPS.bollards.map(([x, z]) => ({
        position: [x, 0.46, z],
        scale: [0.21, 0.92, 0.21],
      })),
    )
    this.#addInstancedPrimitive(
      'Đầu phản quang cọc quảng trường Cầu Thê Húc',
      'sphere',
      'whiteMarking',
      HOAN_KIEM_URBAN_PROPS.bollards.map(([x, z]) => ({
        position: [x, 0.94, z],
        scale: [0.25, 0.11, 0.25],
      })),
    )
  }

  #buildMotorbikes() {
    const seats = []
    const stems = []
    const wheels = []
    const bodyMaterials = new Map()
    HOAN_KIEM_URBAN_PROPS.motorbikes.forEach(([x, z, rotationY, material]) => {
      const materialBodies = bodyMaterials.get(material) ?? []
      materialBodies.push({ size: [0.48, 0.44, 1.18], position: [x, 0.72, z], rotation: [0, rotationY, 0] })
      bodyMaterials.set(material, materialBodies)
      seats.push({ size: [0.42, 0.15, 0.7], position: [x, 1.02, z], rotation: [0, rotationY, 0] })
      const stem = rotateOffset(0, -0.48, rotationY)
      stems.push({ size: [0.18, 0.82, 0.18], position: [x + stem.x, 1.08, z + stem.z], rotation: [0, rotationY, 0] })
      for (const localZ of [-0.62, 0.62]) {
        const wheel = rotateOffset(0, localZ, rotationY)
        wheels.push({
          position: [x + wheel.x, 0.33, z + wheel.z],
          scale: [0.29, 0.14, 0.29],
          rotation: [0, rotationY, Math.PI / 2],
        })
      }
    })
    bodyMaterials.forEach((instances, material) => {
      this.kit.instancedBoxes(this.propsGroup, {
        name: `Thân xe máy đỗ · ${material}`,
        material,
        instances,
      })
    })
    this.kit.instancedBoxes(this.propsGroup, { name: 'Yên xe máy đỗ mở rộng', material: 'darkWood', instances: seats })
    this.kit.instancedBoxes(this.propsGroup, { name: 'Cổ xe máy đỗ mở rộng', material: 'metal', instances: stems })
    this.#addInstancedPrimitive('Bánh xe máy đỗ mở rộng', 'cylinder', 'soot', wheels)
  }

  #buildBinsAndPlanters() {
    this.#addInstancedPrimitive(
      'Thùng rác dãy phố mở rộng',
      'cylinder',
      'greenDoor',
      HOAN_KIEM_URBAN_PROPS.bins.map(([x, z]) => ({
        position: [x, 0.42, z],
        scale: [0.34, 0.84, 0.34],
      })),
    )
    this.#addInstancedPrimitive(
      'Chậu cây trang trí quảng trường',
      'cylinder',
      'terracotta',
      HOAN_KIEM_URBAN_PROPS.planters.map(([x, z, scale]) => ({
        position: [x, 0.36 * scale, z],
        scale: [0.58 * scale, 0.72 * scale, 0.58 * scale],
      })),
    )
    this.#addInstancedPrimitive(
      'Cây thấp trong chậu quảng trường',
      'sphere',
      'foliageLight',
      HOAN_KIEM_URBAN_PROPS.planters.map(([x, z, scale]) => ({
        position: [x, 1.28 * scale, z],
        scale: [0.72 * scale, 0.94 * scale, 0.72 * scale],
      })),
    )
  }

  #buildStreetNameSigns() {
    this.kit.sign(this.propsGroup, {
      text: 'PHỐ ĐINH TIÊN HOÀNG',
      width: 3.5,
      height: 0.58,
      position: [185.8, 2.8, 34],
      rotation: [0, -Math.PI / 2, 0],
      background: '#315c55',
      foreground: '#f5e5bd',
    })
    this.kit.sign(this.propsGroup, {
      text: 'PHỐ HÀNG DẦU',
      width: 2.8,
      height: 0.58,
      position: [265.8, 2.8, -56],
      rotation: [0, -Math.PI / 2, 0],
      background: '#315c55',
      foreground: '#f5e5bd',
    })
  }

  #addInstancedPrimitive(name, geometry, material, instances) {
    if (!instances.length) return null
    const mesh = new THREE.InstancedMesh(
      this.kit.geometries.get(geometry),
      this.kit.material(material),
      instances.length,
    )
    mesh.name = name
    mesh.castShadow = false
    mesh.receiveShadow = true
    const transform = new THREE.Object3D()
    instances.forEach((instance, index) => {
      transform.position.set(...instance.position)
      transform.scale.set(...instance.scale)
      transform.rotation.set(
        instance.rotation?.[0] ?? 0,
        instance.rotation?.[1] ?? 0,
        instance.rotation?.[2] ?? 0,
      )
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    this.propsGroup.add(mesh)
    return mesh
  }

  dispose() {
    this.group.removeFromParent()
  }
}

export function createUrbanEdgeColliderSpecs() {
  const buildings = HOAN_KIEM_URBAN_CLUSTERS.flatMap((clusterLayout) => (
    clusterLayout.buildings.map((building) => {
      const footprint = getUrbanBuildingFootprint(building)
      return createCollider(
        footprint.x,
        footprint.z,
        footprint.width,
        footprint.depth,
        building.name,
        'urbanBuilding',
        building.height,
      )
    })
  ))

  const props = [
    ...HOAN_KIEM_URBAN_PROPS.trees.map(([x, z, scale], index) => createCollider(
      x, z, 0.72 * scale, 0.72 * scale, `Cây dãy phố mở rộng ${index + 1}`, 'urbanTree', 4.3 * scale,
    )),
    ...HOAN_KIEM_URBAN_PROPS.benches.map(([x, z, rotationY], index) => {
      const quarterTurn = Math.abs(Math.sin(rotationY)) > 0.5
      return createCollider(
        x, z,
        quarterTurn ? 0.88 : 2.58,
        quarterTurn ? 2.58 : 0.88,
        `Ghế dãy phố mở rộng ${index + 1}`,
        'urbanBench',
        1.35,
      )
    }),
    ...HOAN_KIEM_URBAN_PROPS.lamps.map(([x, z], index) => createCollider(
      x, z, 0.34, 0.34, `Cột đèn dãy phố mở rộng ${index + 1}`, 'urbanLamp', 4.3,
    )),
    ...HOAN_KIEM_URBAN_PROPS.bollards.map(([x, z], index) => createCollider(
      x, z, 0.44, 0.44, `Cọc chắn xe quảng trường ${index + 1}`, 'urbanBollard', 0.92,
    )),
    ...HOAN_KIEM_URBAN_PROPS.motorbikes.map(([x, z, rotationY], index) => {
      const quarterTurn = Math.abs(Math.sin(rotationY)) > 0.5
      return createCollider(
        x, z,
        quarterTurn ? 1.75 : 0.82,
        quarterTurn ? 0.82 : 1.75,
        `Xe máy đỗ mở rộng ${index + 1}`,
        'urbanMotorbike',
        1.52,
      )
    }),
    ...HOAN_KIEM_URBAN_PROPS.bins.map(([x, z], index) => createCollider(
      x, z, 0.72, 0.72, `Thùng rác mở rộng ${index + 1}`, 'urbanBin', 0.84,
    )),
    ...HOAN_KIEM_URBAN_PROPS.planters.map(([x, z, scale], index) => createCollider(
      x, z, 1.05 * scale, 1.05 * scale, `Chậu cây quảng trường ${index + 1}`, 'urbanPlanter', 1.9 * scale,
    )),
  ]
  return [...buildings, ...props]
}

function getFacade(building) {
  const spec = FRONT_SPECS[building.front]
  if (!spec) throw new Error(`Unknown urban facade direction: ${building.front}`)
  return {
    ...spec,
    x: building.x + spec.outward[0] * building.depth / 2,
    z: building.z + spec.outward[1] * building.depth / 2,
  }
}

function rotateOffset(x, z, rotationY) {
  const cosine = Math.cos(rotationY)
  const sine = Math.sin(rotationY)
  return {
    x: x * cosine + z * sine,
    z: -x * sine + z * cosine,
  }
}

function createCollider(x, z, width, depth, name, kind, height) {
  return {
    x,
    z,
    width,
    depth,
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    name,
    kind,
    height,
    minY: 0,
    maxY: height,
    sourceMapId: 'hoanKiem',
  }
}
