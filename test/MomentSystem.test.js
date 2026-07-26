import test from 'node:test'
import assert from 'node:assert/strict'
import { MOMENT_STATES, MomentSystem } from '../src/moments/MomentSystem.js'

function definition(overrides = {}) {
  return {
    id: 'test-moment',
    region: 'test-region',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 0 },
    triggerRadius: 3,
    pauseDistance: 5,
    cleanupDistance: 9,
    timeWindow: { start: 8 * 60, end: 20 * 60 },
    durations: {
      preparing: 0.1,
      starting: 0.1,
      active: 0.1,
      climax: 0.1,
      ending: 0.1,
    },
    cooldown: 0.2,
    npcIds: [],
    propIds: [],
    priority: 1,
    maxRepeats: 1,
    ...overrides,
  }
}

function context(overrides = {}) {
  return {
    playerPosition: { x: 0, y: 1.68, z: 0 },
    regionIds: ['test-region'],
    areaId: 'outdoor',
    gameMinutes: 12 * 60,
    paused: false,
    ...overrides,
  }
}

test('MomentSystem exposes every required state and follows the complete lifecycle', () => {
  assert.deepEqual(MOMENT_STATES, [
    'inactive',
    'preparing',
    'starting',
    'active',
    'climax',
    'ending',
    'cooldown',
  ])

  const states = []
  const system = new MomentSystem()
  system.registerMoment(definition({
    hooks: {
      onStateChange: (moment) => states.push(moment.state),
    },
  }))

  system.update(0, context())
  assert.equal(system.getMomentState('test-moment').state, 'preparing')
  for (const expected of ['starting', 'active', 'climax', 'ending', 'cooldown']) {
    system.update(0.1, context())
    assert.equal(system.getMomentState('test-moment').state, expected)
  }
  system.update(0.1, context())
  assert.equal(system.getMomentState('test-moment').state, 'cooldown')
  system.update(0.11, context())
  const final = system.getMomentState('test-moment')
  assert.equal(final.state, 'inactive')
  assert.equal(final.completedCount, 1)
  assert.deepEqual(states, [
    'preparing',
    'starting',
    'active',
    'climax',
    'ending',
    'cooldown',
    'inactive',
  ])
  system.dispose()
})

test('cooldown prevents an eligible moment from immediately repeating', () => {
  const system = new MomentSystem()
  system.registerMoment(definition({
    maxRepeats: 2,
    durations: {
      preparing: 0,
      starting: 0,
      active: 0,
      climax: 0,
      ending: 0,
    },
    cooldown: 0.4,
  }))

  system.update(0, context())
  system.update(0.01, context())
  assert.equal(system.getMomentState('test-moment').state, 'cooldown')
  system.update(0.2, context())
  assert.equal(system.getMomentState('test-moment').state, 'cooldown')
  assert.equal(system.getMomentState('test-moment').runCount, 1)
  system.update(0.21, context())
  assert.equal(system.getMomentState('test-moment').state, 'preparing')
  assert.equal(system.getMomentState('test-moment').runCount, 2)
  system.dispose()
})

test('leaving the detail radius pauses updates and returning resumes the same run', () => {
  let updates = 0
  const system = new MomentSystem()
  system.registerMoment(definition({
    durations: {
      preparing: 0,
      starting: 0,
      active: 10,
      climax: 1,
      ending: 1,
    },
    hooks: {
      onUpdate: () => { updates += 1 },
    },
  }))

  system.update(0, context())
  system.update(0.05, context())
  const running = system.getMomentState('test-moment')
  assert.equal(running.state, 'active')
  const elapsedBeforePause = running.stateElapsed
  const runId = running.runId
  const updatesBeforePause = updates

  system.update(0.25, context({
    playerPosition: { x: 6, y: 1.68, z: 0 },
  }))
  const paused = system.getMomentState('test-moment')
  assert.equal(paused.paused, true)
  assert.equal(paused.pauseReason, 'out-of-range')
  assert.equal(paused.stateElapsed, elapsedBeforePause)
  assert.equal(updates, updatesBeforePause)

  system.update(0.1, context())
  const resumed = system.getMomentState('test-moment')
  assert.equal(resumed.paused, false)
  assert.equal(resumed.runId, runId)
  assert.equal(resumed.runCount, 1)
  assert.equal(system.getActiveMoments().length, 1)
  assert.ok(updates > updatesBeforePause)
  system.dispose()
})

test('moving beyond cleanup distance cancels once without duplicating resources', () => {
  let cleanups = 0
  let cancellations = 0
  const system = new MomentSystem()
  system.registerMoment(definition({
    durations: {
      preparing: 0,
      starting: 0,
      active: 10,
      climax: 1,
      ending: 1,
    },
    hooks: {
      onCleanup: () => { cleanups += 1 },
      onCancel: () => { cancellations += 1 },
    },
  }))
  system.update(0, context())
  system.update(0.01, context())

  const far = context({ playerPosition: { x: 12, y: 1.68, z: 0 } })
  system.update(0.1, far)
  system.update(0.1, far)
  assert.equal(system.getMomentState('test-moment').state, 'cooldown')
  assert.equal(system.getActiveMoments().length, 0)
  assert.equal(cleanups, 1)
  assert.equal(cancellations, 1)
  system.dispose()
})

test('region, time, NPC and prop availability gate moment startup', () => {
  const available = new Set(['npc-ready', 'prop-ready'])
  const system = new MomentSystem({
    resourceResolver: (type, id) => available.has(id),
  })
  system.registerMoment(definition({
    npcIds: ['npc-ready'],
    propIds: ['prop-missing'],
  }))

  system.update(0, context())
  assert.equal(system.getMomentState('test-moment').state, 'inactive')
  available.add('prop-missing')
  system.update(0.25, context({ regionIds: ['another-region'] }))
  assert.equal(system.getMomentState('test-moment').state, 'inactive')
  system.update(0.25, context({ gameMinutes: 23 * 60 }))
  assert.equal(system.getMomentState('test-moment').state, 'inactive')
  system.update(0.25, context())
  assert.equal(system.getMomentState('test-moment').state, 'preparing')
  system.dispose()
})

test('priority and concurrency limits start only nearby moments in the current region', () => {
  const system = new MomentSystem({ maxConcurrent: 2 })
  for (const [id, priority, region] of [
    ['low', 1, 'test-region'],
    ['high', 10, 'test-region'],
    ['middle', 5, 'test-region'],
    ['remote-region', 100, 'another-region'],
  ]) {
    system.registerMoment(definition({
      id,
      priority,
      region,
      exclusionRadius: 0,
    }))
  }

  system.update(0, context())
  assert.deepEqual(
    system.getActiveMoments().map((moment) => moment.id),
    ['high', 'middle'],
  )
  assert.equal(system.getMomentState('low').state, 'inactive')
  assert.equal(system.getMomentState('remote-region').state, 'inactive')
  system.dispose()
})

test('inactive moments are scanned by current region on a throttled interval', () => {
  const resolvedIds = []
  const system = new MomentSystem({
    scanInterval: 0.25,
    resourceResolver: (type, id) => {
      resolvedIds.push(`${type}:${id}`)
      return false
    },
  })
  system.registerMoment(definition({
    id: 'nearby',
    npcIds: ['nearby-npc'],
  }))
  for (let index = 0; index < 20; index += 1) {
    system.registerMoment(definition({
      id: `remote-${index}`,
      region: 'remote-region',
      npcIds: [`remote-npc-${index}`],
    }))
  }

  system.update(0, context())
  assert.deepEqual(resolvedIds, ['npc:nearby-npc'])
  system.update(0.1, context())
  assert.equal(resolvedIds.length, 1)
  system.update(0.15, context())
  assert.deepEqual(resolvedIds, ['npc:nearby-npc', 'npc:nearby-npc'])
  assert.ok(resolvedIds.every((id) => !id.includes('remote')))
  system.dispose()
})

test('manual pause, complete and cancel APIs are stable and idempotent', () => {
  const system = new MomentSystem()
  system.registerMoment(definition({
    maxRepeats: 2,
    durations: {
      preparing: 1,
      starting: 1,
      active: 1,
      climax: 1,
      ending: 1,
    },
  }))
  assert.equal(system.startMoment('test-moment', context()), true)
  assert.equal(system.startMoment('test-moment', context()), false)
  assert.equal(system.pauseMoment('test-moment'), true)
  assert.equal(system.pauseMoment('test-moment'), false)
  assert.equal(system.resumeMoment('test-moment', context()), true)
  assert.equal(system.completeMoment('test-moment', context()), true)
  assert.equal(system.completeMoment('test-moment', context()), false)
  assert.equal(system.cancelMoment('test-moment', 'skip-cooldown', context()), true)
  assert.equal(system.getMomentState('test-moment').state, 'inactive')
  system.dispose()
})

test('two moments cannot lock the same NPC and the waiter starts after release', () => {
  const system = new MomentSystem({ maxConcurrent: 2 })
  system.registerMoment(definition({
    id: 'npc-owner',
    priority: 10,
    npcIds: ['shared-npc'],
    exclusionRadius: 0,
    durations: { preparing: 10, starting: 1, active: 1, climax: 1, ending: 1 },
  }))
  system.registerMoment(definition({
    id: 'npc-waiter',
    priority: 1,
    npcIds: ['shared-npc'],
    exclusionRadius: 0,
    durations: { preparing: 10, starting: 1, active: 1, climax: 1, ending: 1 },
  }))

  system.update(0, context())
  assert.equal(system.getResourceOwner('npc', 'shared-npc'), 'npc-owner')
  assert.equal(system.getMomentState('npc-waiter').state, 'inactive')
  assert.equal(system.getMomentState('npc-waiter').waiting, true)
  assert.equal(system.getMomentState('npc-waiter').blockedReason, 'resource-locked')
  assert.equal(system.getDebugSnapshot().locks.length, 1)

  system.completeMoment('npc-owner', context())
  assert.equal(system.getResourceOwner('npc', 'shared-npc'), null)
  system.update(0.25, context())
  assert.equal(system.getMomentState('npc-waiter').state, 'preparing')
  assert.equal(system.getResourceOwner('npc', 'shared-npc'), 'npc-waiter')
  system.dispose()
})

test('staging zones are exclusive even when moments use different NPCs', () => {
  const system = new MomentSystem({ maxConcurrent: 2 })
  system.registerMoment(definition({
    id: 'stage-owner',
    priority: 5,
    npcIds: ['npc-a'],
    stagingIds: ['church-steps'],
    exclusionRadius: 0,
  }))
  system.registerMoment(definition({
    id: 'stage-waiter',
    priority: 4,
    npcIds: ['npc-b'],
    stagingIds: ['church-steps'],
    exclusionRadius: 0,
  }))

  system.update(0, context())
  assert.equal(system.getResourceOwner('staging', 'church-steps'), 'stage-owner')
  assert.equal(system.getMomentState('stage-waiter').blockedReason, 'resource-locked')
  assert.equal(system.getActiveMoments().length, 1)
  system.dispose()
})

test('resource acquisition is atomic when any required resource is unavailable', () => {
  const available = new Set(['npc-ready'])
  const system = new MomentSystem({
    resourceResolver: (type, id) => available.has(id),
  })
  system.registerMoment(definition({
    npcIds: ['npc-ready'],
    propIds: ['missing-prop'],
  }))

  const result = system.requestResources('test-moment', context())
  assert.equal(result.acquired, false)
  assert.equal(result.reason, 'resource-unavailable')
  assert.equal(system.getResourceOwner('npc', 'npc-ready'), null)
  assert.equal(system.getResourceOwner('prop', 'missing-prop'), null)
  system.dispose()
})

test('cancelling a running moment releases every lock and resets each resource once', () => {
  const resetResources = []
  const system = new MomentSystem({
    resourceResetter: (type, id, moment, currentContext, reason) => {
      resetResources.push(`${type}:${id}:${moment.id}:${reason}`)
    },
  })
  system.registerMoment(definition({
    npcIds: ['npc-a'],
    propIds: ['prop-a'],
    stagingIds: ['stage-a'],
    performanceAreaIds: ['performance-a'],
    audioChannelIds: ['ambient-voice'],
    interactionPointIds: ['interaction-a'],
    durations: { preparing: 10, starting: 1, active: 1, climax: 1, ending: 1 },
  }))

  assert.equal(system.startMoment('test-moment', context()), true)
  assert.equal(system.getDebugSnapshot().locks.length, 6)
  assert.equal(system.cancelMoment('test-moment', 'test-cancel', context()), true)
  assert.equal(system.getDebugSnapshot().locks.length, 0)
  assert.equal(system.getResourceOwner('npc', 'npc-a'), null)
  assert.deepEqual(resetResources.sort(), [
    'audio:ambient-voice:test-moment:test-cancel',
    'interaction:interaction-a:test-moment:test-cancel',
    'npc:npc-a:test-moment:test-cancel',
    'performance-area:performance-a:test-moment:test-cancel',
    'prop:prop-a:test-moment:test-cancel',
    'staging:stage-a:test-moment:test-cancel',
  ])
  assert.equal(system.cancelMoment('test-moment', 'again', context()), true)
  assert.equal(resetResources.length, 6)
  system.dispose()
})

test('leaving a moment cleanup radius releases its NPC without duplication', () => {
  let acquired = 0
  let released = 0
  const system = new MomentSystem({
    resourceResetter: () => { released += 1 },
  })
  system.registerMoment(definition({
    npcIds: ['persistent-npc'],
    durations: { preparing: 10, starting: 1, active: 1, climax: 1, ending: 1 },
    hooks: {
      onResourcesAcquired: () => { acquired += 1 },
    },
  }))

  system.update(0, context())
  assert.equal(acquired, 1)
  system.update(0.1, context({
    playerPosition: { x: 15, y: 1.68, z: 0 },
  }))
  assert.equal(system.getResourceOwner('npc', 'persistent-npc'), null)
  assert.equal(released, 1)
  assert.equal(acquired, 1)
  system.dispose()
})

test('nearby performance areas conflict and selection respects priority then distance', () => {
  const system = new MomentSystem({ maxConcurrent: 3 })
  system.registerMoment(definition({
    id: 'near-low',
    position: { x: 1, y: 0, z: 0 },
    triggerRadius: 10,
    pauseDistance: 12,
    cleanupDistance: 18,
    priority: 1,
    exclusionRadius: 2,
  }))
  system.registerMoment(definition({
    id: 'far-high',
    position: { x: 4, y: 0, z: 0 },
    triggerRadius: 10,
    pauseDistance: 12,
    cleanupDistance: 18,
    priority: 8,
    exclusionRadius: 2,
  }))
  system.registerMoment(definition({
    id: 'far-low',
    position: { x: 7, y: 0, z: 0 },
    triggerRadius: 10,
    pauseDistance: 12,
    cleanupDistance: 18,
    priority: 1,
    exclusionRadius: 0,
  }))

  assert.equal(system.selectNextMoment(context()).id, 'far-high')
  system.update(0, context())
  assert.equal(system.getMomentState('far-high').state, 'preparing')
  assert.equal(
    system.getMomentState('near-low').blockedReason,
    'performance-area-conflict',
  )
  assert.equal(system.getMomentState('far-low').state, 'preparing')
  system.dispose()
})

test('type cooldown prevents another moment of the same type from starting too soon', () => {
  const system = new MomentSystem({ maxConcurrent: 2 })
  system.registerMoment(definition({
    id: 'type-owner',
    type: 'street-performance',
    typeCooldown: 0.5,
    priority: 10,
    exclusionRadius: 0,
  }))
  system.registerMoment(definition({
    id: 'type-next',
    type: 'street-performance',
    typeCooldown: 0.5,
    priority: 1,
    exclusionRadius: 0,
  }))

  system.update(0, context())
  system.completeMoment('type-owner', context())
  assert.equal(
    system.canActivateMoment('type-next', context()).reason,
    'type-cooldown',
  )
  system.update(0.25, context())
  assert.equal(system.getMomentState('type-next').state, 'inactive')
  system.update(0.26, context())
  assert.equal(system.getMomentState('type-next').state, 'preparing')
  system.dispose()
})
