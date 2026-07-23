import * as THREE from 'three'
import { CHURCH_DIMENSIONS } from './ChurchDimensions.js'
import { CHURCH_MATERIALS } from './ChurchMaterials.js'

const SIDES = [-1, 1]

function getApseRoofGeometry(kit, width, depth, eaveY, peakY) {
  const key = `church-apse-roof-${width}-${depth}-${eaveY}-${peakY}`
  if (kit.geometries.has(key)) return kit.geometries.get(key)

  const eaves = [
    [-width / 2, eaveY, 0],
    [-width / 2, eaveY, -depth * 0.3],
    [-width * 0.38, eaveY, -depth * 0.76],
    [-width * 0.15, eaveY, -depth],
    [width * 0.15, eaveY, -depth],
    [width * 0.38, eaveY, -depth * 0.76],
    [width / 2, eaveY, -depth * 0.3],
    [width / 2, eaveY, 0],
  ]
  const peak = [0, peakY, -depth * 0.24]
  const positions = [...eaves.flat(), ...peak]
  const peakIndex = eaves.length
  const indices = []
  for (let index = 0; index < eaves.length - 1; index += 1) {
    indices.push(index + 1, index, peakIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.geometries.set(key, geometry)
  return geometry
}

export class ChurchRoof {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Church roofs'
    parent.add(this.group)

    this.#buildNarthexRoof()
    this.#buildNaveRoof()
    this.#buildAisleRoofs()
    this.#buildApseRoof()
  }

  #roofSpan({
    frontZ = CHURCH_DIMENSIONS.naveStartZ + 0.35,
    backZ = CHURCH_DIMENSIONS.apseStartZ - 0.35,
  } = {}) {
    return {
      frontZ,
      backZ,
      depth: frontZ - backZ,
      centerZ: (frontZ + backZ) / 2,
    }
  }

  #buildNarthexRoof() {
    const dimensions = CHURCH_DIMENSIONS
    const span = this.#roofSpan({
      frontZ: dimensions.facadeZ - 0.84,
      backZ: dimensions.towerRearZ + 0.25,
    })
    const run = dimensions.centralFacadeWidth / 2 + 0.25
    const eaveY = dimensions.naveWallHeight + 0.08
    const rise = dimensions.naveRidgeHeight - eaveY
    const slopeLength = Math.hypot(run, rise)
    const angle = Math.atan2(rise, run)

    for (const side of SIDES) {
      const plane = this.kit.box(this.group, {
        name: side < 0 ? 'West narthex roof slope' : 'East narthex roof slope',
        size: [slopeLength, 0.28, span.depth],
        position: [side * run / 2, (eaveY + dimensions.naveRidgeHeight) / 2, span.centerZ],
        material: CHURCH_MATERIALS.roofTile,
        castShadow: true,
      })
      plane.rotation.z = side * -angle
    }

    this.kit.cylinder(this.group, {
      name: 'Narthex ridge cap',
      radius: 0.18,
      height: span.depth + 0.2,
      position: [0, dimensions.naveRidgeHeight + 0.08, span.centerZ],
      rotation: [Math.PI / 2, 0, 0],
      material: CHURCH_MATERIALS.roofTile,
      castShadow: true,
    })
  }

  #buildNaveRoof() {
    const dimensions = CHURCH_DIMENSIONS
    const span = this.#roofSpan({
      backZ: dimensions.apseStartZ - dimensions.apseDepth * 0.27,
    })
    const run = dimensions.naveWidth / 2 + 0.58
    const eaveY = dimensions.naveWallHeight + 0.08
    const rise = dimensions.naveRidgeHeight - eaveY
    const slopeLength = Math.hypot(run, rise)
    const angle = Math.atan2(rise, run)

    for (const side of SIDES) {
      const plane = this.kit.box(this.group, {
        name: side < 0 ? 'West nave roof slope' : 'East nave roof slope',
        size: [slopeLength, 0.28, span.depth],
        position: [side * run / 2, (eaveY + dimensions.naveRidgeHeight) / 2, span.centerZ],
        material: CHURCH_MATERIALS.roofTile,
        castShadow: true,
      })
      plane.rotation.z = side * -angle
    }

    this.kit.cylinder(this.group, {
      name: 'Long nave ridge cap',
      radius: 0.18,
      height: span.depth + 0.2,
      position: [0, dimensions.naveRidgeHeight + 0.08, span.centerZ],
      rotation: [Math.PI / 2, 0, 0],
      material: CHURCH_MATERIALS.roofTile,
      castShadow: true,
    })
  }

  #buildAisleRoofs() {
    const dimensions = CHURCH_DIMENSIONS
    const span = this.#roofSpan()
    const innerX = dimensions.naveWidth / 2 - 0.08
    const outerX = dimensions.halfWidth + 0.48
    const run = outerX - innerX
    const innerY = dimensions.aisleWallHeight + 1.05
    const outerY = dimensions.aisleWallHeight + 0.08
    const slopeLength = Math.hypot(run, innerY - outerY)
    const angle = Math.atan2(innerY - outerY, run)

    for (const side of SIDES) {
      const roof = this.kit.box(this.group, {
        name: side < 0 ? 'West aisle lean-to roof' : 'East aisle lean-to roof',
        size: [slopeLength, 0.24, span.depth],
        position: [side * (innerX + run / 2), (innerY + outerY) / 2, span.centerZ],
        material: CHURCH_MATERIALS.roofTile,
        castShadow: true,
      })
      roof.rotation.z = side * -angle

      this.kit.cylinder(this.group, {
        name: side < 0 ? 'West aisle eave cap' : 'East aisle eave cap',
        radius: 0.1,
        height: span.depth,
        position: [side * outerX, outerY, span.centerZ],
        rotation: [Math.PI / 2, 0, 0],
        material: CHURCH_MATERIALS.roofTile,
      })
    }
  }

  #buildApseRoof() {
    const dimensions = CHURCH_DIMENSIONS
    const width = dimensions.naveWidth + 1.35
    const eaveY = dimensions.naveWallHeight - 1.18
    const peakY = dimensions.naveRidgeHeight - 1.25
    const geometry = getApseRoofGeometry(
      this.kit,
      width,
      dimensions.apseDepth + 0.35,
      eaveY,
      peakY,
    )
    const roof = new THREE.Mesh(
      geometry,
      this.kit.material(CHURCH_MATERIALS.roofTile),
    )
    roof.name = 'Faceted apse roof'
    roof.position.z = dimensions.apseStartZ + 0.08
    roof.castShadow = true
    roof.receiveShadow = true
    this.group.add(roof)
  }
}
