import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  CinematicTimeline,
  applyCinematicEasing,
} from '../src/cinematics/CinematicTimeline.js'

test('cinematic easing clamps values and supports smooth named curves', () => {
  assert.equal(applyCinematicEasing('linear', -1), 0)
  assert.equal(applyCinematicEasing('linear', 2), 1)
  assert.ok(applyCinematicEasing('easeInOut', 0.25) < 0.25)
  assert.ok(applyCinematicEasing('easeOut', 0.5) > 0.5)
})

test('timeline moves through multiple shots and finishes on the exact final pose', () => {
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 150)
  const timeline = new CinematicTimeline({
    shots: [
      {
        position: { x: 0, y: 3, z: 12 },
        target: { x: 0, y: 4, z: 0 },
        duration: 0.1,
        holdTime: 0.1,
        fov: 55,
      },
      {
        position: { x: 4, y: 2, z: 5 },
        target: { x: 0, y: 2, z: 0 },
        duration: 0.2,
        holdTime: 0.1,
        fov: 48,
      },
    ],
  })

  timeline.start(camera)
  assert.deepEqual(camera.position.toArray(), [0, 3, 12])

  for (let index = 0; index < 10; index += 1) timeline.update(0.05, camera)

  assert.equal(timeline.isComplete, true)
  assert.equal(timeline.progress, 1)
  assert.ok(camera.position.distanceTo(new THREE.Vector3(4, 2, 5)) < 1e-8)
  assert.equal(camera.fov, 48)
})

test('timeline rejects an empty shot list', () => {
  assert.throws(
    () => new CinematicTimeline({ shots: [] }),
    /at least one shot/,
  )
})

test('orbit, crane and dolly paths remain smooth and expose bounded slow motion', () => {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 150)
  const timeline = new CinematicTimeline({
    shots: [
      {
        position: { x: -5, y: 3, z: 5 },
        target: { x: 0, y: 2, z: 0 },
        duration: 0.1,
        holdTime: 0,
        fov: 55,
        cameraPath: { type: 'crane' },
      },
      {
        position: { x: 5, y: 4, z: 5 },
        target: { x: 0, y: 2, z: 0 },
        duration: 1,
        holdTime: 0.2,
        fov: 50,
        cameraPath: {
          type: 'orbit',
          center: { x: 0, y: 0, z: 0 },
          radius: Math.sqrt(50),
          startAngle: -45,
          endAngle: 45,
          startHeight: 3,
          endHeight: 4,
        },
        timeScale: 0.45,
        slowMotionStart: 0.2,
        slowMotionDuration: 0.7,
      },
    ],
  })
  timeline.start(camera)
  timeline.update(0.1, camera)
  for (let index = 0; index < 8; index += 1) timeline.update(0.05, camera)

  assert.equal(timeline.currentShot.cameraPath.type, 'orbit')
  assert.ok(timeline.simulationTimeScale >= 0.45)
  assert.ok(timeline.simulationTimeScale < 1)
  assert.ok(Number.isFinite(camera.position.x))
  assert.ok(Number.isFinite(camera.quaternion.w))
})
