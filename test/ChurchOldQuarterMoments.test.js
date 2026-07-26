import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  OFFICIAL_MOMENT_REGIONS,
  createChurchOldQuarterMoments,
} from '../src/moments/ChurchOldQuarterMoments.js'
import { getPhotoMomentContext } from '../src/moments/MomentTemplates.js'
import { MomentSystem } from '../src/moments/MomentSystem.js'
import { ChurchDistrict } from '../src/world/ChurchDistrict.js'

function installCanvasDocumentStub() {
  const previousDocument = globalThis.document
  const context = {
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    measureText() {
      return { width: 40 }
    },
  }
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return context
        },
      }
    },
  }
  return () => {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

function createSharedPropPool() {
  return {
    records: new Map(),
    duplicateAttempts: 0,
  }
}

function createActor(id, propPool) {
  return {
    id,
    active: false,
    requestedActive: false,
    momentLocks: new Set(),
    position: {
      x: 100,
      y: 0,
      z: 100,
      set(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
      },
    },
    group: { rotation: { y: 0 } },
    behavior: 'standing',
    waypoints: [],
    loopWaypoints: true,
    currentWaypointIndex: 0,
    pathComplete: false,
    played: [],
    activityPropIds: new Set(),
    heldProps: new Set(),
    setPosition(x, y, z) {
      this.position.set(x, y, z)
    },
    setActive(active) {
      this.requestedActive = Boolean(active)
      this.active = this.momentLocks.size ? true : this.requestedActive
    },
    setBehavior(behavior) {
      this.behavior = behavior
    },
    setWaypoints(waypoints) {
      this.waypoints = waypoints.map((point) => ({
        x: point.x ?? point[0],
        y: point.y ?? point[1] ?? 0,
        z: point.z ?? point[2],
      }))
      this.currentWaypointIndex = 0
      this.pathComplete = false
    },
    acquireMomentLock(momentId) {
      this.momentLocks.add(momentId)
      this.active = true
    },
    releaseMomentLock(momentId) {
      this.momentLocks.delete(momentId)
      this.stopActivity()
      this.active = this.momentLocks.size ? true : this.requestedActive
    },
    attachProp(type, options = {}) {
      const propId = options.id ?? `${id}:${type}`
      const existing = propPool.records.get(propId)
      if (existing) {
        if (existing.owner !== this) propPool.duplicateAttempts += 1
        return existing.owner === this ? existing : null
      }
      const record = { id: propId, type, owner: this }
      propPool.records.set(propId, record)
      this.heldProps.add(propId)
      if (options.activityOwned) this.activityPropIds.add(propId)
      return record
    },
    transferProp(propId, recipient) {
      const record = propPool.records.get(propId)
      if (!record || record.owner !== this) return false
      this.heldProps.delete(propId)
      this.activityPropIds.delete(propId)
      recipient.heldProps.add(propId)
      record.owner = recipient
      return true
    },
    playActivity(activityId, options = {}) {
      for (const propId of [...this.activityPropIds]) {
        propPool.records.delete(propId)
        this.heldProps.delete(propId)
      }
      this.activityPropIds.clear()
      for (const descriptor of options.props ?? []) {
        this.attachProp(descriptor.type, {
          ...descriptor,
          activityOwned: true,
        })
      }
      this.played.push(activityId)
    },
    queueActivity(activityId) {
      this.played.push(activityId)
    },
    stopActivity() {
      for (const propId of this.heldProps) propPool.records.delete(propId)
      this.heldProps.clear()
      this.activityPropIds.clear()
    },
  }
}

function minutesInside(window) {
  if (window.start === window.end) return window.start
  if (window.start < window.end) return (window.start + window.end) / 2
  const wrappedDuration = 24 * 60 - window.start + window.end
  return (window.start + wrappedDuration / 2) % (24 * 60)
}

function contextFor(definition, overrides = {}) {
  return {
    playerPosition: {
      x: definition.position.x,
      y: 1.68,
      z: definition.position.z,
    },
    regionIds: [definition.region],
    areaId: 'outdoor',
    gameMinutes: minutesInside(definition.timeWindow),
    ...overrides,
  }
}

function advanceUntil(system, id, targetState, context) {
  for (let index = 0; index < 160; index += 1) {
    if (system.getMomentState(id).state === targetState) return
    system.updateMoment(id, 0.25, context)
  }
  assert.fail(`Moment ${id} did not reach ${targetState}`)
}

function collectActivityAndPropTypes(definitions) {
  const activities = new Set()
  const props = new Set()
  for (const definition of definitions) {
    for (const cue of definition.templateRuntime.timeline) {
      for (const action of cue.actions) {
        if (action.type === 'attachProp') props.add(action.propType)
        for (const descriptor of action.activities ?? []) {
          activities.add(descriptor.id)
          for (const prop of descriptor.props ?? []) props.add(prop.type)
        }
      }
    }
  }
  return { activities, props }
}

test('official moments are limited to five Church and six Old Quarter events', () => {
  const definitions = createChurchOldQuarterMoments()
  const church = definitions.filter(
    ({ region }) => region === OFFICIAL_MOMENT_REGIONS.CHURCH,
  )
  const oldQuarter = definitions.filter(
    ({ region }) => region === OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
  )

  assert.equal(definitions.length, 11)
  assert.equal(church.length, 5)
  assert.equal(oldQuarter.length, 6)
  assert.deepEqual(
    new Set(definitions.map(({ region }) => region)),
    new Set(['churchDistrict', 'oldQuarterConnector']),
  )
  assert.ok(definitions.every(({ metadata }) => metadata.official === true))
  assert.ok(definitions.every(({ metadata }) => Boolean(metadata.location)))
})

test('official moments never share an NPC, prop, staging point or performance area', () => {
  const definitions = createChurchOldQuarterMoments()
  for (const key of [
    'npcIds',
    'propIds',
    'stagingIds',
    'performanceAreaIds',
  ]) {
    const ids = definitions.flatMap((definition) => definition[key] ?? [])
    assert.equal(new Set(ids).size, ids.length, `${key} must be globally unique`)
  }
})

test('official moment actors exist in the current world and staging avoids active colliders', () => {
  const restoreDocument = installCanvasDocumentStub()
  const camera = new THREE.PerspectiveCamera()
  const assetLoader = {
    getWorldOutfit: async () => null,
    getSpecialFace: async () => null,
  }
  const world = new ChurchDistrict(new THREE.Scene(), { camera, assetLoader })

  try {
    const definitions = createChurchOldQuarterMoments({
      resolveNpc: (id) => world.getNamedNpc(id),
    })
    const actorIds = new Set(definitions.flatMap(({ npcIds }) => npcIds))
    for (const actorId of actorIds) {
      assert.ok(world.getNamedNpc(actorId), `missing world NPC ${actorId}`)
    }

    const activeColliders = world.areas.outdoor.colliders.filter(
      (collider) => !collider.disabled && !collider.dynamic,
    )
    for (const definition of definitions) {
      for (const point of definition.templateRuntime.stagingPoints.values()) {
        const intersections = activeColliders.filter((collider) => (
          point.position.x >= collider.minX
          && point.position.x <= collider.maxX
          && point.position.z >= collider.minZ
          && point.position.z <= collider.maxZ
        ))
        const expectedSeat = (
          definition.id === 'church-elderly-newspaper-coffee'
          && point.id === 'church-elderly-bench-stage'
        )
        if (expectedSeat) {
          assert.deepEqual(
            intersections.map(({ name }) => name),
            ['Ghế sân Nhà thờ'],
          )
        } else {
          assert.deepEqual(
            intersections.map(({ name }) => name),
            [],
            `${definition.id}:${point.id} overlaps a static collider`,
          )
        }
      }
    }
  } finally {
    world.dispose()
    restoreDocument()
  }
})

test('official timelines cover every requested activity and reusable prop type', () => {
  const definitions = createChurchOldQuarterMoments()
  const { activities, props } = collectActivityAndPropTypes(definitions)

  for (const activityId of [
    'wave',
    'sit',
    'read',
    'drink',
    'takePhoto',
    'viewPhoto',
    'giveItem',
    'receiveItem',
    'help',
    'cycle',
    'openAwning',
  ]) {
    assert.equal(activities.has(activityId), true, `missing activity ${activityId}`)
  }
  for (const propType of [
    'flowers',
    'newspaper',
    'cup',
    'phone',
    'camera',
    'shoppingBag',
    'bicycle',
  ]) {
    assert.equal(props.has(propType), true, `missing prop ${propType}`)
  }
  for (const definition of definitions) {
    const states = new Set(
      definition.templateRuntime.timeline.map(({ state }) => state),
    )
    assert.equal(states.has('preparing'), true, `${definition.id} preparing`)
    assert.equal(states.has('active'), true, `${definition.id} active`)
    assert.equal(states.has('climax'), true, `${definition.id} climax`)
    assert.equal(states.has('ending'), true, `${definition.id} ending`)
  }
})

test('every official moment completes its timeline with photo context and clean resources', () => {
  const propPool = createSharedPropPool()
  const actorIds = createChurchOldQuarterMoments()
    .flatMap(({ npcIds }) => npcIds)
  const actors = new Map(actorIds.map((id) => [id, createActor(id, propPool)]))
  const definitions = createChurchOldQuarterMoments({
    resolveNpc: (id) => actors.get(id),
  })

  for (const definition of definitions) {
    const system = new MomentSystem({
      maxConcurrent: 2,
      resourceResolver: (type, id) => (
        type !== 'npc' || actors.has(id)
      ),
    })
    system.registerMoment(definition)
    const context = contextFor(definition)

    assert.equal(system.startMoment(definition.id, context), true)
    const before = getPhotoMomentContext(system)
    assert.equal(before.momentId, definition.id)
    assert.equal(before.state, 'preparing')
    assert.equal(before.inClimax, false)
    assert.equal(before.location, definition.metadata.location)
    assert.deepEqual(before.primarySubjectIds, definition.metadata.primarySubjectIds)
    assert.ok(system.getDebugSnapshot().locks.length >= definition.npcIds.length)

    advanceUntil(system, definition.id, 'active', context)
    advanceUntil(system, definition.id, 'climax', context)
    system.updateMoment(definition.id, 0.25, context)
    const climax = getPhotoMomentContext(system)
    assert.equal(climax.state, 'climax')
    assert.equal(climax.inClimax, true)
    assert.ok(climax.timingBonus > 0)
    assert.deepEqual(climax.climaxWindow, {
      state: 'climax',
      duration: definition.durations.climax,
    })

    advanceUntil(system, definition.id, 'ending', context)
    const after = getPhotoMomentContext(system)
    assert.equal(after.state, 'ending')
    assert.equal(after.inClimax, false)
    assert.equal(after.timingBonus, 0)

    advanceUntil(system, definition.id, 'cooldown', context)
    assert.equal(system.getDebugSnapshot().locks.length, 0)
    assert.ok(definition.npcIds.every((id) => actors.get(id).momentLocks.size === 0))
    assert.equal(propPool.records.size, 0)
    system.dispose()
  }
  assert.equal(propPool.duplicateAttempts, 0)
})

test('distance cleanup and two-moment concurrency remain bounded without duplication', () => {
  const propPool = createSharedPropPool()
  const allDefinitions = createChurchOldQuarterMoments()
  const actorIds = allDefinitions.flatMap(({ npcIds }) => npcIds)
  const actors = new Map(actorIds.map((id) => [id, createActor(id, propPool)]))
  const definitions = createChurchOldQuarterMoments({
    resolveNpc: (id) => actors.get(id),
  })
  const system = new MomentSystem({
    maxConcurrent: 2,
    scanInterval: 0.05,
    resourceResolver: (type, id) => type !== 'npc' || actors.has(id),
  })
  definitions.forEach((definition) => system.registerMoment(definition))

  const first = definitions[0]
  const firstContext = contextFor(first)
  system.update(0, firstContext)
  assert.ok(system.getActiveMoments().length <= 2)
  assert.equal(system.getMomentState(first.id).state, 'preparing')

  const farContext = contextFor(first, {
    playerPosition: {
      x: first.position.x + first.pauseDistance + 1,
      y: 1.68,
      z: first.position.z,
    },
  })
  system.update(0.1, farContext)
  assert.equal(system.getMomentState(first.id).state, 'cooldown')
  assert.equal(system.getDebugSnapshot().locks.length, 0)

  system.update(0.1, firstContext)
  assert.ok(system.getActiveMoments().length <= 2)
  assert.equal(new Set(actors.values()).size, actors.size)
  assert.equal(propPool.duplicateAttempts, 0)
  system.dispose()
})
