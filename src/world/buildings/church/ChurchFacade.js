import * as THREE from 'three'
import { CHURCH_DIMENSIONS } from './ChurchDimensions.js'
import { CHURCH_MATERIALS } from './ChurchMaterials.js'
import {
  addClock,
  addCross,
  addGothicDoor,
  addLayeredLancet,
  addRoseWindow,
  addStatueNiche,
  addWeatheringStreaks,
} from './ChurchDetails.js'

export class ChurchFacade {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Mặt tiền Nhà thờ Lớn Hà Nội'
    parent.add(this.group)

    this.doors = []
    this.steps = []
    this.#buildMass()
    this.#buildEntrances()
    this.#buildFenestration()
    this.#buildUpperFacade()
    this.#buildSteps()
    this.#buildWeathering()
  }

  #buildMass() {
    const dimensions = CHURCH_DIMENSIONS
    const facadeGableHeight = dimensions.facadeGableHeight ?? 22.5
    const gableHeight = facadeGableHeight - dimensions.naveWallHeight
    const wallDepth = 0.92
    const wallCenterZ = dimensions.facadeZ - wallDepth / 2

    this.kit.box(this.group, {
      name: 'Khối mặt tiền trung tâm',
      size: [dimensions.centralFacadeWidth, dimensions.naveWallHeight, wallDepth],
      position: [0, dimensions.naveWallHeight / 2, wallCenterZ],
      material: CHURCH_MATERIALS.weatheredStone,
      castShadow: true,
    })
    this.kit.gable(this.group, {
      name: 'Tam giác đầu hồi trung tâm',
      width: dimensions.centralFacadeWidth,
      height: gableHeight,
      depth: wallDepth,
      position: [0, dimensions.naveWallHeight - 0.04, wallCenterZ],
      material: CHURCH_MATERIALS.weatheredStone,
      castShadow: true,
    })

    for (const side of [-1, 1]) {
      const edgeX = side * (dimensions.centralFacadeWidth / 2 - 0.28)
      this.kit.box(this.group, {
        name: 'Trụ biên mặt tiền trung tâm',
        size: [0.56, dimensions.naveWallHeight + 0.25, 0.54],
        position: [edgeX, dimensions.naveWallHeight / 2, dimensions.facadeZ + 0.08],
        material: CHURCH_MATERIALS.agedStone,
        castShadow: true,
      })
    }

    this.kit.instancedBoxes(this.group, {
      name: 'Gờ phân tầng mặt tiền trung tâm',
      material: CHURCH_MATERIALS.trimStone,
      castShadow: true,
      instances: [
        {
          size: [dimensions.centralFacadeWidth + 0.2, 0.28, 0.48],
          position: [0, 6.15, dimensions.facadeZ + 0.13],
        },
        {
          size: [dimensions.centralFacadeWidth + 0.3, 0.32, 0.52],
          position: [0, dimensions.naveWallHeight - 0.15, dimensions.facadeZ + 0.1],
        },
      ],
    })

    for (const side of [-1, 1]) {
      const halfWidth = dimensions.centralFacadeWidth / 2
      const shoulderY = dimensions.naveWallHeight + gableHeight * 0.52
      const slopeRise = gableHeight * 0.48
      const slopeLength = Math.hypot(halfWidth, slopeRise)
      const trim = this.kit.box(this.group, {
        name: 'Viền dốc đầu hồi trung tâm',
        size: [slopeLength, 0.28, 0.55],
        position: [
          side * halfWidth / 2,
          shoulderY + slopeRise / 2,
          dimensions.facadeZ + 0.11,
        ],
        material: CHURCH_MATERIALS.trimStone,
        castShadow: true,
      })
      trim.rotation.z = side * -Math.atan2(slopeRise, halfWidth)
    }
  }

  #buildEntrances() {
    const { facadeZ, portalHalfWidth, towerCentersX } = CHURCH_DIMENSIONS
    const frontZ = facadeZ + 0.16

    this.doors.push(addGothicDoor({
      kit: this.kit,
      parent: this.group,
      name: 'Cửa chính Nhà thờ',
      position: [0, 0.22, frontZ],
      width: portalHalfWidth * 2,
      height: 5.85,
      doubleDoor: true,
    }))

    towerCentersX.forEach((x, index) => {
      this.doors.push(addGothicDoor({
        kit: this.kit,
        parent: this.group,
        name: `Cửa phụ ${index === 0 ? 'phía tây' : 'phía đông'}`,
        position: [x, 0.22, frontZ + 0.015],
        width: 2.35,
        height: 4.55,
        doubleDoor: true,
      }))
    })
  }

  #buildFenestration() {
    const { facadeZ } = CHURCH_DIMENSIONS
    const lancetY = 6.48
    for (const [index, x] of [-3.2, -1.6, 0, 1.6, 3.2].entries()) {
      addLayeredLancet({
        kit: this.kit,
        parent: this.group,
        name: `Lancet hàng giữa ${index + 1}`,
        position: [x, lancetY, facadeZ + 0.24],
        width: 0.76,
        height: 1.9,
        glassMaterial: index === 2
          ? CHURCH_MATERIALS.glassAmber
          : CHURCH_MATERIALS.glassBlue,
        depth: 0.17,
      })
    }

    this.roseWindow = addRoseWindow({
      kit: this.kit,
      parent: this.group,
      name: 'Cửa sổ hoa hồng trung tâm',
      position: [0, 10.35, facadeZ + 0.3],
      radius: 1.78,
      depth: 0.22,
    })

    const roundels = [
      [-3.35, 9.0, CHURCH_MATERIALS.glassAmber],
      [3.35, 9.0, CHURCH_MATERIALS.glassTeal],
      [-3.35, 11.45, CHURCH_MATERIALS.glassRed],
      [3.35, 11.45, CHURCH_MATERIALS.glassBlue],
    ]
    this.roundels = roundels.map(([x, y, material], index) => addRoseWindow({
      kit: this.kit,
      parent: this.group,
      name: `Roundel phụ ${index + 1}`,
      position: [x, y, facadeZ + 0.31],
      radius: 0.43,
      glassMaterials: [material, material, CHURCH_MATERIALS.glassAmber],
      spokeCount: 4,
      depth: 0.12,
    }))
  }

  #buildUpperFacade() {
    const { facadeZ, facadeGableHeight = 22.5 } = CHURCH_DIMENSIONS

    this.statueNiche = addStatueNiche({
      kit: this.kit,
      parent: this.group,
      name: 'Hốc tượng trung tâm mặt tiền',
      position: [0, 14.05, facadeZ + 0.25],
      width: 1.3,
      height: 2.75,
    })

    for (const side of [-1, 1]) {
      addLayeredLancet({
        kit: this.kit,
        parent: this.group,
        name: `Lancet nhỏ tầng trên ${side < 0 ? 'trái' : 'phải'}`,
        position: [side * 2.35, 14.5, facadeZ + 0.25],
        width: 0.82,
        height: 2.25,
        glassMaterial: CHURCH_MATERIALS.recess,
        depth: 0.13,
      })
    }

    this.clock = addClock({
      kit: this.kit,
      parent: this.group,
      name: 'Đồng hồ trung tâm Nhà thờ',
      position: [0, 19.05, facadeZ + 0.34],
      radius: 0.92,
    })

    this.cross = addCross({
      kit: this.kit,
      parent: this.group,
      name: 'Thánh giá đỉnh đầu hồi',
      position: [0, facadeGableHeight + 1.55, facadeZ - 0.05],
      height: 3.2,
      width: 1.75,
      thickness: 0.24,
      material: CHURCH_MATERIALS.trimStone,
    })
  }

  #buildSteps() {
    const { facadeZ } = CHURCH_DIMENSIONS
    const steps = [
      { width: 7.5, depth: 2.4, y: 0.08, z: facadeZ + 1.4 },
      { width: 6.45, depth: 1.84, y: 0.22, z: facadeZ + 0.85 },
      { width: 5.45, depth: 1.22, y: 0.37, z: facadeZ + 0.35 },
    ]

    for (const [index, step] of steps.entries()) {
      this.steps.push(this.kit.box(this.group, {
        name: `Bậc thềm cửa chính ${index + 1}`,
        size: [step.width, 0.18, step.depth],
        position: [0, step.y, step.z],
        material: CHURCH_MATERIALS.trimStone,
        receiveShadow: true,
      }))
    }
  }

  #buildWeathering() {
    const { facadeZ, centralFacadeWidth, naveWallHeight } = CHURCH_DIMENSIONS
    addWeatheringStreaks({
      kit: this.kit,
      parent: this.group,
      name: 'Vệt mưa dưới gờ giữa mặt tiền',
      position: [0, 6.02, facadeZ + 0.405],
      width: centralFacadeWidth * 0.9,
      height: 1.7,
      count: 12,
    })
    addWeatheringStreaks({
      kit: this.kit,
      parent: this.group,
      name: 'Vệt mưa dưới đầu hồi',
      position: [0, naveWallHeight - 0.3, facadeZ + 0.4],
      width: centralFacadeWidth * 0.82,
      height: 2.2,
      count: 10,
    })
  }
}
