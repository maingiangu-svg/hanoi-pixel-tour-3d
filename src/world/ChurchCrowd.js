import * as THREE from 'three'
import { NpcActor } from '../npcs/NpcActor.js'
import { NpcManager } from '../npcs/NpcManager.js'
import { SpecialNpcActor } from '../npcs/SpecialNpcActor.js'
import {
  getAmbientDensity,
  getChurchCrowdState,
  getMoOutfitForTime,
  getMoScheduleState,
} from '../npcs/npcSchedules.js'

const TEA_DIALOGUE = Object.freeze([
  { text: 'Uống cốc trà không cháu?' },
  { text: 'Tối ở đây lúc nào cũng đông.' },
])

const DRIVER_DIALOGUE = Object.freeze([
  { text: 'Đi đâu chú chở, giá mềm thôi!' },
])

export class ChurchCrowd {
  constructor({
    kit,
    outdoor,
    interior,
    outdoorColliders,
    interiorColliders,
    playerPosition,
    mo,
    assetLoader = null,
  }) {
    this.kit = kit
    this.outdoor = outdoor
    this.interior = interior
    this.mo = mo
    this.assetLoader = assetLoader
    this.playerPosition = playerPosition
    this.manager = new NpcManager(playerPosition)
    this.outdoorGroup = new THREE.Group()
    this.outdoorGroup.name = 'Đời sống sân Nhà thờ'
    this.interiorGroup = new THREE.Group()
    this.interiorGroup.name = 'Giáo dân trong Nhà thờ'
    outdoor.add(this.outdoorGroup)
    interior.add(this.interiorGroup)
    this.outdoorColliders = outdoorColliders
    this.interiorColliders = interiorColliders
    this.lastAmbientDensity = null
    this.lastChurchState = null
    this.lastMoState = null
    this.lastMoOutfit = null
    this.lastNearChurch = null
    this.profiler = null

    this.#buildTeaStall()
    this.#buildAmbientCast()
    this.#buildSpecialCast()
    this.#buildChurchCast()
  }

  setProfiler(profiler) {
    this.profiler = profiler
    this.manager.setProfiler(profiler)
  }

  update(deltaTime, clock, activeAreaName) {
    const scheduleStartedAt = this.profiler?.begin() ?? 0
    const nearChurch = activeAreaName === 'interior' || Math.hypot(
      this.playerPosition.x,
      this.playerPosition.z,
    ) < 55
    if (nearChurch !== this.lastNearChurch) {
      this.manager.setRoleActive('special', nearChurch, { stagger: 0 })
    }
    const ambientDensity = getAmbientDensity(clock.minutes)
    if (ambientDensity !== this.lastAmbientDensity || nearChurch !== this.lastNearChurch) {
      if (nearChurch) this.#applyAmbientDensity(ambientDensity)
      else this.#disableAmbientRoles()
      this.lastAmbientDensity = ambientDensity
    }

    const churchState = getChurchCrowdState(clock.minutes)
    if (churchState !== this.lastChurchState || nearChurch !== this.lastNearChurch) {
      if (nearChurch) this.#applyChurchState(churchState)
      else {
        this.manager.setRoleActive('churchProcession', false)
        this.manager.setRoleActive('churchService', false)
      }
      this.lastChurchState = churchState
    }

    const moState = getMoScheduleState(clock.minutes)
    if (moState !== this.lastMoState) {
      this.mo?.setScheduleState(moState)
      this.lastMoState = moState
    }

    const moOutfit = getMoOutfitForTime(clock.minutes)
    if (moOutfit !== this.lastMoOutfit) {
      this.mo?.setWorldOutfit(moOutfit)
      this.lastMoOutfit = moOutfit
    }

    this.lastNearChurch = nearChurch
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
    this.outdoorGroup.removeFromParent()
    this.interiorGroup.removeFromParent()
  }

  #actor(options, { area = 'outdoor', role = 'ambientDay' } = {}) {
    const parent = area === 'interior' ? this.interiorGroup : this.outdoorGroup
    const colliders = area === 'interior' ? this.interiorColliders : this.outdoorColliders
    const actor = new NpcActor({
      parent,
      colliders: options.collides === false ? null : colliders,
      active: false,
      ...options,
    })
    return this.manager.add(actor, { area, role, active: false })
  }

  #specialActor(options, role = 'special') {
    const actor = new SpecialNpcActor({
      parent: this.outdoorGroup,
      colliders: this.outdoorColliders,
      active: false,
      faceLoader: (profileId) => this.assetLoader?.getSpecialFace(profileId),
      ...options,
    })
    return this.manager.add(actor, { area: 'outdoor', role, active: false })
  }

  #buildTeaStall() {
    const stall = new THREE.Group()
    stall.name = 'Góc trà đá vỉa hè'
    stall.position.set(-18.2, 0, 5.8)
    this.outdoorGroup.add(stall)

    this.kit.box(stall, {
      name: 'Bàn trà thấp',
      size: [1.45, 0.12, 0.9],
      position: [0, 0.48, 0],
      material: 'greenDoor',
      castShadow: true,
    })
    for (const [x, z, material] of [
      [-1.05, -0.48, 'brick'], [1.05, -0.48, 'greenDoor'], [0, 1.02, 'brick'],
    ]) {
      this.kit.box(stall, {
        name: 'Ghế nhựa trà đá',
        size: [0.46, 0.42, 0.46],
        position: [x, 0.21, z],
        material,
      })
    }
    this.kit.cylinder(stall, {
      name: 'Bình nước trà',
      radius: 0.2,
      height: 0.55,
      position: [-0.35, 0.79, 0],
      material: 'metal',
    })
    this.kit.cone(stall, {
      name: 'Nắp bình nước',
      sides: 8,
      radius: 0.19,
      height: 0.12,
      position: [-0.35, 1.12, 0],
      material: 'metal',
    })
    for (const x of [0.06, 0.3, 0.52]) {
      this.kit.cylinder(stall, {
        name: 'Cốc trà',
        radius: 0.07,
        height: 0.16,
        position: [x, 0.64, -0.1],
        material: 'warmGlass',
      })
    }
    this.kit.addCollider(this.outdoorColliders, -18.2, 5.8, 1.55, 1, 'Bàn trà đá')
  }

  #buildAmbientCast() {
    const groupCenter = new THREE.Vector3(-2.6, 0, 2.1)
    const studentPositions = [[-3.8, 1.7], [-1.9, 1.4], [-2.4, 3.1]]
    studentPositions.forEach(([x, z], index) => {
      this.#actor({
        preset: 'student',
        name: `Bạn trẻ ${index + 1}`,
        behavior: 'standing',
        position: [x, 0, z],
        rotationY: Math.atan2(groupCenter.x - x, groupCenter.z - z),
        colliderRadius: 0.19,
        animationOffset: index * 1.7,
      })
    })

    const coupleCenter = new THREE.Vector3(5.1, 0, 3.6)
    for (const [index, [x, z]] of [[4.45, 3.5], [5.75, 3.7]].entries()) {
      this.#actor({
        preset: index === 0 ? 'student' : 'churchVisitor',
        name: `Người trong cặp đôi ${index + 1}`,
        behavior: 'standing',
        position: [x, 0, z],
        rotationY: Math.atan2(coupleCenter.x - x, coupleCenter.z - z),
        colliderRadius: 0.18,
        animationOffset: index * 2.2,
      })
    }

    this.#actor({
      preset: 'tourist',
      name: 'Khách chụp ảnh',
      behavior: 'photographer',
      position: [0.3, 0, 5.8],
      rotationY: Math.PI,
      colliderRadius: 0.2,
      castShadow: true,
    })

    this.#actor({
      preset: 'student',
      name: 'Người đi dạo phía sân',
      behavior: 'walker',
      position: [-13.2, 0, 5.1],
      waypoints: [[-13.2, 0, 5.1], [12.8, 0, 5.1]],
      animationOffset: 1.1,
      colliderRadius: 0.2,
    })
    this.#actor({
      preset: 'elderly',
      name: 'Người đi dạo vỉa hè',
      behavior: 'walker',
      position: [12.5, 0, 7.1],
      waypoints: [[12.5, 0, 7.1], [-12.5, 0, 7.1]],
      animationOffset: 3.4,
      colliderRadius: 0.2,
    }, { role: 'ambientBusy' })

    this.#actor({
      preset: 'elderly',
      name: 'Cụ ngồi ghế đá',
      behavior: 'seated',
      position: [9.5, 0.36, 0.95],
      rotationY: Math.PI,
      collides: false,
      animationOffset: 2.8,
    })

    this.#actor({
      preset: 'child',
      name: 'Bé Lan',
      behavior: 'walker',
      position: [-6.1, 0, -0.6],
      waypoints: [[-6.1, 0, -0.6], [-4.1, 0, -1.4], [-5.7, 0, -2.8]],
      colliderRadius: 0.16,
      animationOffset: 0.7,
    })
    this.#actor({
      preset: 'child',
      name: 'Em nhỏ áo vàng',
      behavior: 'walker',
      position: [-4.4, 0, -2.5],
      waypoints: [[-4.4, 0, -2.5], [-6.2, 0, -2.1], [-4.8, 0, -0.4]],
      colliderRadius: 0.16,
      animationOffset: 2.5,
    })

    this.#actor({
      preset: 'teaVendor',
      name: 'Cô trà đá',
      behavior: 'standing',
      position: [-19.15, 0, 5.95],
      rotationY: Math.PI / 2,
      dialogueName: 'Cô trà đá',
      dialogueLines: TEA_DIALOGUE,
      interactionLabel: 'Nói chuyện',
      hideDuringDialogue: false,
      castShadow: true,
      colliderRadius: 0.2,
    }, { role: 'teaStall' })
    this.#actor({
      preset: 'student',
      name: 'Khách uống trà 1',
      behavior: 'seated',
      position: [-17.15, 0.22, 5.32],
      rotationY: -Math.PI / 2,
      collides: false,
      animationOffset: 1.8,
    }, { role: 'teaGuest' })
    this.#actor({
      preset: 'elderly',
      name: 'Khách uống trà 2',
      behavior: 'seated',
      position: [-18.2, 0.22, 6.78],
      rotationY: Math.PI,
      collides: false,
      animationOffset: 4.1,
    }, { role: 'ambientBusy' })

    this.#actor({
      preset: 'motorbikeDriver',
      name: 'Chú xe ôm',
      behavior: 'standing',
      position: [9.25, 0, 18.35],
      rotationY: Math.PI,
      dialogueName: 'Chú xe ôm',
      dialogueLines: DRIVER_DIALOGUE,
      interactionLabel: 'Nói chuyện',
      hideDuringDialogue: false,
      castShadow: true,
      colliderRadius: 0.2,
    }, { role: 'driver' })
  }

  #buildSpecialCast() {
    this.#specialActor({
      profile: 'gymmer',
      name: 'Anh kính cười',
      position: [-1.35, 0, 0.35],
      rotationY: 0,
      animationOffset: 0.8,
    })
    this.#specialActor({
      profile: 'basketball',
      name: 'Cầu thủ bóng rổ Elite',
      position: [1.45, 0, 0.35],
      rotationY: 0,
      animationOffset: 2.2,
    })
  }

  #buildChurchCast() {
    const arrivalPaths = [
      [[-11.5, 0, 6.5], [-7, 0, 1], [-3.2, 0, -7], [-2.6, 0, -11]],
      [[11.5, 0, 6.5], [7, 0, 1], [3.2, 0, -7], [2.6, 0, -11]],
      [[-17, 0, 7], [-10, 0, 5.8], [-5, 0, -5.5], [-2.9, 0, -10.8]],
      [[17, 0, 7], [10, 0, 5.8], [5, 0, -5.5], [2.9, 0, -10.8]],
    ]
    this.processionEntries = arrivalPaths.map((waypoints, index) => {
      const actor = this.#actor({
        preset: 'churchVisitor',
        name: `Giáo dân ${index + 1}`,
        behavior: 'walker',
        position: waypoints[0],
        waypoints,
        loopWaypoints: false,
        colliderRadius: 0.18,
        animationOffset: index * 1.4,
      }, { role: 'churchProcession' })
      return this.manager.entries.find((entry) => entry.actor === actor)
    })

    const seatPositions = [
      [-3.15, -6.5], [3.15, -6.5], [-3.15, -1.5],
      [3.15, -1.5], [-3.15, 3.5], [3.15, 3.5],
    ]
    seatPositions.forEach(([x, z], index) => {
      this.#actor({
        preset: 'churchVisitor',
        name: `Giáo dân trong Nhà thờ ${index + 1}`,
        behavior: 'seated',
        position: [x, 0.36, z],
        rotationY: Math.PI,
        collides: false,
        animationOffset: index * 1.3,
      }, { area: 'interior', role: 'churchService' })
    })
    this.#actor({
      preset: 'priest',
      name: 'Cha xứ',
      behavior: 'standing',
      position: [0, 0.34, -14.45],
      rotationY: 0,
      colliderRadius: 0.2,
      castShadow: true,
    }, { area: 'interior', role: 'churchService' })
  }

  #applyAmbientDensity(density) {
    const dayOrBusy = density !== 'quiet'
    this.manager.setRoleActive('ambientDay', dayOrBusy, { stagger: 0.1 })
    this.manager.setRoleActive('ambientBusy', density === 'busy', { stagger: 0.18 })
    this.manager.setRoleActive('teaStall', density !== 'quiet', { stagger: 0 })
    this.manager.setRoleActive('teaGuest', dayOrBusy, { stagger: 0.12 })
    this.manager.setRoleActive('driver', density !== 'quiet', { stagger: 0 })
  }

  #disableAmbientRoles() {
    for (const role of ['ambientDay', 'ambientBusy', 'teaStall', 'teaGuest', 'driver']) {
      this.manager.setRoleActive(role, false)
    }
  }

  #applyChurchState(state) {
    if (state === 'arriving') {
      this.#prepareProcession(false)
      this.manager.setRoleActive('churchProcession', true, { stagger: 0.55 })
      this.manager.setRoleActive('churchService', false)
      return
    }
    if (state === 'service') {
      this.manager.setRoleActive('churchProcession', false)
      this.manager.setRoleActive('churchService', true, { stagger: 0.24 })
      return
    }
    if (state === 'leaving') {
      this.manager.setRoleActive('churchService', false)
      this.#prepareProcession(true)
      this.manager.setRoleActive('churchProcession', true, { stagger: 0.48 })
      return
    }
    if (state === 'postService') {
      this.manager.setRoleActive('churchService', false)
      this.#preparePostServiceGroups()
      this.manager.setRoleActive('churchProcession', true, { stagger: 0 })
      return
    }
    this.manager.setRoleActive('churchProcession', false)
    this.manager.setRoleActive('churchService', false)
  }

  #prepareProcession(leaving) {
    const outdoorTargets = [
      [-10.5, 0, 4.8], [10.5, 0, 4.8], [-15.5, 0, 6.7], [15.5, 0, 6.7],
    ]
    this.processionEntries.forEach((entry, index) => {
      const actor = entry.actor
      const side = index % 2 === 0 ? -1 : 1
      const door = [side * (2.35 + Math.floor(index / 2) * 0.35), 0, -10.9]
      const outside = outdoorTargets[index]
      actor.setBehavior('walker')
      actor.loopWaypoints = false
      if (leaving) {
        actor.setPosition(door[0], door[1], door[2])
        actor.setWaypoints([door, [side * 4.4, 0, -5], [side * 7.5, 0, 1.5], outside])
      } else {
        actor.setPosition(outside[0], outside[1], outside[2])
        actor.setWaypoints([outside, [side * 7.5, 0, 1.5], [side * 4.4, 0, -5], door])
      }
    })
  }

  #preparePostServiceGroups() {
    const positions = [
      [-10.6, 0, 4.8], [-9.25, 0, 5.2], [9.25, 0, 5.2], [10.6, 0, 4.8],
    ]
    this.processionEntries.forEach((entry, index) => {
      const actor = entry.actor
      const targetX = index < 2 ? -9.9 : 9.9
      const targetZ = 5
      actor.setBehavior('standing')
      actor.setPosition(...positions[index])
      actor.group.rotation.y = Math.atan2(
        targetX - actor.position.x,
        targetZ - actor.position.z,
      )
    })
  }
}
