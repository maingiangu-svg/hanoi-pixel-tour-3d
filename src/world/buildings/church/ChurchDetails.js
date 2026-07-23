import * as THREE from 'three'
import { CHURCH_MATERIALS } from './ChurchMaterials.js'

const FALLBACK_GEOMETRIES = new WeakMap()

function cachedGeometry(kit, key, factory) {
  const cacheKey = `church-${key}`
  if (kit.geometries?.has(cacheKey)) return kit.geometries.get(cacheKey)

  if (kit.geometries?.set) {
    const geometry = factory()
    kit.geometries.set(cacheKey, geometry)
    return geometry
  }

  let cache = FALLBACK_GEOMETRIES.get(kit)
  if (!cache) {
    cache = new Map()
    FALLBACK_GEOMETRIES.set(kit, cache)
  }
  if (!cache.has(cacheKey)) cache.set(cacheKey, factory())
  return cache.get(cacheKey)
}

function pointedGeometry(kit) {
  return cachedGeometry(kit, 'pointed-lancet', () => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.5, 0)
    shape.lineTo(-0.5, 0.57)
    shape.bezierCurveTo(-0.5, 0.77, -0.22, 0.94, 0, 1)
    shape.bezierCurveTo(0.22, 0.94, 0.5, 0.77, 0.5, 0.57)
    shape.lineTo(0.5, 0)
    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 1,
      steps: 1,
      curveSegments: 5,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, -0.5)
    geometry.computeVertexNormals()
    return geometry
  })
}

function circleGeometry(kit) {
  return cachedGeometry(
    kit,
    'detail-disc',
    () => new THREE.CylinderGeometry(1, 1, 1, 32),
  )
}

function ringGeometry(kit) {
  return cachedGeometry(
    kit,
    'detail-ring',
    () => new THREE.TorusGeometry(1, 0.075, 8, 40),
  )
}

function pointedMesh(kit, {
  name,
  width,
  height,
  depth,
  y = 0,
  z = 0,
  material,
  castShadow = false,
}) {
  const mesh = new THREE.Mesh(pointedGeometry(kit), kit.material(material))
  mesh.name = name
  mesh.scale.set(width, height, depth)
  mesh.position.set(0, y, z)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  return mesh
}

function groupInstancesBy(instances, key) {
  const groups = new Map()
  for (const instance of instances) {
    const value = instance[key]
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(instance)
  }
  return groups
}

function addInstancedLayer({
  kit,
  parent,
  name,
  geometry,
  material,
  instances,
  castShadow = false,
  getTransform,
}) {
  if (instances.length === 0) return null

  const mesh = new THREE.InstancedMesh(
    geometry,
    kit.material(material),
    instances.length,
  )
  mesh.name = name
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)

  const transform = new THREE.Object3D()
  instances.forEach((instance, index) => {
    const { position, rotationY, scale } = getTransform(instance)
    transform.position.set(position[0], position[1], position[2])
    transform.rotation.set(0, rotationY, 0)
    transform.scale.set(scale[0], scale[1], scale[2])
    transform.updateMatrix()
    mesh.setMatrixAt(index, transform.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
  parent.add(mesh)
  return mesh
}

function layerTransform(instance, {
  width,
  height,
  depth,
  yOffset = 0,
  zOffset = 0,
}) {
  const [x, y, z] = instance.position
  const rotationY = instance.rotationY
  return {
    position: [
      x + Math.sin(rotationY) * zOffset,
      y + yOffset,
      z + Math.cos(rotationY) * zOffset,
    ],
    rotationY,
    scale: [width, height, depth],
  }
}

function discMesh(kit, {
  name,
  radius,
  depth,
  position = [0, 0, 0],
  material,
  castShadow = false,
}) {
  const mesh = new THREE.Mesh(circleGeometry(kit), kit.material(material))
  mesh.name = name
  mesh.scale.set(radius, depth, radius)
  mesh.position.set(...position)
  mesh.rotation.x = Math.PI / 2
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  return mesh
}

function ringMesh(kit, {
  name,
  radius,
  depth = 1,
  position = [0, 0, 0],
  material,
  castShadow = false,
}) {
  const mesh = new THREE.Mesh(ringGeometry(kit), kit.material(material))
  mesh.name = name
  mesh.scale.set(radius, radius, depth)
  mesh.position.set(...position)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  return mesh
}

/**
 * Builds a deep, pointed opening from overlapping layers. Position Y is the
 * bottom of the opening and the finished group faces local +Z.
 */
export function addLayeredLancet({
  kit,
  parent,
  name,
  position: [x, y, z],
  width,
  height,
  rotationY = 0,
  glassMaterial = CHURCH_MATERIALS.glassBlue,
  frameMaterial = CHURCH_MATERIALS.trimStone,
  depth = 0.18,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  group.rotation.y = rotationY
  parent.add(group)

  group.add(pointedMesh(kit, {
    name: `${name} - viền ngoài`,
    width,
    height,
    depth: depth * 1.7,
    z: -depth * 0.28,
    material: CHURCH_MATERIALS.agedStone,
    castShadow: true,
  }))

  const frameHeight = height * 0.91
  group.add(pointedMesh(kit, {
    name: `${name} - viền nổi`,
    width: width * 0.84,
    height: frameHeight,
    depth: depth * 1.35,
    y: height * 0.035,
    z: depth * 0.28,
    material: frameMaterial,
    castShadow: true,
  }))

  const insetHeight = height * 0.79
  group.add(pointedMesh(kit, {
    name: `${name} - lòng cửa`,
    width: width * 0.61,
    height: insetHeight,
    depth,
    y: height * 0.085,
    z: depth * 0.84,
    material: glassMaterial,
  }))

  const mullion = kit.box(group, {
    name: `${name} - đố đứng`,
    size: [Math.max(0.045, width * 0.045), insetHeight * 0.72, depth * 0.42],
    position: [0, height * 0.085 + insetHeight * 0.36, depth * 1.42],
    material: frameMaterial,
  })
  mullion.castShadow = false

  return group
}

/**
 * Batches repeated pointed windows into shared InstancedMesh layers. Instance
 * coordinates match addLayeredLancet: Y is the bottom and the opening faces
 * local +Z before rotationY is applied.
 */
export function addInstancedLancets({
  kit,
  parent,
  name = 'Instanced Gothic lancets',
  instances,
  frameMaterial = CHURCH_MATERIALS.trimStone,
  depth = 0.18,
}) {
  const group = new THREE.Group()
  group.name = name
  parent.add(group)

  const normalized = instances.map((instance, index) => ({
    name: instance.name ?? `${name} ${index + 1}`,
    position: instance.position,
    width: instance.width,
    height: instance.height,
    rotationY: instance.rotationY ?? 0,
    glassMaterial: instance.glassMaterial ?? CHURCH_MATERIALS.glassBlue,
    frameMaterial: instance.frameMaterial ?? frameMaterial,
    depth: instance.depth ?? depth,
  }))
  group.userData.lancetCount = normalized.length

  addInstancedLayer({
    kit,
    parent: group,
    name: `${name} - outer aged frames`,
    geometry: pointedGeometry(kit),
    material: CHURCH_MATERIALS.agedStone,
    instances: normalized,
    castShadow: true,
    getTransform: (instance) => layerTransform(instance, {
      width: instance.width,
      height: instance.height,
      depth: instance.depth * 1.7,
      zOffset: -instance.depth * 0.28,
    }),
  })

  for (const [material, materialInstances] of groupInstancesBy(normalized, 'frameMaterial')) {
    addInstancedLayer({
      kit,
      parent: group,
      name: `${name} - inner frames - ${material}`,
      geometry: pointedGeometry(kit),
      material,
      instances: materialInstances,
      castShadow: true,
      getTransform: (instance) => layerTransform(instance, {
        width: instance.width * 0.84,
        height: instance.height * 0.91,
        depth: instance.depth * 1.35,
        yOffset: instance.height * 0.035,
        zOffset: instance.depth * 0.28,
      }),
    })

    addInstancedLayer({
      kit,
      parent: group,
      name: `${name} - mullions - ${material}`,
      geometry: kit.geometries.get('box'),
      material,
      instances: materialInstances,
      getTransform: (instance) => {
        const insetHeight = instance.height * 0.79
        return layerTransform(instance, {
          width: Math.max(0.045, instance.width * 0.045),
          height: insetHeight * 0.72,
          depth: instance.depth * 0.42,
          yOffset: instance.height * 0.085 + insetHeight * 0.36,
          zOffset: instance.depth * 1.42,
        })
      },
    })
  }

  for (const [material, materialInstances] of groupInstancesBy(normalized, 'glassMaterial')) {
    addInstancedLayer({
      kit,
      parent: group,
      name: `${name} - glass - ${material}`,
      geometry: pointedGeometry(kit),
      material,
      instances: materialInstances,
      getTransform: (instance) => {
        const insetHeight = instance.height * 0.79
        return layerTransform(instance, {
          width: instance.width * 0.61,
          height: insetHeight,
          depth: instance.depth,
          yOffset: instance.height * 0.085,
          zOffset: instance.depth * 0.84,
        })
      },
    })
  }

  return group
}

export function addGothicDoor({
  kit,
  parent,
  name,
  position,
  width,
  height,
  rotationY = 0,
  doubleDoor = true,
}) {
  const group = new THREE.Group()
  group.name = name
  parent.add(group)

  addLayeredLancet({
    kit,
    parent: group,
    name: `${name} - vòm cửa`,
    position,
    width,
    height,
    rotationY,
    glassMaterial: CHURCH_MATERIALS.darkWood,
    frameMaterial: CHURCH_MATERIALS.trimStone,
    depth: 0.24,
  })

  const [x, y, z] = position
  const leafHeight = height * 0.58
  const frontZ = z + 0.38
  if (doubleDoor) {
    kit.box(group, {
      name: `${name} - đường ghép hai cánh`,
      size: [0.065, leafHeight, 0.07],
      position: [x, y + leafHeight / 2, frontZ],
      material: CHURCH_MATERIALS.metal,
    })
  }

  for (const side of doubleDoor ? [-1, 1] : [0]) {
    const leafX = x + side * width * 0.22
    for (const panelY of [0.2, 0.47]) {
      kit.box(group, {
        name: `${name} - ô gỗ chạm`,
        size: [width * (doubleDoor ? 0.29 : 0.58), height * 0.19, 0.055],
        position: [leafX, y + height * panelY, frontZ + 0.045],
        material: CHURCH_MATERIALS.agedStone,
      })
    }
    kit.box(group, {
      name: `${name} - tay nắm`,
      size: [0.07, 0.38, 0.09],
      position: [leafX - side * width * 0.11, y + height * 0.32, frontZ + 0.1],
      material: CHURCH_MATERIALS.metal,
    })
  }

  return group
}

export function addRoseWindow({
  kit,
  parent,
  name = 'Cửa sổ hoa hồng',
  position: [x, y, z],
  radius,
  glassMaterials = [
    CHURCH_MATERIALS.glassRed,
    CHURCH_MATERIALS.glassBlue,
    CHURCH_MATERIALS.glassAmber,
    CHURCH_MATERIALS.glassTeal,
  ],
  spokeCount = 8,
  depth = 0.2,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  parent.add(group)

  group.add(discMesh(kit, {
    name: `${name} - hốc sâu`,
    radius: radius * 1.05,
    depth: depth * 1.65,
    position: [0, 0, -depth * 0.42],
    material: CHURCH_MATERIALS.recess,
  }))
  group.add(discMesh(kit, {
    name: `${name} - kính nền`,
    radius: radius * 0.82,
    depth: depth * 0.62,
    position: [0, 0, depth * 0.45],
    material: glassMaterials[0],
  }))
  group.add(ringMesh(kit, {
    name: `${name} - vành đá sâu`,
    radius,
    depth: 1.45,
    position: [0, 0, depth * 0.12],
    material: CHURCH_MATERIALS.agedStone,
    castShadow: true,
  }))
  group.add(ringMesh(kit, {
    name: `${name} - vành đá trong`,
    radius: radius * 0.72,
    depth: 0.8,
    position: [0, 0, depth * 0.83],
    material: CHURCH_MATERIALS.trimStone,
  }))

  const diameterBars = Math.max(2, Math.ceil(spokeCount / 2))
  for (let index = 0; index < diameterBars; index += 1) {
    const bar = kit.box(group, {
      name: `${name} - nan tracery`,
      size: [Math.max(0.045, radius * 0.055), radius * 1.58, depth * 0.34],
      position: [0, 0, depth * 1.18],
      material: CHURCH_MATERIALS.trimStone,
    })
    bar.rotation.z = (index / diameterBars) * Math.PI
  }

  const petalRadius = radius * 0.17
  const petalOrbit = radius * 0.53
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (index / spokeCount) * Math.PI * 2
    group.add(discMesh(kit, {
      name: `${name} - ô kính cánh ${index + 1}`,
      radius: petalRadius,
      depth: depth * 0.35,
      position: [
        Math.cos(angle) * petalOrbit,
        Math.sin(angle) * petalOrbit,
        depth * 1.32,
      ],
      material: glassMaterials[index % glassMaterials.length],
    }))
  }

  group.add(discMesh(kit, {
    name: `${name} - tâm kính`,
    radius: radius * 0.16,
    depth: depth * 0.45,
    position: [0, 0, depth * 1.45],
    material: glassMaterials[2 % glassMaterials.length],
  }))
  group.add(ringMesh(kit, {
    name: `${name} - vòng tracery giữa`,
    radius: radius * 0.31,
    depth: 0.52,
    position: [0, 0, depth * 1.5],
    material: CHURCH_MATERIALS.trimStone,
  }))

  return group
}

export function addClock({
  kit,
  parent,
  name = 'Đồng hồ Nhà thờ',
  position: [x, y, z],
  radius = 0.82,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  parent.add(group)

  group.add(discMesh(kit, {
    name: `${name} - mặt`,
    radius,
    depth: 0.14,
    material: CHURCH_MATERIALS.trimStone,
    castShadow: true,
  }))
  group.add(ringMesh(kit, {
    name: `${name} - viền`,
    radius,
    depth: 0.72,
    position: [0, 0, 0.11],
    material: CHURCH_MATERIALS.agedStone,
  }))

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const mark = kit.box(group, {
      name: `${name} - vạch giờ ${index + 1}`,
      size: [radius * 0.065, index % 3 === 0 ? radius * 0.24 : radius * 0.16, 0.055],
      position: [
        Math.sin(angle) * radius * 0.72,
        Math.cos(angle) * radius * 0.72,
        0.18,
      ],
      material: CHURCH_MATERIALS.recess,
    })
    mark.rotation.z = -angle
  }

  const addHand = (handName, angle, length, width) => {
    const directionX = Math.sin(angle)
    const directionY = Math.cos(angle)
    const hand = kit.box(group, {
      name: `${name} - ${handName}`,
      size: [width, length, 0.065],
      position: [directionX * length / 2, directionY * length / 2, 0.24],
      material: CHURCH_MATERIALS.metal,
    })
    hand.rotation.z = -angle
  }
  addHand('kim giờ', Math.PI * 0.16, radius * 0.48, radius * 0.075)
  addHand('kim phút', -Math.PI * 0.34, radius * 0.68, radius * 0.052)
  group.add(discMesh(kit, {
    name: `${name} - chốt kim`,
    radius: radius * 0.095,
    depth: 0.08,
    position: [0, 0, 0.29],
    material: CHURCH_MATERIALS.metal,
  }))

  return group
}

export function addStatueNiche({
  kit,
  parent,
  name = 'Hốc tượng trung tâm',
  position: [x, y, z],
  width = 1.35,
  height = 2.45,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  parent.add(group)

  addLayeredLancet({
    kit,
    parent: group,
    name: `${name} - vòm`,
    position: [0, 0, 0],
    width,
    height,
    glassMaterial: CHURCH_MATERIALS.recess,
    frameMaterial: CHURCH_MATERIALS.trimStone,
    depth: 0.2,
  })
  kit.box(group, {
    name: `${name} - bệ tượng`,
    size: [width * 0.72, 0.23, 0.42],
    position: [0, height * 0.17, 0.42],
    material: CHURCH_MATERIALS.trimStone,
    castShadow: true,
  })
  kit.sphere(group, {
    name: `${name} - đầu tượng`,
    scale: [width * 0.105, width * 0.115, width * 0.1],
    position: [0, height * 0.69, 0.45],
    material: CHURCH_MATERIALS.trimStone,
  })
  const body = kit.box(group, {
    name: `${name} - thân tượng`,
    size: [width * 0.3, height * 0.37, 0.24],
    position: [0, height * 0.43, 0.44],
    material: CHURCH_MATERIALS.trimStone,
    castShadow: true,
  })
  body.rotation.z = 0.025
  for (const side of [-1, 1]) {
    const arm = kit.box(group, {
      name: `${name} - tay tượng`,
      size: [width * 0.105, height * 0.3, 0.17],
      position: [side * width * 0.19, height * 0.45, 0.46],
      material: CHURCH_MATERIALS.trimStone,
    })
    arm.rotation.z = side * -0.28
  }

  return group
}

export function addCross({
  kit,
  parent,
  name = 'Thánh giá',
  position: [x, y, z],
  height = 1.7,
  width = 0.95,
  thickness = 0.18,
  material = CHURCH_MATERIALS.trimStone,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  parent.add(group)

  kit.box(group, {
    name: `${name} - trụ đứng`,
    size: [thickness, height, thickness],
    position: [0, 0, 0],
    material,
    castShadow: true,
  })
  kit.box(group, {
    name: `${name} - nhánh ngang`,
    size: [width, thickness, thickness],
    position: [0, height * 0.13, 0],
    material,
    castShadow: true,
  })
  return group
}

export function addWeatheringStreaks({
  kit,
  parent,
  name = 'Vệt phong hóa',
  position: [x, y, z],
  width,
  height,
  count = 7,
  rotationY = 0,
}) {
  const group = new THREE.Group()
  group.name = name
  group.position.set(x, y, z)
  group.rotation.y = rotationY
  parent.add(group)

  for (let index = 0; index < count; index += 1) {
    const normalized = count === 1 ? 0.5 : index / (count - 1)
    const streakHeight = height * (0.22 + ((index * 37) % 53) / 100)
    const streakWidth = Math.max(0.035, width * (0.012 + ((index * 11) % 9) / 500))
    kit.box(group, {
      name: `${name} ${index + 1}`,
      size: [streakWidth, streakHeight, 0.025],
      position: [
        -width / 2 + normalized * width,
        -streakHeight / 2,
        0,
      ],
      material: CHURCH_MATERIALS.agedStone,
      receiveShadow: false,
    })
  }

  return group
}
