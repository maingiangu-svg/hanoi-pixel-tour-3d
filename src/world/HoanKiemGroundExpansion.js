import * as THREE from 'three'
import {
  HOAN_KIEM_BOUNDARY_OPENINGS,
  HOAN_KIEM_EXPANDED_WORLD_BOUNDS,
  HOAN_KIEM_EXPANSION_PLAZAS,
  HOAN_KIEM_EXPANSION_ROADS,
  HOAN_KIEM_LAKE_COLLISION_OPENINGS,
  HOAN_KIEM_LAKE_OUTLINE,
  HOAN_KIEM_PROMENADE_OUTLINE,
} from './map/hoanKiemExpansionLayout.js'
import { HOAN_KIEM_PEDESTRIAN_ZONES } from './map/hoanKiemPedestrianLayout.js'

const LAKE_COLLISION_STEP = 2.2
const LAKE_COLLISION_INSET = 0.42
const LEGACY_WATER_NAMES = new Set([
  'Mặt nước Hồ Gươm',
  'Mặt nước nhánh Đền Ngọc Sơn',
])

export class HoanKiemGroundExpansion {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.colliders = colliders
    this.group = new THREE.Group()
    this.group.name = 'Mặt bằng Hoàn Kiếm mở rộng'
    parent.add(this.group)

    this.geometries = []
    this.materials = []
    this.hiddenLegacyObjects = []
    this.disabledLegacyColliders = []
    this.boundaryReplacementColliders = []

    this.#hideSupersededLakeSurfaces(parent)
    this.#disableSupersededWaterCollision()
    this.#carveExpansionEntrances()
    this.#buildRoadNetwork()
    this.#buildNaturalLake()
    this.#buildLakePromenade()
    this.#buildLakeBoundary()
    this.#buildLakeCollision()
    this.#buildWorldBoundary()
  }

  #hideSupersededLakeSurfaces(parent) {
    parent.traverse((object) => {
      const sourceLake = object.userData?.sourceRef === 'hoanKiem:water-001'
      const sourceRail = object.userData?.sourceRef === 'hoanKiem:decoration-008'
      const legacyWater = LEGACY_WATER_NAMES.has(object.name)
      const legacyRectangularEdge = (
        object.name.startsWith('Bó đá bờ')
        || object.name.startsWith('Lan can bờ')
        || object.name === 'Trụ lan can bờ tây'
      )
      if (!sourceLake && !sourceRail && !legacyWater && !legacyRectangularEdge) return
      if (!object.visible) return
      object.visible = false
      object.userData.hiddenByGroundExpansion = true
      this.hiddenLegacyObjects.push(object)
    })
  }

  #disableSupersededWaterCollision() {
    for (const collider of this.colliders) {
      if (collider.kind !== 'water' && !LEGACY_WATER_NAMES.has(collider.name)) continue
      if (collider.disabled) continue
      collider.disabled = true
      collider.disabledReason = 'Superseded by the natural Hoàn Kiếm lake footprint'
      this.disabledLegacyColliders.push(collider)
    }
  }

  #carveExpansionEntrances() {
    const walkableOpenings = [
      ...HOAN_KIEM_BOUNDARY_OPENINGS,
      ...HOAN_KIEM_EXPANSION_ROADS.map(createRoadWalkableBounds),
      ...HOAN_KIEM_EXPANSION_PLAZAS.map((plaza) => worldRectToBounds(plaza, 1.2)),
      ...HOAN_KIEM_PEDESTRIAN_ZONES.map((zone) => worldRectToBounds(zone, 1.2)),
    ]
    const candidates = this.colliders.filter((collider) => (
      collider.kind === 'nonWalkBoundary' && !collider.disabled
    ))
    for (const collider of candidates) {
      const pieces = subtractOpenings(collider, walkableOpenings)
      if (pieces.length === 1 && sameBounds(pieces[0], collider)) continue

      collider.disabled = true
      collider.disabledReason = 'Opened for the expanded Hoàn Kiếm street network'
      this.disabledLegacyColliders.push(collider)
      pieces.forEach((piece, index) => {
        const replacement = {
          ...piece,
          x: (piece.minX + piece.maxX) / 2,
          z: (piece.minZ + piece.maxZ) / 2,
          width: piece.maxX - piece.minX,
          depth: piece.maxZ - piece.minZ,
          name: `${collider.name} · phần mở rộng ${index + 1}`,
          kind: 'nonWalkBoundary',
          sourceMapId: 'hoanKiem',
          sourceId: `${collider.sourceId ?? 'boundary'}-expansion-${index + 1}`,
        }
        this.colliders.push(replacement)
        this.boundaryReplacementColliders.push(replacement)
      })
    }
  }

  #buildRoadNetwork() {
    for (const road of HOAN_KIEM_EXPANSION_ROADS) {
      this.kit.box(this.group, {
        name: road.name,
        size: [road.width, 0.1, road.depth],
        position: [road.x, -0.035, road.z],
        material: 'asphalt',
        receiveShadow: true,
      })
      this.#addRoadSidewalks(road)
    }

    for (const plaza of HOAN_KIEM_EXPANSION_PLAZAS) {
      this.kit.box(this.group, {
        name: plaza.name,
        size: [plaza.width, 0.12, plaza.depth],
        position: [plaza.x, 0.005, plaza.z],
        material: plaza.kind === 'sidewalk' ? 'sidewalk' : 'plaza',
        receiveShadow: true,
      })
    }
  }

  #addRoadSidewalks(road) {
    const horizontal = road.width >= road.depth
    const sidewalkWidth = horizontal ? road.width : 4.4
    const sidewalkDepth = horizontal ? 4.4 : road.depth
    const offset = horizontal
      ? road.depth / 2 + sidewalkDepth / 2
      : road.width / 2 + sidewalkWidth / 2

    for (const side of [-1, 1]) {
      this.kit.box(this.group, {
        name: `Vỉa hè · ${road.name}`,
        size: [sidewalkWidth, 0.12, sidewalkDepth],
        position: [
          road.x + (horizontal ? 0 : side * offset),
          0.005,
          road.z + (horizontal ? side * offset : 0),
        ],
        material: 'sidewalk',
        receiveShadow: true,
      })
    }
  }

  #buildNaturalLake() {
    const geometry = createHorizontalShapeGeometry(HOAN_KIEM_LAKE_OUTLINE)
    const mesh = new THREE.Mesh(geometry, this.kit.material('lakeWater'))
    mesh.name = 'Mặt hồ Hoàn Kiếm mở rộng'
    mesh.position.y = -0.06
    mesh.receiveShadow = false
    mesh.renderOrder = 1
    this.group.add(mesh)
    this.geometries.push(geometry)
  }

  #buildLakePromenade() {
    const geometry = createHorizontalRingGeometry(
      HOAN_KIEM_PROMENADE_OUTLINE,
      HOAN_KIEM_LAKE_OUTLINE,
    )
    const mesh = new THREE.Mesh(geometry, this.kit.material('plaza'))
    mesh.name = 'Vòng phố đi bộ Hồ Gươm'
    mesh.position.y = 0.018
    mesh.receiveShadow = true
    this.group.add(mesh)
    this.geometries.push(geometry)
  }

  #buildLakeBoundary() {
    const curvePoints = HOAN_KIEM_LAKE_OUTLINE.map(
      ([x, z]) => new THREE.Vector3(x, 0.16, z),
    )
    const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal', 0.18)
    const geometry = new THREE.TubeGeometry(curve, 96, 0.09, 4, true)
    const mesh = new THREE.Mesh(geometry, this.kit.material('stoneLight'))
    mesh.name = 'Bó đá tự nhiên quanh Hồ Gươm'
    mesh.receiveShadow = true
    this.group.add(mesh)
    this.geometries.push(geometry)
  }

  #buildLakeCollision() {
    const collisionRects = createLakeCollisionRects()
    collisionRects.forEach((rect, index) => {
      this.colliders.push({
        ...rect,
        x: (rect.minX + rect.maxX) / 2,
        z: (rect.minZ + rect.maxZ) / 2,
        width: rect.maxX - rect.minX,
        depth: rect.maxZ - rect.minZ,
        name: `Mặt hồ Hoàn Kiếm · vùng ${index + 1}`,
        kind: 'expandedLake',
        sourceMapId: 'hoanKiem',
        sourceId: `expanded-lake-${String(index + 1).padStart(3, '0')}`,
      })
    })
    this.lakeCollisionCount = collisionRects.length
  }

  #buildWorldBoundary() {
    const { minX, maxX, minZ, maxZ } = HOAN_KIEM_EXPANDED_WORLD_BOUNDS
    const width = maxX - minX
    const depth = maxZ - minZ
    const boundarySpecs = [
      { x: (minX + maxX) / 2, z: minZ + 0.12, width, depth: 0.24 },
      { x: (minX + maxX) / 2, z: maxZ - 0.12, width, depth: 0.24 },
      { x: minX + 0.12, z: (minZ + maxZ) / 2, width: 0.24, depth },
      { x: maxX - 0.12, z: (minZ + maxZ) / 2, width: 0.24, depth },
    ]
    boundarySpecs.forEach((edge, index) => {
      this.kit.addCollider(
        this.colliders,
        edge.x,
        edge.z,
        edge.width,
        edge.depth,
        `Ranh giới Hoàn Kiếm mở rộng ${index + 1}`,
      )
    })
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.group.removeFromParent()
  }
}

export function createLakeCollisionRects({
  outline = HOAN_KIEM_LAKE_OUTLINE,
  openings = HOAN_KIEM_LAKE_COLLISION_OPENINGS,
  step = LAKE_COLLISION_STEP,
  inset = LAKE_COLLISION_INSET,
} = {}) {
  const minZ = Math.min(...outline.map((point) => point[1]))
  const maxZ = Math.max(...outline.map((point) => point[1]))
  const rectangles = []

  for (let stripMinZ = minZ + inset; stripMinZ < maxZ - inset; stripMinZ += step) {
    const stripMaxZ = Math.min(maxZ - inset, stripMinZ + step)
    const samples = [
      stripMinZ,
      (stripMinZ + stripMaxZ) / 2,
      stripMaxZ,
    ].map((z) => horizontalPolygonIntervals(outline, z))
    if (samples.some((intervals) => intervals.length !== 1)) continue

    const minX = Math.max(...samples.map((intervals) => intervals[0][0])) + inset
    const maxX = Math.min(...samples.map((intervals) => intervals[0][1])) - inset
    if (maxX - minX <= 0.2) continue

    const base = { minX, maxX, minZ: stripMinZ, maxZ: stripMaxZ }
    rectangles.push(...subtractOpenings(base, openings))
  }

  return rectangles.filter((rect) => (
    rect.maxX - rect.minX > 0.18 && rect.maxZ - rect.minZ > 0.18
  ))
}

export function pointInLakeOutline(point, outline = HOAN_KIEM_LAKE_OUTLINE) {
  let inside = false
  for (let current = 0, previous = outline.length - 1; current < outline.length; previous = current++) {
    const [currentX, currentZ] = outline[current]
    const [previousX, previousZ] = outline[previous]
    const intersects = (
      (currentZ > point.z) !== (previousZ > point.z)
      && point.x < (
        (previousX - currentX) * (point.z - currentZ)
        / (previousZ - currentZ)
        + currentX
      )
    )
    if (intersects) inside = !inside
  }
  return inside
}

function createHorizontalShapeGeometry(outline) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
  const geometry = new THREE.ShapeGeometry(shape, 8)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createHorizontalRingGeometry(outer, inner) {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)))
  const hole = new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z)))
  shape.holes.push(hole)
  const geometry = new THREE.ShapeGeometry(shape, 8)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function horizontalPolygonIntervals(outline, z) {
  const intersections = []
  for (let current = 0, previous = outline.length - 1; current < outline.length; previous = current++) {
    const [currentX, currentZ] = outline[current]
    const [previousX, previousZ] = outline[previous]
    if ((currentZ > z) === (previousZ > z)) continue
    const ratio = (z - currentZ) / (previousZ - currentZ)
    intersections.push(currentX + (previousX - currentX) * ratio)
  }
  intersections.sort((a, b) => a - b)
  const intervals = []
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    intervals.push([intersections[index], intersections[index + 1]])
  }
  return intervals
}

function subtractOpenings(base, openings) {
  return openings.reduce(
    (pieces, opening) => pieces.flatMap((piece) => subtractRect(piece, opening)),
    [{ minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: base.maxZ }],
  )
}

function subtractRect(base, cut) {
  const minX = Math.max(base.minX, cut.minX)
  const maxX = Math.min(base.maxX, cut.maxX)
  const minZ = Math.max(base.minZ, cut.minZ)
  const maxZ = Math.min(base.maxZ, cut.maxZ)
  if (maxX <= minX || maxZ <= minZ) return [base]

  const result = []
  if (minZ > base.minZ) {
    result.push({ minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: minZ })
  }
  if (maxZ < base.maxZ) {
    result.push({ minX: base.minX, maxX: base.maxX, minZ: maxZ, maxZ: base.maxZ })
  }
  if (minX > base.minX) {
    result.push({ minX: base.minX, maxX: minX, minZ, maxZ })
  }
  if (maxX < base.maxX) {
    result.push({ minX: maxX, maxX: base.maxX, minZ, maxZ })
  }
  return result
}

function sameBounds(a, b) {
  return a.minX === b.minX
    && a.maxX === b.maxX
    && a.minZ === b.minZ
    && a.maxZ === b.maxZ
}

function createRoadWalkableBounds(road) {
  const horizontal = road.width >= road.depth
  return worldRectToBounds({
    ...road,
    width: road.width + (horizontal ? 0 : 8.8),
    depth: road.depth + (horizontal ? 8.8 : 0),
  }, 0.6)
}

function worldRectToBounds(rect, padding = 0) {
  return {
    minX: rect.x - rect.width / 2 - padding,
    maxX: rect.x + rect.width / 2 + padding,
    minZ: rect.z - rect.depth / 2 - padding,
    maxZ: rect.z + rect.depth / 2 + padding,
  }
}
