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

  assert.equal(mo.areaName, 'interior')
  assert.equal(outdoorColliders.length, 1)
  assert.equal(interiorColliders.length, 1)
  assert.equal(mo.outdoorCollider.disabled, true)
  assert.equal(mo.interiorCollider.disabled, true)

  load.resolve(fullbodyTexture())
  await mo.readyPromise

  assert.equal(mo.group.parent, interior)
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
