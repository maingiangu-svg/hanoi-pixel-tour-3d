import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { HOAN_KIEM_SCENE_MOMENTS } from '../src/moments/HoanKiemSceneMoments.js'
import { SceneMomentSystem } from '../src/moments/SceneMomentSystem.js'
import { SceneMomentEffects } from '../src/world/effects/SceneMomentEffects.js'

const TEST_PROFILE = Object.freeze({
  id: 'scene-test-landmark',
  name: 'Test landmark scene',
  region: 'sceneTest',
  position: Object.freeze([0, 0, 0]),
  target: Object.freeze([0, 2, -10]),
  captureRadius: 8,
  angleTolerance: 25,
  landmarkId: 'testLandmark',
  time: Object.freeze({
    start: 18 * 60,
    end: 19 * 60,
    lightingPhase: 'blueHour',
  }),
  effectId: 'testEffect',
  timingBonus: 1.5,
  priority: 20,
  photoType: 'scene-scene',
})

function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 200)
  camera.position.set(0, 1.68, 0)
  camera.lookAt(0, 2, -10)
  camera.updateMatrixWorld(true)
  return camera
}

function createContext(overrides = {}) {
  return {
    playerPosition: { x: 0, y: 1.68, z: 0 },
    regionIds: ['sceneTest'],
    areaId: 'outdoor',
    gameMinutes: 18 * 60 + 15,
    lightingPhase: 'blueHour',
    paused: false,
    ...overrides,
  }
}

function advanceUntil(system, state, context) {
  for (let index = 0; index < 80; index += 1) {
    system.update(0.25, context)
    if (system.getMomentState(TEST_PROFILE.id).state === state) return
  }
  assert.fail(`Scene moment did not reach ${state}`)
}

test('Hoàn Kiếm scenery registry contains every requested non-NPC photo moment', () => {
  assert.equal(HOAN_KIEM_SCENE_MOMENTS.length, 11)
  assert.equal(
    new Set(HOAN_KIEM_SCENE_MOMENTS.map(({ id }) => id)).size,
    HOAN_KIEM_SCENE_MOMENTS.length,
  )
  assert.ok(HOAN_KIEM_SCENE_MOMENTS.every((profile) => profile.photoType === 'scene-scene'))
  assert.ok(HOAN_KIEM_SCENE_MOMENTS.every((profile) => profile.captureRadius >= 9))
  assert.ok(HOAN_KIEM_SCENE_MOMENTS.every((profile) => profile.landmarkId))
  assert.ok(HOAN_KIEM_SCENE_MOMENTS.every((profile) => profile.time.lightingPhase))
})

test('scene moment metadata distinguishes correct angle, time and climax timing', () => {
  const effects = {
    active: new Set(),
    setActive(id, active) {
      if (active) this.active.add(id)
      else this.active.delete(id)
    },
    reset() {
      this.active.clear()
    },
  }
  const system = new SceneMomentSystem({ effects, profiles: [TEST_PROFILE] })
  const context = createContext()
  const camera = createCamera()

  advanceUntil(system, 'climax', context)
  const correct = system.getPhotoContext({
    camera,
    gameMinutes: context.gameMinutes,
    lightingPhase: context.lightingPhase,
    visibleLandmarkIds: ['testLandmark'],
  })
  assert.equal(correct.sceneMomentId, TEST_PROFILE.id)
  assert.equal(correct.angleMatched, true)
  assert.equal(correct.timeMatched, true)
  assert.equal(correct.lightingMatched, true)
  assert.equal(correct.landmarkVisible, true)
  assert.equal(correct.inClimax, true)
  assert.equal(correct.photoType, 'scene-scene')
  assert.ok(correct.timingBonus > 0)
  assert.deepEqual([...effects.active], ['testEffect'])

  camera.lookAt(0, 2, 10)
  camera.updateMatrixWorld(true)
  const wrongAngle = system.getPhotoContext({
    camera,
    gameMinutes: context.gameMinutes,
    lightingPhase: context.lightingPhase,
    visibleLandmarkIds: ['testLandmark'],
  })
  assert.equal(wrongAngle.angleMatched, false)
  assert.equal(wrongAngle.timingBonus, 0)

  const wrongTime = system.getPhotoContext({
    camera: createCamera(),
    gameMinutes: 12 * 60,
    lightingPhase: 'day',
    visibleLandmarkIds: ['testLandmark'],
  })
  assert.equal(wrongTime.available, true)
  assert.equal(wrongTime.timeMatched, false)
  assert.equal(wrongTime.lightingMatched, false)
  assert.equal(wrongTime.timingBonus, 0)
  system.update(0.1, createContext({
    gameMinutes: 19 * 60 + 1,
    lightingPhase: 'blueHour',
  }))
  assert.equal(system.getMomentState(TEST_PROFILE.id).state, 'cooldown')
  assert.equal(effects.active.size, 0)
  system.dispose()
})

test('scene effect is cleaned up out of range and is not duplicated on return', () => {
  const activationCounts = new Map()
  const effects = {
    active: new Set(),
    setActive(id, active) {
      if (active === this.active.has(id)) return false
      activationCounts.set(id, (activationCounts.get(id) ?? 0) + 1)
      if (active) this.active.add(id)
      else this.active.delete(id)
      return true
    },
    reset() {
      this.active.clear()
    },
  }
  const system = new SceneMomentSystem({ effects, profiles: [TEST_PROFILE] })
  const near = createContext()
  system.update(0.4, near)
  assert.equal(system.getMomentState(TEST_PROFILE.id).state, 'preparing')
  assert.deepEqual([...effects.active], ['testEffect'])

  const far = createContext({
    playerPosition: { x: 30, y: 1.68, z: 0 },
  })
  system.update(0.1, far)
  assert.equal(system.getMomentState(TEST_PROFILE.id).state, 'cooldown')
  assert.equal(effects.active.size, 0)
  system.update(0.4, near)
  assert.equal(effects.active.size, 0)
  assert.equal(activationCounts.get('testEffect'), 2)
  system.dispose()
})

test('pooled birds, leaves and reflections are created once and reused', () => {
  const geometries = new Map([
    ['sphere', new THREE.SphereGeometry(1, 6, 4)],
    ['plane', new THREE.PlaneGeometry(1, 1)],
    ['box', new THREE.BoxGeometry(1, 1, 1)],
  ])
  const materials = new Map([
    ['lakeWater', new THREE.MeshBasicMaterial()],
    ['waterReflection', new THREE.MeshBasicMaterial()],
    ['lampGlow', new THREE.MeshBasicMaterial()],
    ['soot', new THREE.MeshBasicMaterial()],
    ['foliageLight', new THREE.MeshBasicMaterial()],
    ['foliage', new THREE.MeshBasicMaterial()],
  ])
  const kit = {
    geometries: { get: (id) => geometries.get(id) },
    material: (id) => materials.get(id),
    box(parent, options) {
      const mesh = new THREE.Mesh(geometries.get('box'), materials.get(options.material))
      mesh.name = options.name
      mesh.position.fromArray(options.position)
      mesh.scale.fromArray(options.size)
      mesh.rotation.y = options.rotationY ?? 0
      parent.add(mesh)
      return mesh
    },
  }
  const transient = new Set()
  const effects = new SceneMomentEffects({
    kit,
    parent: new THREE.Group(),
    photoCompositions: {
      setTransientEffectActive(id, active) {
        if (id !== 'towerReflection') return false
        if (active) transient.add(id)
        else transient.delete(id)
        return true
      },
    },
  })
  const before = effects.getDebugSnapshot()
  assert.equal(before.birdCount, 6)
  assert.equal(before.leafCount, 8)
  assert.equal(effects.setActive('landmarkBirds', true), true)
  assert.equal(effects.setActive('landmarkBirds', true), false)
  assert.equal(effects.setActive('foregroundLeaves', true), true)
  effects.update(1 / 60, true)
  const after = effects.getDebugSnapshot()
  assert.equal(after.createdGroups, before.createdGroups)
  assert.equal(after.birdCount, before.birdCount)
  assert.equal(after.leafCount, before.leafCount)

  effects.setActive('towerReflection', true)
  assert.deepEqual([...transient], ['towerReflection'])
  effects.reset()
  assert.equal(effects.activeIds.size, 0)
  assert.equal(transient.size, 0)
  effects.dispose()
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
})
