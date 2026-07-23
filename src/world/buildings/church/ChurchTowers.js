import * as THREE from 'three'
import { CHURCH_DIMENSIONS } from './ChurchDimensions.js'
import { CHURCH_MATERIALS } from './ChurchMaterials.js'
import {
  addCross,
  addLayeredLancet,
  addWeatheringStreaks,
} from './ChurchDetails.js'

const TIER_OPENINGS = Object.freeze([
  Object.freeze({ y: 5.25, height: 2.05, material: CHURCH_MATERIALS.glassBlue }),
  Object.freeze({ y: 10.25, height: 2.3, material: CHURCH_MATERIALS.recess }),
  Object.freeze({ y: 15.45, height: 2.55, material: CHURCH_MATERIALS.recess }),
  Object.freeze({ y: 20.75, height: 3.15, material: CHURCH_MATERIALS.recess }),
])

function getTowerCapGeometry(kit, width, depth) {
  const key = `church-tower-cap-${width}-${depth}`
  if (kit.geometries.has(key)) return kit.geometries.get(key)

  const halfWidth = width / 2
  const halfDepth = depth / 2
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    halfWidth, 0, halfDepth,
    -halfWidth, 0, halfDepth,
    0, 1, 0,
  ], 3))
  geometry.setIndex([
    0, 4, 1,
    1, 4, 2,
    2, 4, 3,
    3, 4, 0,
  ])
  geometry.computeVertexNormals()
  kit.geometries.set(key, geometry)
  return geometry
}

export class ChurchTowers {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Hai tháp chuông Nhà thờ Lớn'
    parent.add(this.group)

    this.towers = CHURCH_DIMENSIONS.towerCentersX.map((x, index) =>
      this.#buildTower(x, index === 0 ? 'phía tây' : 'phía đông', index),
    )
    this.westTower = this.towers[0]
    this.eastTower = this.towers[1]
  }

  #buildTower(centerX, label, towerIndex) {
    const { facadeZ, towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const crownOffsetZ = (towerDepth - towerWidth) / 2
    const tower = new THREE.Group()
    tower.name = `Tháp chuông ${label}`
    tower.position.set(centerX, 0, facadeZ - towerDepth / 2)
    tower.userData.footprint = Object.freeze({ width: towerWidth, depth: towerDepth })
    this.group.add(tower)

    const shaftHeight = 26.15
    this.kit.box(tower, {
      name: `Khối tháp vuông ${label}`,
      size: [towerWidth, shaftHeight, towerDepth],
      position: [0, shaftHeight / 2, 0],
      material: CHURCH_MATERIALS.weatheredStone,
      castShadow: true,
    })

    this.#buildCornerPiers(tower, label)
    this.#buildTierBands(tower, label)
    this.#buildTierOpenings(tower, label, towerIndex)
    this.#buildBellSideOpenings(tower, label, towerIndex)
    this.#buildOpenParapet(tower, label)
    this.#buildHiddenCap(tower, label)
    this.#buildPinnacles(tower, label)
    this.#buildTowerWeathering(tower, label)

    addCross({
      kit: this.kit,
      parent: tower,
      name: `Thánh giá đỉnh tháp ${label}`,
      position: [0, 30.65, crownOffsetZ],
      height: 1.5,
      width: 0.82,
      thickness: 0.16,
      material: CHURCH_MATERIALS.metal,
    })

    return tower
  }

  #buildCornerPiers(tower, label) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const edgeX = towerWidth / 2 - 0.24
    const edgeZ = towerDepth / 2 - 0.24
    const instances = []
    for (const x of [-edgeX, edgeX]) {
      for (const z of [-edgeZ, edgeZ]) {
        instances.push({
          size: [0.48, 26.45, 0.48],
          position: [x, 13.225, z],
        })
      }
    }
    this.kit.instancedBoxes(tower, {
      name: `Trụ góc tháp ${label}`,
      material: CHURCH_MATERIALS.agedStone,
      castShadow: true,
      instances,
    })

    for (const x of [-edgeX, edgeX]) {
      this.kit.box(tower, {
        name: `Chân trụ góc mặt trước ${label}`,
        size: [0.72, 0.48, 0.66],
        position: [x, 0.24, towerDepth / 2 + 0.05],
        material: CHURCH_MATERIALS.trimStone,
        castShadow: true,
      })
    }
  }

  #buildTierBands(tower, label) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const bands = [4.72, 8.55, 13.62, 18.86, 24.58]
    this.kit.instancedBoxes(tower, {
      name: `Gờ ngang phân tầng tháp ${label}`,
      material: CHURCH_MATERIALS.trimStone,
      castShadow: true,
      instances: bands.map((y, index) => ({
        size: [
          towerWidth + (index === bands.length - 1 ? 0.45 : 0.28),
          index === bands.length - 1 ? 0.42 : 0.3,
          towerDepth + (index === bands.length - 1 ? 0.45 : 0.28),
        ],
        position: [0, y, 0],
      })),
    })
  }

  #buildTierOpenings(tower, label, towerIndex) {
    const { towerDepth } = CHURCH_DIMENSIONS
    const frontZ = towerDepth / 2 + 0.08
    const openingOffsets = [-1.48, 0, 1.48]

    TIER_OPENINGS.forEach((tier, tierIndex) => {
      openingOffsets.forEach((x, openingIndex) => {
        const glassMaterial = tier.material === CHURCH_MATERIALS.recess
          ? CHURCH_MATERIALS.recess
          : (openingIndex + towerIndex) % 2 === 0
            ? tier.material
            : CHURCH_MATERIALS.glassAmber
        addLayeredLancet({
          kit: this.kit,
          parent: tower,
          name: `Lancet tháp ${label} tầng ${tierIndex + 1}.${openingIndex + 1}`,
          position: [x, tier.y, frontZ],
          width: tierIndex === 3 ? 0.78 : 0.72,
          height: tier.height,
          glassMaterial,
          depth: 0.16,
        })

        if (tier.material === CHURCH_MATERIALS.recess) {
          this.#addLouverSlats(
            tower,
            `Chớp tháp ${label} tầng ${tierIndex + 1}.${openingIndex + 1}`,
            [x, tier.y, frontZ + 0.29],
            0.48,
            tier.height * 0.57,
            0,
          )
        }
      })
    })
  }

  #buildBellSideOpenings(tower, label, towerIndex) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const outerSide = towerIndex === 0 ? -1 : 1
    const sideX = outerSide * (towerWidth / 2 + 0.08)
    const sideOpeningOffset = Math.min(2.75, towerDepth * 0.31)
    for (const [index, z] of [-sideOpeningOffset, 0, sideOpeningOffset].entries()) {
      addLayeredLancet({
        kit: this.kit,
        parent: tower,
        name: `Louver hông tháp ${label} ${index + 1}`,
        position: [sideX, 20.75, z],
        width: 0.78,
        height: 3.15,
        rotationY: outerSide * Math.PI / 2,
        glassMaterial: CHURCH_MATERIALS.recess,
        depth: 0.16,
      })
      this.#addLouverSlats(
        tower,
        `Chớp hông tháp ${label} ${index + 1}`,
        [sideX + outerSide * 0.28, 20.75, z],
        0.48,
        1.8,
        outerSide * Math.PI / 2,
      )
    }
  }

  #addLouverSlats(parent, name, [x, y, z], width, height, rotationY) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(x, y, z)
    group.rotation.y = rotationY
    parent.add(group)

    for (let index = 0; index < 5; index += 1) {
      const slat = this.kit.box(group, {
        name: `${name} nan ${index + 1}`,
        size: [width, 0.07, 0.07],
        position: [0, height * (0.18 + index * 0.13), 0],
        material: CHURCH_MATERIALS.metal,
      })
      slat.rotation.x = -0.18
    }
    return group
  }

  #buildOpenParapet(tower, label) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const crownOffsetZ = (towerDepth - towerWidth) / 2
    const group = new THREE.Group()
    group.name = `Lan can đá hở bảy khe tháp ${label}`
    group.position.z = crownOffsetZ
    tower.add(group)

    this.kit.box(group, {
      name: `Bệ lan can tháp ${label}`,
      size: [towerWidth + 0.26, 0.72, towerWidth + 0.26],
      position: [0, 26.45, 0],
      material: CHURCH_MATERIALS.agedStone,
      castShadow: true,
    })

    const frontZ = towerWidth / 2 - 0.08
    const usableWidth = towerWidth - 0.48
    const postWidth = 0.22
    const postCount = 8
    const gapWidth = (usableWidth - postWidth * postCount) / 7
    const startX = -usableWidth / 2 + postWidth / 2

    for (const faceZ of [-frontZ, frontZ]) {
      for (let index = 0; index < postCount; index += 1) {
        const x = startX + index * (postWidth + gapWidth)
        this.kit.box(group, {
          name: `Trụ khe lan can tháp ${label} ${index + 1}`,
          size: [postWidth, 2.55, 0.24],
          position: [x, 28.08, faceZ],
          material: CHURCH_MATERIALS.trimStone,
          castShadow: true,
        })
      }
    }

    for (let index = 0; index < 7; index += 1) {
      const gapCenter = startX + postWidth / 2 + gapWidth / 2
        + index * (postWidth + gapWidth)
      for (const faceZ of [-frontZ, frontZ]) {
        for (const side of [-1, 1]) {
          const archShoulder = this.kit.box(group, {
            name: `Vai vòm khe lan can tháp ${label}`,
            size: [gapWidth * 0.64, 0.13, 0.24],
            position: [
              gapCenter + side * gapWidth * 0.2,
              29.12,
              faceZ,
            ],
            material: CHURCH_MATERIALS.trimStone,
            castShadow: true,
          })
          archShoulder.rotation.z = side * -0.62
        }
      }
    }

    for (const faceZ of [-frontZ, frontZ]) {
      this.kit.box(group, {
        name: `Gờ đỉnh lan can tháp ${label}`,
        size: [towerWidth + 0.38, 0.2, 0.34],
        position: [0, 29.55, faceZ],
        material: CHURCH_MATERIALS.agedStone,
        castShadow: true,
      })
    }

    const sidePostCount = 8
    const sidePostWidth = 0.22
    const usableDepth = towerWidth - 0.48
    const sideGap = (usableDepth - sidePostWidth * sidePostCount) / (sidePostCount - 1)
    const sideStartZ = -usableDepth / 2 + sidePostWidth / 2
    for (const side of [-1, 1]) {
      const sideX = side * (towerWidth / 2 - 0.08)
      for (let index = 0; index < sidePostCount; index += 1) {
        this.kit.box(group, {
          name: `Trụ khe lan can hông tháp ${label} ${index + 1}`,
          size: [0.24, 2.55, sidePostWidth],
          position: [sideX, 28.08, sideStartZ + index * (sidePostWidth + sideGap)],
          material: CHURCH_MATERIALS.trimStone,
          castShadow: true,
        })
      }
      for (let index = 0; index < sidePostCount - 1; index += 1) {
        const gapCenterZ = sideStartZ + sidePostWidth / 2 + sideGap / 2
          + index * (sidePostWidth + sideGap)
        for (const direction of [-1, 1]) {
          const archShoulder = this.kit.box(group, {
            name: `Vai vòm khe lan can hông tháp ${label}`,
            size: [0.24, 0.13, sideGap * 0.64],
            position: [sideX, 29.12, gapCenterZ + direction * sideGap * 0.2],
            material: CHURCH_MATERIALS.trimStone,
            castShadow: true,
          })
          archShoulder.rotation.x = direction * 0.62
        }
      }
      this.kit.box(group, {
        name: `Gờ đỉnh lan can hông tháp ${label}`,
        size: [0.34, 0.2, towerWidth + 0.38],
        position: [sideX, 29.55, 0],
        material: CHURCH_MATERIALS.agedStone,
        castShadow: true,
      })
    }
  }

  #buildHiddenCap(tower, label) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const crownOffsetZ = (towerDepth - towerWidth) / 2
    const geometry = getTowerCapGeometry(this.kit, towerWidth - 0.5, towerWidth - 0.5)
    const cap = new THREE.Mesh(geometry, this.kit.material(CHURCH_MATERIALS.roofTile))
    cap.name = `Mái tháp thấp ẩn trong parapet ${label}`
    cap.position.z = crownOffsetZ
    cap.position.y = 26.72
    cap.scale.y = 1.05
    cap.castShadow = true
    cap.receiveShadow = true
    tower.add(cap)
  }

  #buildPinnacles(tower, label) {
    const { towerWidth, towerDepth, towerHeight } = CHURCH_DIMENSIONS
    const crownOffsetZ = (towerDepth - towerWidth) / 2
    const edgeX = towerWidth / 2 - 0.22
    const edgeZ = towerWidth / 2 - 0.22
    const instances = []
    for (const x of [-edgeX, edgeX]) {
      for (const z of [crownOffsetZ - edgeZ, crownOffsetZ + edgeZ]) {
        instances.push(
          { size: [0.54, 2.7, 0.54], position: [x, towerHeight - 1.35, z] },
          { size: [0.72, 0.2, 0.72], position: [x, towerHeight - 2.62, z] },
          { size: [0.42, 0.22, 0.42], position: [x, towerHeight - 0.12, z] },
        )
      }
    }
    this.kit.instancedBoxes(tower, {
      name: `Pinnacle góc tháp ${label}`,
      material: CHURCH_MATERIALS.trimStone,
      castShadow: true,
      instances,
    })
  }

  #buildTowerWeathering(tower, label) {
    const { towerWidth, towerDepth } = CHURCH_DIMENSIONS
    const frontZ = towerDepth / 2 + 0.39
    for (const [index, y] of [8.4, 13.47, 18.71, 24.38].entries()) {
      addWeatheringStreaks({
        kit: this.kit,
        parent: tower,
        name: `Vệt mưa tháp ${label} tầng ${index + 1}`,
        position: [0, y, frontZ],
        width: towerWidth * 0.78,
        height: index === 3 ? 2.15 : 1.55,
        count: 7,
      })
    }
  }
}
