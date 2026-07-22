import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { NpcActor } from '../src/npcs/NpcActor.js'
import { NpcResources } from '../src/npcs/NpcResources.js'
import {
  getNpcPreset,
  NPC_BEHAVIORS,
  NPC_PRESETS,
  NPC_PRESET_NAMES,
} from '../src/npcs/npcPresets.js'

test('NPC presets cover the requested cast with sane human proportions', () => {
  const required = [
    'student',
    'elderly',
    'tourist',
    'teaVendor',
    'motorbikeDriver',
    'child',
    'churchVisitor',
  ]
  required.forEach((name) => {
    const preset = getNpcPreset(name)
    assert.equal(Object.isFrozen(preset), true)
    assert.ok(preset.height >= 1.2 && preset.height <= 1.8)
    assert.ok(NPC_BEHAVIORS.includes(preset.defaultBehavior))
  })
  assert.deepEqual(NPC_PRESET_NAMES, Object.keys(NPC_PRESETS))
  assert.throws(() => getNpcPreset('unknown'), RangeError)
})

test('actors reuse the same low-poly geometry and material pool', () => {
  const resources = new NpcResources()
  const first = new NpcActor({ resources, preset: 'student' })
  const second = new NpcActor({ resources, preset: 'student' })
  const firstTorso = first.group.getObjectByName('Thân')
  const secondTorso = second.group.getObjectByName('Thân')

  assert.equal(firstTorso.geometry, secondTorso.geometry)
  assert.equal(firstTorso.material, secondTorso.material)
  assert.equal(firstTorso.castShadow, false)
  assert.ok(Math.abs(first.visual.scale.y - first.preset.height / 1.745) < 1e-9)
  assert.ok(first.group.getObjectByName('Khuôn mặt'))
  assert.ok(first.group.getObjectByName('Chân Trái'))
  assert.ok(first.group.getObjectByName('Vai Phải'))

  first.dispose()
  second.dispose()
  resources.dispose()
})

test('walker follows waypoints, pauses near the player, and updates its collider', () => {
  const resources = new NpcResources()
  const colliders = []
  const actor = new NpcActor({
    resources,
    preset: 'student',
    behavior: 'walker',
    position: [0, 0, 0],
    waypoints: [[0, 0, 0], [0, 0, 2]],
    colliders,
  })

  actor.update(0.05, { playerPosition: new THREE.Vector3(8, 0, 8) })
  assert.ok(actor.position.z > 0)
  assert.equal(actor.collider.disabled, false)
  assert.ok(Math.abs(actor.collider.minZ - (actor.position.z - actor.colliderDepth)) < 1e-9)

  const stoppedAt = actor.position.clone()
  actor.update(0.05, { playerPosition: new THREE.Vector3(0, 0, 0.1) })
  actor.update(0.05, { playerPosition: new THREE.Vector3(0, 0, 0.1) })
  assert.equal(actor.pausedForPlayer, true)
  assert.ok(actor.position.distanceTo(stoppedAt) < 1e-9)

  actor.deactivate()
  assert.equal(actor.group.visible, false)
  assert.equal(actor.collider.disabled, true)
  assert.ok(actor.collider.minX > 100000)
  actor.activate()
  assert.equal(actor.collider.disabled, false)
  assert.equal(colliders.length, 1)

  actor.dispose()
  assert.equal(colliders.length, 0)
  resources.dispose()
})

test('optional dialogue API matches the current interaction contract', () => {
  const resources = new NpcResources()
  const lines = Object.freeze([{ expression: 'idle', text: 'Xin chào.' }])
  const actor = new NpcActor({
    resources,
    preset: 'churchVisitor',
    name: 'An',
    position: [2, 0, -3],
    dialogueLines: lines,
  })
  const interaction = actor.getInteraction()

  assert.equal(actor.ready, true)
  assert.equal(actor.disabled, false)
  assert.equal(interaction.type, 'dialogue')
  assert.equal(interaction.target, actor)
  assert.equal(interaction.position, actor.position)
  assert.equal(interaction.label, 'Nói chuyện với An')
  assert.equal(actor.dialogueName, 'An')
  assert.equal(actor.dialoguePortrait, false)
  assert.equal(actor.getDialogueLines(), lines)
  assert.deepEqual(actor.getFocusPoint(new THREE.Vector3()).toArray(), [
    2,
    actor.preset.height * 0.82,
    -3,
  ])

  actor.setDialogueActive(true)
  assert.equal(actor.getInteraction(), null)
  assert.equal(actor.collider.disabled, true)
  assert.equal(actor.group.visible, false)
  actor.setDialogueActive(false)
  assert.equal(actor.getInteraction(), interaction)

  actor.dispose()
  resources.dispose()
})

test('seated and photographer behaviors apply distinct lightweight poses', () => {
  const resources = new NpcResources()
  const seated = new NpcActor({ resources, preset: 'motorbikeDriver' })
  const photographer = new NpcActor({ resources, preset: 'tourist' })

  assert.equal(seated.behavior, 'seated')
  assert.ok(seated.leftLeg.rotation.x < -1)
  assert.equal(photographer.behavior, 'photographer')
  assert.ok(photographer.leftArm.rotation.x < -1)
  assert.ok(photographer.group.getObjectByName('Máy ảnh'))

  seated.dispose()
  photographer.dispose()
  resources.dispose()
})

test('one-way walkers stop at their final waypoint instead of looping back', () => {
  const resources = new NpcResources()
  const actor = new NpcActor({
    resources,
    preset: 'churchVisitor',
    behavior: 'walker',
    position: [0, 0, 0],
    waypoints: [[0, 0, 0], [0, 0, 0.12]],
    loopWaypoints: false,
  })
  const playerPosition = new THREE.Vector3(8, 0, 8)

  for (let frame = 0; frame < 30; frame += 1) actor.update(0.05, { playerPosition })

  assert.equal(actor.pathComplete, true)
  assert.ok(actor.position.z >= 0.08)
  actor.dispose()
  resources.dispose()
})
