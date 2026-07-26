import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createMultiActorMoment,
  createSimpleMoment,
  getClimaxProgress,
  getPhotoMomentContext,
  runMomentTimeline,
} from '../src/moments/MomentTemplates.js'
import { createDevelopmentTestMoments } from '../src/moments/developmentMomentFixtures.js'
import { MomentSystem } from '../src/moments/MomentSystem.js'

function createActor(id, x = 20) {
  return {
    id,
    active: false,
    position: {
      x,
      y: 0,
      z: 20,
      set(nextX, nextY, nextZ) {
        this.x = nextX
        this.y = nextY
        this.z = nextZ
      },
    },
    group: { rotation: { y: 0 } },
    played: [],
    queued: [],
    stopped: 0,
    setActive(active) {
      this.active = active
    },
    setPosition(nextX, nextY, nextZ) {
      this.position.set(nextX, nextY, nextZ)
    },
    playActivity(activity, options) {
      this.played.push({ activity, options })
    },
    queueActivity(activity, options) {
      this.queued.push({ activity, options })
    },
    stopActivity() {
      this.stopped += 1
      return true
    },
  }
}

function createContext(overrides = {}) {
  return {
    playerPosition: { x: 0, y: 1.68, z: 0 },
    regionIds: ['test-region'],
    areaId: 'outdoor',
    gameMinutes: 12 * 60,
    ...overrides,
  }
}

function createSystem(actors) {
  return new MomentSystem({
    resourceResolver: (type, id) => (
      type !== 'npc' || actors.has(id)
    ),
  })
}

test('simple template stages actors, runs a full activity timeline and exposes climax context', () => {
  const actor = createActor('wave-npc')
  const actors = new Map([['wave-npc', actor]])
  const system = createSystem(actors)
  const definition = createSimpleMoment({
    id: 'simple-wave',
    name: 'Người lạ vẫy tay',
    region: 'test-region',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 0 },
    triggerRadius: 3,
    pauseDistance: 5,
    cleanupDistance: 8,
    timeWindow: { start: 0, end: 0 },
    durations: {
      preparing: 0.1,
      starting: 0.1,
      active: 0.1,
      climax: 0.2,
      ending: 0.1,
    },
    cooldown: 0.2,
    npcIds: ['wave-npc'],
    stagingPoints: [
      { id: 'wave-stage', position: [1, 0, 2], yaw: Math.PI },
    ],
    initialStaging: [
      { actorId: 'wave-npc', stagingId: 'wave-stage' },
    ],
    timeline: [
      {
        state: 'preparing',
        actorId: 'wave-npc',
        activities: [
          { id: 'idle', duration: 0.1 },
          { id: 'wave', duration: 1 },
        ],
      },
      {
        state: 'climax',
        actorId: 'wave-npc',
        activity: { id: 'wave', duration: 1, loop: true },
      },
      {
        state: 'ending',
        actorId: 'wave-npc',
        activity: { id: 'idle', duration: 0.2 },
      },
    ],
    primarySubjectIds: ['wave-npc'],
    momentType: 'wave',
    timingBonus: 1.2,
    resolveNpc: (id) => actors.get(id),
  })
  system.registerMoment(definition)

  assert.equal(system.startMoment('simple-wave', createContext()), true)
  assert.deepEqual(
    { x: actor.position.x, y: actor.position.y, z: actor.position.z },
    { x: 1, y: 0, z: 2 },
  )
  assert.equal(actor.active, true)
  assert.equal(actor.played[0].activity, 'idle')
  assert.equal(actor.queued[0].activity, 'wave')

  const beforeClimax = getPhotoMomentContext(system)
  assert.equal(beforeClimax.momentId, 'simple-wave')
  assert.equal(beforeClimax.state, 'preparing')
  assert.equal(beforeClimax.inClimax, false)
  assert.equal(beforeClimax.timingBonus, 0)

  system.update(0.1, createContext())
  system.update(0.1, createContext())
  system.update(0.1, createContext())
  assert.equal(system.getMomentState('simple-wave').state, 'climax')
  system.update(0.1, createContext())

  const duringClimax = getPhotoMomentContext(system)
  assert.equal(duringClimax.inClimax, true)
  assert.ok(duringClimax.timingBonus > 0)
  assert.deepEqual(duringClimax.primarySubjectIds, ['wave-npc'])
  assert.equal(duringClimax.momentType, 'wave')
  assert.ok(getClimaxProgress(system.getMomentState('simple-wave')) > 0.45)

  system.update(0.1, createContext())
  const afterClimax = getPhotoMomentContext(system)
  assert.equal(afterClimax.state, 'ending')
  assert.equal(afterClimax.inClimax, false)
  assert.equal(afterClimax.timingBonus, 0)

  system.update(0.1, createContext())
  assert.equal(system.getMomentState('simple-wave').state, 'cooldown')
  assert.deepEqual(
    { x: actor.position.x, y: actor.position.y, z: actor.position.z },
    { x: 20, y: 0, z: 20 },
  )
  assert.equal(actor.active, false)
  assert.equal(system.getResourceOwner('npc', 'wave-npc'), null)
  system.dispose()
})

test('multi-actor template synchronizes staging, activity and complete cleanup', () => {
  const actors = new Map([
    ['actor-a', createActor('actor-a', 10)],
    ['actor-b', createActor('actor-b', 11)],
    ['actor-c', createActor('actor-c', 12)],
  ])
  const system = createSystem(actors)
  const definition = createMultiActorMoment({
    id: 'multi-pose',
    region: 'test-region',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 0 },
    triggerRadius: 4,
    pauseDistance: 6,
    cleanupDistance: 9,
    timeWindow: { start: 0, end: 0 },
    durations: {
      preparing: 0.1,
      starting: 0.1,
      active: 3,
      climax: 1,
      ending: 0.1,
    },
    cooldown: 0,
    npcIds: [...actors.keys()],
    stagingPoints: [...actors.keys()].map((actorId, index) => ({
      id: `stage-${index}`,
      position: [index - 1, 0, -2],
    })),
    initialStaging: [...actors.keys()].map((actorId, index) => ({
      actorId,
      stagingId: `stage-${index}`,
    })),
    timeline: [...actors.keys()].map((actorId) => ({
      id: `pose-${actorId}`,
      state: 'active',
      actorId,
      activity: { id: 'pose', duration: 4, loop: true },
    })),
    resolveNpc: (id) => actors.get(id),
  })
  system.registerMoment(definition)
  system.startMoment('multi-pose', createContext())
  system.update(0.1, createContext())
  system.update(0.1, createContext())

  assert.equal(system.getMomentState('multi-pose').state, 'active')
  assert.deepEqual(
    [...actors.values()].map((actor) => actor.played.at(-1).activity),
    ['pose', 'pose', 'pose'],
  )
  assert.equal(system.getDebugSnapshot().locks.length, 6)

  assert.equal(system.cancelMoment('multi-pose', 'test-cancel', createContext()), true)
  assert.equal(system.getDebugSnapshot().locks.length, 0)
  assert.deepEqual(
    [...actors.values()].map((actor) => actor.active),
    [false, false, false],
  )
  assert.ok([...actors.values()].every((actor) => actor.stopped === 1))
  system.dispose()
})

test('distance cleanup releases actors and returning never duplicates them', () => {
  const actor = createActor('persistent')
  const actors = new Map([['persistent', actor]])
  const system = createSystem(actors)
  const definition = createSimpleMoment({
    id: 'distance-template',
    region: 'test-region',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 0 },
    triggerRadius: 3,
    pauseDistance: 5,
    cleanupDistance: 8,
    timeWindow: { start: 0, end: 0 },
    durations: {
      preparing: 0,
      starting: 0,
      active: 10,
      climax: 1,
      ending: 1,
    },
    cooldown: 0,
    maxRepeats: 2,
    npcIds: ['persistent'],
    stagingPoints: [{ id: 'stage', position: [0, 0, 0] }],
    initialStaging: [{ actorId: 'persistent', stagingId: 'stage' }],
    timeline: [{
      state: 'active',
      actorId: 'persistent',
      activity: { id: 'wave', duration: 10, loop: true },
    }],
    resolveNpc: (id) => actors.get(id),
  })
  system.registerMoment(definition)
  system.startMoment('distance-template', createContext())
  system.update(0.01, createContext())
  const originalActor = actors.get('persistent')

  system.update(0.1, createContext({
    playerPosition: { x: 6, y: 0, z: 0 },
  }))
  assert.equal(system.getMomentState('distance-template').state, 'inactive')
  assert.equal(system.getResourceOwner('npc', 'persistent'), null)
  assert.ok(actor.stopped >= 1)

  system.update(0.25, createContext())
  assert.equal(system.getMomentState('distance-template').state, 'preparing')
  assert.equal(actors.get('persistent'), originalActor)

  system.update(0.1, createContext({ regionIds: ['other-region'] }))
  assert.equal(system.getMomentState('distance-template').state, 'inactive')
  assert.equal(system.getResourceOwner('npc', 'persistent'), null)
  assert.equal(actors.size, 1)
  system.dispose()
})

test('template cancellation conditions release every resource safely', () => {
  const actor = createActor('cancel-npc')
  const actors = new Map([['cancel-npc', actor]])
  const system = createSystem(actors)
  system.registerMoment(createSimpleMoment({
    id: 'conditional-cancel',
    region: 'test-region',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 0 },
    triggerRadius: 3,
    pauseDistance: 5,
    cleanupDistance: 8,
    timeWindow: { start: 0, end: 0 },
    durations: {
      preparing: 10,
      starting: 1,
      active: 1,
      climax: 1,
      ending: 1,
    },
    cooldown: 1,
    npcIds: ['cancel-npc'],
    stagingPoints: [{ id: 'cancel-stage', position: [0, 0, 0] }],
    propIds: ['flowers'],
    performanceAreaIds: ['cancel-area'],
    timeline: [],
    cancelWhen: (context) => context.cancelRequested && 'requested-by-test',
    resolveNpc: (id) => actors.get(id),
  }))
  system.startMoment('conditional-cancel', createContext())
  system.update(0.1, createContext({ cancelRequested: true }))

  assert.equal(system.getMomentState('conditional-cancel').state, 'cooldown')
  assert.equal(system.getDebugSnapshot().locks.length, 0)
  assert.equal(system.getResourceOwner('npc', 'cancel-npc'), null)
  system.dispose()
})

test('development fixtures contain only one wave and one multi-actor pose moment', () => {
  const fixtures = createDevelopmentTestMoments()
  assert.deepEqual(fixtures.map(({ id }) => id), [
    'dev-simple-wave',
    'dev-multi-pose',
  ])
  assert.equal(fixtures[0].metadata.template, 'simple')
  assert.equal(fixtures[1].metadata.template, 'multi-actor')
  assert.equal(fixtures[0].npcIds.length, 1)
  assert.equal(fixtures[1].npcIds.length, 3)

  const runtime = fixtures[0].templateRuntime
  assert.equal(runMomentTimeline(runtime, {
    state: 'inactive',
    stateElapsed: 0,
    runId: 0,
    paused: false,
  }), 0)
})
