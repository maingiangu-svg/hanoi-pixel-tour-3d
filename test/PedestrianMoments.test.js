import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  PEDESTRIAN_MOMENT_REGION,
  createPedestrianMoments,
} from '../src/moments/PedestrianMoments.js'
import { getPhotoMomentContext } from '../src/moments/MomentTemplates.js'
import { MomentSystem } from '../src/moments/MomentSystem.js'
import { PEDESTRIAN_MOMENT_CAST } from '../src/npcs/pedestrianMomentCast.js'
import { ChurchDistrict } from '../src/world/ChurchDistrict.js'

function createPropPool() {
  return { records: new Map(), duplicateAttempts: 0 }
}

function createActor(id, propPool) {
  return {
    id,
    active: false,
    requestedActive: false,
    momentLocks: new Set(),
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x, y, z) {
        Object.assign(this, { x, y, z })
      },
    },
    group: { rotation: { y: 0 } },
    behavior: 'standing',
    waypoints: [],
    loopWaypoints: true,
    currentWaypointIndex: 0,
    pathComplete: false,
    played: [],
    heldProps: new Set(),
    activityPropIds: new Set(),
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
    stopActivity({ detachProps = true } = {}) {
      if (detachProps) {
        for (const propId of this.heldProps) propPool.records.delete(propId)
        this.heldProps.clear()
      } else {
        for (const propId of this.activityPropIds) {
          propPool.records.delete(propId)
          this.heldProps.delete(propId)
        }
      }
      this.activityPropIds.clear()
    },
  }
}

function minutesInside(window) {
  if (window.start === window.end) return window.start
  if (window.start < window.end) return (window.start + window.end) / 2
  return (window.start + (24 * 60 - window.start + window.end) / 2) % (24 * 60)
}

function contextFor(definition, overrides = {}) {
  return {
    playerPosition: {
      x: definition.position.x,
      y: 1.68,
      z: definition.position.z,
    },
    regionIds: [PEDESTRIAN_MOMENT_REGION],
    areaId: 'outdoor',
    gameMinutes: minutesInside(definition.timeWindow),
    ...overrides,
  }
}

function advanceUntil(system, id, targetState, context) {
  for (let index = 0; index < 180; index += 1) {
    if (system.getMomentState(id).state === targetState) return
    system.updateMoment(id, 0.25, context)
  }
  assert.fail(`Moment ${id} did not reach ${targetState}`)
}

function collectTimelineVocabulary(definitions) {
  const activities = new Set()
  const props = new Set()
  definitions.forEach((definition) => {
    definition.templateRuntime.timeline.forEach((entry) => {
      entry.actions.forEach((action) => {
        if (action.type === 'attachProp') props.add(action.propType)
        ;(action.activities ?? []).forEach((descriptor) => {
          activities.add(descriptor.id)
          ;(descriptor.props ?? []).forEach((prop) => props.add(prop.type))
        })
      })
    })
  })
  return { activities, props }
}

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

test('pedestrian events contain one large event and five small official variants', () => {
  const definitions = createPedestrianMoments()
  assert.deepEqual(definitions.map(({ id }) => id), [
    'pedestrian-street-dance',
    'pedestrian-portrait-session',
    'pedestrian-group-photo',
    'pedestrian-stranger-photo-help',
    'pedestrian-ice-cream-parent-child',
    'pedestrian-ice-cream-couple',
  ])
  assert.ok(definitions.every(({ region }) => region === PEDESTRIAN_MOMENT_REGION))
  assert.ok(definitions.every(({ metadata }) => metadata.official))
  assert.ok(definitions.every(({ metadata }) => metadata.pedestrianMoment))
  assert.ok(definitions.every(({ metadata }) => metadata.location.includes('phố đi bộ')))
})

test('pedestrian moments use unique reserved actors and props', () => {
  const definitions = createPedestrianMoments()
  const actorIds = definitions.flatMap(({ npcIds }) => npcIds)
  const propIds = definitions.flatMap(({ propIds }) => propIds)
  assert.equal(new Set(actorIds).size, actorIds.length)
  assert.equal(new Set(propIds).size, propIds.length)
  assert.deepEqual(
    new Set(actorIds),
    new Set(PEDESTRIAN_MOMENT_CAST.map(({ name }) => name)),
  )
})

test('pedestrian timelines cover required activities, props and lifecycle states', () => {
  const definitions = createPedestrianMoments()
  const { activities, props } = collectTimelineVocabulary(definitions)
  for (const activityId of [
    'dance',
    'clap',
    'recordVideo',
    'pose',
    'takePhoto',
    'viewPhoto',
    'draw',
    'giveItem',
    'receiveItem',
  ]) {
    assert.equal(activities.has(activityId), true, `missing ${activityId}`)
  }
  for (const propType of [
    'phone',
    'camera',
    'drawingBoard',
    'pencil',
    'iceCream',
  ]) {
    assert.equal(props.has(propType), true, `missing prop ${propType}`)
  }
  for (const definition of definitions) {
    const states = new Set(
      definition.templateRuntime.timeline.map(({ state }) => state),
    )
    for (const state of ['preparing', 'starting', 'active', 'climax', 'ending']) {
      assert.equal(states.has(state), true, `${definition.id} missing ${state}`)
    }
    assert.ok(definition.durations.climax > 0)
    assert.ok(definition.cooldown > 0)
    assert.ok(definition.stagingIds.length >= definition.npcIds.length)
  }
})

test('every pedestrian event runs through climax metadata and releases resources', () => {
  const propPool = createPropPool()
  const actorIds = createPedestrianMoments().flatMap(({ npcIds }) => npcIds)
  const actors = new Map(actorIds.map((id) => [id, createActor(id, propPool)]))
  const definitions = createPedestrianMoments({
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
    assert.equal(before.momentId, definition.id)
    assert.equal(before.state, 'preparing')
    assert.equal(before.momentType, definition.metadata.momentType)
    assert.deepEqual(before.primarySubjectIds, definition.metadata.primarySubjectIds)

    advanceUntil(system, definition.id, 'climax', context)
    system.updateMoment(definition.id, 0.25, context)
    const climax = getPhotoMomentContext(system)
    assert.equal(climax.inClimax, true)
    assert.equal(climax.location, definition.metadata.location)
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

test('large dance excludes small events while two different small zones may run', () => {
  const propPool = createPropPool()
  const actorIds = createPedestrianMoments().flatMap(({ npcIds }) => npcIds)
  const actors = new Map(actorIds.map((id) => [id, createActor(id, propPool)]))
  const definitions = createPedestrianMoments({
    resolveNpc: (id) => actors.get(id),
  })
  const system = new MomentSystem({
    maxConcurrent: 2,
    resourceResolver: (type, id) => type !== 'npc' || actors.has(id),
  })
  definitions.forEach((definition) => system.registerMoment(definition))

  const [dance, portrait, groupPhoto, , parentIceCream] = definitions
  assert.equal(system.startMoment(dance.id, contextFor(dance)), true)
  assert.equal(system.startMoment(portrait.id, contextFor(portrait)), false)
  assert.equal(
    system.getMomentState(portrait.id).blockedReason,
    'resource-locked',
  )
  system.cancelMoment(dance.id, 'test', contextFor(dance))

  assert.equal(system.startMoment(portrait.id, contextFor(portrait)), true)
  assert.equal(system.startMoment(groupPhoto.id, contextFor(groupPhoto)), true)
  assert.equal(system.startMoment(parentIceCream.id, contextFor(parentIceCream)), false)
  assert.equal(
    system.getMomentState(parentIceCream.id).blockedReason,
    'concurrency-limit',
  )
  system.dispose()
})

test('leaving a pedestrian zone cleans the run and returning reuses the same actors', () => {
  const propPool = createPropPool()
  const actorIds = createPedestrianMoments().flatMap(({ npcIds }) => npcIds)
  const actors = new Map(actorIds.map((id) => [id, createActor(id, propPool)]))
  const definitions = createPedestrianMoments({
    resolveNpc: (id) => actors.get(id),
  })
  const definition = definitions.find(({ id }) => id === 'pedestrian-group-photo')
  const originalActors = definition.npcIds.map((id) => actors.get(id))
  const system = new MomentSystem({
    maxConcurrent: 2,
    scanInterval: 0.05,
    resourceResolver: (type, id) => type !== 'npc' || actors.has(id),
  })
  system.registerMoment(definition)
  const nearby = contextFor(definition)

  system.update(0, nearby)
  assert.equal(system.getMomentState(definition.id).state, 'preparing')
  system.update(0.1, contextFor(definition, {
    playerPosition: {
      x: definition.position.x + definition.pauseDistance + 1,
      y: 1.68,
      z: definition.position.z,
    },
  }))
  assert.equal(system.getMomentState(definition.id).state, 'cooldown')
  assert.equal(system.getDebugSnapshot().locks.length, 0)
  assert.equal(propPool.records.size, 0)

  system.cancelMoment(definition.id, 'skip-test-cooldown', nearby)
  system.update(0.1, nearby)
  assert.equal(system.getMomentState(definition.id).state, 'preparing')
  assert.deepEqual(
    definition.npcIds.map((id) => actors.get(id)),
    originalActors,
  )
  assert.equal(actors.size, actorIds.length)
  assert.equal(propPool.duplicateAttempts, 0)
  system.dispose()
})

test('current world resolves the reserved cast and every staging point is safe', () => {
  const restoreDocument = installCanvasDocumentStub()
  const camera = new THREE.PerspectiveCamera()
  const assetLoader = {
    getWorldOutfit: async () => null,
    getSpecialFace: async () => null,
  }
  const world = new ChurchDistrict(new THREE.Scene(), { camera, assetLoader })

  try {
    const definitions = createPedestrianMoments({
      resolveNpc: (id) => world.getNamedNpc(id),
    })
    const activeStaticColliders = world.areas.outdoor.colliders.filter(
      (collider) => !collider.disabled && !collider.dynamic,
    )

    definitions.forEach((definition) => {
      assert.ok(
        world.getActiveDistrictNames(definition.position)
          .includes(PEDESTRIAN_MOMENT_REGION),
        `${definition.id} is outside its activation region`,
      )
      definition.npcIds.forEach((id) => {
        assert.ok(world.getNamedNpc(id), `missing actor ${id}`)
      })
      definition.templateRuntime.stagingPoints.forEach((point) => {
        const intersections = activeStaticColliders.filter((collider) => (
          point.position.x >= collider.minX
          && point.position.x <= collider.maxX
          && point.position.z >= collider.minZ
          && point.position.z <= collider.maxZ
        ))
        assert.deepEqual(
          intersections.map(({ name }) => name),
          [],
          `${definition.id}:${point.id} overlaps a collider`,
        )
      })
    })
  } finally {
    world.dispose()
    restoreDocument()
  }
})
