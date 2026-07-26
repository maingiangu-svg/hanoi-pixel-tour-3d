import * as THREE from 'three'
import {
  CENTRAL_HANOI_COMMERCIAL_ZONES,
  CENTRAL_HANOI_LAKE_REFLECTIONS,
  CENTRAL_HANOI_SKYLINE_CLUSTERS,
} from './map/centralHanoiBackdropLayout.js'

const VISIBILITY_HYSTERESIS = 12
const SIGN_FAMILIES = Object.freeze({
  green: Object.freeze({ background: '#315f57', foreground: '#f2dfb0' }),
  brick: Object.freeze({ background: '#995343', foreground: '#f2dfb0' }),
  cream: Object.freeze({ background: '#cda765', foreground: '#34393a' }),
})

export class CentralHanoiBackdrop {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Bốn lớp đô thị trung tâm Hà Nội'
    parent.add(this.group)

    this.skylineGroups = []
    this.commercialZones = []
    this.drawMeshes = []
    this.#buildSkyline()
    this.#buildCommercialForeground()
    this.#buildLakeReflections()
  }

  updateVisibility(playerPosition, active = true) {
    this.group.visible = Boolean(active)
    if (!active || !playerPosition) return

    for (const entry of [...this.skylineGroups, ...this.commercialZones]) {
      const dx = playerPosition.x - entry.center[0]
      const dz = playerPosition.z - entry.center[1]
      const threshold = entry.activationRadius + (
        entry.group.visible ? VISIBILITY_HYSTERESIS : 0
      )
      entry.group.visible = dx * dx + dz * dz <= threshold * threshold
    }

    const lakeDx = playerPosition.x - 108
    const lakeDz = playerPosition.z
    this.reflectionGroup.visible = lakeDx * lakeDx + lakeDz * lakeDz <= 118 ** 2
  }

  getStats() {
    const visibleSkylineClusters = this.skylineGroups.reduce((
      total,
      entry,
    ) => total + Number(entry.group.visible), 0)
    const visibleCommercialZones = this.commercialZones.reduce((
      total,
      entry,
    ) => total + Number(entry.group.visible), 0)
    const visibleMeshes = this.drawMeshes.reduce((total, mesh) => (
      total + Number(mesh.visible && mesh.parent?.visible)
    ), 0)

    return {
      skylineBuildings: CENTRAL_HANOI_SKYLINE_CLUSTERS.reduce((
        total,
        entry,
      ) => total + entry.buildings.length, 0),
      commercialFronts: CENTRAL_HANOI_COMMERCIAL_ZONES.reduce((
        total,
        entry,
      ) => total + entry.fronts.length, 0),
      visibleSkylineClusters,
      visibleCommercialZones,
      visibleMeshes,
    }
  }

  dispose() {
    this.group.removeFromParent()
  }

  #buildSkyline() {
    CENTRAL_HANOI_SKYLINE_CLUSTERS.forEach((layout) => {
      const group = new THREE.Group()
      group.name = layout.name
      group.userData.centralHanoiLayer = 'background-skyline'
      this.group.add(group)
      this.skylineGroups.push({ ...layout, group })

      const bodiesByMaterial = new Map()
      const cornices = []
      const windows = []
      const roofDetails = []

      layout.buildings.forEach((entry, buildingIndex) => {
        const material = entry.material === 'brick' || entry.material === 'oldYellow'
          ? 'skylineFacadeWarm'
          : 'skylineFacade'
        const bodies = bodiesByMaterial.get(material) ?? []
        const bodyHeight = entry.height - entry.baseY
        bodies.push({
          size: [entry.width, bodyHeight, entry.depth],
          position: [entry.x, entry.baseY + bodyHeight / 2, entry.z],
        })
        const topHeight = Math.max(3.4, entry.height * 0.25)
        bodies.push({
          size: [
            entry.width * entry.setback,
            topHeight,
            entry.depth * Math.min(0.78, entry.setback + 0.08),
          ],
          position: [
            entry.x,
            entry.height + topHeight / 2 - 0.12,
            entry.z,
          ],
        })
        bodiesByMaterial.set(material, bodies)

        cornices.push({
          size: [entry.width + 0.45, 0.32, entry.depth + 0.45],
          position: [entry.x, entry.height + 0.02, entry.z],
        })
        cornices.push({
          size: [
            entry.width * entry.setback + 0.34,
            0.28,
            entry.depth * Math.min(0.78, entry.setback + 0.08) + 0.34,
          ],
          position: [entry.x, entry.height + topHeight - 0.12, entry.z],
        })
        if (entry.roof === 'service' || buildingIndex % 3 === 0) {
          roofDetails.push({
            size: [entry.width * 0.22, 1.2, entry.depth * 0.3],
            position: [entry.x, entry.height + topHeight + 0.48, entry.z],
          })
        }

        this.#appendWindowBands(windows, entry, buildingIndex)
      })

      bodiesByMaterial.forEach((instances, material) => {
        this.#track(this.kit.instancedBoxes(group, {
          name: `${layout.name} · thân nhà ${material}`,
          material,
          instances,
          castShadow: false,
          receiveShadow: true,
        }))
      })
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · gờ mái`,
        material: 'stoneDark',
        instances: cornices,
        castShadow: false,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · cửa sổ xa`,
        material: 'skylineGlass',
        instances: windows,
        castShadow: false,
        receiveShadow: false,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · chi tiết mái`,
        material: 'metal',
        instances: roofDetails,
        castShadow: false,
      }))
    })
  }

  #appendWindowBands(target, building, seed) {
    const frontAlongX = building.front === 'positiveZ' || building.front === 'negativeZ'
    const direction = building.front === 'positiveZ' || building.front === 'positiveX' ? 1 : -1
    const facadeDepth = frontAlongX ? building.depth : building.width
    const facadeWidth = frontAlongX ? building.width : building.depth
    const floorStart = Math.max(4.1, building.baseY + 1.7)
    const floorCount = Math.max(2, Math.floor((building.height - floorStart) / 2.7))
    const bayCount = Math.max(2, Math.min(4, Math.floor(facadeWidth / 4.6)))

    for (let floor = 0; floor < floorCount; floor += 1) {
      const y = floorStart + floor * 2.72
      if (y > building.height - 1.1) break
      for (let bay = 0; bay < bayCount; bay += 1) {
        if ((seed + floor * 3 + bay * 5) % 7 === 0) continue
        const tangent = (bay - (bayCount - 1) / 2) * (facadeWidth / bayCount)
        target.push({
          size: frontAlongX
            ? [Math.min(2.4, facadeWidth / bayCount * 0.62), 1.35, 0.14]
            : [0.14, 1.35, Math.min(2.4, facadeWidth / bayCount * 0.62)],
          position: frontAlongX
            ? [
                building.x + tangent,
                y,
                building.z + direction * (facadeDepth / 2 + 0.08),
              ]
            : [
                building.x + direction * (facadeDepth / 2 + 0.08),
                y,
                building.z + tangent,
              ],
        })
      }
    }
  }

  #buildCommercialForeground() {
    CENTRAL_HANOI_COMMERCIAL_ZONES.forEach((layout) => {
      const group = new THREE.Group()
      group.name = layout.name
      group.userData.centralHanoiLayer = 'foreground-midground'
      this.group.add(group)
      this.commercialZones.push({ ...layout, group })

      const premiumDisplayWindows = []
      const regularDisplayWindows = []
      const frames = []
      const awnings = []
      const signBackings = []
      const lightPools = []

      layout.fronts.forEach((front, index) => {
        const isX = front.axis === 'x'
        const [x, y, z] = front.position
        const out = front.normal
        const displayTarget = index % 3 === 0
          ? premiumDisplayWindows
          : regularDisplayWindows
        displayTarget.push({
          size: isX ? [front.width, 2.65, 0.12] : [0.12, 2.65, front.width],
          position: isX
            ? [x, y, z + out * 0.04]
            : [x + out * 0.04, y, z],
        })
        frames.push(
          ...[-1, 0, 1].map((side) => ({
            size: isX ? [0.11, 2.82, 0.18] : [0.18, 2.82, 0.11],
            position: isX
              ? [x + side * front.width / 2, y, z + out * 0.09]
              : [x + out * 0.09, y, z + side * front.width / 2],
          })),
        )
        awnings.push({
          size: isX ? [front.width + 0.35, 0.16, 1.12] : [1.12, 0.16, front.width + 0.35],
          position: isX
            ? [x, 3.22, z + out * 0.48]
            : [x + out * 0.48, 3.22, z],
        })
        signBackings.push({
          size: isX ? [front.width + 0.25, 0.72, 0.15] : [0.15, 0.72, front.width + 0.25],
          position: isX
            ? [x, 3.74, z + out * 0.11]
            : [x + out * 0.11, 3.74, z],
        })
        lightPools.push({
          size: isX ? [front.width * 1.06, 0.012, 2.7] : [2.7, 0.012, front.width * 1.06],
          position: isX
            ? [x, 0.055, z + out * 1.55]
            : [x + out * 1.55, 0.055, z],
        })

        if (index % 2 === 0) {
          const family = SIGN_FAMILIES[front.family] ?? SIGN_FAMILIES.green
          this.#track(this.kit.sign(group, {
            text: front.label,
            width: Math.min(4.8, front.width * 0.92),
            height: 0.58,
            position: isX
              ? [x, 3.76, z + out * 0.2]
              : [x + out * 0.2, 3.76, z],
            rotation: isX
              ? [0, out > 0 ? 0 : Math.PI, 0]
              : [0, out > 0 ? Math.PI / 2 : -Math.PI / 2, 0],
            background: family.background,
            foreground: family.foreground,
          }))
        }
      })

      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · cửa kính shop điểm nhấn`,
        material: 'premiumGlass',
        instances: premiumDisplayWindows,
        receiveShadow: false,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · cửa kính shop thường`,
        material: 'cityWindow',
        instances: regularDisplayWindows,
        receiveShadow: false,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · nhịp khung cửa`,
        material: 'metal',
        instances: frames,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · mái hiên`,
        material: 'greenDoor',
        instances: awnings,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · nền biển hiệu`,
        material: 'signGlow',
        instances: signBackings,
        receiveShadow: false,
      }))
      this.#track(this.kit.instancedBoxes(group, {
        name: `${layout.name} · vùng sáng vỉa hè`,
        material: 'cityLightPool',
        instances: lightPools,
        receiveShadow: false,
      }))
    })
  }

  #buildLakeReflections() {
    this.reflectionGroup = new THREE.Group()
    this.reflectionGroup.name = 'Phản sáng đô thị trên Hồ Gươm'
    this.reflectionGroup.userData.centralHanoiLayer = 'lake-reflection'
    this.group.add(this.reflectionGroup)
    this.#track(this.kit.instancedBoxes(this.reflectionGroup, {
      name: 'Vệt phản sáng skyline và shop trên hồ',
      material: 'waterReflection',
      instances: CENTRAL_HANOI_LAKE_REFLECTIONS,
      receiveShadow: false,
    }))
  }

  #track(mesh) {
    this.drawMeshes.push(mesh)
    return mesh
  }
}
