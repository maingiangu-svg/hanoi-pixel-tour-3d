import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { SpecialNpcActor } from '../src/npcs/SpecialNpcActor.js'
import {
  getSpecialNpcProfile,
  SPECIAL_NPC_CANONICAL_HEIGHT,
  SPECIAL_NPC_PROFILE_NAMES,
} from '../src/npcs/specialNpcProfiles.js'

function faceTexture(width = 512, height = 512) {
  const texture = new THREE.Texture()
  texture.image = { width, height }
  return texture
}

async function createActor(profile, options = {}) {
  const actor = new SpecialNpcActor({ profile, ...options })
  const faceLoaded = await actor.readyPromise
  actor.group.updateMatrixWorld(true)
  return { actor, faceLoaded }
}

function meshNames(root, prefix) {
  const names = []
  root.traverse((object) => {
    if (object.isMesh && object.name.startsWith(prefix)) names.push(object.name)
  })
  return names
}

test('special NPC profiles remain immutable and basketball is exactly 1.5x canonical height', () => {
  assert.deepEqual(SPECIAL_NPC_PROFILE_NAMES, ['gymmer', 'basketball'])
  SPECIAL_NPC_PROFILE_NAMES.forEach((id) => {
    assert.equal(Object.isFrozen(getSpecialNpcProfile(id)), true)
  })

  const gymmer = getSpecialNpcProfile('gymmer')
  const basketball = getSpecialNpcProfile('basketball')

  assert.equal(basketball.height, SPECIAL_NPC_CANONICAL_HEIGHT * 1.5)
  assert.equal(basketball.height / SPECIAL_NPC_CANONICAL_HEIGHT, 1.5)
  assert.ok(gymmer.bodyWidth > basketball.bodyWidth)
  assert.ok(gymmer.limbBulk > basketball.limbBulk)
  assert.throws(() => getSpecialNpcProfile('missing'), RangeError)
})

test('special procedural NPCs paste their supplied face texture onto one transparent plane', async () => {
  for (const profileId of SPECIAL_NPC_PROFILE_NAMES) {
    const texture = faceTexture()
    const requestedProfiles = []
    const { actor, faceLoaded } = await createActor(profileId, {
      faceLoader: async (requestedProfileId) => {
        requestedProfiles.push(requestedProfileId)
        return texture
      },
    })

    assert.equal(faceLoaded, true)
    assert.deepEqual(requestedProfiles, [profileId])
    assert.equal(actor.ready, true)
    assert.equal(actor.disabled, false)
    assert.equal(actor.group.visible, true)

    assert.equal(actor.faceCard?.name, 'Special.FaceCard')
    assert.equal(actor.faceCard?.parent, actor.headRig)
    assert.equal(actor.faceCard?.geometry?.type, 'PlaneGeometry')
    assert.equal(actor.faceCard?.material?.isMeshBasicMaterial, true)
    assert.equal(actor.faceCard?.material?.transparent, true)
    assert.ok(actor.faceCard.material.alphaTest > 0)
    assert.equal(actor.faceCard.material.toneMapped, false)
    assert.equal(actor.faceCard.material.map, texture)
    assert.equal(actor.faceCard.visible, true)
    assert.equal(actor.fallbackFace.visible, false)
    assert.equal(actor.headRoot, actor.headRig)
    assert.equal(actor.headMesh.name, 'Special.HeadBacking')

    const profile = getSpecialNpcProfile(profileId)
    assert.equal(actor.faceCard.scale.x, profile.faceWidth)
    assert.equal(actor.faceCard.scale.y, profile.faceHeight)
    assert.equal(actor.faceCard.position.y, profile.faceCenterY - 1.53)
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace)
    assert.equal(texture.generateMipmaps, false)
    assert.equal(texture.minFilter, THREE.LinearFilter)
    assert.equal(texture.magFilter, THREE.LinearFilter)

    const faceCards = []
    actor.group.traverse((object) => {
      if (object.name === 'Special.FaceCard') faceCards.push(object)
      assert.notEqual(object.isSprite, true, `${profileId} must not use a face sprite`)
    })
    assert.equal(faceCards.length, 1)

    actor.dispose()
  }
})

test('missing or failed face textures keep the low-poly fallback face usable', async () => {
  const cases = [
    { name: 'no texture', faceLoader: async () => null },
    { name: 'load failure', faceLoader: async () => { throw new Error('missing') } },
  ]

  for (const entry of cases) {
    const { actor, faceLoaded } = await createActor('gymmer', {
      faceLoader: entry.faceLoader,
      dialogueLines: null,
    })

    assert.equal(faceLoaded, false, entry.name)
    assert.equal(actor.ready, true, entry.name)
    assert.equal(actor.group.visible, true, entry.name)
    assert.equal(actor.faceCard.visible, false, entry.name)
    assert.equal(actor.faceCard.material.map, null, entry.name)
    assert.equal(actor.fallbackFace.visible, true, entry.name)
    assert.ok(actor.group.getObjectByName('Special.FallbackEye.L'), entry.name)
    assert.ok(actor.group.getObjectByName('Special.FallbackEye.R'), entry.name)
    assert.ok(actor.group.getObjectByName('Special.FallbackMouth'), entry.name)
    assert.equal(actor.getInteraction()?.target, actor, entry.name)

    actor.dispose()
  }
})

test('gymmer restores the shirtless bulky body, six-pack, shorts and fixed flex pose', async () => {
  const { actor } = await createActor('gymmer', {
    faceLoader: async () => faceTexture(),
  })

  assert.equal(actor.torso.material, actor.materials.skin)
  assert.deepEqual(meshNames(actor.group, 'Special.Gym.Chest.').sort(), [
    'Special.Gym.Chest.L',
    'Special.Gym.Chest.R',
  ])
  assert.deepEqual(meshNames(actor.group, 'Special.Gym.Abs.').sort(), [
    'Special.Gym.Abs.1',
    'Special.Gym.Abs.2',
    'Special.Gym.Abs.3',
    'Special.Gym.Abs.4',
    'Special.Gym.Abs.5',
    'Special.Gym.Abs.6',
  ])
  assert.deepEqual(meshNames(actor.group, 'Special.Outfit.Shorts.').sort(), [
    'Special.Outfit.Shorts.L',
    'Special.Outfit.Shorts.R',
  ])
  assert.ok(actor.leftArm.rotation.z < -1.5)
  assert.ok(actor.rightArm.rotation.z > 1.5)
  assert.ok(actor.leftElbow.rotation.z < -1.2)
  assert.ok(actor.rightElbow.rotation.z > 1.2)

  actor.dispose()
})

test('basketball restores the tall dark outfit, Elite backpack, ball and basketball shoes', async () => {
  const { actor } = await createActor('basketball', {
    faceLoader: async () => faceTexture(),
  })

  assert.equal(actor.bodyScale, 1.5)
  assert.equal(actor.visual.scale.x, 1.5)
  assert.equal(actor.visual.scale.y, 1.5)
  assert.equal(actor.visual.scale.z, 1.5)
  assert.equal(actor.torso.material, actor.materials.black)
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.Elite'))
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.Body'))
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.EliteBadge'))
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.Strap.L'))
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.Strap.R'))
  assert.equal(actor.ball?.name, 'Special.Accessory.Ball')
  assert.ok(actor.group.getObjectByName('Special.Accessory.Ball.Surface'))
  assert.equal(meshNames(actor.ball, 'Special.Accessory.Ball.Seam.').length, 3)
  assert.ok(actor.group.getObjectByName('Special.ShoeSole.L'))
  assert.ok(actor.group.getObjectByName('Special.ShoeSole.R'))
  assert.ok(actor.group.getObjectByName('Special.ShoeCuff.L'))
  assert.ok(actor.group.getObjectByName('Special.ShoeCuff.R'))

  actor.dispose()
})

test('setDebugLookFrozen prevents automatic player-facing rotation', async () => {
  const { actor } = await createActor('gymmer', {
    position: [0, 0, 0],
    rotationY: 0,
  })
  const playerPosition = new THREE.Vector3(2, 0, 0)

  assert.equal(typeof actor.setDebugLookFrozen, 'function')
  actor.setDebugLookFrozen(true)
  actor.update(0.05, playerPosition)
  assert.equal(actor.debugLookFrozen, true)
  assert.equal(actor.group.rotation.y, 0)

  actor.setDebugLookFrozen(false)
  actor.update(0.05, playerPosition)
  assert.equal(actor.debugLookFrozen, false)
  assert.ok(actor.group.rotation.y > 0)

  actor.dispose()
})

test('activation, dialogue, positioning and disposal keep the dynamic collider consistent', async () => {
  const parent = new THREE.Group()
  const colliders = []
  const { actor } = await createActor('gymmer', {
    parent,
    position: [2, 0, -3],
    colliders,
    dialogueLines: [{ text: 'Xin chào.' }],
  })

  assert.equal(parent.children.includes(actor.group), true)
  assert.equal(colliders.length, 1)
  assert.equal(actor.collider.dynamic, true)
  assert.equal(actor.collider.disabled, false)
  assert.equal(actor.collider.minX, 2 - actor.colliderRadius)
  assert.equal(actor.collider.maxX, 2 + actor.colliderRadius)
  assert.equal(actor.collider.minZ, -3 - actor.colliderDepth)
  assert.equal(actor.collider.maxZ, -3 + actor.colliderDepth)
  assert.equal(actor.getInteraction()?.target, actor)
  assert.deepEqual(actor.getFocusPoint(new THREE.Vector3()).toArray(), [
    2,
    actor.profile.height * actor.profile.focusRatio,
    -3,
  ])

  actor.setPosition(4, 0, 5)
  assert.equal(actor.collider.minX, 4 - actor.colliderRadius)
  assert.equal(actor.collider.maxZ, 5 + actor.colliderDepth)

  actor.setDialogueActive(true)
  assert.equal(actor.group.visible, false)
  assert.equal(actor.collider.disabled, true)
  assert.equal(actor.getInteraction(), null)
  actor.setDialogueActive(false)
  assert.equal(actor.group.visible, true)
  assert.equal(actor.collider.disabled, false)

  actor.deactivate()
  assert.equal(actor.group.visible, false)
  assert.equal(actor.collider.disabled, true)
  assert.ok(actor.collider.minX > 100000)
  actor.activate()
  assert.equal(actor.group.visible, true)
  assert.equal(actor.collider.disabled, false)

  actor.setDisabled(true)
  assert.equal(actor.group.visible, false)
  assert.equal(actor.collider.disabled, true)
  actor.setDisabled(false)
  assert.equal(actor.group.visible, true)

  actor.dispose()
  actor.dispose()
  assert.equal(actor.disposed, true)
  assert.equal(actor.ready, false)
  assert.equal(colliders.length, 0)
  assert.equal(parent.children.includes(actor.group), false)
})
