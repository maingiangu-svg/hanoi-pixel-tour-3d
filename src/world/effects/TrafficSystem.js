import * as THREE from 'three'
import { HANOI_VISUAL_TOKENS } from '../style/HanoiVisualTokens.js'

/**
 * TrafficSystem — Vietnamese-style traffic with detailed motorbikes.
 *
 * Features:
 * - Multi-part motorbike geometry (body, seat, handlebar, wheels, headlight)
 * - Realistic Vietnamese traffic flow — no lane discipline, weaving
 * - Motorbikes dominate, with occasional cars and bicycles
 * - Headlights at night, brake lights
 * - Horn-like visual cues (headlight flash)
 */

const VEHICLE_TYPES = Object.freeze({
  MOTORBIKE: 'motorbike',
  CAR: 'car',
  BICYCLE: 'bicycle',
  CYCLO: 'cyclo',            // Xích lô — iconic Vietnamese
})

const MOTORBIKE_COLORS = HANOI_VISUAL_TOKENS.streetProps.motorbikeColors

// ── Shared geometries (created once, reused) ──
let _motorbikeGeo = null
let _carGeo = null
let _bicycleGeo = null
let _cycloGeo = null

function createMotorbikeGeometry() {
  if (_motorbikeGeo) return _motorbikeGeo

  const group = new THREE.Group()

  // Body — main frame
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.28, 0.75)
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.4 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.35
  group.add(body)

  // Seat
  const seatGeo = new THREE.BoxGeometry(0.28, 0.08, 0.35)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
  const seat = new THREE.Mesh(seatGeo, seatMat)
  seat.position.set(0, 0.52, -0.05)
  group.add(seat)

  // Handlebar
  const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6)
  const barMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 })
  const bar = new THREE.Mesh(barGeo, barMat)
  bar.rotation.z = Math.PI / 2
  bar.position.set(0, 0.62, 0.28)
  group.add(bar)

  // Front wheel
  const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
  const frontWheel = new THREE.Mesh(wheelGeo, wheelMat)
  frontWheel.rotation.x = Math.PI / 2
  frontWheel.position.set(0, 0.16, 0.32)
  group.add(frontWheel)

  // Rear wheel
  const rearWheel = frontWheel.clone()
  rearWheel.position.set(0, 0.16, -0.3)
  group.add(rearWheel)

  // Headlight
  const headlightGeo = new THREE.SphereGeometry(0.04, 8, 8)
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xFFF8E7,
    emissive: 0xFFF8E7,
    emissiveIntensity: 0.5,
  })
  const headlight = new THREE.Mesh(headlightGeo, headlightMat)
  headlight.position.set(0, 0.45, 0.42)
  group.add(headlight)

  // Taillight
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xCC0000,
    emissive: 0xCC0000,
    emissiveIntensity: 0.3,
  })
  const taillight = new THREE.Mesh(headlightGeo.clone(), taillightMat)
  taillight.position.set(0, 0.4, -0.42)
  group.add(taillight)

  // Mirror
  const mirrorGeo = new THREE.SphereGeometry(0.025, 6, 6)
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 })
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat)
    mirror.position.set(side * 0.2, 0.65, 0.25)
    group.add(mirror)
  }

  _motorbikeGeo = group
  return group
}

function createCarGeometry() {
  if (_carGeo) return _carGeo

  const group = new THREE.Group()

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 1.8)
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.45
  group.add(body)

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(0.7, 0.35, 1.0)
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x5577AA,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
  })
  const cabin = new THREE.Mesh(cabinGeo, cabinMat)
  cabin.position.set(0, 0.85, -0.1)
  group.add(cabin)

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  const wheelPositions = [[-0.38, 0.18, 0.55], [0.38, 0.18, 0.55], [-0.38, 0.18, -0.55], [0.38, 0.18, -0.55]]
  for (const pos of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(...pos)
    group.add(wheel)
  }

  // Headlights
  const hlGeo = new THREE.SphereGeometry(0.05, 6, 6)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E7, emissive: 0xFFF8E7, emissiveIntensity: 0.4 })
  for (const side of [-0.28, 0.28]) {
    const hl = new THREE.Mesh(hlGeo, hlMat)
    hl.position.set(side, 0.45, 0.92)
    group.add(hl)
  }

  _carGeo = group
  return group
}

function createBicycleGeometry() {
  if (_bicycleGeo) return _bicycleGeo

  const group = new THREE.Group()

  // Frame
  const frameGeo = new THREE.BoxGeometry(0.04, 0.04, 0.6)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
  const frame = new THREE.Mesh(frameGeo, frameMat)
  frame.position.y = 0.4
  frame.rotation.x = 0.15
  group.add(frame)

  // Wheels
  const wheelGeo = new THREE.TorusGeometry(0.18, 0.015, 6, 16)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const frontW = new THREE.Mesh(wheelGeo, wheelMat)
  frontW.position.set(0, 0.18, 0.28)
  group.add(frontW)
  const rearW = frontW.clone()
  rearW.position.set(0, 0.18, -0.28)
  group.add(rearW)

  // Seat
  const seatGeo = new THREE.BoxGeometry(0.08, 0.03, 0.15)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const seat = new THREE.Mesh(seatGeo, seatMat)
  seat.position.set(0, 0.55, -0.08)
  group.add(seat)

  _bicycleGeo = group
  return group
}

function createCycloGeometry() {
  if (_cycloGeo) return _cycloGeo

  const group = new THREE.Group()

  // Passenger box
  const boxGeo = new THREE.BoxGeometry(0.6, 0.35, 0.6)
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xB85A3C, roughness: 0.7 })
  const box = new THREE.Mesh(boxGeo, boxMat)
  box.position.set(0, 0.35, -0.2)
  group.add(box)

  // Canopy
  const canopyGeo = new THREE.BoxGeometry(0.65, 0.04, 0.65)
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xE8C86A, roughness: 0.6 })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.set(0, 0.7, -0.2)
  group.add(canopy)

  // Frame
  const frameGeo = new THREE.BoxGeometry(0.04, 0.04, 0.9)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
  const frame = new THREE.Mesh(frameGeo, frameMat)
  frame.position.set(0, 0.3, 0.15)
  group.add(frame)

  // Front wheel
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const wheel = new THREE.Mesh(wheelGeo, wheelMat)
  wheel.rotation.x = Math.PI / 2
  wheel.position.set(0, 0.2, 0.55)
  group.add(wheel)

  // Rear wheels
  for (const side of [-0.25, 0.25]) {
    const rw = new THREE.Mesh(wheelGeo, wheelMat)
    rw.rotation.x = Math.PI / 2
    rw.position.set(side, 0.2, -0.45)
    group.add(rw)
  }

  _cycloGeo = group
  return group
}

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
    this.spawnInterval = 1.5 // Faster spawning — more traffic
    this.isNight = false

    this.#defineRoutes()
  }

  update(delta, activeAreaName) {
    this._elapsed += delta
    this.group.visible = activeAreaName === 'outdoor'

    if (!this.group.visible) return

    // Spawn
    this.spawnTimer += delta
    if (this.spawnTimer > this.spawnInterval && this.vehicles.length < 40) {
      this.#spawnVehicle()
      this.spawnTimer = 0
    }

    // Update
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i]
      vehicle.progress += delta * vehicle.speed / vehicle.routeLength

      if (vehicle.progress >= 1) {
        this.#removeVehicle(i)
        continue
      }

      // Position along route
      const pos = vehicle.curve.getPointAt(vehicle.progress)
      vehicle.group.position.copy(pos)

      // Face direction of travel
      const tangent = vehicle.curve.getTangentAt(vehicle.progress)
      vehicle.group.rotation.y = Math.atan2(tangent.x, tangent.z)

      // Vietnamese-style weaving — subtle lateral oscillation
      if (vehicle.type === VEHICLE_TYPES.MOTORBIKE) {
        const weave = Math.sin(this._elapsed * 1.5 + vehicle.weavePhase) * 0.15
        vehicle.group.position.x += weave * Math.cos(vehicle.group.rotation.y)
        vehicle.group.position.z -= weave * Math.sin(vehicle.group.rotation.y)
      }

      // Update headlights for night
      if (vehicle.headlight) {
        vehicle.headlight.intensity = this.isNight ? 2.5 : 0
      }
    }
  }

  setNightMode(isNight) {
    this.isNight = isNight
  }

  dispose() {
    for (const vehicle of this.vehicles) {
      this.group.remove(vehicle.group)
    }
    this.vehicles.length = 0
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #defineRoutes() {
    this.routes = [
      // Main road east-west (past church)
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[-35, 0, 12], [-10, 0, 12.5], [10, 0, 11.8], [30, 0, 12.2], [55, 0, 12]],
        speed: 4.5,
      },
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[55, 0, 14.2], [30, 0, 13.8], [10, 0, 14.5], [-10, 0, 14], [-35, 0, 14]],
        speed: 4.0,
      },
      // More motorbikes on main road
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[-30, 0, 11.5], [0, 0, 12], [20, 0, 11.5], [45, 0, 12]],
        speed: 5.0,
      },
      // Road along lake west
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[65, 0, -35], [65, 0, -10], [65, 0, 10], [65, 0, 35]],
        speed: 3.5,
      },
      {
        type: VEHICLE_TYPES.CAR,
        points: [[67, 0, 35], [67, 0, 10], [67, 0, -10], [67, 0, -35]],
        speed: 2.8,
      },
      // Road north of lake
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[70, 0, 35], [95, 0, 35], [115, 0, 35], [135, 0, 35]],
        speed: 4.5,
      },
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[135, 0, 37], [115, 0, 37], [95, 0, 37], [70, 0, 37]],
        speed: 4.2,
      },
      // Old quarter streets — more motorbikes, slower
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[40, 0, 30], [52, 0, 30.5], [62, 0, 29.8], [72, 0, 30]],
        speed: 2.5,
      },
      {
        type: VEHICLE_TYPES.BICYCLE,
        points: [[42, 0, 32], [55, 0, 32], [68, 0, 32]],
        speed: 1.5,
      },
      // Cyclo — slow, iconic
      {
        type: VEHICLE_TYPES.CYCLO,
        points: [[48, 0, 28], [58, 0, 28.5], [68, 0, 28]],
        speed: 1.2,
      },
      // Connector road
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[25, 0, 10], [35, 0, 14], [45, 0, 19], [55, 0, 24]],
        speed: 3.8,
      },
      // Lake road south
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[130, 0, -20], [110, 0, -20], [90, 0, -20], [70, 0, -20]],
        speed: 3.2,
      },
      {
        type: VEHICLE_TYPES.MOTORBIKE,
        points: [[70, 0, -22], [90, 0, -22], [110, 0, -22], [130, 0, -22]],
        speed: 3.0,
      },
    ]
  }

  #spawnVehicle() {
    if (this.routes.length === 0) return

    const routeDef = this.routes[Math.floor(Math.random() * this.routes.length)]
    const points = routeDef.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))

    // Add slight curve variation for natural movement
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')

    const sourceGroup = this.#getVehicleModel(routeDef.type)
    const vehicleGroup = sourceGroup.clone(true)

    // Randomize color for motorbikes
    if (routeDef.type === VEHICLE_TYPES.MOTORBIKE) {
      const color = MOTORBIKE_COLORS[Math.floor(Math.random() * MOTORBIKE_COLORS.length)]
      vehicleGroup.children[0]?.material?.color?.set(color)
    }

    // Scale
    const scale = routeDef.type === VEHICLE_TYPES.CAR ? 1.4 :
                  routeDef.type === VEHICLE_TYPES.CYCLO ? 1.2 : 1.0
    vehicleGroup.scale.setScalar(scale)

    vehicleGroup.castShadow = true
    this.group.add(vehicleGroup)

    // Headlight for night driving
    let headlight = null
    if (routeDef.type === VEHICLE_TYPES.MOTORBIKE || routeDef.type === VEHICLE_TYPES.CAR) {
      headlight = new THREE.PointLight(0xFFF8E7, 0, 8, 2)
      headlight.position.set(0, 0.5, 0.5)
      vehicleGroup.add(headlight)
    }

    const routeLength = curve.getLength()

    this.vehicles.push({
      group: vehicleGroup,
      curve,
      progress: 0,
      speed: routeDef.speed * (0.75 + Math.random() * 0.5),
      routeLength,
      type: routeDef.type,
      weavePhase: Math.random() * Math.PI * 2,
      headlight,
    })
  }

  #removeVehicle(index) {
    const vehicle = this.vehicles[index]
    this.group.remove(vehicle.group)
    // Dispose cloned geometries/materials
    vehicle.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose()
        child.material?.dispose()
      }
    })
    this.vehicles.splice(index, 1)
  }

  #getVehicleModel(type) {
    switch (type) {
      case VEHICLE_TYPES.MOTORBIKE: return createMotorbikeGeometry()
      case VEHICLE_TYPES.CAR: return createCarGeometry()
      case VEHICLE_TYPES.BICYCLE: return createBicycleGeometry()
      case VEHICLE_TYPES.CYCLO: return createCycloGeometry()
      default: return createMotorbikeGeometry()
    }
  }
}
