import * as THREE from 'three'
import {
  HOAN_KIEM_PHOTO_COMPOSITION_TREES,
  HOAN_KIEM_PHOTO_HANGING_SIGNS,
  HOAN_KIEM_PHOTO_PUDDLES,
  HOAN_KIEM_PHOTO_REFLECTION_STRIPS,
} from './map/hoanKiemPhotoViewpoints.js'

const CLUSTER_LAYOUTS = Object.freeze([
  { id: 'bridge-foliage', name: 'Khung tán lá Cầu Thê Húc', center: [156, 59], radius: 92 },
  { id: 'lake-reflection', name: 'Lớp phản chiếu Tháp Rùa', center: [103, -8], radius: 120 },
  { id: 'old-quarter', name: 'Lớp ảnh Phố Cổ', center: [252, -8], radius: 105 },
  { id: 'cafe-frame', name: 'Khung nhìn quán cà phê bờ hồ', center: [67, -27], radius: 70 },
])

export class HoanKiemPhotoCompositions {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Bố cục góc chụp Hoàn Kiếm'
    parent.add(this.group)

    this.geometries = []
    this.materials = []
    this.clusterGroups = new Map(CLUSTER_LAYOUTS.map((layout) => {
      const group = new THREE.Group()
      group.name = layout.name
      group.userData.photoCompositionClusterId = layout.id
      this.group.add(group)
      return [layout.id, { ...layout, group }]
    }))

    this.colliderSpecs = createPhotoCompositionColliderSpecs()
    colliders.push(...this.colliderSpecs)

    this.#buildBridgeFoliage()
    this.#buildTowerReflection()
    this.#buildOldQuarterPuddles()
    this.#buildOldQuarterSignLayers()
    this.#buildSunsetWires()
    this.#buildCafeFrame()
  }

  updateVisibility(playerPosition, active = true) {
    this.group.visible = Boolean(active)
    if (!active) return

    for (const entry of this.clusterGroups.values()) {
      if (!playerPosition) {
        entry.group.visible = true
        continue
      }
      const dx = playerPosition.x - entry.center[0]
      const dz = playerPosition.z - entry.center[1]
      const threshold = entry.radius + (entry.group.visible ? 10 : 0)
      entry.group.visible = dx * dx + dz * dz <= threshold ** 2
    }
  }

  #cluster(id) {
    return this.clusterGroups.get(id).group
  }

  #buildBridgeFoliage() {
    const parent = this.#cluster('bridge-foliage')
    const trunks = []
    const darkCanopies = []
    const lightCanopies = []

    HOAN_KIEM_PHOTO_COMPOSITION_TREES.forEach((tree) => {
      const [x, z] = tree.position
      const { scale } = tree
      trunks.push({
        position: [x, 2.15 * scale, z],
        scale: [0.27 * scale, 4.3 * scale, 0.27 * scale],
      })
      const target = tree.material === 'foliageLight' ? lightCanopies : darkCanopies
      target.push(
        {
          position: [x - 0.35 * scale, 4.65 * scale, z],
          scale: [1.72 * scale, 1.5 * scale, 1.6 * scale],
        },
        {
          position: [x + 1.05 * scale, 4.3 * scale, z + 0.42 * scale],
          scale: [1.16 * scale, 1.08 * scale, 1.25 * scale],
        },
      )
    })

    this.#addInstancedGeometry(parent, {
      name: 'Thân cây tạo khung Cầu Thê Húc',
      geometry: 'cylinder',
      material: 'wood',
      instances: trunks,
    })
    this.#addInstancedGeometry(parent, {
      name: 'Tán cây tối tạo khung Cầu Thê Húc',
      geometry: 'sphere',
      material: 'foliageDark',
      instances: darkCanopies,
    })
    this.#addInstancedGeometry(parent, {
      name: 'Tán cây sáng tạo khung Cầu Thê Húc',
      geometry: 'sphere',
      material: 'foliageLight',
      instances: lightCanopies,
    })
  }

  #buildTowerReflection() {
    this.kit.instancedBoxes(this.#cluster('lake-reflection'), {
      name: 'Vệt phản chiếu dài dẫn mắt tới Tháp Rùa',
      material: 'waterReflection',
      instances: HOAN_KIEM_PHOTO_REFLECTION_STRIPS,
      receiveShadow: false,
    })
  }

  #buildOldQuarterPuddles() {
    const parent = this.#cluster('old-quarter')
    this.kit.instancedBoxes(parent, {
      name: 'Vũng nước nhỏ trên phố cũ',
      material: 'lakeWater',
      instances: HOAN_KIEM_PHOTO_PUDDLES.map((puddle) => ({
        size: puddle.size,
        position: puddle.position,
        rotation: [0, puddle.rotationY, 0],
      })),
      receiveShadow: false,
    })
    this.kit.instancedBoxes(parent, {
      name: 'Vệt đèn phản chiếu trong vũng nước',
      material: 'waterReflection',
      instances: HOAN_KIEM_PHOTO_PUDDLES.map((puddle, index) => ({
        size: [puddle.size[0] * 0.16, 0.012, puddle.size[2] * 0.84],
        position: [puddle.position[0] + 0.45 - index * 0.25, 0.088, puddle.position[2]],
        rotation: [0, puddle.rotationY, 0],
      })),
      receiveShadow: false,
    })
  }

  #buildOldQuarterSignLayers() {
    const parent = this.#cluster('old-quarter')
    const brackets = []
    HOAN_KIEM_PHOTO_HANGING_SIGNS.forEach((sign) => {
      this.kit.sign(parent, {
        text: sign.text,
        width: sign.width,
        height: sign.height,
        position: sign.position,
        rotation: [0, sign.rotationY, 0],
        background: sign.background,
        foreground: '#f4e3bd',
      })
      brackets.push(
        {
          size: [1.3, 0.06, 0.06],
          position: [sign.position[0] + 0.62, sign.position[1] + sign.height * 0.42, sign.position[2]],
          rotation: [0, sign.rotationY, 0],
        },
        {
          size: [0.06, 0.52, 0.06],
          position: [sign.position[0] + 1.2, sign.position[1] + 0.24, sign.position[2]],
        },
      )
    })
    this.kit.instancedBoxes(parent, {
      name: 'Tay treo biển hiệu nhiều lớp',
      material: 'metal',
      instances: brackets,
    })
  }

  #buildSunsetWires() {
    const parent = this.#cluster('old-quarter')
    const material = new THREE.LineBasicMaterial({
      color: 0x292d2d,
      transparent: true,
      opacity: 0.82,
    })
    this.materials.push(material)
    ;[
      [[231, 7.1, 24], [231, 6.75, 35], [231, 7.15, 47]],
      [[219, 8.2, 23], [219, 7.78, 35], [219, 8.18, 48]],
      [[207, 6.7, 24], [207, 6.42, 35], [207, 6.75, 46]],
    ].forEach((points, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((point) => new THREE.Vector3(...point)),
      )
      const line = new THREE.Line(geometry, material)
      line.name = `Dây điện tạo lớp hoàng hôn ${index + 1}`
      parent.add(line)
      this.geometries.push(geometry)
    })
  }

  #buildCafeFrame() {
    this.kit.instancedBoxes(this.#cluster('cafe-frame'), {
      name: 'Khung hiên nhìn từ quán cà phê ra phố',
      material: 'darkWood',
      instances: [
        { size: [0.14, 3.35, 0.18], position: [67.55, 1.68, -30.15] },
        { size: [0.14, 3.35, 0.18], position: [67.55, 1.68, -23.85] },
        { size: [0.16, 0.16, 6.5], position: [67.55, 3.33, -27] },
      ],
    })
    this.kit.instancedBoxes(this.#cluster('cafe-frame'), {
      name: 'Ánh ấm trên khung hiên cà phê',
      material: 'warmGlass',
      instances: [
        { size: [0.035, 2.7, 0.04], position: [67.48, 1.65, -30] },
        { size: [0.035, 2.7, 0.04], position: [67.48, 1.65, -24] },
      ],
      receiveShadow: false,
    })
  }

  #addInstancedGeometry(parent, {
    name,
    geometry,
    material,
    instances,
  }) {
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
    parent.add(mesh)
    return mesh
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.group.removeFromParent()
  }
}

export function createPhotoCompositionColliderSpecs() {
  return HOAN_KIEM_PHOTO_COMPOSITION_TREES.map((tree, index) => {
    const [x, z] = tree.position
    const width = 0.72 * tree.scale
    return {
      x,
      z,
      width,
      depth: width,
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - width / 2,
      maxZ: z + width / 2,
      minY: 0,
      maxY: 4.3 * tree.scale,
      height: 4.3 * tree.scale,
      name: `Cây tạo khung Cầu Thê Húc ${index + 1}`,
      kind: 'photoCompositionTree',
      sourceMapId: 'hoanKiem',
      sourceId: tree.id,
    }
  })
}
