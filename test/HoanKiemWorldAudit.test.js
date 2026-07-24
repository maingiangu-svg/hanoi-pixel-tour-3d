import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { ChurchDistrict } from '../src/world/ChurchDistrict.js'
import { HOAN_KIEM_LOOP_TEST_POINTS } from '../src/world/map/hoanKiemExpansionLayout.js'
import {
  pointInWorldBounds,
  pointInWorldCollider,
} from '../src/world/shared/collisionHelpers.js'

const PLAYER_CLEARANCE = 0.36
const GRID_STEP = 1
const SEARCH_MARGIN = 18

test('the mounted Hoàn Kiếm world keeps the complete lake loop connected', () => {
  const restoreDocument = installCanvasDocumentStub()
  const world = new ChurchDistrict(new THREE.Scene())

  try {
    for (const sourceId of [
      'building-044',
      'building-045',
      'building-046',
      'building-047',
      'building-048',
    ]) {
      const sourceGroup = world.hoanKiemCoverageDistrict.group.children.find(
        (object) => object.userData.sourceRef === `hoanKiem:${sourceId}`,
      )
      assert.equal(sourceGroup?.visible, false)
      assert.equal(
        world.areas.outdoor.colliders
          .filter((collider) => collider.sourceId?.startsWith(sourceId))
          .every((collider) => collider.disabled),
        true,
      )
    }

    for (let index = 0; index < HOAN_KIEM_LOOP_TEST_POINTS.length; index += 1) {
      const start = HOAN_KIEM_LOOP_TEST_POINTS[index]
      const end = HOAN_KIEM_LOOP_TEST_POINTS[
        (index + 1) % HOAN_KIEM_LOOP_TEST_POINTS.length
      ]
      assert.equal(
        hasLocalGridPath(world.areas.outdoor, start, end),
        true,
        `mounted collider set blocks lake-loop segment ${index + 1}`,
      )
    }
  } finally {
    world.dispose()
    restoreDocument()
  }
})

test('the mounted world connects church, lake, bridge, temple and Old Quarter', () => {
  const restoreDocument = installCanvasDocumentStub()
  const world = new ChurchDistrict(new THREE.Scene())
  const route = [
    [0, 2.5],
    [43, 13],
    [60, -4],
    [71, 42],
    [119, 33],
    [119, 48.5],
    [119, 33],
    [158, 43],
    [205, -96],
    [238, -96],
    [252, -82],
  ]

  try {
    for (let index = 1; index < route.length; index += 1) {
      assert.equal(
        hasLocalGridPath(world.areas.outdoor, route[index - 1], route[index], 28),
        true,
        `mounted collider set blocks foundation route segment ${index}`,
      )
    }
  } finally {
    world.dispose()
    restoreDocument()
  }
})

function hasLocalGridPath(area, start, end, margin = SEARCH_MARGIN) {
  const minGridX = Math.floor((Math.min(start[0], end[0]) - margin) / GRID_STEP)
  const maxGridX = Math.ceil((Math.max(start[0], end[0]) + margin) / GRID_STEP)
  const minGridZ = Math.floor((Math.min(start[1], end[1]) - margin) / GRID_STEP)
  const maxGridZ = Math.ceil((Math.max(start[1], end[1]) + margin) / GRID_STEP)
  const localColliders = area.colliders.filter((collider) => (
    !collider.disabled
    && collider.maxX >= minGridX * GRID_STEP - PLAYER_CLEARANCE
    && collider.minX <= maxGridX * GRID_STEP + PLAYER_CLEARANCE
    && collider.maxZ >= minGridZ * GRID_STEP - PLAYER_CLEARANCE
    && collider.minZ <= maxGridZ * GRID_STEP + PLAYER_CLEARANCE
  ))
  const startCell = [
    Math.round(start[0] / GRID_STEP),
    Math.round(start[1] / GRID_STEP),
  ]
  const endCell = [
    Math.round(end[0] / GRID_STEP),
    Math.round(end[1] / GRID_STEP),
  ]
  const cellKey = (x, z) => `${x}:${z}`
  const queue = [startCell]
  const visited = new Set([cellKey(...startCell)])

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, z] = queue[cursor]
    if (Math.abs(x - endCell[0]) <= 1 && Math.abs(z - endCell[1]) <= 1) {
      return true
    }

    for (const [offsetX, offsetZ] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + offsetX
      const nextZ = z + offsetZ
      const key = cellKey(nextX, nextZ)
      if (
        nextX < minGridX || nextX > maxGridX
        || nextZ < minGridZ || nextZ > maxGridZ
        || visited.has(key)
      ) continue
      const point = { x: nextX * GRID_STEP, z: nextZ * GRID_STEP }
      if (!pointInWorldBounds(point, area.bounds, PLAYER_CLEARANCE)) continue
      if (localColliders.some(
        (collider) => pointInWorldCollider(point, collider, PLAYER_CLEARANCE),
      )) continue
      visited.add(key)
      queue.push([nextX, nextZ])
    }
  }

  return false
}

function installCanvasDocumentStub() {
  const previousDocument = globalThis.document
  const context = {
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
  }
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
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
