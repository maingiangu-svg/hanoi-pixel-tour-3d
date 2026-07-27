import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createChurchCinematicPoint } from '../src/cinematics/churchCinematic.js'
import {
  colliderContainsPoint,
  createChurchColliderSpecs,
} from '../src/world/buildings/church/ChurchColliders.js'

test('church cinematic is a replayable interaction with a 12–18 second authored timeline', () => {
  const point = createChurchCinematicPoint()
  const timeline = point.createTimeline({
    playerPose: {
      position: new THREE.Vector3(0, 1.68, 6),
      quaternion: new THREE.Quaternion(),
      fov: 68,
    },
  })

  assert.equal(point.triggerType, 'interaction')
  assert.equal(point.promptText, 'Xem giới thiệu')
  assert.equal(point.replayable, true)
  assert.ok(timeline.duration >= 12)
  assert.ok(timeline.duration <= 18)
  assert.deepEqual(
    timeline.shots.map((shot) => shot.cameraPath.type),
    ['pan', 'dolly-in', 'crane', 'orbit', 'dolly-out'],
  )
  assert.equal(timeline.shots[3].timeScale, 0.48)
  assert.equal(timeline.shots[3].audioCue, 'church-climax')
})

test('the complete church camera path stays outside church wall colliders', () => {
  const point = createChurchCinematicPoint()
  const timeline = point.createTimeline({
    playerPose: {
      position: new THREE.Vector3(0, 1.68, 6),
      quaternion: new THREE.Quaternion(),
      fov: 68,
    },
  })
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 150)
  const colliders = createChurchColliderSpecs()
  timeline.start(camera)

  for (let frame = 0; frame < Math.ceil(timeline.duration * 60) + 2; frame += 1) {
    timeline.update(1 / 60, camera)
    assert.equal(
      colliders.some((collider) => colliderContainsPoint(collider, camera.position, 0.1)),
      false,
      `camera entered a church collider at frame ${frame}`,
    )
  }
  assert.equal(timeline.isComplete, true)
})
