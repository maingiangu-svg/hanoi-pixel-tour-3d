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

function fullbodyTexture() {
  const texture = new THREE.Texture()
  texture.image = { naturalWidth: 768, naturalHeight: 1536 }
  return texture
}

test('Mơ keeps collision in the scheduled area when the billboard loads late', async () => {
  const load = deferred()
  const outdoor = new THREE.Group()
  const interior = new THREE.Group()
  const outdoorColliders = []
  const interiorColliders = []
  const mo = new MoNpc({
    parent: outdoor,
    camera: new THREE.PerspectiveCamera(),
    assetLoader: { getFullbody: () => load.promise },
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

  load.resolve(fullbodyTexture())
  await mo.readyPromise

  assert.equal(mo.group.parent, interior)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.setDialogueActive(true)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, true)
  mo.setDialogueActive(false)
  assert.equal(mo.interiorCollider.disabled, false)

  mo.dispose()
  assert.equal(outdoorColliders.length, 0)
  assert.equal(interiorColliders.length, 0)
})

test('Mơ swaps only the existing billboard texture and defers an outfit change during dialogue', async () => {
  const idleTexture = fullbodyTexture()
  const churchTexture = fullbodyTexture()
  churchTexture.image = { naturalWidth: 720, naturalHeight: 1536 }
  const churchLoad = deferred()
  const loader = {
    getFullbody(outfitId = 'idle') {
      return outfitId === 'church' ? churchLoad.promise : Promise.resolve(idleTexture)
    },
  }
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: loader,
    colliders: [],
  })
  await mo.readyPromise

  const billboard = mo.billboard
  assert.equal(billboard.material.isMeshLambertMaterial, true)
  assert.equal(mo.contactShadow.material.isShaderMaterial, true)
  assert.equal(mo.contactShadow.material.depthWrite, false)
  billboard.geometry.computeBoundingBox()
  assert.ok(Math.abs(billboard.geometry.boundingBox.min.y) < 1e-6)
  assert.ok(Math.abs(billboard.position.y) < 1e-6)
  const geometry = billboard.geometry
  const footAnchorHeight = billboard.position.y
  const pendingChange = mo.setWorldOutfit('church')
  mo.setDialogueActive(true)
  churchLoad.resolve(churchTexture)
  assert.equal(await pendingChange, false)
  assert.equal(mo.currentOutfit, 'idle')
  assert.equal(billboard.material.map, idleTexture)

  mo.setDialogueActive(false)
  await mo.outfitPromise
  assert.equal(mo.billboard, billboard)
  assert.equal(billboard.geometry, geometry)
  assert.equal(billboard.position.y, footAnchorHeight)
  assert.equal(billboard.material.map, churchTexture)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(billboard.scale.y, 1)
  assert.ok(billboard.scale.x < 1)
  assert.throws(() => mo.setWorldOutfit('raincoat'), RangeError)

  mo.dispose()
})

test('Mơ billboard remains upright and only turns through a restrained horizontal arc', async () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(20, 8, -4.2)
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera,
    assetLoader: { getFullbody: () => Promise.resolve(fullbodyTexture()) },
    colliders: [],
  })
  await mo.readyPromise

  for (let frame = 0; frame < 240; frame += 1) mo.update(1 / 60, 'outdoor')

  assert.ok(Math.abs(mo.group.rotation.y) <= Math.PI * 0.42 + 1e-4)
  assert.equal(mo.group.rotation.x, 0)
  assert.equal(mo.pose.rotation.z, 0)
  assert.ok(Math.abs(mo.pose.scale.y - 1) < 0.007)
  mo.dispose()
})

test('a failed church asset can keep the idle texture visible as fallback', async () => {
  const idleTexture = fullbodyTexture()
  const parent = new THREE.Group()
  const mo = new MoNpc({
    parent,
    camera: new THREE.PerspectiveCamera(),
    assetLoader: { getFullbody: () => Promise.resolve(idleTexture) },
    colliders: [],
  })
  await mo.readyPromise

  const billboard = mo.billboard
  await mo.setWorldOutfit('church')

  assert.equal(mo.billboard, billboard)
  assert.equal(billboard.material.map, idleTexture)
  assert.equal(billboard.visible, true)
  assert.equal(mo.currentOutfit, 'church')
  assert.equal(mo.disabled, false)
  mo.dispose()
})

test('cropped billboard metadata keeps visible body height at 1.72 m and feet at local ground', async () => {
  const texture = fullbodyTexture()
  texture.userData.moBillboard = {
    contentHeight: 1400,
    bottomPadding: 5,
  }
  const mo = new MoNpc({
    parent: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(),
    assetLoader: { getFullbody: () => Promise.resolve(texture) },
    colliders: [],
  })
  await mo.readyPromise

  mo.billboard.geometry.computeBoundingBox()
  const planeHeight = (
    mo.billboard.geometry.boundingBox.max.y - mo.billboard.geometry.boundingBox.min.y
  ) * mo.billboard.scale.y
  const imageHeight = texture.image.naturalHeight
  const visibleBodyHeight = planeHeight * (1400 / imageHeight)
  const feetY = mo.billboard.position.y + planeHeight * (5 / imageHeight)

  assert.ok(Math.abs(visibleBodyHeight - 1.72) < 1e-6)
  assert.ok(Math.abs(feetY) < 1e-6)
  mo.dispose()
})
