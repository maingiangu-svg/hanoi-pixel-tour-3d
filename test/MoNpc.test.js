import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MoNpc } from '../src/world/npcs/MoNpc.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function faceTexture() {
  const texture = new THREE.Texture()
  texture.image = { naturalWidth: 1254, naturalHeight: 1254 }
  return texture
}

function faceAssetLoader(result = faceTexture()) {
  return { getSpecialFace: () => Promise.resolve(result) }
}

test('Mơ keeps collision in the scheduled area when the face card loads late', async () => {
  const load = deferred()
  const outdoor = new THREE.Group()
  const interior = new THREE.Group()
  const outdoorColliders = []
  const interiorColliders = []
  const mo = new MoNpc({
    parent: outdoor,
    camera: new THREE.PerspectiveCamera(),
    assetLoader: { getSpecialFace: () => load.promise },
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

  load.resolve(faceTexture())
  await mo.readyPromise
  await mo.outfitPromise

  assert.equal(mo.group.parent, interior)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.faceCard.visible, true)
  assert.equal(mo.actor.fallbackFace.visible, false)
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

test('Mơ keeps the same body and face card while outfit state changes', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: faceAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise

  const visual = mo.visual
  const faceCard = mo.faceCard
  mo.setDialogueActive(true)
  assert.equal(await mo.setWorldOutfit('church'), false)
  assert.equal(mo.currentOutfit, 'idle')

  mo.setDialogueActive(false)
  await mo.outfitPromise
  assert.equal(mo.visual, visual)
  assert.equal(mo.faceCard, faceCard)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.actor.currentOutfit, 'church')
  assert.throws(() => mo.setWorldOutfit('raincoat'), RangeError)

  mo.dispose()
})

test('Mơ faces her travel direction and toggles the legacy-body walk pose', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(7.5, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    assetLoader: faceAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise

  mo.setScheduleState('walkingToChurch')
  const expectedTravelYaw = Math.atan2(
    mo.targetPosition.x - mo.position.x,
    mo.targetPosition.z - mo.position.z,
  )
  mo.update(1 / 60, 'outdoor')

  assert.equal(mo.actor.walking, true)
  assert.ok(
    Math.abs(Math.atan2(
      Math.sin(mo.group.rotation.y - expectedTravelYaw),
      Math.cos(mo.group.rotation.y - expectedTravelYaw),
    )) < 1e-6,
  )
  assert.equal(mo.group.rotation.x, 0)
  assert.equal(mo.pose.rotation.z, 0)
  assert.equal(typeof mo.actor.setDebugLookFrozen, 'function')

  mo.dispose()
})

test('Mơ keeps the existing restrained player-facing behavior while idle', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(20, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    assetLoader: faceAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise

  for (let frame = 0; frame < 180; frame += 1) {
    mo.update(1 / 60, 'outdoor')
  }

  assert.equal(mo.actor.walking, false)
  assert.ok(Math.abs(mo.group.rotation.y - Math.PI * 0.42) < 0.03)
  assert.ok(Math.abs(mo.actor.visual.scale.y - mo.actor.bodyScale) < 0.008)
  mo.dispose()
})

test('a failed optional face texture keeps Mơ visible and interactive', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: faceAssetLoader(null),
    colliders: [],
  })
  await mo.readyPromise
  mo.update(0, 'outdoor')

  assert.equal(mo.ready, true)
  assert.equal(mo.disabled, false)
  assert.equal(mo.faceCard.visible, false)
  assert.equal(mo.actor.fallbackFace.visible, true)
  assert.equal(mo.group.visible, true)
  assert.equal(mo.getInteraction()?.target, mo)
  mo.dispose()
})

test('Mơ uses a transparent face card on the grounded camisole-and-shorts body', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: faceAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise
  mo.group.updateMatrixWorld(true)

  const bounds = new THREE.Box3().setFromObject(mo.actor.visual)
  assert.ok(Math.abs((bounds.max.y - mo.position.y) - mo.actor.profile.height) < 0.02)
  assert.ok(Math.abs(bounds.min.y - mo.position.y) < 0.02)
  assert.ok(mo.group.getObjectByName('Special.Outfit.Top'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Strap.L'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Strap.R'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Shorts.L'))
  assert.ok(mo.group.getObjectByName('Special.Outfit.Shorts.R'))
  assert.equal(mo.faceCard.geometry.type, 'PlaneGeometry')
  assert.equal(mo.faceCard.material.transparent, true)
  assert.equal(mo.faceCard.material.map.colorSpace, THREE.SRGBColorSpace)
  assert.equal(mo.actor.headRoot, mo.actor.headRig)
  assert.equal(mo.actor.headMesh.name, 'Special.HeadBacking')

  const focus = mo.getFocusPoint(new THREE.Vector3())
  assert.ok(focus.y > 1.35 && focus.y < 1.5)
  mo.dispose()
})
