import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MOTORCYCLE_MISSIONS,
  MotorcycleMissionSystem,
} from '../src/systems/MotorcycleMissionSystem.js'

test('MotorcycleMissionSystem lists missions correctly', () => {
  const system = new MotorcycleMissionSystem()
  const missions = system.getMissions()

  assert.equal(missions.length, 4)
  assert.equal(system.getActiveMission(), null)
})

test('MotorcycleMissionSystem handles pickup and dropoff progression for Xe Ôm mission', () => {
  let noticeMsg = ''
  const mockUi = {
    showNotice(msg) {
      noticeMsg = msg
    },
  }

  const system = new MotorcycleMissionSystem({ ui: mockUi })
  const started = system.startMission('xeom-church')
  assert.equal(started, true)

  const active = system.getActiveMission()
  assert.notEqual(active, null)
  assert.equal(active.stage, 'pickup')
  assert.equal(active.targetName, 'Điểm đón khách Bờ Hồ')

  // Move player near pickup position (x: 105, z: -33)
  system.update(1.0, { x: 105, z: -33 }, true)

  const updatedActive = system.getActiveMission()
  assert.equal(updatedActive.stage, 'dropoff')
  assert.equal(updatedActive.targetName, 'Nhà Thờ Lớn Hà Nội')
  assert.match(noticeMsg, /Khách đã lên xe/)

  // Move player near dropoff position (x: 8, z: -8)
  system.update(1.0, { x: 8, z: -8 }, true)

  assert.equal(system.getActiveMission(), null)
  assert.equal(system.isMissionCompleted('xeom-church'), true)
  assert.equal(system.totalEarnedCoins, 500)
  assert.match(noticeMsg, /Hoàn thành Xe Ôm — Chở khách đến Nhà Thờ Lớn/)
})

test('MotorcycleMissionSystem fails active mission when timer expires', () => {
  let noticeMsg = ''
  const mockUi = {
    showNotice(msg) {
      noticeMsg = msg
    },
  }

  const system = new MotorcycleMissionSystem({ ui: mockUi })
  system.startMission('food-pho-thin')

  // Elapse more time than limit (limit: 55s)
  system.update(60.0, { x: 0, z: 0 }, true)

  assert.equal(system.getActiveMission(), null)
  assert.equal(system.isMissionCompleted('food-pho-thin'), false)
  assert.match(noticeMsg, /Hết thời gian/)
})

test('MotorcycleMissionSystem handles City Tour checkpoint sequence', () => {
  const system = new MotorcycleMissionSystem()
  system.startMission('city-tour-lake')

  const active = system.getActiveMission()
  assert.equal(active.stage, 'checkpoint')
  assert.equal(active.checkpointIndex, 0)

  const checkpoints = active.checkpoints
  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i]
    system.update(1.0, { x: cp.x, z: cp.z }, true)
  }

  assert.equal(system.getActiveMission(), null)
  assert.equal(system.isMissionCompleted('city-tour-lake'), true)
  assert.equal(system.totalEarnedCoins, 800)
})
