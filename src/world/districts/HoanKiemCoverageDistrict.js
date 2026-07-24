import * as THREE from 'three'
import { hoanKiemMapData } from '../map/data/hoanKiemMapData.js'
import { ProceduralMapDistrict } from './ProceduralMapDistrict.js'

// The retained vertical slice used a different lake/bridge topology. Its five
// water AABBs would overlap the source-accurate Thê Húc corridor and southern
// promenade. Keep the legacy geometry visible, but let the exact water pieces
// built from mapHoanKiem.js be the sole collision authority for the lake.
const SUPERSEDED_LEGACY_COLLIDERS = new Map([
  ['Mặt nước Hồ Gươm', 'Superseded by source-accurate Hoàn Kiếm water collision'],
  ['Mặt nước phía tây đảo Ngọc Sơn', 'Superseded by source-accurate Hoàn Kiếm water collision'],
  ['Mặt nước phía đông đảo Ngọc Sơn', 'Superseded by source-accurate Hoàn Kiếm water collision'],
  ['Mặt nước cạnh tây Cầu Thê Húc', 'Superseded by source-accurate Hoàn Kiếm water collision'],
  ['Mặt nước cạnh đông Cầu Thê Húc', 'Superseded by source-accurate Hoàn Kiếm water collision'],
  ['Nhà ống tuyến Hồ Gươm 6', 'Legacy footprint crosses the source-accurate Cầu Thê Húc deck'],
  ['Nhà ống tuyến Hồ Gươm 7', 'Legacy footprint crosses the source-accurate Cầu Thê Húc deck'],
])

const SUPERSEDED_LEGACY_GEOMETRY = new Set([
  'Nhà ống tuyến Hồ Gươm 6',
  'Nhà ống tuyến Hồ Gươm 7',
])

const SUPERSEDED_SOURCE_GEOMETRY = new Set([
  'hoanKiem:decoration-007',
  'hoanKiem:building-056',
  'hoanKiem:building-057',
])

const SUPERSEDED_SOURCE_COLLIDER_IDS = Object.freeze([
  'building-056',
  'building-057',
])

const COVERAGE_ACTIVATION_DISTANCE = 104
const COVERAGE_ACTIVATION_HYSTERESIS = 10

export class HoanKiemCoverageDistrict extends ProceduralMapDistrict {
  constructor(options) {
    const disabledLegacyColliders = (options.colliders ?? []).filter((collider) => (
      !collider.sourceMapId && SUPERSEDED_LEGACY_COLLIDERS.has(collider.name)
    ))
    disabledLegacyColliders.forEach((collider) => {
      collider.disabled = true
      collider.disabledReason = SUPERSEDED_LEGACY_COLLIDERS.get(collider.name)
    })

    const hiddenLegacyGroups = [...SUPERSEDED_LEGACY_GEOMETRY].flatMap((legacyName) => {
      const group = options.parent?.getObjectByName(`Cụm ${legacyName}`)
      if (!group) return []
      group.visible = false
      group.userData.supersededBy = 'hoanKiem:walk-zone-024'
      group.userData.hiddenReason = 'Legacy footprint overlaps the source-accurate Cầu Thê Húc deck'
      return [group]
    })

    super({ ...options, mapData: hoanKiemMapData })
    this.group.name = 'Hoàn Kiếm - Phố Cổ · coverage đầy đủ'
    this.group.traverse((object) => {
      object.castShadow = false
      if (!SUPERSEDED_SOURCE_GEOMETRY.has(object.userData?.sourceRef)) return
      object.visible = false
      object.userData.supersededBy = 'Tháp Rùa vertical slice'
      object.userData.hiddenReason = 'Custom Tháp Rùa is the retained composition authority'
    })
    const bounds = new THREE.Box3()
    const sphere = new THREE.Sphere()
    this.visibilityEntries = this.group.children.map((object) => {
      bounds.setFromObject(object)
      bounds.getBoundingSphere(sphere)
      return {
        object,
        center: sphere.center.clone(),
        radius: sphere.radius,
      }
    })
    this.disabledSourceColliders = this.ownColliders.filter((collider) => (
      SUPERSEDED_SOURCE_COLLIDER_IDS.some((sourceId) => (
        collider.sourceId === sourceId
        || collider.sourceId?.startsWith(`${sourceId}-part-`)
      ))
    ))
    this.disabledSourceColliders.forEach((collider) => {
      collider.disabled = true
      collider.disabledReason = 'Superseded by the expanded natural lake boundary'
    })
    this.disabledLegacyColliders = disabledLegacyColliders
    this.hiddenLegacyGroups = hiddenLegacyGroups
  }

  updateVisibility(playerPosition, active = true) {
    this.group.visible = Boolean(active)
    if (!active || !playerPosition) return

    for (const entry of this.visibilityEntries) {
      if (
        entry.object.userData.hiddenByGroundExpansion
        || entry.object.userData.supersededBy
      ) {
        entry.object.visible = false
        continue
      }
      const threshold = COVERAGE_ACTIVATION_DISTANCE
        + entry.radius
        + (entry.object.visible ? COVERAGE_ACTIVATION_HYSTERESIS : 0)
      const dx = playerPosition.x - entry.center.x
      const dz = playerPosition.z - entry.center.z
      entry.object.visible = dx * dx + dz * dz <= threshold * threshold
    }
  }
}
