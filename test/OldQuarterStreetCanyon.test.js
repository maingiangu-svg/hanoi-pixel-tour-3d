import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { OldQuarterStreetCanyon } from '../src/world/OldQuarterStreetCanyon.js'
import {
  OLD_QUARTER_CANYON_BUILDINGS,
} from '../src/world/map/oldQuarterStreetCanyonLayout.js'
import { GradientSky } from '../src/world/sky/GradientSky.js'
import { SceneKit } from '../src/world/shared/SceneKit.js'

function installCanvasDocumentStub() {
  const previousDocument = globalThis.document
  const context = {
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
  }
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return context
        },
      }
    },
  }
  return () => {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

test('Old Quarter canyon closes one side with varied 3–7 storey facades', () => {
  const heights = OLD_QUARTER_CANYON_BUILDINGS.map((building) => building.height)
  const frontZ = OLD_QUARTER_CANYON_BUILDINGS[0].z
    + OLD_QUARTER_CANYON_BUILDINGS[0].depth / 2
  assert.equal(OLD_QUARTER_CANYON_BUILDINGS.length, 8)
  assert.ok(Math.min(...heights) <= 12.5)
  assert.ok(Math.max(...heights) >= 24)
  assert.ok(new Set(heights).size >= 7)
  assert.equal(frontZ, -91.5)
  assert.equal(Math.abs(frontZ - -82.5), 9)
})

test('canyon uses bounded shared meshes and keeps ambient lanes outside buildings', () => {
  const restoreDocument = installCanvasDocumentStub()
  try {
    const kit = new SceneKit()
    const parent = new THREE.Group()
    const colliders = []
    const canyon = new OldQuarterStreetCanyon({ kit, parent, colliders })

    assert.equal(colliders.length, OLD_QUARTER_CANYON_BUILDINGS.length)
    for (const z of [-84, -96, -109]) {
      assert.equal(colliders.some((collider) => (
        254 >= collider.minX
        && 254 <= collider.maxX
        && z >= collider.minZ
        && z <= collider.maxZ
      )), false)
    }
    let instancedMeshes = 0
    let pointLights = 0
    canyon.group.traverse((object) => {
      if (object.isInstancedMesh) instancedMeshes += 1
      if (object.isPointLight) pointLights += 1
    })
    assert.ok(instancedMeshes >= 14)
    assert.equal(pointLights, 0)

    canyon.updateVisibility(new THREE.Vector3(254, 0, -84), true)
    assert.equal(canyon.group.visible, true)
    canyon.updateVisibility(new THREE.Vector3(40, 0, 10), true)
    assert.equal(canyon.group.visible, false)

    canyon.dispose()
    kit.dispose()
  } finally {
    restoreDocument()
  }
})

test('gradient sky follows the player and blends top and horizon colors', () => {
  const parent = new THREE.Group()
  const sky = new GradientSky({ parent })
  const fromTop = new THREE.Color(0x91afc2)
  const toTop = new THREE.Color(0x53647b)
  const fromHorizon = new THREE.Color(0xa0b3be)
  const toHorizon = new THREE.Color(0x596a7d)

  sky.setTransition(fromTop, toTop, fromHorizon, toHorizon, 0.5)
  sky.updatePosition(new THREE.Vector3(254, 1.72, -84))

  assert.deepEqual(sky.mesh.position.toArray(), [254, 1.72, -84])
  assert.notDeepEqual(
    sky.material.uniforms.topColor.value.getHex(),
    sky.material.uniforms.horizonColor.value.getHex(),
  )
  assert.equal(parent.children.includes(sky.mesh), true)
  assert.equal(sky.mesh.frustumCulled, false)

  sky.dispose()
  assert.equal(parent.children.includes(sky.mesh), false)
})
