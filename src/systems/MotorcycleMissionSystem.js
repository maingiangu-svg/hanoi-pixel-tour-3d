/**
 * MotorcycleMissionSystem — Manages Xe Ôm passenger pickups, food deliveries,
 * and City Tour checkpoint challenges.
 */

export const MISSION_TYPES = Object.freeze({
  XE_OM: 'xe_om',
  FOOD_DELIVERY: 'food_delivery',
  CITY_TOUR: 'city_tour',
})

export const MOTORCYCLE_MISSIONS = Object.freeze([
  Object.freeze({
    id: 'xeom-church',
    name: 'Xe Ôm — Chở khách đến Nhà Thờ Lớn',
    type: MISSION_TYPES.XE_OM,
    description: 'Chở vị khách du lịch từ Bờ Hồ về Quảng trường Nhà Thờ Lớn.',
    timeLimit: 75,
    rewardCoins: 500,
    rewardTitle: 'Tài Xế Phố Cổ 🏍️',
    pickupPosition: Object.freeze({ x: 105, z: -33 }),
    pickupName: 'Điểm đón khách Bờ Hồ',
    dropoffPosition: Object.freeze({ x: 8, z: -8 }),
    dropoffName: 'Nhà Thờ Lớn Hà Nội',
    targetRadius: 6.0,
  }),
  Object.freeze({
    id: 'food-pho-thin',
    name: 'Giao Đồ Ăn — Phở Thìn Phố Cổ',
    type: MISSION_TYPES.FOOD_DELIVERY,
    description: 'Lấy suất phở bò nóng hổi từ Phố Cổ ship tới Đền Ngọc Sơn.',
    timeLimit: 55,
    rewardCoins: 450,
    rewardTitle: 'Vua Ship Phở 🍜',
    pickupPosition: Object.freeze({ x: 50, z: 33 }),
    pickupName: 'Quán Phở Thìn Hàng Bạc',
    dropoffPosition: Object.freeze({ x: 122, z: 52 }),
    dropoffName: 'Cổng Đền Ngọc Sơn',
    targetRadius: 6.0,
  }),
  Object.freeze({
    id: 'food-tra-da',
    name: 'Giao Đồ Ăn — Trà Đá Phố Đi Bộ',
    type: MISSION_TYPES.FOOD_DELIVERY,
    description: 'Ship cốc trà đá vỉa hè giải khát tới bờ tây Hồ Gươm.',
    timeLimit: 50,
    rewardCoins: 350,
    rewardTitle: 'Trùm Trà Đá 🍵',
    pickupPosition: Object.freeze({ x: 145, z: 110 }),
    pickupName: 'Quán Trà Đá Phố Đi Bộ',
    dropoffPosition: Object.freeze({ x: 70, z: -15 }),
    dropoffName: 'Ghế đá Bờ Tây Hồ Gươm',
    targetRadius: 6.0,
  }),
  Object.freeze({
    id: 'city-tour-lake',
    name: 'City Tour — Lượn Vòng Hồ Gươm',
    type: MISSION_TYPES.CITY_TOUR,
    description: 'Chạy xe qua 4 trạm kiểm soát xung quanh danh thắng Hồ Gươm.',
    timeLimit: 90,
    rewardCoins: 800,
    rewardTitle: 'Tay Lái Vàng Hà Nội 🏆',
    checkpoints: Object.freeze([
      Object.freeze({ x: 70, z: -15, name: 'Trạm 1: Bờ Tây Hồ Gươm' }),
      Object.freeze({ x: 95, z: 33, name: 'Trạm 2: Bờ Bắc Hồ Gươm' }),
      Object.freeze({ x: 122, z: 52, name: 'Trạm 3: Đền Ngọc Sơn' }),
      Object.freeze({ x: 105, z: -33, name: 'Trạm 4: Bờ Nam Hồ Gươm' }),
    ]),
    targetRadius: 6.0,
  }),
])

export class MotorcycleMissionSystem {
  constructor({ ui = null, player = null } = {}) {
    this.ui = ui
    this.player = player
    this.activeMission = null
    this.completedMissionIds = new Set()
    this.totalEarnedCoins = 0
    this.unlockedTitles = new Set()
    this.listeners = []
  }

  getMissions() {
    return MOTORCYCLE_MISSIONS
  }

  getMissionById(id) {
    return MOTORCYCLE_MISSIONS.find((m) => m.id === id) || null
  }

  isMissionCompleted(id) {
    return this.completedMissionIds.has(id)
  }

  getActiveMission() {
    return this.activeMission
  }

  startMission(missionId) {
    const template = this.getMissionById(missionId)
    if (!template) return false

    if (template.type === MISSION_TYPES.CITY_TOUR) {
      this.activeMission = {
        ...template,
        stage: 'checkpoint',
        checkpointIndex: 0,
        targetPosition: template.checkpoints[0],
        targetName: template.checkpoints[0].name,
        timeRemaining: template.timeLimit,
      }
    } else {
      this.activeMission = {
        ...template,
        stage: 'pickup',
        targetPosition: template.pickupPosition,
        targetName: template.pickupName,
        timeRemaining: template.timeLimit,
      }
    }

    this._notifyListeners('start', this.activeMission)
    if (this.ui?.showNotice) {
      this.ui.showNotice(`Đã nhận nhiệm vụ: ${template.name}! 🏍️`)
    }
    return true
  }

  cancelMission(reason = 'Đã hủy nhiệm vụ') {
    if (!this.activeMission) return
    const mission = this.activeMission
    this.activeMission = null
    this._notifyListeners('fail', { mission, reason })
    if (this.ui?.showNotice) {
      this.ui.showNotice(`${reason} ❌`)
    }
  }

  update(delta, playerPosition, isMotorbikeMounted = true) {
    if (!this.activeMission || !playerPosition) return

    const mission = this.activeMission
    mission.timeRemaining -= delta

    if (mission.timeRemaining <= 0) {
      this.cancelMission('Hết thời gian thực hiện nhiệm vụ!')
      return
    }

    // Calculate 2D distance to target
    const dx = playerPosition.x - mission.targetPosition.x
    const dz = playerPosition.z - mission.targetPosition.z
    const dist = Math.hypot(dx, dz)
    mission.currentDistance = dist

    const radius = mission.targetRadius || 6.0

    if (dist <= radius) {
      this._handleTargetReached(mission, isMotorbikeMounted)
    }

    this._notifyListeners('update', mission)
  }

  _handleTargetReached(mission, isMotorbikeMounted) {
    if (mission.type === MISSION_TYPES.CITY_TOUR) {
      mission.checkpointIndex += 1
      if (mission.checkpointIndex >= mission.checkpoints.length) {
        this._completeActiveMission()
      } else {
        const nextCp = mission.checkpoints[mission.checkpointIndex]
        mission.targetPosition = nextCp
        mission.targetName = nextCp.name
        if (this.ui?.showNotice) {
          this.ui.showNotice(`Đã qua ${nextCp.name}! 🚩`)
        }
      }
    } else if (mission.stage === 'pickup') {
      mission.stage = 'dropoff'
      mission.targetPosition = mission.dropoffPosition
      mission.targetName = mission.dropoffName
      const msg = mission.type === MISSION_TYPES.XE_OM
        ? 'Khách đã lên xe! Hãy chở khách đến đích.'
        : 'Đã nhận đồ ăn! Hãy nhanh chóng giao đến khách hàng.'
      if (this.ui?.showNotice) {
        this.ui.showNotice(`${msg} 📦`)
      }
    } else if (mission.stage === 'dropoff') {
      this._completeActiveMission()
    }
  }

  _completeActiveMission() {
    const mission = this.activeMission
    if (!mission) return

    this.completedMissionIds.add(mission.id)
    this.totalEarnedCoins += mission.rewardCoins
    if (mission.rewardTitle) {
      this.unlockedTitles.add(mission.rewardTitle)
    }
    this.activeMission = null

    this._notifyListeners('complete', mission)
    if (this.ui?.showNotice) {
      this.ui.showNotice(
        `Hoàn thành ${mission.name}! Thưởng +${mission.rewardCoins} xu 🪙 (${mission.rewardTitle})`,
      )
    }
  }

  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  _notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data)
      } catch (err) {
        console.error('Error in mission listener:', err)
      }
    }
  }
}
