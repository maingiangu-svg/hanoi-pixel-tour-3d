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
    this.disabledLegacyColliders = disabledLegacyColliders
    this.hiddenLegacyGroups = hiddenLegacyGroups
  }
}
