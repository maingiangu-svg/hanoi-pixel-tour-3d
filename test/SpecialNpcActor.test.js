import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { SpecialNpcActor } from '../src/npcs/SpecialNpcActor.js'
import {
  getSpecialNpcProfile,
  SPECIAL_NPC_PROFILE_NAMES,
} from '../src/npcs/specialNpcProfiles.js'

const GROUND_TOLERANCE = 0.025

function faceTexture(width = 256, height = 256) {
  const texture = new THREE.Texture()
  texture.image = { width, height }
  return texture
}

async function createActor(profile, options = {}) {
  const actor = new SpecialNpcActor({ profile, ...options })
  await actor.readyPromise
  actor.group.updateMatrixWorld(true)
  return actor
}

function boundsOf(object) {
  object.updateWorldMatrix(true, true)
  return new THREE.Box3().setFromObject(object)
}

function visibleMeshes(root) {
  const meshes = []
  root.traverse((object) => {
    if (!object.isMesh) return
    let visible = object.visible
    for (let parent = object.parent; parent; parent = parent.parent) {
      visible &&= parent.visible
    }
    if (visible) meshes.push(object)
  })
  return meshes
}

function triangleCount(meshes) {
  return meshes.reduce((total, mesh) => {
    const geometry = mesh.geometry
    const indexCount = geometry.index?.count ?? geometry.attributes.position.count
    return total + indexCount / 3
  }, 0)
}

function assertProceduralHead(actor) {
  assert.equal(actor.headRoot?.name, 'Special.HeadRoot')
  assert.equal(actor.headMesh?.name, 'Special.HeadMesh')
  assert.equal(actor.headMesh?.isMesh, true)
  assert.ok(actor.faceDetails?.isGroup)
  assert.ok(actor.hairGroup?.isGroup)
  assert.ok(actor.glassesGroup?.isGroup)
  assert.equal(actor.group.getObjectByName('Special.FaceCard'), undefined)

  actor.headRoot.traverse((object) => {
    assert.notEqual(object.isSprite, true, `${object.name || 'head child'} must not be a Sprite`)
    if (object.isMesh) {
      assert.notEqual(
        object.geometry?.type,
        'PlaneGeometry',
        `${object.name || 'head mesh'} must not use a face plane`,
      )
    }
  })
}

function assertGroundedAndProportional(actor) {
  const actorBounds = boundsOf(actor.visual)
  const height = actorBounds.max.y - actorBounds.min.y
  assert.ok(
    Math.abs(actorBounds.min.y - actor.position.y) <= GROUND_TOLERANCE,
    `${actor.profile.id} feet are not grounded`,
  )
  assert.ok(
    Math.abs(height - actor.profile.height) <= 0.035,
    `${actor.profile.id} visual height must match its profile`,
  )

  const headBounds = boundsOf(actor.headMesh)
  const headRatio = (headBounds.max.y - headBounds.min.y) / height
  assert.ok(
    headRatio >= 0.2295 && headRatio <= 0.28,
    `${actor.profile.id} head proportion ${headRatio.toFixed(3)} is outside the rounded 23-28% range`,
  )
}

function headLocalBounds(actor, object) {
  object.geometry.computeBoundingBox()
  actor.headRoot.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  const relativeMatrix = actor.headRoot.matrixWorld
    .clone()
    .invert()
    .multiply(object.matrixWorld)
  return object.geometry.boundingBox.clone().applyMatrix4(relativeMatrix)
}

test('special profiles are immutable and character B is only 8-12% taller than A', () => {
  assert.deepEqual(SPECIAL_NPC_PROFILE_NAMES, ['gymmer', 'basketball', 'mo'])
  SPECIAL_NPC_PROFILE_NAMES.forEach((id) => {
    assert.equal(Object.isFrozen(getSpecialNpcProfile(id)), true)
  })

  const characterA = getSpecialNpcProfile('gymmer')
  const characterB = getSpecialNpcProfile('basketball')
  const heightRatio = characterB.height / characterA.height
  assert.ok(heightRatio >= 1.08 && heightRatio <= 1.12)
  assert.ok(characterA.bodyWidth > getSpecialNpcProfile('mo').bodyWidth)
  assert.ok(characterA.limbBulk > getSpecialNpcProfile('mo').limbBulk)
  assert.throws(() => getSpecialNpcProfile('missing'), RangeError)
})

test('all special NPCs use a grounded procedural 3D head without a face card', async () => {
  for (const profile of SPECIAL_NPC_PROFILE_NAMES) {
    const actor = await createActor(profile)

    assert.equal(actor.ready, true)
    assert.equal(actor.disabled, false)
    assert.equal(actor.group.visible, true)
    assertProceduralHead(actor)
    assertGroundedAndProportional(actor)
    assert.ok(
      actor.headMesh.material?.isMeshLambertMaterial ||
        actor.headMesh.material?.isMeshStandardMaterial ||
        actor.headMesh.material?.isMeshPhongMaterial,
      `${profile} default head material must react to scene lighting`,
    )
    assert.equal(actor.headMesh.material.map ?? null, null)

    actor.dispose()
  }
})

test('all special NPC shoulder spans stay between 1.35 and 1.6 actual head-mesh widths', async () => {
  for (const profile of SPECIAL_NPC_PROFILE_NAMES) {
    const actor = await createActor(profile)
    const leftShoulder = actor.leftArm.getWorldPosition(new THREE.Vector3())
    const rightShoulder = actor.rightArm.getWorldPosition(new THREE.Vector3())
    const shoulderSpan = leftShoulder.distanceTo(rightShoulder)
    const headBounds = boundsOf(actor.headMesh)
    const actualHeadWidth = headBounds.max.x - headBounds.min.x
    const shoulderToHeadRatio = shoulderSpan / actualHeadWidth

    assert.ok(
      shoulderToHeadRatio >= 1.35 && shoulderToHeadRatio <= 1.6,
      `${profile} shoulder/head width ratio ${shoulderToHeadRatio.toFixed(3)} is outside 1.35-1.6`,
    )

    actor.dispose()
  }
})

test('procedural face geometry exists only on the front half of each 3D head', async () => {
  for (const profile of SPECIAL_NPC_PROFILE_NAMES) {
    const actor = await createActor(profile)
    const faceMeshes = []

    assert.equal(actor.faceDetails.parent, actor.headRoot)
    actor.headRoot.traverse((object) => {
      assert.notEqual(object.isSprite, true, `${profile} head must not contain a Sprite`)
      if (object.isMesh) {
        assert.notEqual(
          object.geometry?.type,
          'PlaneGeometry',
          `${profile} head must not contain PlaneGeometry`,
        )
      }
      if (object.isMesh && object.name.startsWith('Special.Face.')) {
        faceMeshes.push(object)
      }
    })

    assert.ok(faceMeshes.length > 0, `${profile} must contain procedural face meshes`)
    for (const mesh of faceMeshes) {
      const bounds = headLocalBounds(actor, mesh)
      assert.ok(
        bounds.min.z > 0,
        `${profile} ${mesh.name} crosses onto the side/back half of the head`,
      )
    }

    actor.dispose()
  }
})

test('optional wrapped-face mode reuses the same lit head mesh', async () => {
  const texture = faceTexture()
  let resolveTexture
  const pendingTexture = new Promise((resolve) => {
    resolveTexture = resolve
  })
  const actor = new SpecialNpcActor({
    profile: 'gymmer',
    faceMode: 'wrappedTexture',
    faceLoader: () => pendingTexture,
  })
  const headMesh = actor.headMesh

  resolveTexture(texture)
  await actor.readyPromise

  assert.equal(actor.headMesh, headMesh)
  assert.equal(actor.headMesh.material.map, texture)
  assert.equal(actor.headMesh.material.transparent, false)
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace)
  assert.ok(actor.headMesh.material.userData.faceProjection.radiusX <= 0.25)
  const shader = {
    vertexShader: '#include <common>\n#include <beginnormal_vertex>',
    fragmentShader: '#include <common>\n#include <map_fragment>',
  }
  actor.headMesh.material.onBeforeCompile(shader)
  assert.match(shader.vertexShader, /vSpecialObjectNormal/)
  assert.match(shader.fragmentShader, /frontHemisphereMask/)
  assert.match(shader.fragmentShader, /vSpecialObjectNormal\.z/)
  assertProceduralHead(actor)
  actor.dispose()
})

test('wrapped-face textures larger than 512px fall back to the procedural face', async () => {
  for (const [width, height] of [[513, 512], [512, 513]]) {
    const texture = faceTexture(width, height)
    const actor = new SpecialNpcActor({
      profile: 'gymmer',
      faceMode: 'wrappedTexture',
      faceLoader: async () => texture,
    })
    const wrapped = await actor.readyPromise

    assert.equal(wrapped, false)
    assert.equal(actor.ready, true)
    assert.equal(actor.headMesh.material.map ?? null, null)
    assert.equal(actor.faceDetails.visible, true)
    assertProceduralHead(actor)

    actor.dispose()
  }
})

test('character A uses a wine shirt and only raises his arms during the celebration beat', async () => {
  const actor = await createActor('gymmer')

  assert.equal(
    actor.torso.material.color.getHex(),
    getSpecialNpcProfile('gymmer').outfit.top.color,
  )
  assert.ok(actor.group.getObjectByName('Special.Face.Teeth'))
  assert.ok(actor.group.getObjectByName('Special.Glasses.Frame.L'))
  assert.ok(Math.abs(actor.leftArm.rotation.z) < 0.2)
  assert.ok(Math.abs(actor.rightArm.rotation.z) < 0.2)

  actor.elapsed = 6.2
  actor.update(0.01)
  assert.ok(actor.leftArm.rotation.z < -1.3)
  assert.ok(actor.rightArm.rotation.z > 1.3)
  actor.elapsed = 8
  actor.update(0.01)
  assert.ok(Math.abs(actor.leftArm.rotation.z) < 0.2)
  assert.ok(Math.abs(actor.rightArm.rotation.z) < 0.2)
  assert.ok(actor.colliderRadius > getSpecialNpcProfile('mo').colliderRadius)

  actor.dispose()
})

test('basketball ball follows a hand anchor and walking can be toggled explicitly', async () => {
  const actor = await createActor('basketball')

  assert.ok(actor.leftHandAnchor?.isObject3D)
  assert.ok(actor.rightHandAnchor?.isObject3D)
  assert.ok(actor.ball?.isObject3D)
  assert.ok(
    actor.ball.parent === actor.leftHandAnchor || actor.ball.parent === actor.rightHandAnchor,
    'basketball must be parented to one of the animated hand anchors',
  )
  assert.ok(actor.group.getObjectByName('Special.Accessory.Backpack.Elite'))
  assert.ok(actor.group.getObjectByName('Special.ShoeSole.L'))

  assert.equal(typeof actor.setWalking, 'function')
  actor.setWalking(true)
  assert.equal(actor.walking, true)
  actor.update(0.05)
  actor.setWalking(false)
  assert.equal(actor.walking, false)

  actor.dispose()
})

test('Mơ exposes a real head hierarchy, hair, glasses, camisole and shorts', async () => {
  const actor = await createActor('mo', {
    name: 'Mơ visual',
    dialogueLines: null,
    dialoguePortrait: true,
  })

  assertProceduralHead(actor)
  assert.equal(actor.hairGroup.parent, actor.headRoot)
  assert.equal(actor.glassesGroup.parent, actor.headRoot)
  assert.ok(actor.group.getObjectByName('Special.Outfit.Top'))
  assert.ok(actor.group.getObjectByName('Special.Outfit.Strap.L'))
  assert.ok(actor.group.getObjectByName('Special.Outfit.Strap.R'))
  assert.ok(actor.group.getObjectByName('Special.Outfit.Shorts.L'))
  assert.ok(actor.group.getObjectByName('Special.Outfit.Shorts.R'))
  assert.equal(actor.getInteraction()?.target, actor)

  actor.dispose()
})

test('glasses use their configured opacity on lit materials', async () => {
  for (const profileId of SPECIAL_NPC_PROFILE_NAMES) {
    const actor = await createActor(profileId)
    const lens = actor.group.getObjectByName('Special.Glasses.Lens.L')
    const expectedOpacity = getSpecialNpcProfile(profileId).glasses.lensOpacity

    assert.ok(lens.material.isMeshStandardMaterial)
    assert.equal(lens.material.toneMapped, true)
    assert.equal(lens.material.transparent, expectedOpacity < 1)
    assert.equal(lens.material.opacity, expectedOpacity)

    actor.dispose()
  }
})

test('outfit variants swap prewarmed shared materials without rebuilding geometry', async () => {
  const actor = await createActor('mo')
  const torsoGeometry = actor.torso.geometry
  const idleTorsoMaterial = actor.torso.material
  const materialCount = actor.resources.materials.size

  assert.equal(actor.setOutfit('church'), true)
  assert.equal(actor.currentOutfit, 'church')
  assert.equal(actor.torso.geometry, torsoGeometry)
  assert.notEqual(actor.torso.material, idleTorsoMaterial)
  assert.equal(
    actor.torso.material.color.getHex(),
    getSpecialNpcProfile('mo').outfitVariants.church.top.color,
  )
  assert.equal(actor.resources.materials.size, materialCount)

  assert.equal(actor.setOutfit('idle'), true)
  assert.equal(actor.torso.material, idleTorsoMaterial)
  assert.equal(actor.resources.materials.size, materialCount)
  assert.equal(actor.setOutfit('missing'), false)

  actor.dispose()
})

test('walking uses knee and shoe lift pivots, then restores their idle offsets', async () => {
  const actor = await createActor('mo')
  const walk = actor.profile.animation.walk
  const idleKneeX = actor.basePose.rightKnee.x
  const idleShoeY = actor.basePose.rightShoePosition.y

  actor.elapsed = Math.PI / (2 * walk.strideSpeed)
  actor.setWalking(true)
  actor.update(0)
  assert.ok(actor.rightKnee.rotation.x > idleKneeX + walk.kneeBend * 0.9)
  assert.ok(actor.rightShoe.position.y > idleShoeY + walk.footLift * 0.9)

  actor.setWalking(false)
  for (let index = 0; index < 60; index += 1) actor.update(0.05)
  assert.ok(Math.abs(actor.rightKnee.rotation.x - idleKneeX) < 0.001)
  assert.ok(Math.abs(actor.rightShoe.position.y - idleShoeY) < 0.001)

  actor.dispose()
})

test('special actors share primitive geometry and stay inside a render budget', async () => {
  const first = await createActor('gymmer')
  const second = await createActor('gymmer')

  assert.equal(first.headMesh.geometry, second.headMesh.geometry)
  let sharedHeadDisposed = 0
  second.headMesh.geometry.addEventListener('dispose', () => {
    sharedHeadDisposed += 1
  })

  for (const actor of [first, second]) {
    const meshes = visibleMeshes(actor.group)
    assert.ok(meshes.length <= 60, `${actor.profile.id} exceeds the 60-mesh budget`)
    assert.ok(triangleCount(meshes) <= 2500, `${actor.profile.id} exceeds the triangle budget`)
    assert.ok(
      meshes.filter((mesh) => mesh.castShadow).length <= 8,
      `${actor.profile.id} has too many shadow-casting submeshes`,
    )
  }

  first.dispose()
  assert.equal(sharedHeadDisposed, 0, 'disposing one actor must not invalidate shared geometry')
  assert.equal(second.headMesh.geometry, first.headMesh.geometry)
  second.dispose()
})

test('activation, dialogue and disposal keep the dynamic collider consistent', async () => {
  const colliders = []
  const actor = await createActor('gymmer', {
    position: [2, 0, -3],
    colliders,
    dialogueLines: [{ text: 'Xin chào.' }],
  })

  assert.equal(colliders.length, 1)
  assert.equal(actor.collider.disabled, false)
  assert.equal(actor.getInteraction()?.target, actor)
  assert.deepEqual(actor.getFocusPoint(new THREE.Vector3()).toArray(), [
    2,
    actor.profile.height * actor.profile.focusRatio,
    -3,
  ])

  actor.setDialogueActive(true)
  assert.equal(actor.group.visible, false)
  assert.equal(actor.collider.disabled, true)
  actor.setDialogueActive(false)
  assert.equal(actor.group.visible, true)
  actor.deactivate()
  assert.equal(actor.collider.disabled, true)
  assert.ok(actor.collider.minX > 100000)
  actor.activate()
  assert.equal(actor.collider.disabled, false)

  actor.dispose()
  actor.dispose()
  assert.equal(colliders.length, 0)
})
