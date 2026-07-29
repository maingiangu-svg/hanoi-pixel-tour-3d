import * as THREE from 'three'

/**
 * TrafficSystem — moving vehicles (motorcycles, cars, bicycles)
 * on predefined routes through the city.
 */

const VEHICLE_TYPES = Object.freeze({
  MOTORBIKE: 'motorbike',
  CAR: 'car',
  BICYCLE: 'bicycle',
})

const VEHICLE_COLORS = [
  0x333333, 0x666666, 0x999999, 0xcc0000, 0x0066cc,
  0x006633, 0xcc6600, 0xffffff, 0x1a1a2e, 0x16213e,
]

export class TrafficSystem {
  constructor({ parent, playerPosition }) {
    this.parent = parent
    this.playerPosition = playerPosition

    this.group = new THREE.Group()
    this.group.name = 'Traffic'
    parent.add(this.group)

    this.vehicles = []
    this._elapsed = 0
    this.spawnTimer = 0
    this.spawnInterval = 2 // seconds between spawns

    this.#defineRoutes()
  }

  /**
   * Update — move vehicles along routes, spawn new ones.
   */
  update(delta, activeAreaName) {
    this._elapsed += delta
    this.group.visible = activeAreaName === 'outdoor'

    if (!this.group.visible) return

    // Spawn new vehicles
    this.spawnTimer += delta
    if (this.spawnTimer > this.spawnInterval && this.vehicles.length < 30) {
      this.#spawnVehicle()
      this.spawnTimer = 0
    }

    // Update vehicle positions
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i]
      vehicle.progress += delta * vehicle.speed / vehicle.routeLength

      if (vehicle.progress >= 1) {
        // Remove vehicle at end of route
        vehicle.mesh.geometry.dispose()
        vehicle.mesh.material.dispose()
        this.group.remove(vehicle.mesh)
        this.vehicles.splice(i, 1)
        continue
      }

      // Interpolate position along route
      const pos = vehicle.curve.getPointAt(vehicle.progress)
      vehicle.mesh.position.copy(pos)

      // Face direction of travel
      const tangent = vehicle.curve.getTangentAt(vehicle.progress)
      vehicle.mesh.rotation.y = Math.atan2(tangent.x, tangent.z)
    }
  }

  dispose() {
    for (const vehicle of this.vehicles) {
      vehicle.mesh.geometry.dispose()
      vehicle.mesh.material.dispose()
    }
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #defineRoutes() {
    // Routes are curves through the city
    this.routes = [
      // Main road east-west (past church)
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[-30, 0, 12], [-10, 0, 12], [10, 0, 12], [30, 0, 12], [50, 0, 12]],
        speed: 4,
      },
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[50, 0, 14], [30, 0, 14], [10, 0, 14], [-10, 0, 14], [-30, 0, 14]],
        speed: 3.5,
      },
      // Road along lake west
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[65, 0, -30], [65, 0, -10], [65, 0, 10], [65, 0, 30]],
        speed: 3,
      },
      {
        type: VEHICLE_TYPES.CAR,
        points: [[67, 0, 30], [67, 0, 10], [67, 0, -10], [67, 0, -30]],
        speed: 2.5,
      },
      // Road north of lake
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[70, 0, 35], [90, 0, 35], [110, 0, 35], [130, 0, 35]],
        speed: 4,
      },
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[130, 0, 37], [110, 0, 37], [90, 0, 37], [70, 0, 37]],
        speed: 3.8,
      },
      // Old quarter streets
      {
        type: VEHICLE_TYPES.BICYCLE,
        points: [[40, 0, 30], [50, 0, 30], [60, 0, 30], [70, 0, 30]],
        speed: 1.5,
      },
      // Connector road
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[25, 0, 10], [35, 0, 15], [45, 0, 20], [55, 0, 25]],
        speed: 3.2,
      },
    ]
  }

  #spawnVehicle() {
    if (this.routes.length === 0) return

    const routeDef = this.routes[Math.floor(Math.random() * this.routes.length)]
    const points = routeDef.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))

    // Add some curve variation
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const geometry = this.#getVehicleGeometry(routeDef.type)
    const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)]
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.3,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.scale.setScalar(routeDef.type === VEHICLE_TYPES.CAR ? 1.5 : 1)
    this.group.add(mesh)

    const routeLength = curve.getLength()

    this.vehicles.push({
      mesh,
      curve,
      progress: 0,
      speed: routeDef.speed * (0.8 + Math.random() * 0.4),
      routeLength,
      type: routeDef.type,
    })
  }

  #getVehicleGeometry(type) {
    switch (type) {
      case VEHICLE_TYPES.MOTORBIKE:
        return new THREE.BoxGeometry(0.4, 0.5, 0.8)
      case VEHICLE_TYPES.CAR:
        return new THREE.BoxGeometry(0.8, 0.6, 1.6)
      case VEHICLE_TYPES.BICYCLE:
        return new THREE.BoxGeometry(0.3, 0.4, 0.6)
      default:
        return new THREE.BoxGeometry(0.4, 0.5, 0.8)
    }
  }
}
