import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPhotoCompositionColliderSpecs,
} from '../src/world/HoanKiemPhotoCompositions.js'
import { pointInLakeOutline } from '../src/world/HoanKiemGroundExpansion.js'
import {
  HOAN_KIEM_PHOTO_COMPOSITION_TREES,
  HOAN_KIEM_PHOTO_HANGING_SIGNS,
  HOAN_KIEM_PHOTO_PUDDLES,
  HOAN_KIEM_PHOTO_REFLECTION_STRIPS,
  HOAN_KIEM_PHOTO_VIEWPOINTS,
} from '../src/world/map/hoanKiemPhotoViewpoints.js'

const REQUIRED_VIEWPOINT_IDS = [
  'church-street-reveal',
  'turtle-tower-tree-aisle',
  'the-huc-through-foliage',
  'lakeside-pedestrian-depth',
  'old-quarter-sunset-corridor',
  'turtle-tower-reflection',
  'old-quarter-puddle-reflection',
  'cafe-street-frame',
  'old-quarter-layered-signs',
  'ngoc-son-bridge-entrance',
]

test('Hoan Kiem photo viewpoints cover the ten requested compositions with complete metadata', () => {
  assert.deepEqual(
    HOAN_KIEM_PHOTO_VIEWPOINTS.map((viewpoint) => viewpoint.id),
    REQUIRED_VIEWPOINT_IDS,
  )

  const ids = new Set()
  for (const viewpoint of HOAN_KIEM_PHOTO_VIEWPOINTS) {
    assert.equal(ids.has(viewpoint.id), false)
    ids.add(viewpoint.id)
    assert.equal(viewpoint.position.length, 3)
    assert.equal(viewpoint.facing.length, 2)
    assert.equal(viewpoint.target.length, 3)
    assert.ok(viewpoint.position.every(Number.isFinite))
    assert.ok(viewpoint.facing.every(Number.isFinite))
    assert.ok(viewpoint.target.every(Number.isFinite))
    assert.ok(Math.abs(Math.hypot(...viewpoint.facing) - 1) < 1e-9)
    assert.ok(viewpoint.recommendedFov >= 38 && viewpoint.recommendedFov <= 58)
    assert.ok(viewpoint.standingRadius >= 0.65)
    assert.ok(viewpoint.timeOfDay.recommendedMinutes >= 0)
    assert.ok(viewpoint.timeOfDay.recommendedMinutes < 24 * 60)
    assert.equal(viewpoint.timeOfDay.window.length, 2)
    assert.equal(typeof viewpoint.landmarkId, 'string')
    assert.ok(viewpoint.layers.foreground.length > 0)
    assert.ok(viewpoint.layers.midground.length > 0)
    assert.ok(viewpoint.layers.background.length > 0)
    assert.equal('activate' in viewpoint, false)
    assert.equal('interaction' in viewpoint, false)

    const expectedFacing = normalize([
      viewpoint.target[0] - viewpoint.position[0],
      viewpoint.target[2] - viewpoint.position[2],
    ])
    assert.ok(Math.abs(expectedFacing[0] - viewpoint.facing[0]) < 1e-9)
    assert.ok(Math.abs(expectedFacing[1] - viewpoint.facing[1]) < 1e-9)
  }
})

test('photo composition props respect water placement and use only lightweight shared scene data', () => {
  assert.equal(HOAN_KIEM_PHOTO_COMPOSITION_TREES.length, 2)
  assert.equal(HOAN_KIEM_PHOTO_HANGING_SIGNS.length, 3)
  assert.ok(HOAN_KIEM_PHOTO_REFLECTION_STRIPS.length >= 4)
  assert.equal(HOAN_KIEM_PHOTO_PUDDLES.length, 2)

  for (const tree of HOAN_KIEM_PHOTO_COMPOSITION_TREES) {
    assert.equal(pointInLakeOutline({ x: tree.position[0], z: tree.position[1] }), false)
  }
  for (const reflection of HOAN_KIEM_PHOTO_REFLECTION_STRIPS) {
    assert.equal(
      pointInLakeOutline({ x: reflection.position[0], z: reflection.position[2] }),
      true,
    )
  }
  for (const puddle of HOAN_KIEM_PHOTO_PUDDLES) {
    assert.equal(
      pointInLakeOutline({ x: puddle.position[0], z: puddle.position[2] }),
      false,
    )
    assert.ok(puddle.size[1] <= 0.02)
  }
})

test('new composition colliders leave every viewpoint and primary sightline clear', () => {
  const colliders = createPhotoCompositionColliderSpecs()
  assert.equal(colliders.length, HOAN_KIEM_PHOTO_COMPOSITION_TREES.length)

  for (const viewpoint of HOAN_KIEM_PHOTO_VIEWPOINTS) {
    const [viewX, , viewZ] = viewpoint.position
    const [targetX, , targetZ] = viewpoint.target
    for (const collider of colliders) {
      const safetyRadius = Math.max(collider.width, collider.depth) / 2 + 0.55
      assert.ok(
        Math.hypot(collider.x - viewX, collider.z - viewZ)
          > viewpoint.standingRadius + safetyRadius,
        `${collider.sourceId} intrudes into ${viewpoint.id}`,
      )
      assert.ok(
        distanceToSegment(
          [collider.x, collider.z],
          [viewX, viewZ],
          [targetX, targetZ],
        ) > safetyRadius,
        `${collider.sourceId} blocks the sightline for ${viewpoint.id}`,
      )
    }
  }
})

function normalize(vector) {
  const length = Math.hypot(...vector) || 1
  return vector.map((component) => component / length)
}

function distanceToSegment(point, start, end) {
  const segmentX = end[0] - start[0]
  const segmentZ = end[1] - start[1]
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ
  const projection = lengthSquared === 0
    ? 0
    : (
        (point[0] - start[0]) * segmentX
        + (point[1] - start[1]) * segmentZ
      ) / lengthSquared
  const clamped = Math.max(0, Math.min(1, projection))
  const nearestX = start[0] + segmentX * clamped
  const nearestZ = start[1] + segmentZ * clamped
  return Math.hypot(point[0] - nearestX, point[1] - nearestZ)
}
