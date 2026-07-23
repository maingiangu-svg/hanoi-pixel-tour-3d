import * as THREE from 'three'
import {
  CHURCH_DIMENSIONS,
  getButtressZPositions,
  getNaveBayCenters,
} from './ChurchDimensions.js'
import { CHURCH_MATERIALS } from './ChurchMaterials.js'
import { addInstancedLancets, addLayeredLancet } from './ChurchDetails.js'

const SIDES = [-1, 1]

function getApseGeometry(kit, width, depth, height) {
  const key = `church-apse-${width}-${depth}-${height}`
  if (kit.geometries.has(key)) return kit.geometries.get(key)

  const shape = new THREE.Shape()
  const points = [
    [-width / 2, 0],
    [-width / 2, depth * 0.3],
    [-width * 0.38, depth * 0.76],
    [-width * 0.15, depth],
    [width * 0.15, depth],
    [width * 0.38, depth * 0.76],
    [width / 2, depth * 0.3],
    [width / 2, 0],
  ]

  shape.moveTo(points[0][0], points[0][1])
  for (let index = 1; index < points.length; index += 1) {
    shape.lineTo(points[index][0], points[index][1])
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  kit.geometries.set(key, geometry)
  return geometry
}

export class ChurchNave {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Church nave and chevet'
    parent.add(this.group)

    this.#buildMasses()
    this.#buildSideElevations()
    this.#buildApse()
  }

  #buildMasses() {
    const dimensions = CHURCH_DIMENSIONS
    const depth = dimensions.naveStartZ - dimensions.apseStartZ
    const centerZ = (dimensions.naveStartZ + dimensions.apseStartZ) / 2

    this.kit.box(this.group, {
      name: 'Raised central nave',
      size: [dimensions.naveWidth, dimensions.naveWallHeight, depth],
      position: [0, dimensions.naveWallHeight / 2, centerZ],
      material: CHURCH_MATERIALS.weatheredStone,
      castShadow: true,
    })

    const facadeWallRearZ = dimensions.facadeZ - 0.92
    const narthexDepth = facadeWallRearZ - dimensions.towerRearZ
    this.kit.box(this.group, {
      name: 'Narthex linking facade to nave',
      size: [dimensions.centralFacadeWidth - 0.08, dimensions.naveWallHeight, narthexDepth],
      position: [
        0,
        dimensions.naveWallHeight / 2,
        (facadeWallRearZ + dimensions.towerRearZ) / 2,
      ],
      material: CHURCH_MATERIALS.weatheredStone,
      castShadow: true,
    })

    const aisleCenterX = dimensions.naveWidth / 2 + dimensions.aisleWidth / 2
    for (const side of SIDES) {
      this.kit.box(this.group, {
        name: side < 0 ? 'West side aisle' : 'East side aisle',
        size: [dimensions.aisleWidth, dimensions.aisleWallHeight, depth],
        position: [side * aisleCenterX, dimensions.aisleWallHeight / 2, centerZ],
        material: CHURCH_MATERIALS.weatheredStone,
        castShadow: true,
      })
    }

    const trimInstances = []
    for (const side of SIDES) {
      trimInstances.push(
        {
          size: [0.3, 0.95, depth + 0.2],
          position: [side * (dimensions.halfWidth + 0.08), 0.48, centerZ],
        },
        {
          size: [0.28, 0.3, depth + 0.2],
          position: [side * (dimensions.halfWidth + 0.06), dimensions.aisleWallHeight - 0.18, centerZ],
        },
        {
          size: [0.24, 0.3, depth + 0.2],
          position: [side * (dimensions.naveWidth / 2 + 0.05), dimensions.naveWallHeight - 0.2, centerZ],
        },
      )
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Nave continuous stone courses',
      material: CHURCH_MATERIALS.trimStone,
      castShadow: true,
      instances: trimInstances,
    })
  }

  #buildSideElevations() {
    const dimensions = CHURCH_DIMENSIONS
    const bayCenters = getNaveBayCenters()
    const glass = [CHURCH_MATERIALS.glassBlue, CHURCH_MATERIALS.glassAmber]
    const repeatedLancets = []

    for (const side of SIDES) {
      const rotationY = side * Math.PI / 2
      for (let index = 0; index < bayCenters.length; index += 1) {
        const z = bayCenters[index]
        repeatedLancets.push({
          name: `Aisle lancet ${side}-${index + 1}`,
          position: [side * (dimensions.halfWidth + 0.03), 1.35, z],
          width: 1.45,
          height: 4.75,
          rotationY,
          glassMaterial: glass[index % glass.length],
        })

        for (const offset of [-0.95, 0.95]) {
          repeatedLancets.push({
            name: `Clerestory lancet ${side}-${index + 1}`,
            position: [side * (dimensions.naveWidth / 2 + 0.04), 8.8, z + offset],
            width: 0.82,
            height: 3.05,
            rotationY,
            glassMaterial: glass[(index + (offset > 0 ? 1 : 0)) % glass.length],
          })
        }
      }
    }
    addInstancedLancets({
      kit: this.kit,
      parent: this.group,
      name: 'Instanced aisle and clerestory lancets',
      instances: repeatedLancets,
    })

    const outerButtresses = []
    const clerestoryPiers = []
    for (const z of getButtressZPositions()) {
      for (const side of SIDES) {
        outerButtresses.push({
          size: [0.82, 6.8, 1.08],
          position: [side * (dimensions.halfWidth + 0.27), 3.4, z],
        })
        clerestoryPiers.push({
          size: [0.44, dimensions.naveWallHeight - dimensions.aisleWallHeight, 0.82],
          position: [
            side * (dimensions.naveWidth / 2 + 0.14),
            (dimensions.naveWallHeight + dimensions.aisleWallHeight) / 2,
            z,
          ],
        })
      }
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Side aisle buttresses',
      material: CHURCH_MATERIALS.agedStone,
      castShadow: true,
      instances: outerButtresses,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Clerestory bay piers',
      material: CHURCH_MATERIALS.trimStone,
      castShadow: true,
      instances: clerestoryPiers,
    })
  }

  #buildApse() {
    const dimensions = CHURCH_DIMENSIONS
    const width = dimensions.naveWidth + 0.8
    const height = dimensions.naveWallHeight - 1.35
    const depth = dimensions.apseDepth
    const geometry = getApseGeometry(this.kit, width, depth, height)
    const apse = new THREE.Mesh(
      geometry,
      this.kit.material(CHURCH_MATERIALS.weatheredStone),
    )
    apse.name = 'Polygonal rear apse'
    apse.position.z = dimensions.apseStartZ
    apse.castShadow = true
    apse.receiveShadow = true
    this.group.add(apse)

    const rearZ = dimensions.rearZ - 0.04
    const rearWindows = [
      { x: -2.7, zOffset: 0.24, rotationY: -Math.PI + 0.34, width: 1.05 },
      { x: 0, zOffset: 0, rotationY: Math.PI, width: 1.35 },
      { x: 2.7, zOffset: 0.24, rotationY: Math.PI - 0.34, width: 1.05 },
    ]
    for (const [index, window] of rearWindows.entries()) {
      addLayeredLancet({
        kit: this.kit,
        parent: this.group,
        name: `Apse lancet ${index + 1}`,
        position: [window.x, 2.55, rearZ + window.zOffset],
        width: window.width,
        height: 5.25,
        rotationY: window.rotationY,
        glassMaterial: index === 1
          ? CHURCH_MATERIALS.glassAmber
          : CHURCH_MATERIALS.glassBlue,
      })
    }

    const apseButtresses = []
    for (const side of SIDES) {
      apseButtresses.push(
        {
          size: [0.72, 8.5, 1.05],
          position: [side * width * 0.4, 4.25, dimensions.apseStartZ - depth * 0.77],
          rotation: [0, side * 0.48, 0],
        },
        {
          size: [0.68, 8.7, 1.0],
          position: [side * width * 0.17, 4.35, dimensions.rearZ - 0.2],
          rotation: [0, side * 0.22, 0],
        },
      )
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Apse radial buttresses',
      material: CHURCH_MATERIALS.agedStone,
      castShadow: true,
      instances: apseButtresses,
    })
  }
}
