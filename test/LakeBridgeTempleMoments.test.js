import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  SCENIC_MOMENT_REGIONS,
  createLakeBridgeTempleMoments,
} from '../src/moments/LakeBridgeTempleMoments.js'
import { getPhotoMomentContext } from '../src/moments/MomentTemplates.js'
import { MomentSystem } from '../src/moments/MomentSystem.js'
import { SCENIC_MOMENT_CAST } from '../src/npcs/scenicMomentCast.js'
import {
  ChurchDistrict,
  getOutdoorGroundHeight,
} from '../src/world/ChurchDistrict.js'

function createActor(id, propPool) {
  return {
    id,
    active: false,
    requestedActive: false,
    momentLocks: new Set(),
    position: {
      x: 0, y: 0, z: 0,
      set(x, y, z) { Object.assign(this, { x, y, z }) },
    },
    group: { rotation: { y: 0 } },
    behavior: 'standing',
    waypoints: [],
    loopWaypoints: true,
    currentWaypointIndex: 0,
    pathComplete: false,
    heldProps: new Set(),
    activityProps: new Set(),
    setPosition(x, y, z) { this.position.set(x, y, z) },
    setBehavior(behavior) { this.behavior = behavior },
    setWaypoints(waypoints) { this.waypoints = waypoints },
    setActive(active) {
      this.requestedActive = Boolean(active)
      this.active = this.momentLocks.size > 0 || this.requestedActive
    },
    acquireMomentLock(momentId) {
      this.momentLocks.add(momentId)
      this.active = true
    },
    releaseMomentLock(momentId) {
      this.momentLocks.delete(momentId)
      this.active = this.momentLocks.size > 0 || this.requestedActive
    },
    attachProp(type, options = {}) {
      const propId = options.id ?? `${id}:${type}`
      const existing = propPool.get(propId)
      if (existing) return existing.owner === this ? existing : null
      const prop = { id: propId, type, owner: this }
      propPool.set(propId, prop)
      this.heldProps.add(propId)
      if (options.activityOwned) this.activityProps.add(propId)
      return prop
    },
    playActivity(activityId, options = {}) {
      for (const propId of this.activityProps) {
        propPool.delete(propId)
        this.heldProps.delete(propId)
      }
      this.activityProps.clear()
      for (const prop of options.props ?? []) {
        this.attachProp(prop.type, { ...prop, activityOwned: true })
      }
      this.activity = activityId
    },
    queueActivity(activityId) { this.activity = activityId },
    stopActivity({ detachProps = true } = {}) {
      const ids = detachProps ? [...this.heldProps] : [...this.activityProps]
      ids.forEach((propId) => {
        propPool.delete(propId)
        this.heldProps.delete(propId)
      })
      this.activityProps.clear()
      this.activity = null
    },
  }
}

function insideTimeWindow(window) {
  if (window.start < window.end) return (window.start + window.end) / 2
  return (window.start + (1440 - window.start + window.end) / 2) % 1440
}

function contextFor(definition, overrides = {}) {
  return {
    playerPosition: { ...definition.position },
    regionIds: [definition.region],
    areaId: 'outdoor',
    gameMinutes: insideTimeWindow(definition.timeWindow),
    ...overrides,
  }
}

function advanceUntil(system, id, state, context) {
  for (let index = 0; index < 160; index += 1) {
    if (system.getMomentState(id).state === state) return
    system.updateMoment(id, 0.25, context)
  }
  assert.fail(`${id} did not reach ${state}`)
}

function installCanvasDocumentStub() {
  const previous = globalThis.document
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            fillText() {},
            measureText() { return { width: 40 } },
          }
        },
      }
    },
  }
  return () => {
    if (previous === undefined) delete globalThis.document
    else globalThis.document = previous
  }
}

test('official scenic moments cover exactly Hồ Gươm, Cầu Thê Húc and Đền Ngọc Sơn', () => {
  const definitions = createLakeBridgeTempleMoments()
  assert.equal(definitions.length, 21)
  assert.deepEqual(
    Object.fromEntries(Object.values(SCENIC_MOMENT_REGIONS).map((region) => [
      region,
      definitions.filter((definition) => definition.region === region).length,
    ])),
    {
      hoanKiemDistrict: 8,
      theHucBridge: 7,
      ngocSonTemple: 6,
    },
  )
  assert.ok(definitions.every(({ metadata }) => metadata.official))
  assert.ok(definitions.every(({ metadata }) => metadata.scenicMoment))
  assert.ok(
    definitions
      .filter(({ region }) => region === SCENIC_MOMENT_REGIONS.temple)
      .every(({ metadata }) => metadata.quiet),
  )
})

test('scenic events reserve unique actors and cover the requested quiet activities', () => {
  const definitions = createLakeBridgeTempleMoments()
  const actorIds = definitions.flatMap(({ npcIds }) => npcIds)
  assert.equal(actorIds.length, new Set(actorIds).size)
  assert.deepEqual(
    new Set(actorIds),
    new Set(SCENIC_MOMENT_CAST.map(({ name }) => name)),
  )

  const activities = new Set()
  for (const definition of definitions) {
    const states = new Set()
    for (const cue of definition.templateRuntime.timeline) {
      states.add(cue.state)
      for (const action of cue.actions) {
        for (const descriptor of action.activities ?? []) {
          activities.add(descriptor.id)
        }
      }
    }
    assert.deepEqual(
      states,
      new Set(['preparing', 'starting', 'active', 'climax', 'ending']),
    )
    assert.ok(definition.timeWindow)
    assert.ok(definition.cooldown > 0)
    assert.ok(definition.metadata.primarySubjectIds.length > 0)
    assert.ok(['people-people', 'people-scene'].includes(definition.metadata.photoType))
  }
  for (const required of [
    'exercise',
    'walk',
    'sit',
    'read',
    'feedBirds',
    'takePhoto',
    'pose',
    'viewPhoto',
    'point',
    'lookAtLandmark',
    'respectfulPause',
  ]) {
    assert.equal(activities.has(required), true, `missing ${required}`)
  }
})

test('bridge and temple staging stays on authored ground and current world resolves every actor', () => {
  const restoreDocument = installCanvasDocumentStub()
  const camera = new THREE.PerspectiveCamera()
  const world = new ChurchDistrict(new THREE.Scene(), {
    camera,
    assetLoader: {
      getWorldOutfit: async () => null,
      getSpecialFace: async () => null,
    },
  })
  try {
    const definitions = createLakeBridgeTempleMoments()
    definitions.forEach((definition) => {
      assert.ok(
        world.getActiveDistrictNames(definition.position).includes(definition.region),
        `${definition.id} is outside ${definition.region}`,
      )
      definition.npcIds.forEach((id) => {
        assert.ok(world.getNamedNpc(id), `missing ${id}`)
      })
      definition.templateRuntime.stagingPoints.forEach(({ position }) => {
        if (definition.region === SCENIC_MOMENT_REGIONS.bridge) {
          assert.ok(position.x >= 117.75 && position.x <= 120.25)
          assert.ok(position.z >= 33.7 && position.z <= 45)
          assert.ok(Math.abs(position.y - getOutdoorGroundHeight(position)) < 0.08)
        }
        if (definition.region === SCENIC_MOMENT_REGIONS.temple) {
          assert.ok(position.x > 110 && position.x < 128)
          assert.ok(position.z > 46.5 && position.z < 59)
          assert.equal(position.y, 0.16)
        }
      })
    })
  } finally {
    world.dispose()
    restoreDocument()
  }
})

test('every scenic moment exposes climax photo context and cleans its reserved actor pool', () => {
  const propPool = new Map()
  const actors = new Map(
    SCENIC_MOMENT_CAST.map(({ name }) => [name, createActor(name, propPool)]),
  )
  const definitions = createLakeBridgeTempleMoments({
    resolveNpc: (id) => actors.get(id),
  })

  for (const definition of definitions) {
    const system = new MomentSystem({
      maxConcurrent: 2,
      resourceResolver: (type, id) => type !== 'npc' || actors.has(id),
    })
    system.registerMoment(definition)
    const context = contextFor(definition)
    assert.equal(system.startMoment(definition.id, context), true)
    const before = getPhotoMomentContext(system)
    assert.equal(before.state, 'preparing')
    assert.equal(before.inClimax, false)
    assert.equal(before.timingBonus, 0)

    advanceUntil(system, definition.id, 'climax', context)
    system.updateMoment(definition.id, 0.25, context)

    const photoContext = getPhotoMomentContext(system)
    assert.equal(photoContext.momentId, definition.id)
    assert.equal(photoContext.region, definition.region)
    assert.equal(photoContext.photoType, definition.metadata.photoType)
    assert.equal(photoContext.inClimax, true)
    assert.ok(photoContext.timingBonus > 0)

    advanceUntil(system, definition.id, 'ending', context)
    const after = getPhotoMomentContext(system)
    assert.equal(after.state, 'ending')
    assert.equal(after.inClimax, false)
    assert.equal(after.timingBonus, 0)

    advanceUntil(system, definition.id, 'cooldown', context)
    assert.equal(system.getDebugSnapshot().locks.length, 0)
    assert.ok(definition.npcIds.every((id) => actors.get(id).momentLocks.size === 0))
    assert.equal(propPool.size, 0)
    system.dispose()
  }
})

test('leaving a scenic event cleans it and shared bridge staging prevents overlap', () => {
  const propPool = new Map()
  const actors = new Map(
    SCENIC_MOMENT_CAST.map(({ name }) => [name, createActor(name, propPool)]),
  )
  const definitions = createLakeBridgeTempleMoments({
    resolveNpc: (id) => actors.get(id),
  })
  const [firstBridge, secondBridge] = definitions.filter(
    ({ region }) => region === SCENIC_MOMENT_REGIONS.bridge,
  )
  const originalActors = firstBridge.npcIds.map((id) => actors.get(id))
  const system = new MomentSystem({
    maxConcurrent: 2,
    resourceResolver: (type, id) => type !== 'npc' || actors.has(id),
  })
  definitions.forEach((definition) => system.registerMoment(definition))

  assert.equal(system.startMoment(firstBridge.id, contextFor(firstBridge)), true)
  assert.equal(system.startMoment(secondBridge.id, contextFor(secondBridge)), false)
  assert.equal(
    system.getMomentState(secondBridge.id).blockedReason,
    'performance-area-conflict',
  )

  system.updateMoment(firstBridge.id, 0.25, contextFor(firstBridge, {
    playerPosition: {
      x: firstBridge.position.x + firstBridge.cleanupDistance + 1,
      y: firstBridge.position.y,
      z: firstBridge.position.z,
    },
  }))
  assert.equal(system.getMomentState(firstBridge.id).state, 'cooldown')
  assert.equal(system.getDebugSnapshot().locks.length, 0)
  assert.equal(propPool.size, 0)

  const nearby = contextFor(firstBridge)
  system.cancelMoment(firstBridge.id, 'skip-test-cooldown', nearby)
  system.update(0.1, nearby)
  assert.equal(system.getMomentState(firstBridge.id).state, 'preparing')
  assert.deepEqual(firstBridge.npcIds.map((id) => actors.get(id)), originalActors)
  assert.equal(actors.size, SCENIC_MOMENT_CAST.length)
  system.dispose()
})
