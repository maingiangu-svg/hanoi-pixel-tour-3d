import { mapCoordinates } from '../map/MapCoordinateSystem.js'
import { subtractSourceRects } from './collisionHelpers.js'

const PATCH_MATERIALS = Object.freeze({
  asphalt: 'asphalt',
  brick: 'terracotta',
  embankment: 'stoneWarm',
  grass: 'foliageDark',
  interiorFloor: 'plaza',
  paving: 'stoneDark',
  plaza: 'plaza',
})

const ZONE_MATERIALS = Object.freeze({
  bridge: 'asphalt',
  courtyard: 'plaza',
  path: 'stoneWarm',
  plaza: 'plaza',
  road: 'asphalt',
  sidewalk: 'sidewalk',
})

export class MapSurfaceBuilder {
  constructor({ kit, parent, mapData, colliders, coordinates = mapCoordinates }) {
    this.kit = kit
    this.parent = parent
    this.mapData = mapData
    this.colliders = colliders
    this.coordinates = coordinates
    this.meshesBySourceId = new Map()
  }

  build() {
    this.#buildBase()
    this.mapData.groundPatches.forEach((patch, index) => this.#buildPatch(patch, index))
    this.mapData.water.forEach((water, index) => this.#buildWater(water, index))
    this.mapData.walkZones.forEach((zone, index) => this.#buildWalkZone(zone, index))
    ;(this.mapData.parkingSpots ?? []).forEach((spot, index) => (
      this.#buildParkingSpot(spot, index)
    ))
    return this
  }

  #buildBase() {
    const bounds = this.coordinates.bounds(this.mapData.id)
    const width = bounds.maxX - bounds.minX
    const depth = bounds.maxZ - bounds.minZ
    const mesh = this.kit.box(this.parent, {
      name: `Nền tổng ${this.mapData.name}`,
      size: [width, 0.22, depth],
      position: [(bounds.minX + bounds.maxX) / 2, -0.34, (bounds.minZ + bounds.maxZ) / 2],
      material: this.mapData.kind === 'churchInterior' ? 'stoneDark' : 'stoneDark',
      receiveShadow: true,
    })
    mesh.userData.sourceRef = `${this.mapData.id}:bounds`
  }

  #buildPatch(patch, index) {
    const world = this.coordinates.rect(this.mapData.id, patch)
    const mesh = this.kit.box(this.parent, {
      name: `Địa hình ${patch.kind} ${index + 1}`,
      size: [world.width, 0.08, world.depth],
      position: [world.x, -0.19 + index * 0.0005, world.z],
      material: PATCH_MATERIALS[patch.kind] ?? 'stoneDark',
      receiveShadow: true,
    })
    this.#tag(mesh, patch)
  }

  #buildWater(water, index) {
    const world = this.coordinates.rect(this.mapData.id, water)
    const mesh = this.kit.box(this.parent, {
      name: water.label ?? `Mặt nước ${index + 1}`,
      size: [world.width, 0.07, world.depth],
      position: [world.x, -0.105 + index * 0.001, world.z],
      material: 'lakeWater',
      receiveShadow: false,
    })
    this.#tag(mesh, water)

    const bridgeCuts = this.mapData.walkZones.filter((zone) => zone.kind === 'bridge')
    subtractSourceRects(water, bridgeCuts).forEach((piece, pieceIndex) => {
      const collider = this.coordinates.collider(
        this.mapData.id,
        { ...piece, id: `${water.id}-safety-${pieceIndex + 1}` },
        `${water.label ?? 'Mặt nước'} — vùng không thể đi`,
      )
      collider.kind = 'water'
      collider.sourceWaterId = water.id
      this.colliders.push(collider)
    })
  }

  #buildWalkZone(zone, index) {
    const world = this.coordinates.rect(this.mapData.id, zone)
    const mesh = this.kit.box(this.parent, {
      name: `${zone.kind} ${index + 1} · ${this.mapData.name}`,
      size: [world.width, zone.kind === 'bridge' ? 0.22 : 0.1, world.depth],
      position: [world.x, zone.kind === 'bridge' ? 0.06 : -0.035 + index * 0.0004, world.z],
      material: ZONE_MATERIALS[zone.kind] ?? 'sidewalk',
      receiveShadow: true,
      castShadow: zone.kind === 'bridge',
    })
    this.#tag(mesh, zone)

    if (zone.kind === 'road' || zone.kind === 'bridge') this.#buildRoadMarkings(zone, world)
  }

  #buildRoadMarkings(zone, world) {
    const horizontal = zone.width >= zone.height
    const longWorld = horizontal ? world.width : world.depth
    const dashLength = Math.min(3.6, longWorld / 8)
    const gap = dashLength * 1.7
    const count = Math.max(1, Math.floor(longWorld / gap))
    const instances = []
    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * gap
      instances.push({
        size: horizontal ? [dashLength, 0.02, 0.12] : [0.12, 0.02, dashLength],
        position: horizontal
          ? [world.x + offset, zone.kind === 'bridge' ? 0.19 : 0.03, world.z]
          : [world.x, zone.kind === 'bridge' ? 0.19 : 0.03, world.z + offset],
      })
    }
    if (!instances.length) return
    const markings = this.kit.instancedBoxes(this.parent, {
      name: `Vạch ${zone.kind} ${zone.id}`,
      material: 'whiteMarking',
      instances,
      receiveShadow: false,
    })
    markings.userData.sourceRef = `${this.mapData.id}:${zone.id}:markings`
  }

  #buildParkingSpot(spot, index) {
    const world = this.coordinates.rect(this.mapData.id, spot)
    const pad = this.kit.box(this.parent, {
      name: `${spot.name} · bề mặt`,
      size: [world.width, 0.065, world.depth],
      position: [world.x, 0.035 + index * 0.0005, world.z],
      material: 'roadPatch',
      receiveShadow: true,
    })
    this.#tag(pad, spot)

    const stripeInstances = []
    for (let offset = 10; offset < spot.width - 8; offset += 16) {
      const start = this.coordinates.point(this.mapData.id, {
        x: spot.x + offset,
        y: spot.y + 5,
      })
      const end = this.coordinates.point(this.mapData.id, {
        x: spot.x + offset - 8,
        y: spot.y + spot.height - 5,
      })
      const dx = end.x - start.x
      const dz = end.z - start.z
      stripeInstances.push({
        size: [0.065, 0.018, Math.hypot(dx, dz)],
        position: [(start.x + end.x) / 2, 0.078, (start.z + end.z) / 2],
        rotation: [0, Math.atan2(dx, dz), 0],
      })
    }
    const stripes = this.kit.instancedBoxes(this.parent, {
      name: `${spot.name} · vạch đỗ xe`,
      material: 'oldYellow',
      instances: stripeInstances,
      receiveShadow: false,
    })
    stripes.userData.sourceRef = `${this.mapData.id}:${spot.id}:markings`

    const signPoint = this.coordinates.point(this.mapData.id, {
      x: spot.x + spot.width - 17,
      y: spot.y - 22,
    })
    const pole = this.kit.cylinder(this.parent, {
      name: `${spot.name} · cột biển`,
      radius: 0.055,
      height: 2.1,
      position: [signPoint.x, 1.05, signPoint.z],
      material: 'metal',
    })
    pole.userData.sourceRef = `${this.mapData.id}:${spot.id}:sign-pole`
    const sign = this.kit.sign(this.parent, {
      text: 'P',
      width: 0.72,
      height: 0.52,
      position: [signPoint.x, 2.08, signPoint.z],
      background: '#f2bd45',
      foreground: '#151515',
    })
    sign.userData.sourceRef = `${this.mapData.id}:${spot.id}:sign`
  }

  #tag(mesh, source) {
    mesh.userData.sourceMapId = this.mapData.id
    mesh.userData.sourceId = source.id
    mesh.userData.sourceRef = `${this.mapData.id}:${source.id}`
    this.meshesBySourceId.set(source.id, mesh)
  }
}
