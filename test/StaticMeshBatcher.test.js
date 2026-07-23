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
