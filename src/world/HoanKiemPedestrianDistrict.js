import * as THREE from 'three'
import { HOAN_KIEM_LAKE_OUTLINE } from './map/hoanKiemExpansionLayout.js'
import {
  HOAN_KIEM_BENCH_POSITIONS,
  HOAN_KIEM_BOLLARD_POSITIONS,
  HOAN_KIEM_LAKESIDE_OUTLINE,
  HOAN_KIEM_LAMP_POSITIONS,
  HOAN_KIEM_OUTER_VEHICLE_LANES,
  HOAN_KIEM_PEDESTRIAN_ZONES,
  HOAN_KIEM_TREE_POSITIONS,
} from './map/hoanKiemPedestrianLayout.js'

export class HoanKiemPedestrianDistrict {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.colliders = colliders
    this.group = new THREE.Group()
    this.group.name = 'Không gian phố đi bộ Hồ Gươm'
    parent.add(this.group)

    this.geometries = []
    this.colliderSpecs = createPedestrianColliderSpecs()
    this.colliders.push(...this.colliderSpecs)

    this.#buildLakesidePath()
    this.#buildZoneSurfaces()
    this.#buildZoneMarkings()
    this.#buildTreeGroves()
    this.#buildRestBenches()
    this.#buildLampRows()
    this.#buildBollards()
    this.#buildOuterVehicleMarkings()
  }

  #buildLakesidePath() {
    const geometry = createHorizontalRingGeometry(
      HOAN_KIEM_LAKESIDE_OUTLINE,
      HOAN_KIEM_LAKE_OUTLINE,
    )
    const mesh = new THREE.Mesh(geometry, this.kit.material('sidewalk'))
    mesh.name = 'Lối đi sát mặt hồ'
    mesh.position.y = 0.032
    mesh.receiveShadow = true
    mesh.renderOrder = 2
    this.group.add(mesh)
    this.geometries.push(geometry)
  }

  #buildZoneSurfaces() {
    const zonesByMaterial = new Map()
    HOAN_KIEM_PEDESTRIAN_ZONES.forEach((zone) => {
      const zones = zonesByMaterial.get(zone.material) ?? []
      zones.push(zone)
      zonesByMaterial.set(zone.material, zones)
    })
    zonesByMaterial.forEach((zones, material) => {
      this.kit.instancedBoxes(this.group, {
        name: `Mặt nền zone phố đi bộ · ${material}`,
        material,
        instances: zones.map((zone) => ({
          size: [zone.width, 0.05, zone.depth],
          position: [zone.x, 0.046, zone.z],
        })),
        receiveShadow: true,
      })
    })
  }

  #buildZoneMarkings() {
    const markings = []
    const zone = (kind) => HOAN_KIEM_PEDESTRIAN_ZONES.find(
      (entry) => entry.kind === kind,
    )

    addRectOutline(markings, zone('performance'), 0.18)
    addCornerMarks(markings, zone('crowd'), 3)
    addCornerMarks(markings, zone('portrait'), 2)
    addCornerMarks(markings, zone('photo'), 2.2)
    addCornerMarks(markings, zone('iceCream'), 1.8)

    const stallZone = zone('reservedStalls')
    for (let index = -2; index <= 2; index += 1) {
      const centerX = stallZone.x + index * 6
      markings.push(
        {
          size: [4.2, 0.018, 0.12],
          position: [centerX, 0.082, stallZone.z - 2.6],
        },
        {
          size: [0.12, 0.018, 5.2],
          position: [centerX - 2.1, 0.082, stallZone.z],
        },
        {
          size: [0.12, 0.018, 5.2],
          position: [centerX + 2.1, 0.082, stallZone.z],
        },
      )
    }

    this.kit.instancedBoxes(this.group, {
      name: 'Vạch phân khu phố đi bộ',
      material: 'whiteMarking',
      instances: markings,
      receiveShadow: false,
    })
  }

  #buildTreeGroves() {
    const trunks = []
    const darkCanopies = []
    const lightCanopies = []

    HOAN_KIEM_TREE_POSITIONS.forEach(([x, z, scale], index) => {
      trunks.push({
        position: [x, 2.05 * scale, z],
        scale: [0.25 * scale, 4.1 * scale, 0.25 * scale],
      })
      const canopies = index % 2 === 0 ? lightCanopies : darkCanopies
      canopies.push(
        {
          position: [x - 0.28 * scale, 4.55 * scale, z],
          scale: [1.55 * scale, 1.32 * scale, 1.42 * scale],
        },
        {
          position: [x + 0.9 * scale, 4.2 * scale, z + 0.35 * scale],
          scale: [1.05 * scale, 0.98 * scale, 1.14 * scale],
        },
      )
    })

    this.#addInstancedGeometry({
      name: 'Thân hàng cây phố đi bộ',
      geometry: 'cylinder',
      material: 'wood',
      instances: trunks,
    })
    this.#addInstancedGeometry({
      name: 'Tán cây sáng phố đi bộ',
      geometry: 'sphere',
      material: 'foliageLight',
      instances: lightCanopies,
    })
    this.#addInstancedGeometry({
      name: 'Tán cây tối phố đi bộ',
      geometry: 'sphere',
      material: 'foliage',
      instances: darkCanopies,
    })
  }

  #buildRestBenches() {
    const seats = []
    const backs = []
    const legs = []
    HOAN_KIEM_BENCH_POSITIONS.forEach(([x, z, rotationY]) => {
      seats.push({
        size: [2.4, 0.16, 0.58],
        position: [x, 0.55, z],
        rotation: [0, rotationY, 0],
      })
      const back = rotateOffset(0, 0.26, rotationY)
      backs.push({
        size: [2.4, 0.78, 0.14],
        position: [x + back.x, 0.94, z + back.z],
        rotation: [0, rotationY, 0],
      })
      for (const offsetX of [-0.84, 0.84]) {
        const leg = rotateOffset(offsetX, 0, rotationY)
        legs.push({
          size: [0.18, 0.52, 0.46],
          position: [x + leg.x, 0.27, z + leg.z],
          rotation: [0, rotationY, 0],
        })
      }
    })

    this.kit.instancedBoxes(this.group, {
      name: 'Mặt ghế khu nghỉ',
      material: 'stoneLight',
      instances: seats,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Lưng ghế khu nghỉ',
      material: 'stoneWarm',
      instances: backs,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Chân ghế khu nghỉ',
      material: 'stoneDark',
      instances: legs,
    })
  }

  #buildLampRows() {
    const posts = HOAN_KIEM_LAMP_POSITIONS.map(([x, z]) => ({
      position: [x, 2.1, z],
      scale: [0.1, 4.2, 0.1],
    }))
    const globes = HOAN_KIEM_LAMP_POSITIONS.map(([x, z]) => ({
      position: [x, 4.12, z],
      scale: [0.24, 0.22, 0.24],
    }))
    const pools = HOAN_KIEM_LAMP_POSITIONS.map(([x, z]) => ({
      size: [3.4, 0.012, 3.4],
      position: [x, 0.075, z],
    }))

    this.#addInstancedGeometry({
      name: 'Cột đèn phố đi bộ',
      geometry: 'cylinder',
      material: 'metal',
      instances: posts,
    })
    this.#addInstancedGeometry({
      name: 'Bóng đèn phố đi bộ',
      geometry: 'sphere',
      material: 'lampGlow',
      instances: globes,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Vệt sáng đèn phố đi bộ',
      material: 'lampPool',
      instances: pools,
      receiveShadow: false,
    })
  }

  #buildBollards() {
    const bodies = HOAN_KIEM_BOLLARD_POSITIONS.map(([x, z]) => ({
      position: [x, 0.44, z],
      scale: [0.22, 0.88, 0.22],
    }))
    const caps = HOAN_KIEM_BOLLARD_POSITIONS.map(([x, z]) => ({
      position: [x, 0.91, z],
      scale: [0.27, 0.12, 0.27],
    }))
    this.#addInstancedGeometry({
      name: 'Cọc phân tách phố đi bộ',
      geometry: 'cylinder',
      material: 'metal',
      instances: bodies,
    })
    this.#addInstancedGeometry({
      name: 'Đầu phản quang cọc phố đi bộ',
      geometry: 'sphere',
      material: 'whiteMarking',
      instances: caps,
    })
  }

  #buildOuterVehicleMarkings() {
    const instances = []
    HOAN_KIEM_OUTER_VEHICLE_LANES.forEach((lane) => {
      const horizontal = lane.orientation === 'horizontal'
      const length = horizontal ? lane.width : lane.depth
      const count = Math.max(1, Math.floor((length - 12) / 10))
      for (let index = 0; index < count; index += 1) {
        const offset = (index - (count - 1) / 2) * 10
        instances.push({
          size: horizontal ? [4.2, 0.018, 0.14] : [0.14, 0.018, 4.2],
          position: horizontal
            ? [lane.x + offset, 0.025, lane.z]
            : [lane.x, 0.025, lane.z + offset],
        })
      }
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Vạch lối phương tiện vòng ngoài',
      material: 'whiteMarking',
      instances,
      receiveShadow: false,
    })
  }

  #addInstancedGeometry({
    name,
    geometry,
    material,
    instances,
    castShadow = false,
  }) {
    if (!instances.length) return null
    const mesh = new THREE.InstancedMesh(
      this.kit.geometries.get(geometry),
      this.kit.material(material),
      instances.length,
    )
    mesh.name = name
    mesh.castShadow = castShadow
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
    this.group.add(mesh)
    return mesh
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.group.removeFromParent()
  }
}

export function createPedestrianColliderSpecs() {
  return [
    ...HOAN_KIEM_TREE_POSITIONS.map(([x, z, scale], index) => createCollider(
      x,
      z,
      0.7 * scale,
      0.7 * scale,
      `Hàng cây phố đi bộ ${index + 1}`,
      'pedestrianTree',
    )),
    ...HOAN_KIEM_BENCH_POSITIONS.map(([x, z, rotationY], index) => {
      const quarterTurn = Math.abs(Math.sin(rotationY)) > 0.5
      return createCollider(
        x,
        z,
        quarterTurn ? 0.9 : 2.65,
        quarterTurn ? 2.65 : 0.9,
        `Ghế nghỉ phố đi bộ ${index + 1}`,
        'pedestrianBench',
      )
    }),
    ...HOAN_KIEM_LAMP_POSITIONS.map(([x, z], index) => createCollider(
      x,
      z,
      0.34,
      0.34,
      `Cột đèn phố đi bộ ${index + 1}`,
      'pedestrianLamp',
    )),
    ...HOAN_KIEM_BOLLARD_POSITIONS.map(([x, z], index) => createCollider(
      x,
      z,
      0.44,
      0.44,
      `Cọc chắn xe phố đi bộ ${index + 1}`,
      'pedestrianBollard',
    )),
  ]
}

function createCollider(x, z, width, depth, name, kind) {
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
    sourceMapId: 'hoanKiem',
  }
}

function createHorizontalRingGeometry(outer, inner) {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)))
  shape.holes.push(new THREE.Path(
    inner.map(([x, z]) => new THREE.Vector2(x, -z)),
  ))
  const geometry = new THREE.ShapeGeometry(shape, 8)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function addRectOutline(instances, zone, thickness) {
  instances.push(
    {
      size: [zone.width, 0.018, thickness],
      position: [zone.x, 0.082, zone.z - zone.depth / 2 + thickness / 2],
    },
    {
      size: [zone.width, 0.018, thickness],
      position: [zone.x, 0.082, zone.z + zone.depth / 2 - thickness / 2],
    },
    {
      size: [thickness, 0.018, zone.depth],
      position: [zone.x - zone.width / 2 + thickness / 2, 0.082, zone.z],
    },
    {
      size: [thickness, 0.018, zone.depth],
      position: [zone.x + zone.width / 2 - thickness / 2, 0.082, zone.z],
    },
  )
}

function addCornerMarks(instances, zone, size) {
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const x = zone.x + sideX * (zone.width / 2 - size / 2)
      const z = zone.z + sideZ * (zone.depth / 2 - size / 2)
      instances.push(
        {
          size: [size, 0.018, 0.12],
          position: [x, 0.082, z + sideZ * (size / 2 - 0.06)],
        },
        {
          size: [0.12, 0.018, size],
          position: [x + sideX * (size / 2 - 0.06), 0.082, z],
        },
      )
    }
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
