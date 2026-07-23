import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MoNpc } from '../src/world/npcs/MoNpc.js'

function assertNoFaceCard(mo) {
  assert.equal(mo.group.getObjectByName('Special.FaceCard'), undefined)
  assert.equal(mo.actor.headRoot?.name, 'Special.HeadRoot')
  assert.equal(mo.actor.headMesh?.name, 'Special.HeadMesh')
  mo.actor.headRoot.traverse((object) => {
    assert.notEqual(object.isSprite, true)
    if (object.isMesh) assert.notEqual(object.geometry?.type, 'PlaneGeometry')
  })
}

test('Mơ keeps collision in the scheduled area with her procedural head', async () => {
  const outdoor = new THREE.Group()
  const interior = new THREE.Group()
  const outdoorColliders = []
  const interiorColliders = []
  const mo = new MoNpc({
    parent: outdoor,
    camera: new THREE.PerspectiveCamera(),
    colliders: outdoorColliders,
  })

  mo.setScheduleEnvironment({
    outdoorParent: outdoor,
    interiorParent: interior,
    interiorColliders,
  })
  mo.setScheduleState('insideChurch')
  mo.setWorldOutfit('church')

  assert.equal(mo.areaName, 'interior')
  assert.equal(outdoorColliders.length, 1)
  assert.equal(interiorColliders.length, 1)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, true)

  await mo.readyPromise
  await mo.outfitPromise

  assert.equal(mo.group.parent, interior)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.actor.headMesh.material.map, null)
  assertNoFaceCard(mo)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.setDialogueActive(true)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, true)
  assert.equal(mo.group.visible, false)
  mo.setDialogueActive(false)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.dispose()
  assert.equal(outdoorColliders.length, 0)
  assert.equal(interiorColliders.length, 0)
})

test('Mơ keeps the same 3D head and defers outfit state during dialogue', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    colliders: [],
  })
  await mo.readyPromise

  const visual = mo.visual
  const headRoot = mo.actor.headRoot
  const headMesh = mo.actor.headMesh
  mo.setDialogueActive(true)
  assert.equal(await mo.setWorldOutfit('church'), false)
  assert.equal(mo.currentOutfit, 'idle')

  mo.setDialogueActive(false)
  await mo.outfitPromise
  assert.equal(mo.visual, visual)
  assert.equal(mo.actor.headRoot, headRoot)
  assert.equal(mo.actor.headMesh, headMesh)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.actor.currentOutfit, 'church')
  assert.throws(() => mo.setWorldOutfit('raincoat'), RangeError)

  mo.dispose()
})

test('Mơ faces her travel direction while walking and keeps camera look on the head', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(7.5, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    colliders: [],
  })
  await mo.readyPromise

  assert.equal(typeof mo.actor.setWalking, 'function')
  mo.setScheduleState('walkingToChurch')
  const expectedTravelYaw = Math.atan2(
    mo.targetPosition.x - mo.position.x,
    mo.targetPosition.z - mo.position.z,
  )
  const positionReference = mo.position
  const targetReference = mo.targetPosition
  mo.update(1 / 60, 'outdoor')
  assert.equal(mo.actor.walking, true)
  assert.ok(
    Math.abs(Math.atan2(
      Math.sin(mo.group.rotation.y - expectedTravelYaw),
      Math.cos(mo.group.rotation.y - expectedTravelYaw),
    )) < 1e-6,
  )
  assert.ok(Math.abs(mo.actor.headRoot.rotation.y) > 0.001)
  assert.equal(mo.position, positionReference)
  assert.equal(mo.targetPosition, targetReference)

  for (let frame = 0; frame < 60; frame += 1) {
    mo.update(1 / 60, 'outdoor')
  }

  assert.ok(
    Math.abs(Math.atan2(
      Math.sin(mo.group.rotation.y - expectedTravelYaw),
      Math.cos(mo.group.rotation.y - expectedTravelYaw),
    )) < 1e-6,
  )
  assert.equal(mo.group.rotation.x, 0)
  assert.equal(mo.pose.rotation.z, 0)
  assert.ok(Math.abs(mo.actor.visual.scale.y - mo.actor.bodyScale) < 0.008)
  mo.dispose()
})

test('Mơ keeps the existing player-facing body behavior while standing still', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(20, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    colliders: [],
  })
  await mo.readyPromise

  for (let frame = 0; frame < 180; frame += 1) {
    mo.update(1 / 60, 'outdoor')
  }

  assert.equal(mo.actor.walking, false)
  assert.ok(Math.abs(mo.group.rotation.y - Math.PI * 0.42) < 0.03)
  mo.dispose()
})

test('a missing optional texture keeps Mơ procedural, lit and interactive', async () => {
  const parent = new THREE.Group()
  const mo = new MoNpc({
    parent,
    camera: new THREE.PerspectiveCamera(),
    colliders: [],
  })
  await mo.readyPromise
  mo.update(0, 'outdoor')

  assert.equal(mo.ready, true)
  assert.equal(mo.disabled, false)
  assertNoFaceCard(mo)
  assert.equal(mo.actor.headMesh.material.map ?? null, null)
  assert.ok(
    mo.actor.headMesh.material.isMeshLambertMaterial ||
      mo.actor.headMesh.material.isMeshStandardMaterial ||
      mo.actor.headMesh.material.isMeshPhongMaterial,
  )
  assert.equal(mo.actor.faceDetails.visible, true)
  assert.equal(mo.group.visible, true)
  assert.equal(mo.getInteraction()?.target, mo)
  mo.dispose()
})

test('Mơ hierarchy is grounded, proportional and preserves dialogue focus', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    colliders: [],
  })
  await mo.readyPromise
  mo.group.updateMatrixWorld(true)

  const bounds = new THREE.Box3().setFromObject(mo.actor.visual)
  const height = bounds.max.y - bounds.min.y
  assert.ok(Math.abs(height - mo.actor.profile.height) < 0.035)
  assert.ok(Math.abs(bounds.min.y - mo.position.y) < 0.025)
  assertNoFaceCard(mo)
  assert.equal(mo.actor.hairGroup.parent, mo.actor.headRoot)
  assert.equal(mo.actor.glassesGroup.parent, mo.actor.headRoot)
  assert.ok(mo.group.getObjectByName('Special.Outfit.Top'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Strap.L'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Strap.R'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Shorts.L'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Shorts.R'))

  const focus = mo.getFocusPoint(new THREE.Vector3())
  const headPosition = mo.actor.headRoot.getWorldPosition(new THREE.Vector3())
  assert.ok(focus.distanceTo(headPosition) < 0.3)

  mo.setDialogueActive(true)
  assert.equal(mo.getInteraction(), null)
  assert.equal(mo.group.visible, false)
  assert.equal(mo.actor.dialogueActive, true)
  mo.setDialogueActive(false)
  assert.equal(mo.getInteraction()?.target, mo)
  assert.equal(mo.actor.dialogueActive, false)

  mo.dispose()
})
