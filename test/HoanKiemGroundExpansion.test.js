import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PlayerCollision } from '../src/player/PlayerCollision.js'
import {
  createLakeCollisionRects,
  pointInLakeOutline,
} from '../src/world/HoanKiemGroundExpansion.js'
import { mapCoordinates } from '../src/world/map/MapCoordinateSystem.js'
import {
  HOAN_KIEM_EXPANDED_WORLD_BOUNDS,
  HOAN_KIEM_EXPANSION_PLAZAS,
  HOAN_KIEM_LAKE_OUTLINE,
  HOAN_KIEM_LOOP_TEST_POINTS,
} from '../src/world/map/hoanKiemExpansionLayout.js'

const OLD_AREA = 336 * 228

test('Hoàn Kiếm bounds expand to roughly 2–3 times the previous area', () => {
  const bounds = mapCoordinates.bounds('hoanKiem')
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  const ratio = width * depth / OLD_AREA

  assert.ok(Math.abs(bounds.minX - HOAN_KIEM_EXPANDED_WORLD_BOUNDS.minX) < 0.01)
  assert.ok(Math.abs(bounds.maxX - HOAN_KIEM_EXPANDED_WORLD_BOUNDS.maxX) < 0.01)
  assert.ok(Math.abs(bounds.minZ - HOAN_KIEM_EXPANDED_WORLD_BOUNDS.minZ) < 0.01)
  assert.ok(Math.abs(bounds.maxZ - HOAN_KIEM_EXPANDED_WORLD_BOUNDS.maxZ) < 0.01)
  assert.ok(ratio >= 2 && ratio <= 3)
})

test('the lake has an irregular outline and keeps the complete promenade loop dry', () => {
  assert.ok(HOAN_KIEM_LAKE_OUTLINE.length >= 12)
  const uniqueX = new Set(HOAN_KIEM_LAKE_OUTLINE.map(([x]) => x))
  const uniqueZ = new Set(HOAN_KIEM_LAKE_OUTLINE.map(([, z]) => z))
  assert.ok(uniqueX.size > 8)
  assert.ok(uniqueZ.size > 8)

  for (let index = 0; index < HOAN_KIEM_LOOP_TEST_POINTS.length; index += 1) {
    const start = HOAN_KIEM_LOOP_TEST_POINTS[index]
    const end = HOAN_KIEM_LOOP_TEST_POINTS[
      (index + 1) % HOAN_KIEM_LOOP_TEST_POINTS.length
    ]
    for (let step = 0; step <= 20; step += 1) {
      const amount = step / 20
      const point = {
        x: start[0] + (end[0] - start[0]) * amount,
        z: start[1] + (end[1] - start[1]) * amount,
      }
      const onPedestrianLink = HOAN_KIEM_EXPANSION_PLAZAS.some((plaza) => (
        plaza.kind === 'sidewalk'
        && point.x >= plaza.x - plaza.width / 2
        && point.x <= plaza.x + plaza.width / 2
        && point.z >= plaza.z - plaza.depth / 2
        && point.z <= plaza.z + plaza.depth / 2
      ))
      assert.equal(pointInLakeOutline(point) && !onPedestrianLink, false)
    }
  }
})

test('natural lake collision blocks water while preserving old bridge and viewpoint paths', () => {
  const colliders = createLakeCollisionRects()
  const collision = new PlayerCollision({
    colliders,
    bounds: mapCoordinates.bounds('hoanKiem'),
    radius: 0.36,
  })

  const towerApproach = new THREE.Vector3(60, 0, 0)
  collision.move(towerApproach, new THREE.Vector3(55, 0, 0))
  const westWaterEdge = Math.min(...colliders
    .filter((collider) => collider.minZ <= 0 && collider.maxZ >= 0)
    .map((collider) => collider.minX))
  assert.ok(
    towerApproach.x <= westWaterEdge - collision.radius + 0.01,
    'player must stop one player radius before the west lake edge',
  )

  for (const [x, z] of [
    [68, -3],
    [119, 39],
    [119, 50],
    [108, 92],
  ]) {
    const point = new THREE.Vector3(x, 0, z)
    const before = point.clone()
    collision.move(point, new THREE.Vector3(0, 0, 0))
    assert.ok(point.distanceTo(before) < 1e-9, `expected clear route at ${x},${z}`)
  }
})

test('player collision can follow the complete promenade loop without entering water', () => {
  const collision = new PlayerCollision({
    colliders: createLakeCollisionRects(),
    bounds: mapCoordinates.bounds('hoanKiem'),
    radius: 0.36,
  })
  const start = HOAN_KIEM_LOOP_TEST_POINTS[0]
  const position = new THREE.Vector3(start[0], 0, start[1])

  for (let index = 1; index <= HOAN_KIEM_LOOP_TEST_POINTS.length; index += 1) {
    const target = HOAN_KIEM_LOOP_TEST_POINTS[
      index % HOAN_KIEM_LOOP_TEST_POINTS.length
    ]
    collision.move(position, new THREE.Vector3(
      target[0] - position.x,
      0,
      target[1] - position.z,
    ))
    assert.ok(
      Math.hypot(target[0] - position.x, target[1] - position.z) < 0.01,
      `promenade segment ${index} is blocked by lake collision`,
    )
  }
})
