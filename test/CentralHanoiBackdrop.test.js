import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { CentralHanoiBackdrop } from '../src/world/CentralHanoiBackdrop.js'
import {
  CENTRAL_HANOI_COMMERCIAL_ZONES,
  CENTRAL_HANOI_SKYLINE_CLUSTERS,
} from '../src/world/map/centralHanoiBackdropLayout.js'
import { SceneKit } from '../src/world/shared/SceneKit.js'

function withCanvasDocument(run) {
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
  try {
    return run()
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

test('central Hanoi skyline adds height tiers without gameplay colliders', () => {
  const heights = CENTRAL_HANOI_SKYLINE_CLUSTERS.flatMap((cluster) => (
    cluster.buildings.map((building) => building.height)
  ))
  assert.ok(heights.length >= 24)
  assert.ok(heights.some((height) => height >= 32))
  assert.ok(heights.some((height) => height >= 27 && height < 32))
  assert.ok(heights.some((height) => height < 24))
  assert.ok(CENTRAL_HANOI_SKYLINE_CLUSTERS.every(
    (cluster) => cluster.activationRadius <= 150,
  ))
  assert.equal(
    CENTRAL_HANOI_SKYLINE_CLUSTERS.some((cluster) => (
      cluster.buildings.some((building) => 'collision' in building)
    )),
    false,
  )
})

test('commercial layers use controlled Vietnamese shopfront families', () => {
  const fronts = CENTRAL_HANOI_COMMERCIAL_ZONES.flatMap((zone) => zone.fronts)
  assert.ok(fronts.length >= 10)
  assert.ok(fronts.some((front) => front.label.includes('NHÀ THUỐC')))
  assert.ok(fronts.some((front) => front.label.includes('MINIMART')))
  assert.ok(fronts.some((front) => front.label.includes('KHÁCH SẠN')))
  assert.deepEqual(new Set(fronts.map((front) => front.family)), new Set([
    'brick',
    'green',
    'cream',
  ]))
})

test('backdrop batches repeated detail and distance-culls whole zones', () => withCanvasDocument(() => {
  const kit = new SceneKit()
  const parent = new THREE.Group()
  const backdrop = new CentralHanoiBackdrop({ kit, parent })
  const stats = backdrop.getStats()

  assert.equal(parent.children.includes(backdrop.group), true)
  assert.equal(stats.skylineBuildings, 25)
  assert.equal(stats.commercialFronts, 15)
  assert.ok(backdrop.drawMeshes.filter((mesh) => mesh.isInstancedMesh).length >= 20)
  assert.ok(backdrop.drawMeshes.filter((mesh) => !mesh.isInstancedMesh).length <= 8)

  backdrop.updateVisibility(new THREE.Vector3(48, 0, 12), true)
  assert.equal(
    backdrop.commercialZones.find((entry) => entry.id === 'nha-chung-connector').group.visible,
    true,
  )
  assert.equal(
    backdrop.commercialZones.find((entry) => entry.id === 'old-quarter-retail').group.visible,
    false,
  )

  backdrop.updateVisibility(new THREE.Vector3(272, 0, -18), true)
  assert.equal(
    backdrop.commercialZones.find((entry) => entry.id === 'old-quarter-retail').group.visible,
    true,
  )
  assert.equal(
    backdrop.commercialZones.find((entry) => entry.id === 'nha-chung-connector').group.visible,
    false,
  )

  backdrop.updateVisibility(new THREE.Vector3(272, 0, -18), false)
  assert.equal(backdrop.group.visible, false)

  backdrop.dispose()
  kit.dispose()
}))

test('shared city materials provide emissive night hierarchy without point lights', () => (
  withCanvasDocument(() => {
    const kit = new SceneKit()
    for (const role of [
      'premiumGlass',
      'cityWindow',
      'skylineGlass',
      'signGlow',
      'cityLightPool',
    ]) {
      assert.ok(kit.material(role).emissiveIntensity > 0)
    }
    assert.equal(kit.material('cityLightPool').depthWrite, false)
    assert.equal(kit.material('cityLightPool').transparent, true)
    kit.dispose()
  })
))
