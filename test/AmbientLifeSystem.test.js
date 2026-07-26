import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import {
  AmbientLifeSystem,
  resolveAmbientStagingPoints,
} from '../src/npcs/AmbientLifeSystem.js'
import { NpcSpatialGrid } from '../src/npcs/NpcSpatialGrid.js'
import { ChurchDistrict } from '../src/world/ChurchDistrict.js'
import {
  AMBIENT_LIFE_PROFILES,
  AMBIENT_QUALITY_PRESETS,
} from '../src/npcs/ambientLifeProfiles.js'

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
    measureText() {
      return { width: 40 }
    },
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

test('ambient profiles cover all requested districts with three bounded LOD tiers', () => {
  const required = [
    'oldQuarter',
    'pedestrian',
    'lakeWest',
    'theHuc',
    'baDinh',
    'longBien',
  ]
  required.forEach((id) => {
    const profile = AMBIENT_LIFE_PROFILES.find((candidate) => candidate.id === id)
    assert.ok(profile, `missing ambient profile ${id}`)
    assert.ok(profile.near.length >= AMBIENT_QUALITY_PRESETS.high.near)
    assert.ok(profile.mid.length >= AMBIENT_QUALITY_PRESETS.high.mid)
    assert.ok(profile.far.length >= AMBIENT_QUALITY_PRESETS.high.far)
  })
})

test('ambient life reuses one pool and activates high detail without gameplay colliders', () => {
  const areaRoots = {
    outdoor: new THREE.Group(),
    baDinh: new THREE.Group(),
    longBien: new THREE.Group(),
  }
  const playerPosition = new THREE.Vector3(252, 1.7, -80)
  const system = new AmbientLifeSystem({ areaRoots, playerPosition })
  const pool = [...system.manager.entries]

  system.update(1 / 60, { minutes: 18 * 60 }, 'outdoor')
  const stats = system.getStats()
  assert.equal(stats.quality, 'high')
  assert.equal(stats.region, 'oldQuarter')
  assert.ok(stats.near >= 12 && stats.near <= 20)
  assert.ok(stats.mid >= 15 && stats.mid <= 30)
  assert.ok(stats.far > 0)
  assert.equal(system.manager.entries.length, AMBIENT_QUALITY_PRESETS.high.near)
  assert.deepEqual(system.manager.entries, pool)
  assert.ok(system.manager.entries.every((entry) => entry.actor.colliderList === null))
  assert.equal(system.root.parent, areaRoots.outdoor)

  playerPosition.set(1000, 1.7, 1000)
  system.update(1 / 60, { minutes: 18 * 60 }, 'outdoor')
  assert.equal(system.getStats().near, 0)
  assert.equal(system.getStats().mid, 0)
  assert.equal(system.getStats().far, 0)
  assert.deepEqual(system.manager.entries, pool)
  system.dispose()
})

test('quality presets reduce density by about one quarter and one half', () => {
  const root = new THREE.Group()
  const playerPosition = new THREE.Vector3(146, 1.7, 113)
  const system = new AmbientLifeSystem({
    areaRoots: { outdoor: root },
    playerPosition,
  })
  system.update(1 / 60, { minutes: 18 * 60 }, 'outdoor')
  const high = system.getStats()
  system.setQualityPreset('medium')
  const medium = system.getStats()
  system.setQualityPreset('low')
  const low = system.getStats()

  assert.ok(medium.near <= Math.ceil(high.near * 0.75))
  assert.ok(medium.mid <= Math.ceil(high.mid * 0.75))
  assert.ok(low.near <= Math.ceil(high.near * 0.5))
  assert.ok(low.mid <= Math.ceil(high.mid * 0.5))
  assert.equal(low.shadowCasters, 0)
  system.dispose()
})

test('sustained sub-55 FPS lowers density once without rebuilding the pool', () => {
  const root = new THREE.Group()
  const playerPosition = new THREE.Vector3(146, 1.7, 113)
  const system = new AmbientLifeSystem({
    areaRoots: { outdoor: root },
    playerPosition,
  })
  const pool = [...system.manager.entries]
  for (let frame = 0; frame < 245; frame += 1) {
    system.update(1 / 40, { minutes: 18 * 60 }, 'outdoor')
  }
  assert.equal(system.getStats().quality, 'medium')
  assert.deepEqual(system.manager.entries, pool)
  system.dispose()
})

test('spatial grid returns only actors inside nearby cells', () => {
  const grid = new NpcSpatialGrid(10)
  const near = { position: new THREE.Vector3(3, 0, 4) }
  const edge = { position: new THREE.Vector3(9, 0, 0) }
  const far = { position: new THREE.Vector3(40, 0, 40) }
  grid.rebuild([near, edge, far])
  assert.deepEqual(grid.query(new THREE.Vector3(), 10), [near, edge])
  assert.deepEqual(grid.query(new THREE.Vector3(), 5), [near])
})

test('authored near-tier staging remains outside current static colliders', () => {
  const restoreDocument = installCanvasDocumentStub()
  const world = new ChurchDistrict(new THREE.Scene())
  try {
    const blockedByProfile = {}
    for (const profile of AMBIENT_LIFE_PROFILES) {
      const area = world.areas[profile.area]
      const resolved = resolveAmbientStagingPoints(profile.near, area)
      assert.equal(resolved.length, profile.near.length)
      const blocked = resolved.filter((position) => area.colliders.some((collider) => (
        !collider.disabled
        && !collider.dynamic
        && position.x > collider.minX - 0.18
        && position.x < collider.maxX + 0.18
        && position.z > collider.minZ - 0.18
        && position.z < collider.maxZ + 0.18
      )))
      if (blocked.length) blockedByProfile[profile.id] = blocked
    }
    assert.deepEqual(blockedByProfile, {})
  } finally {
    world.dispose()
    restoreDocument()
  }
})
