import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PhotoSceneAnalyzer } from '../src/photo/PhotoSceneAnalyzer.js'

function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 120)
  camera.position.set(0, 1.6, 0)
  camera.lookAt(0, 1, -6)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

function createPerson(id = 'subject', x = 0) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.8, 0.4),
    new THREE.MeshBasicMaterial(),
  )
  object.name = id
  object.position.set(x, 0.9, -6)
  object.updateMatrixWorld(true)
  return {
    candidate: { id, name: id, kind: 'person', object },
    visible: {
      id,
      name: id,
      kind: 'person',
      frame: {
        center: { x: 0.5 + x * 0.05, y: 0.5 },
        bounds: { minX: 0.42, minY: 0.18, maxX: 0.58, maxY: 0.82 },
        widthRatio: 0.16,
        heightRatio: 0.64,
        coverage: 0.1024,
        edgeMargin: 0.18,
        distance: 6,
      },
    },
  }
}

function createObstacle({ height, y, width = 1.2, name }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.35),
    new THREE.MeshBasicMaterial(),
  )
  mesh.name = name
  mesh.position.set(0, y, -3)
  mesh.updateMatrixWorld(true)
  return mesh
}

function analyzeWithObstacle(obstacle = null, subjects = [createPerson()]) {
  const camera = createCamera()
  const root = new THREE.Group()
  if (obstacle) root.add(obstacle)
  root.updateMatrixWorld(true)
  const analyzer = new PhotoSceneAnalyzer({
    camera,
    world: {
      getPhotoOccluderRoots: () => [root],
      getPhotoCompositionContext: () => null,
    },
  })
  return analyzer.analyze({
    subjectCandidates: subjects.map(({ candidate }) => candidate),
    subjects: subjects.map(({ visible }) => visible),
    landmarkCandidates: [],
    landmarks: [],
  })
}

test('an unobstructed subject keeps all representative rays clear', () => {
  const result = analyzeWithObstacle()
  const occlusion = result.subjects[0].occlusion

  assert.equal(occlusion.percentage, 0)
  assert.equal(occlusion.faceOccluded, false)
  assert.deepEqual(occlusion.samples, {
    head: false,
    body: false,
    center: false,
  })
})

test('a tree-like foreground obstacle can cover only part of the subject', () => {
  const branch = createObstacle({
    name: 'Cành cây tiền cảnh',
    height: 0.15,
    y: 1.17,
  })
  const result = analyzeWithObstacle(branch)
  const occlusion = result.subjects[0].occlusion

  assert.ok(occlusion.percentage > 0)
  assert.ok(occlusion.percentage < 1)
  assert.equal(occlusion.faceOccluded, false)
})

test('a wall between camera and subject blocks most representative rays', () => {
  const wall = createObstacle({
    name: 'Tường chắn',
    height: 2.5,
    y: 1.25,
    width: 2,
  })
  const result = analyzeWithObstacle(wall)
  const occlusion = result.subjects[0].occlusion

  assert.ok(occlusion.percentage >= 2 / 3)
  assert.equal(occlusion.faceOccluded, true)
})

test('multiple NPCs are analyzed independently without treating their own mesh as an obstacle', () => {
  const left = createPerson('left', -0.8)
  const right = createPerson('right', 0.8)
  const result = analyzeWithObstacle(null, [left, right])

  assert.equal(result.subjects.length, 2)
  assert.ok(result.subjects.every((subject) => subject.occlusion.percentage === 0))
})
