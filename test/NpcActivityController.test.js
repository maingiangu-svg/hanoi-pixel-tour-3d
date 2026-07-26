import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { NPC_ACTIVITY_TYPES } from '../src/npcs/ActivityController.js'
import { HANDHELD_PROP_TYPES } from '../src/npcs/HandheldProps.js'
import { NpcActor } from '../src/npcs/NpcActor.js'
import { NpcResources } from '../src/npcs/NpcResources.js'
import { MomentSystem } from '../src/moments/MomentSystem.js'

const NEAR_PLAYER = Object.freeze({
  playerPosition: new THREE.Vector3(0, 0, 2),
})

function createActor(resources, name = 'Activity test NPC') {
  return new NpcActor({
    resources,
    preset: 'student',
    name,
    behavior: 'standing',
  })
}

test('activity controller exposes every requested reusable activity', () => {
  assert.deepEqual(NPC_ACTIVITY_TYPES, [
    'idle',
    'walk',
    'sit',
    'wave',
    'clap',
    'pose',
    'point',
    'takePhoto',
    'viewPhoto',
    'drink',
    'read',
    'exercise',
    'dance',
    'draw',
    'giveItem',
    'receiveItem',
    'lookAtLandmark',
  ])
})

test('wave blends into a raised arm pose and completes exactly once', () => {
  const resources = new NpcResources()
  const actor = createActor(resources)
  let completions = 0
  actor.playActivity('wave', {
    duration: 0.15,
    transitionDuration: 0,
    onComplete: () => { completions += 1 },
  })

  actor.update(0.05, NEAR_PLAYER)
  assert.equal(actor.getActivityState().activity, 'wave')
  assert.ok(actor.rightArm.rotation.z > 1)
  actor.update(0.05, NEAR_PLAYER)
  actor.update(0.05, NEAR_PLAYER)

  assert.equal(completions, 1)
  assert.equal(actor.getActivityState().activity, null)
  assert.ok(Math.abs(actor.rightArm.rotation.z - 0.06) < 1e-9)
  actor.dispose()
  resources.dispose()
})

test('sit uses the existing seated rig without moving the actor root', () => {
  const resources = new NpcResources()
  const actor = createActor(resources)
  const rootPosition = actor.position.clone()

  actor.playActivity('sit', {
    duration: 1,
    transitionDuration: 0,
  })
  actor.update(0.05, NEAR_PLAYER)

  assert.ok(actor.leftLeg.rotation.x < -1)
  assert.ok(actor.rightKnee.rotation.x > 1)
  assert.ok(actor.visual.position.y < -0.2)
  assert.deepEqual(actor.position.toArray(), rootPosition.toArray())
  actor.dispose()
  resources.dispose()
})

test('phone and flowers attach to the correct anchors and never duplicate', () => {
  const resources = new NpcResources()
  const first = createActor(resources, 'First')
  const second = createActor(resources, 'Second')

  const phone = first.attachProp('phone', { id: 'shared-phone' })
  const duplicateOnSameActor = first.attachProp('phone', { id: 'shared-phone' })
  const duplicateOnOtherActor = second.attachProp('phone', { id: 'shared-phone' })
  const flowers = first.attachProp('flowers', { id: 'bouquet' })

  assert.equal(duplicateOnSameActor, phone)
  assert.equal(duplicateOnOtherActor, null)
  assert.equal(phone.group.parent, first.rightHandAnchor)
  assert.equal(flowers.group.parent, first.leftHandAnchor)
  assert.equal(first.getActivityState().props.length, 2)
  assert.equal(
    phone.group.getObjectByName('Điện thoại').geometry,
    resources.getGeometry('box'),
  )
  assert.deepEqual(HANDHELD_PROP_TYPES.includes('flowers'), true)

  first.dispose()
  second.dispose()
  resources.dispose()
})

test('a held prop transfers between NPCs without cloning its object', () => {
  const resources = new NpcResources()
  const giver = createActor(resources, 'Giver')
  const recipient = createActor(resources, 'Recipient')
  const flowers = giver.attachProp('flowers', { id: 'transfer-bouquet' })
  const originalGroup = flowers.group

  assert.equal(giver.transferProp('transfer-bouquet', recipient), true)
  assert.equal(giver.getActivityState().props.length, 0)
  assert.equal(recipient.getActivityState().props.length, 1)
  assert.equal(
    recipient.activityController.heldProps.get('transfer-bouquet').group,
    originalGroup,
  )
  assert.equal(originalGroup.parent, recipient.leftHandAnchor)
  assert.equal(giver.transferProp('transfer-bouquet', recipient), false)

  giver.dispose()
  recipient.dispose()
  resources.dispose()
})

test('queue advances in order and cancelling mid-activity clears pose and props', () => {
  const resources = new NpcResources()
  const actor = createActor(resources)
  actor.playActivity('draw', {
    duration: 2,
    transitionDuration: 0,
  })
  actor.queueActivity('wave', {
    duration: 1,
    transitionDuration: 0,
  })
  actor.update(0.05, NEAR_PLAYER)

  assert.equal(actor.getActivityState().activity, 'draw')
  assert.equal(actor.getActivityState().queued, 1)
  assert.equal(actor.getActivityState().props.length, 2)
  assert.ok(actor.rightArm.rotation.x < -0.7)

  assert.equal(actor.stopActivity({ transitionDuration: 0 }), true)
  assert.deepEqual(actor.getActivityState(), {
    activity: null,
    elapsed: 0,
    queued: 0,
    transitioning: false,
    props: [],
  })
  assert.ok(Math.abs(actor.rightArm.rotation.x) < 1e-9)
  assert.ok(Math.abs(actor.rightArm.rotation.z - 0.06) < 1e-9)
  actor.dispose()
  resources.dispose()
})

test('far NPCs keep activity timing correct while detailed pose work is throttled', () => {
  const resources = new NpcResources()
  const actor = createActor(resources)
  let completed = false
  actor.playActivity('pose', {
    duration: 0.1,
    transitionDuration: 0,
    onComplete: () => { completed = true },
  })
  const farContext = {
    playerPosition: new THREE.Vector3(100, 0, 100),
  }

  actor.update(0.05, farContext)
  actor.update(0.05, farContext)
  assert.equal(completed, true)
  assert.equal(actor.getActivityState().activity, null)
  actor.dispose()
  resources.dispose()
})

test('cancelling a moment resets its NPC activity and releases held props', () => {
  const resources = new NpcResources()
  const actor = createActor(resources, 'Moment NPC')
  const momentContext = {
    playerPosition: new THREE.Vector3(0, 0, 0),
    regionIds: ['test-region'],
    areaId: 'outdoor',
    gameMinutes: 12 * 60,
  }
  const system = new MomentSystem({
    resourceResolver: (type, id) => type === 'npc' && id === 'moment-npc',
    resourceResetter: (type, id) => {
      if (type === 'npc' && id === 'moment-npc') actor.resetMomentState()
    },
  })
  system.registerMoment({
    id: 'activity-cleanup',
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
    cooldown: 0,
    npcIds: ['moment-npc'],
    hooks: {
      onPrepare: () => actor.playActivity('wave', {
        duration: 10,
        transitionDuration: 0,
        props: [{ type: 'flowers', id: 'moment-flowers' }],
      }),
    },
  })

  assert.equal(system.startMoment('activity-cleanup', momentContext), true)
  actor.update(0.05, NEAR_PLAYER)
  assert.equal(actor.getActivityState().activity, 'wave')
  assert.equal(actor.getActivityState().props.length, 1)
  system.cancelMoment('activity-cleanup', 'test-cancel', momentContext)
  assert.equal(actor.getActivityState().activity, null)
  assert.equal(actor.getActivityState().props.length, 0)
  assert.equal(system.getResourceOwner('npc', 'moment-npc'), null)

  system.dispose()
  actor.dispose()
  resources.dispose()
})
