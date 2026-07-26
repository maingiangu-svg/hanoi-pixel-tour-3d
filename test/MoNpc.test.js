import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { MoNpc } from '../src/world/npcs/MoNpc.js'
import { MO_WORLD_HEIGHT } from '../src/world/npcs/MoWorldVisual.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function worldTexture(width = 446, height = 1493) {
  const texture = new THREE.Texture()
  texture.image = { naturalWidth: width, naturalHeight: height }
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function worldAssetLoader({
  idle = worldTexture(),
  church = worldTexture(445, 1495),
} = {}) {
  return {
    getWorldOutfit: (outfitId) => Promise.resolve(
      outfitId === 'church' ? church : idle,
    ),
  }
}

test('Mơ keeps collision in the scheduled area while clean assets load', async () => {
  const load = deferred()
  const outdoor = new THREE.Group()
  const interior = new THREE.Group()
  const outdoorColliders = []
  const interiorColliders = []
  const church = worldTexture(445, 1495)
  const mo = new MoNpc({
    parent: outdoor,
    camera: new THREE.PerspectiveCamera(),
    assetLoader: {
      getWorldOutfit: (outfitId) => (
        outfitId === 'idle' ? load.promise : Promise.resolve(church)
      ),
    },
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

  load.resolve(worldTexture())
  await mo.readyPromise
  await mo.outfitPromise

  assert.equal(mo.group.parent, interior)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.faceCard.visible, true)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.setDialogueActive(true)
  assert.equal(mo.interiorCollider.disabled, true)
  assert.equal(mo.group.visible, false)
  mo.setDialogueActive(false)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.dispose()
  assert.equal(outdoorColliders.length, 0)
  assert.equal(interiorColliders.length, 0)
})

test('outfit changes replace only the cached billboard texture', async () => {
  const idle = worldTexture()
  const church = worldTexture(445, 1495)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: worldAssetLoader({ idle, church }),
    colliders: [],
  })
  await mo.readyPromise

  const visual = mo.visual
  const billboard = mo.faceCard
  const material = billboard.material
  assert.equal(material.map, idle)
  mo.setDialogueActive(true)
  assert.equal(await mo.setWorldOutfit('church'), false)
  assert.equal(mo.currentOutfit, 'idle')

  mo.setDialogueActive(false)
  await mo.outfitPromise
  assert.equal(mo.visual, visual)
  assert.equal(mo.faceCard, billboard)
  assert.equal(mo.faceCard.material, material)
  assert.equal(material.map, church)
  assert.equal(mo.currentOutfit, 'church')
  assert.throws(() => mo.setWorldOutfit('raincoat'), RangeError)

  mo.dispose()
})

test('Mơ faces travel direction without tilting the full-body billboard', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(7.5, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    assetLoader: worldAssetLoader(),
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
  assert.equal(mo.faceCard.rotation.x, 0)
  mo.dispose()
})

test('idle billboard keeps restrained yaw and feet-anchored breathing', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(20, 2, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    assetLoader: worldAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise

  for (let frame = 0; frame < 180; frame += 1) {
    mo.update(1 / 60, 'outdoor')
  }

  assert.equal(mo.actor.walking, false)
  assert.ok(Math.abs(mo.group.rotation.y - Math.PI * 0.42) < 0.03)
  assert.ok(Math.abs(mo.visual.scale.y - 1) < 0.005)
  assert.equal(mo.faceCard.position.y, MO_WORLD_HEIGHT * 0.5)
  mo.dispose()
})

test('a missing clean full-body asset disables Mơ safely', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: worldAssetLoader({ idle: null, church: null }),
    colliders: [],
  })
  await mo.readyPromise
  mo.update(0, 'outdoor')

  assert.equal(mo.ready, false)
  assert.equal(mo.disabled, true)
  assert.equal(mo.faceCard.visible, false)
  assert.equal(mo.group.visible, false)
  assert.equal(mo.getInteraction(), null)
  mo.dispose()
})

test('Mơ is one clean transparent full-body billboard at 1.72m', async () => {
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: worldAssetLoader(),
    colliders: [],
  })
  await mo.readyPromise
  mo.group.updateMatrixWorld(true)

  const bounds = new THREE.Box3().setFromObject(mo.visual)
  assert.ok(Math.abs((bounds.max.y - mo.position.y) - MO_WORLD_HEIGHT) < 0.02)
  assert.ok(Math.abs(bounds.min.y - mo.position.y) < 0.02)
  assert.equal(mo.group.getObjectByName('Special.Outfit.Top'), undefined)
  assert.equal(mo.group.getObjectByName('Special.HeadBacking'), undefined)
  assert.equal(mo.faceCard.geometry.type, 'PlaneGeometry')
  assert.equal(mo.faceCard.material.transparent, true)
  assert.ok(mo.faceCard.material.alphaTest > 0)
  assert.equal(mo.faceCard.material.map.colorSpace, THREE.SRGBColorSpace)
  assert.equal(mo.faceCard.material.map.image.naturalWidth, 446)
  assert.equal(mo.faceCard.material.map.image.naturalHeight, 1493)

  const focus = mo.getFocusPoint(new THREE.Vector3())
  assert.ok(focus.y > 1.4 && focus.y < 1.5)
  mo.dispose()
})
