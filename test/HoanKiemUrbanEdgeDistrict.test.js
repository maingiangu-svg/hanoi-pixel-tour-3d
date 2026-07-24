import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PlayerCollision } from '../src/player/PlayerCollision.js'
import { createLakeCollisionRects } from '../src/world/HoanKiemGroundExpansion.js'
import { createPedestrianColliderSpecs } from '../src/world/HoanKiemPedestrianDistrict.js'
import { createUrbanEdgeColliderSpecs } from '../src/world/HoanKiemUrbanEdgeDistrict.js'
import {
  getUrbanBuildingFootprint,
  getUrbanShopBuildings,
  HOAN_KIEM_URBAN_CLUSTERS,
  HOAN_KIEM_URBAN_PROPS,
  HOAN_KIEM_URBAN_SIDE_ROADS,
} from '../src/world/map/hoanKiemUrbanEdgeLayout.js'
import {
  HOAN_KIEM_EXPANDED_WORLD_BOUNDS,
  HOAN_KIEM_LOOP_TEST_POINTS,
} from '../src/world/map/hoanKiemExpansionLayout.js'
import { HOAN_KIEM_PEDESTRIAN_ZONES } from '../src/world/map/hoanKiemPedestrianLayout.js'
import { getShopProfileForSign } from '../src/world/shops/shopProfiles.js'

test('expanded urban edge supplies varied tube houses and data-driven shops', () => {
  const buildings = HOAN_KIEM_URBAN_CLUSTERS.flatMap((cluster) => cluster.buildings)
  const shops = getUrbanShopBuildings()
  const ids = new Set(buildings.map((building) => building.id))
  const materials = new Set(buildings.map((building) => building.material))
  const fronts = new Set(buildings.map((building) => building.front))
  const heights = buildings.map((building) => building.height)

  assert.ok(HOAN_KIEM_URBAN_CLUSTERS.length >= 6)
  assert.ok(buildings.length >= 40)
  assert.equal(ids.size, buildings.length)
  assert.ok(shops.length >= 14)
  assert.ok(materials.size >= 4)
  assert.deepEqual(
    [...fronts].sort(),
    ['negativeX', 'negativeZ', 'positiveX', 'positiveZ'],
  )
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 6)
  assert.ok(buildings.some((building) => building.roof === 'tile'))
  assert.ok(buildings.some((building) => building.roof === 'flat'))
  assert.ok(shops.every((building) => getShopProfileForSign(building.sign)))
})

test('new building footprints protect landmarks, staging zones, roads and world bounds', () => {
  const footprints = HOAN_KIEM_URBAN_CLUSTERS.flatMap((cluster) => (
    cluster.buildings.map((building) => ({
      ...getUrbanBuildingFootprint(building),
      id: building.id,
    }))
  ))
  const protectedLandmarkSpace = [
    { id: 'church-and-existing-route', x: 0, z: -42, width: 74, depth: 122 },
    { id: 'lake-promenade-and-landmarks', x: 110, z: 2, width: 130, depth: 220 },
  ]

  for (const footprint of footprints) {
    const bounds = rectBounds(footprint)
    assert.ok(bounds.minX >= HOAN_KIEM_EXPANDED_WORLD_BOUNDS.minX)
    assert.ok(bounds.maxX <= HOAN_KIEM_EXPANDED_WORLD_BOUNDS.maxX)
    assert.ok(bounds.minZ >= HOAN_KIEM_EXPANDED_WORLD_BOUNDS.minZ)
    assert.ok(bounds.maxZ <= HOAN_KIEM_EXPANDED_WORLD_BOUNDS.maxZ)
    for (const protectedRect of protectedLandmarkSpace) {
      assert.equal(
        overlaps(footprint, protectedRect),
        false,
        `${footprint.id} intrudes into ${protectedRect.id}`,
      )
    }
    for (const zone of HOAN_KIEM_PEDESTRIAN_ZONES) {
      assert.equal(
        overlaps(footprint, zone),
        false,
        `${footprint.id} blocks ${zone.id}`,
      )
    }
    for (const road of HOAN_KIEM_URBAN_SIDE_ROADS) {
      assert.equal(
        overlaps(footprint, road),
        false,
        `${footprint.id} blocks ${road.id}`,
      )
    }
  }
})

test('urban collision preserves the complete lake loop and every deliberate side route', () => {
  const colliders = createUrbanEdgeColliderSpecs()
  const collision = new PlayerCollision({
    colliders: [
      ...createLakeCollisionRects(),
      ...createPedestrianColliderSpecs(),
      ...colliders,
    ],
    bounds: HOAN_KIEM_EXPANDED_WORLD_BOUNDS,
    radius: 0.36,
  })
  const position = new THREE.Vector3(
    HOAN_KIEM_LOOP_TEST_POINTS[0][0],
    0,
    HOAN_KIEM_LOOP_TEST_POINTS[0][1],
  )

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
      `urban edge blocks lake loop segment ${index}`,
    )
  }

  const routes = [
    [[50.25, -142], [50.25, -176]],
    [[59, 160], [59, 214]],
    [[178, 35], [248, 35]],
    [[264, 60], [350, 60]],
    [[-64, 12], [-116, 12]],
  ]
  routes.forEach(([start, target], index) => {
    position.set(start[0], 0, start[1])
    collision.move(position, new THREE.Vector3(
      target[0] - start[0],
      0,
      target[1] - start[1],
    ))
    assert.ok(
      Math.hypot(target[0] - position.x, target[1] - position.z) < 0.01,
      `urban side route ${index + 1} is blocked`,
    )
  })
})

test('repeated street props stay bounded and map one-to-one to lightweight colliders', () => {
  const buildingCount = HOAN_KIEM_URBAN_CLUSTERS.reduce(
    (total, cluster) => total + cluster.buildings.length,
    0,
  )
  const propCount = Object.values(HOAN_KIEM_URBAN_PROPS).reduce(
    (total, entries) => total + entries.length,
    0,
  )
  const colliders = createUrbanEdgeColliderSpecs()

  assert.equal(colliders.length, buildingCount + propCount)
  assert.ok(HOAN_KIEM_URBAN_PROPS.trees.length >= 16)
  assert.ok(HOAN_KIEM_URBAN_PROPS.lamps.length >= 18)
  assert.ok(HOAN_KIEM_URBAN_PROPS.motorbikes.length >= 8)
  assert.ok(HOAN_KIEM_URBAN_PROPS.bollards.length <= 12)
  assert.ok(colliders.length < 140)
})

function rectBounds(rect) {
  return {
    minX: rect.x - rect.width / 2,
    maxX: rect.x + rect.width / 2,
    minZ: rect.z - rect.depth / 2,
    maxZ: rect.z + rect.depth / 2,
  }
}

function overlaps(first, second) {
  const a = rectBounds(first)
  const b = rectBounds(second)
  return (
    a.minX < b.maxX
    && a.maxX > b.minX
    && a.minZ < b.maxZ
    && a.maxZ > b.minZ
  )
}
