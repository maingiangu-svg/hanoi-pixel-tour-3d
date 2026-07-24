import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PlayerCollision } from '../src/player/PlayerCollision.js'
import {
  createLakeCollisionRects,
  pointInLakeOutline,
} from '../src/world/HoanKiemGroundExpansion.js'
import { createPedestrianColliderSpecs } from '../src/world/HoanKiemPedestrianDistrict.js'
import {
  HOAN_KIEM_LOOP_TEST_POINTS,
} from '../src/world/map/hoanKiemExpansionLayout.js'
import {
  HOAN_KIEM_BENCH_POSITIONS,
  HOAN_KIEM_BOLLARD_POSITIONS,
  HOAN_KIEM_LAKESIDE_OUTLINE,
  HOAN_KIEM_LAMP_POSITIONS,
  HOAN_KIEM_OUTER_VEHICLE_LANES,
  HOAN_KIEM_PEDESTRIAN_ZONES,
  HOAN_KIEM_TREE_POSITIONS,
} from '../src/world/map/hoanKiemPedestrianLayout.js'
import { mapCoordinates } from '../src/world/map/MapCoordinateSystem.js'

test('pedestrian layout exposes every requested staging zone without fragmenting the plaza', () => {
  const kinds = new Set(HOAN_KIEM_PEDESTRIAN_ZONES.map((zone) => zone.kind))
  for (const kind of [
    'performance',
    'crowd',
    'reservedStalls',
    'portrait',
    'photo',
    'iceCream',
    'rest',
    'treeGrove',
  ]) {
    assert.equal(kinds.has(kind), true, `missing pedestrian zone ${kind}`)
  }

  assert.equal(HOAN_KIEM_OUTER_VEHICLE_LANES.length, 4)
  assert.ok(HOAN_KIEM_TREE_POSITIONS.length >= 8)
  assert.ok(HOAN_KIEM_BENCH_POSITIONS.length >= 3)
  assert.ok(HOAN_KIEM_LAMP_POSITIONS.length >= 10)
  assert.ok(HOAN_KIEM_PEDESTRIAN_ZONES.every(
    (zone) => zone.width * zone.depth >= 250,
  ))
})

test('staging zones and the lakeside path remain outside the water footprint', () => {
  for (const zone of HOAN_KIEM_PEDESTRIAN_ZONES) {
    for (let x = zone.x - zone.width / 2; x <= zone.x + zone.width / 2; x += 1) {
      for (let z = zone.z - zone.depth / 2; z <= zone.z + zone.depth / 2; z += 1) {
        assert.equal(
          pointInLakeOutline({ x, z }),
          false,
          `${zone.id} overlaps the lake at ${x},${z}`,
        )
      }
    }
  }

  for (let index = 0; index < HOAN_KIEM_LAKESIDE_OUTLINE.length; index += 1) {
    const start = HOAN_KIEM_LAKESIDE_OUTLINE[index]
    const end = HOAN_KIEM_LAKESIDE_OUTLINE[
      (index + 1) % HOAN_KIEM_LAKESIDE_OUTLINE.length
    ]
    for (let step = 0; step <= 20; step += 1) {
      const amount = step / 20
      assert.equal(pointInLakeOutline({
        x: start[0] + (end[0] - start[0]) * amount,
        z: start[1] + (end[1] - start[1]) * amount,
      }), false)
    }
  }
})

test('new props keep the complete lake loop clear and collision remains bounded', () => {
  const pedestrianColliders = createPedestrianColliderSpecs()
  const collision = new PlayerCollision({
    colliders: [
      ...createLakeCollisionRects(),
      ...pedestrianColliders,
    ],
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
      `pedestrian prop blocks loop segment ${index}`,
    )
  }

  assert.ok(pedestrianColliders.length < 130)
  assert.equal(
    pedestrianColliders.length,
    HOAN_KIEM_TREE_POSITIONS.length
      + HOAN_KIEM_BENCH_POSITIONS.length
      + HOAN_KIEM_LAMP_POSITIONS.length
      + HOAN_KIEM_BOLLARD_POSITIONS.length,
  )
})

test('bollards leave deliberate pedestrian crossings instead of forming solid walls', () => {
  assert.ok(HOAN_KIEM_BOLLARD_POSITIONS.length >= 60)
  assert.ok(HOAN_KIEM_BOLLARD_POSITIONS.length < 110)

  for (const [x, z] of [
    [108, -118],
    [108, 132],
    [232, 32],
    [232, 64],
    [-55.5, 13],
  ]) {
    assert.equal(
      HOAN_KIEM_BOLLARD_POSITIONS.some(
        ([bollardX, bollardZ]) => Math.hypot(x - bollardX, z - bollardZ) < 2,
      ),
      false,
      `expected a pedestrian crossing around ${x},${z}`,
    )
  }
})
