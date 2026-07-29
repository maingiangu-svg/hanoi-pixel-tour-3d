/**
 * FastTravelSystem — Handles instant transportation between major Hanoi landmarks
 * via Bus Stops (Trạm Xe Bus) and Xe Ôm Stands (Bến Xe Ôm).
 */

export const FAST_TRAVEL_STOPS = Object.freeze([
  Object.freeze({
    id: 'bus-church',
    name: 'Trạm Bus Nhà Thờ Lớn',
    type: 'bus',
    icon: '🚌',
    description: 'Trạm xe bus trước quảng trường Nhà Thờ Lớn Hà Nội',
    position: Object.freeze({ x: 0, z: 10 }),
    yaw: 0,
    landmarkId: 'nhaThoLon',
  }),
  Object.freeze({
    id: 'bus-lake-west',
    name: 'Trạm Bus Bờ Hồ (Bờ Tây)',
    type: 'bus',
    icon: '🚌',
    description: 'Trạm bus bến Bờ Hồ, ngắm Tháp Rùa và hồ nước',
    position: Object.freeze({ x: 68, z: -3 }),
    yaw: -Math.PI / 2,
    landmarkId: 'hoGuom',
  }),
  Object.freeze({
    id: 'bus-temple',
    name: 'Trạm Bus Cầu Thê Húc',
    type: 'bus',
    icon: '🚌',
    description: 'Trạm xe bus đầu lối vào Cầu Thê Húc & Đền Ngọc Sơn',
    position: Object.freeze({ x: 119, z: 25 }),
    yaw: Math.PI,
    landmarkId: 'denNgocSon',
  }),
  Object.freeze({
    id: 'xeom-old-quarter',
    name: 'Bến Xe Ôm Phố Cổ (Hàng Bạc)',
    type: 'xeom',
    icon: '🏍️',
    description: 'Bến xe ôm truyền thống ngay trung tâm Phố Cổ Hà Nội',
    position: Object.freeze({ x: 146, z: 113 }),
    yaw: 0,
    landmarkId: 'phoCo',
  }),
  Object.freeze({
    id: 'xeom-night-market',
    name: 'Bến Xe Ôm Chợ Đêm',
    type: 'xeom',
    icon: '🏍️',
    description: 'Bến xe ôm sầm uất tuyến Phố Đi Bộ & Chợ Đêm Hàng Đào',
    position: Object.freeze({ x: 108, z: -91 }),
    yaw: 0,
    landmarkId: 'phoCo',
  }),
  Object.freeze({
    id: 'xeom-pedestrian',
    name: 'Bến Xe Ôm Phố Đi Bộ',
    type: 'xeom',
    icon: '🏍️',
    description: 'Bến xe ôm cửa ngõ Phố Đi Bộ Hồ Gươm',
    position: Object.freeze({ x: 145, z: 110 }),
    yaw: Math.PI / 2,
    landmarkId: 'hoGuom',
  }),
])

export class FastTravelSystem {
  constructor({ player = null, audio = null, ui = null } = {}) {
    this.player = player
    this.audio = audio
    this.ui = ui
    this.stops = FAST_TRAVEL_STOPS
  }

  getStops() {
    return this.stops
  }

  getStopById(id) {
    return this.stops.find((s) => s.id === id) || null
  }

  /**
   * Fast travel to a stop by ID.
   */
  travelToStop(stopId, player = this.player) {
    const stop = this.getStopById(stopId)
    if (!stop) return false
    const targetPlayer = player || this.player
    if (!targetPlayer) return false

    targetPlayer.teleport(stop.position, stop.yaw)

    if (this.ui?.showNotice) {
      this.ui.showNotice(`Đã di chuyển nhanh tới ${stop.name} ${stop.icon}`)
    }

    return true
  }
}
