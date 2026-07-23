import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { SceneKit } from '../src/world/shared/SceneKit.js'
import { ChurchBuilding } from '../src/world/buildings/church/ChurchBuilding.js'
import {
  CHURCH_DIMENSIONS,
  CHURCH_EXTENTS,
  getNaveBayCenters,
} from '../src/world/buildings/church/ChurchDimensions.js'
import {
  circleIntersectsCollider,
  colliderContainsPoint,
  createChurchColliderSpecs,
} from '../src/world/buildings/church/ChurchColliders.js'

function installDocumentStub() {
  const previousDocument = globalThis.document
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
  }

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, 'canvas')
      return {
        width: 0,
        height: 0,
        getContext(contextType) {
          assert.equal(contextType, '2d')
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

function countTriangles(root) {
  let triangleCount = 0
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry) return
    const geometryTriangles = object.geometry.index
      ? object.geometry.index.count / 3
      : object.geometry.getAttribute('position').count / 3
    triangleCount += geometryTriangles * (object.isInstancedMesh ? object.count : 1)
  })
  return triangleCount
}

test('church dimensions use the documented real-world envelope', () => {
  assert.equal(CHURCH_DIMENSIONS.widthTotal, 20.5)
  assert.equal(CHURCH_DIMENSIONS.lengthTotal, 64.5)
  assert.equal(CHURCH_DIMENSIONS.towerHeight, 31.5)
  assert.ok(CHURCH_EXTENTS.depth > 50)
  assert.ok(CHURCH_DIMENSIONS.towerHeight > 25)
  assert.equal(getNaveBayCenters().length, 8)
})

test('church colliders leave spawn, return spawn, and the entrance portal open', () => {
  const colliders = createChurchColliderSpecs()
  const spawn = { x: 0, z: 6 }
  const returnSpawn = { x: 0, z: -9.7 }
  const portal = { x: 0, z: -12.65, radius: 2.5 }

  assert.equal(colliders.some((collider) => colliderContainsPoint(collider, spawn, 0.36)), false)
  assert.equal(
    colliders.some((collider) => colliderContainsPoint(collider, returnSpawn, 0.36)),
    false,
  )
  assert.equal(
    colliders.some((collider) => circleIntersectsCollider(collider, portal, 0.36)),
    false,
  )
})

test('steps remain walkable because no collider is assigned to them', () => {
  const colliders = createChurchColliderSpecs()
  assert.equal(colliders.some((collider) => collider.part === 'steps'), false)
})

test('stepped apse colliders cover the polygon shoulders without a broad rear wall', () => {
  const colliders = createChurchColliderSpecs()
  const wallSamples = [
    { x: -6.4, z: -76.6 },
    { x: 6.4, z: -76.6 },
    { x: -5.55, z: -77.8 },
    { x: 5.55, z: -77.8 },
    { x: -3.9, z: -79.1 },
    { x: 3.9, z: -79.1 },
  ]

  for (const point of wallSamples) {
    assert.equal(
      colliders.some((collider) => colliderContainsPoint(collider, point)),
      true,
      `apse wall sample is not covered at (${point.x}, ${point.z})`,
    )
  }
  assert.equal(
    colliders.some((collider) => colliderContainsPoint(collider, { x: 8, z: -79.1 })),
    false,
  )
})

test('procedural church assembles all required parts within geometry and collision budgets', (t) => {
  const restoreDocument = installDocumentStub()
  const kit = new SceneKit()
  const parent = new THREE.Group()
  const colliders = []
  const church = new ChurchBuilding({ kit, parent, colliders })

  t.after(() => {
    kit.dispose()
    restoreDocument()
  })

  parent.updateMatrixWorld(true)

  assert.ok(church.parts.facade?.isGroup, 'facade group is missing')
  assert.ok(church.parts.nave?.isGroup, 'nave group is missing')
  assert.ok(church.parts.roof?.isGroup, 'roof group is missing')
  assert.ok(church.parts.towers?.isGroup, 'tower group is missing')

  const towerGroups = church.parts.towers.children.filter((child) =>
    child.isGroup && child.userData.footprint,
  )
  assert.equal(towerGroups.length, 2)

  const bounds = new THREE.Box3().setFromObject(church.group)
  assert.ok(bounds.max.z - bounds.min.z > 50, 'church length must exceed 50 metres')
  assert.ok(bounds.max.y > 25, 'tower geometry must exceed 25 metres')

  let coneCount = 0
  church.group.traverse((object) => {
    if (object.geometry?.type === 'ConeGeometry') coneCount += 1
  })
  assert.equal(coneCount, 0, 'tower cones/spires are forbidden')
  assert.ok(countTriangles(church.group) < 250_000, 'church exceeds the triangle budget')

  assert.equal(colliders.length, 11)
  assert.equal(colliders.filter((collider) => collider.part === 'apse').length, 4)
  const spawn = { x: 0, z: 6 }
  const returnSpawn = { x: 0, z: -9.7 }
  const portal = { x: 0, z: -12.65, radius: 2.5 }
  assert.equal(colliders.some((collider) => colliderContainsPoint(collider, spawn, 0.36)), false)
  assert.equal(
    colliders.some((collider) => colliderContainsPoint(collider, returnSpawn, 0.36)),
    false,
  )
  assert.equal(
    colliders.some((collider) => circleIntersectsCollider(collider, portal, 0.36)),
    false,
  )
})
