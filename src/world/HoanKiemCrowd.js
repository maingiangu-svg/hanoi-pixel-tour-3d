import * as THREE from 'three'
import { NpcActor } from '../npcs/NpcActor.js'
import { NpcManager } from '../npcs/NpcManager.js'
import { normalizeGameMinutes } from '../npcs/npcSchedules.js'

const TEA_DIALOGUE = Object.freeze([
  { text: 'Uống cốc trà không cháu?' },
  { text: 'Tối ở đây lúc nào cũng đông.' },
])

const DRIVER_DIALOGUE = Object.freeze([
  { text: 'Đi đâu chú chở, giá mềm thôi!' },
])

function inTimeRange(minutes, start, end) {
  const time = normalizeGameMinutes(minutes)
  return start <= end ? time >= start && time < end : time >= start || time < end
}

export class HoanKiemCrowd {
  constructor({ kit, parent, colliders, playerPosition }) {
    this.kit = kit
    this.colliders = colliders
    this.playerPosition = playerPosition
    this.group = new THREE.Group()
    this.group.name = 'Đời sống Hồ Gươm và Phố Cổ'
    parent.add(this.group)
    this.manager = new NpcManager(playerPosition)
    this.lastActivationKey = null
    this.profiler = null

    this.#buildTeaCorner()
    this.#buildActors()
  }

  setProfiler(profiler) {
    this.profiler = profiler
    this.manager.setProfiler(profiler)
  }

  update(deltaTime, clock, activeAreaName) {
    const scheduleStartedAt = this.profiler?.begin() ?? 0
    const outdoor = activeAreaName === 'outdoor'
    const lakeDistance = Math.hypot(this.playerPosition.x - 92, this.playerPosition.z)
    const oldQuarterDistance = Math.hypot(this.playerPosition.x - 56, this.playerPosition.z - 36)
    const nearLake = outdoor && this.playerPosition.x > 54 && lakeDistance < 68
    const nearOldQuarter = outdoor && this.playerPosition.x > 38 && oldQuarterDistance < 40
    const time = clock.minutes
    const daytime = inTimeRange(time, 5 * 60 + 30, 22 * 60 + 30)
    const teaOpen = inTimeRange(time, 6 * 60 + 30, 21 * 60)
    const lakeBusy = inTimeRange(time, 15 * 60 + 30, 22 * 60)
    const jogTime = inTimeRange(time, 5 * 60 + 30, 8 * 60 + 30) ||
      inTimeRange(time, 16 * 60 + 30, 20 * 60)
    const activationKey = [nearLake, nearOldQuarter, daytime, teaOpen, lakeBusy, jogTime].join(':')

    if (activationKey !== this.lastActivationKey) {
      this.manager.setRoleActive('lakeDay', nearLake && daytime, { stagger: 0.09 })
      this.manager.setRoleActive('lakeBusy', nearLake && lakeBusy, { stagger: 0.14 })
      this.manager.setRoleActive('jogger', nearLake && jogTime, { stagger: 0.18 })
      this.manager.setRoleActive('teaVendor', nearLake && teaOpen, { stagger: 0 })
      this.manager.setRoleActive('teaGuest', nearLake && teaOpen && lakeBusy, { stagger: 0.13 })
      this.manager.setRoleActive('oldQuarter', nearOldQuarter && daytime, { stagger: 0.12 })
      this.manager.setRoleActive('temple', nearLake && daytime, { stagger: 0.16 })
      this.lastActivationKey = activationKey
    }
    this.profiler?.end('schedule', scheduleStartedAt)
    this.manager.update(deltaTime, activeAreaName)
  }

  getInteractions(areaName, position = null, maxDistance = Infinity) {
    return this.manager.getInteractions(areaName, position, maxDistance)
  }

  getActiveCount(areaName) {
    return this.manager.getActiveCount(areaName)
  }

  getActorByName(name) {
    return this.manager.findActor(name)
  }

  dispose() {
    this.manager.dispose()
    this.group.removeFromParent()
  }

  #actor(options, role) {
    const actor = new NpcActor({
      parent: this.group,
      colliders: options.collides === false ? null : this.colliders,
      active: false,
      ...options,
    })
    return this.manager.add(actor, { area: 'outdoor', role, active: false })
  }

  #buildTeaCorner() {
    const stall = new THREE.Group()
    stall.name = 'Quán trà đá Cô Hương ven hồ'
    stall.position.set(63.2, 0, 19.8)
    this.group.add(stall)
    this.kit.box(stall, {
      name: 'Bàn trà đá ven hồ', size: [1.35, 0.12, 0.86],
      position: [0, 0.48, 0], material: 'greenDoor', castShadow: true,
    })
    for (const [x, z, material] of [[-1, -0.4, 'bridgeRed'], [1, -0.4, 'greenDoor'], [0.3, 0.9, 'bridgeRed']]) {
      this.kit.box(stall, {
        name: 'Ghế nhựa quán Cô Hương', size: [0.44, 0.4, 0.44],
        position: [x, 0.2, z], material,
      })
    }
    this.kit.cylinder(stall, {
      name: 'Bình trà', radius: 0.19, height: 0.52,
      position: [-0.32, 0.8, 0], material: 'metal',
    })
    for (const x of [0.08, 0.3, 0.5]) {
      this.kit.cylinder(stall, {
        name: 'Cốc trà đá', radius: 0.065, height: 0.14,
        position: [x, 0.64, -0.08], material: 'warmGlass',
      })
    }
    this.kit.addCollider(this.colliders, 63.2, 19.8, 1.5, 1, 'Bàn trà đá Cô Hương')
  }

  #buildActors() {
    this.#actor({
      preset: 'teaVendor', name: 'Cô Hương', dialogueName: 'Cô Hương',
      behavior: 'standing', position: [62.15, 0, 19.8], rotationY: -Math.PI / 2,
      dialogueLines: TEA_DIALOGUE, interactionLabel: 'Nói chuyện với Cô Hương',
      hideDuringDialogue: false, castShadow: true, colliderRadius: 0.2,
    }, 'teaVendor')
    this.#actor({
      preset: 'student', name: 'Khách uống trà ven hồ', behavior: 'seated',
      position: [64.2, 0.2, 19.4], rotationY: Math.PI / 2,
      collides: false, animationOffset: 2.1,
    }, 'teaGuest')
    this.#actor({
      preset: 'elderly', name: 'Khách quen của Cô Hương', behavior: 'seated',
      position: [63.5, 0.2, 20.75], rotationY: Math.PI,
      collides: false, animationOffset: 4.2,
    }, 'teaGuest')

    this.#actor({
      preset: 'tourist', name: 'Du khách chụp Tháp Rùa', behavior: 'photographer',
      position: [68.3, 0, 1.5], rotationY: Math.PI / 2,
      colliderRadius: 0.18, castShadow: true,
    }, 'lakeDay')
    this.#actor({
      preset: 'tourist', name: 'Khách chụp ảnh Cầu Thê Húc', behavior: 'photographer',
      position: [112, 0, 36.5], rotationY: Math.PI / 2,
      colliderRadius: 0.18,
    }, 'lakeDay')

    for (const [index, [x, z, preset]] of [
      [67.7, 0.2, 'student'], [68.6, 0.2, 'churchVisitor'],
    ].entries()) {
      this.#actor({
        preset, name: `Đôi bạn bên hồ ${index + 1}`, behavior: 'standing',
        position: [x, 0, z + 7], rotationY: index === 0 ? Math.PI / 2 : -Math.PI / 2,
        colliderRadius: 0.17, animationOffset: 1.5 + index * 2,
      }, 'lakeBusy')
    }

    const walkingRoutes = [
      { name: 'Người đi bộ ven hồ 1', preset: 'student', offset: 0, points: [[68.8, 0, -29], [68.8, 0, 28]] },
      { name: 'Người đi bộ ven hồ 2', preset: 'elderly', offset: 2.4, points: [[67.2, 0, 25], [67.2, 0, -26]] },
      { name: 'Người chạy bộ ven hồ 1', preset: 'student', offset: 1.1, speed: 1.18, points: [[70.1, 0, -28], [70.1, 0, 27]] },
      { name: 'Người chạy bộ ven hồ 2', preset: 'tourist', offset: 3.2, speed: 1.08, points: [[66.7, 0, 24], [66.7, 0, -23]] },
    ]
    walkingRoutes.forEach((route, index) => {
      this.#actor({
        preset: route.preset, name: route.name, behavior: 'walker',
        position: route.points[0], waypoints: route.points,
        speed: route.speed, colliderRadius: 0.18, animationOffset: route.offset,
      }, index < 2 ? 'lakeDay' : 'jogger')
    })

    this.#actor({
      preset: 'motorbikeDriver', name: 'Chú xe ôm phố cổ', dialogueName: 'Chú xe ôm',
      behavior: 'standing', position: [60.3, 0, 33.4], rotationY: Math.PI,
      dialogueLines: DRIVER_DIALOGUE, interactionLabel: 'Nói chuyện với chú xe ôm',
      hideDuringDialogue: false, castShadow: true, colliderRadius: 0.2,
    }, 'oldQuarter')
    this.#actor({
      preset: 'tourist', name: 'Du khách Phố Cổ 1', behavior: 'standing',
      position: [50.8, 0, 32], rotationY: Math.PI / 2, colliderRadius: 0.18,
    }, 'oldQuarter')
    this.#actor({
      preset: 'tourist', name: 'Du khách Phố Cổ 2', behavior: 'standing',
      position: [51.9, 0, 31.75], rotationY: -Math.PI / 2, colliderRadius: 0.18,
    }, 'oldQuarter')

    this.#actor({
      preset: 'churchVisitor', name: 'Khách Đền Ngọc Sơn 1', behavior: 'standing',
      position: [114, 0, 48.2], rotationY: 0, colliderRadius: 0.17,
    }, 'temple')
    this.#actor({
      preset: 'elderly', name: 'Khách Đền Ngọc Sơn 2', behavior: 'standing',
      position: [124.2, 0, 48.5], rotationY: 0, colliderRadius: 0.17,
    }, 'temple')
  }
}
