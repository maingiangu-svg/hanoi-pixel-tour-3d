import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { batchStaticMeshes } from '../src/world/shared/StaticMeshBatcher.js'

function triangleCount(root) {
  let triangles = 0
  root.traverse((object) => {
    if (!object.isMesh) return
    const geometry = object.geometry
    triangles += geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3
  })
  return triangles
}

test('static batching preserves geometry while reducing draw-bearing meshes', () => {
  const root = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 })
  const geometry = new THREE.BoxGeometry()
  for (let index = 0; index < 12; index += 1) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.x = index * 1.2
    mesh.castShadow = true
    root.add(mesh)
  }
  const beforeTriangles = triangleCount(root)

  const batches = batchStaticMeshes(root, { name: 'test batches' })

  assert.equal(batches.sourceMeshCount, 12)
  assert.equal(batches.batchCount, 1)
  assert.equal(triangleCount(root), beforeTriangles)
  assert.equal(root.getObjectsByProperty('isMesh', true).length, 1)
  batches.dispose()
  geometry.dispose()
  material.dispose()
})

test('distance-culls static cells with hysteresis without rebuilding batches', () => {
  const root = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: 0x777777 })
  const geometry = new THREE.BoxGeometry()
  for (const x of [0, 1, 40, 41]) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.x = x
    root.add(mesh)
  }

  const batches = batchStaticMeshes(root, {
    cellSize: 20,
    activationDistance: 10,
    activationHysteresis: 4,
  })
  batches.updateVisibility(new THREE.Vector3(0, 0, 0))
  const nearVisibility = batches.root.children.map((mesh) => mesh.visible)
  assert.deepEqual(nearVisibility, [true, false])

  batches.updateVisibility(new THREE.Vector3(30, 0, 0))
  batches.updateVisibility(new THREE.Vector3(27, 0, 0))
  const hysteresisVisibility = batches.root.children.map((mesh) => mesh.visible)
  assert.deepEqual(hysteresisVisibility, [false, true])
  assert.equal(batches.batchCount, 2)

  batches.dispose()
  geometry.dispose()
  material.dispose()
})

test('static batching preserves intentionally hidden composition groups', () => {
  const root = new THREE.Group()
  const hidden = new THREE.Group()
  hidden.visible = false
  root.add(hidden)
  const material = new THREE.MeshStandardMaterial()
  const geometry = new THREE.BoxGeometry()
  hidden.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  )

  const batches = batchStaticMeshes(root)
  assert.equal(batches.sourceMeshCount, 0)
  assert.equal(batches.batchCount, 0)
  assert.equal(hidden.children.length, 2)

  batches.dispose()
  geometry.dispose()
  material.dispose()
})
