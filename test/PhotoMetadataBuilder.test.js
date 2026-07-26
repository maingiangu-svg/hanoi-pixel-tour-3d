import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  PHOTO_CLASSIFICATIONS,
  PhotoMetadataBuilder,
  classifyPhotoType,
  getVisibleLandmarks,
  getVisibleSubjects,
} from '../src/photo/PhotoMetadataBuilder.js'

function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 120)
  camera.position.set(0, 1.6, 0)
  camera.lookAt(0, 1.6, -1)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

function createCandidate(id, name, x, z, kind) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(1, kind === 'person' ? 1.75 : 5, 1),
    new THREE.MeshBasicMaterial(),
  )
  object.position.set(x, kind === 'person' ? 0.875 : 2.5, z)
  object.updateMatrixWorld(true)
  return { id, name, kind, object }
}

test('church and lake metadata only include the landmark inside the camera frustum', () => {
  const camera = createCamera()
  const church = createCandidate('nhaThoLon', 'Nhà thờ Lớn Hà Nội', 0, -12, 'cathedral')
  const lake = createCandidate('hoGuom', 'Hồ Gươm', 0, 12, 'lake')

  assert.deepEqual(
    getVisibleLandmarks({ camera, candidates: [church, lake] }).map(({ id }) => id),
    ['nhaThoLon'],
  )

  camera.lookAt(0, 1.6, 1)
  camera.updateMatrixWorld(true)
  assert.deepEqual(
    getVisibleLandmarks({ camera, candidates: [church, lake] }).map(({ id }) => id),
    ['hoGuom'],
  )
})

test('visible subjects exclude NPCs outside the frame or hidden by their hierarchy', () => {
  const camera = createCamera()
  const visibleNpc = createCandidate('mo', 'Mơ', 0, -5, 'person')
  const outsideNpc = createCandidate('tourist', 'Du khách', 30, -5, 'person')
  const hiddenNpc = createCandidate('vendor', 'Người bán', 0.8, -5, 'person')
  const hiddenParent = new THREE.Group()
  hiddenParent.visible = false
  hiddenParent.add(hiddenNpc.object)

  const visible = getVisibleSubjects({
    camera,
    candidates: [visibleNpc, outsideNpc, hiddenNpc],
  })
  assert.deepEqual(visible.map(({ id }) => id), ['mo'])
})

test('temporary photo classification distinguishes people and scenery', () => {
  const person = Object.freeze({ id: 'mo', kind: 'person' })
  const tourist = Object.freeze({ id: 'tourist', kind: 'person' })
  const landmark = Object.freeze({ id: 'hoGuom', kind: 'lake' })

  assert.equal(
    classifyPhotoType([person, tourist], [landmark]),
    PHOTO_CLASSIFICATIONS.PEOPLE_PEOPLE,
  )
  assert.equal(
    classifyPhotoType([person], [landmark]),
    PHOTO_CLASSIFICATIONS.PEOPLE_SCENE,
  )
  assert.equal(
    classifyPhotoType([], [landmark]),
    PHOTO_CLASSIFICATIONS.SCENE_SCENE,
  )
})

test('buildPhotoMetadata snapshots camera, clock, lighting, subjects and landmarks at capture time', () => {
  const camera = createCamera()
  const church = createCandidate('nhaThoLon', 'Nhà thờ Lớn Hà Nội', 0, -12, 'cathedral')
  const mo = createCandidate('mo', 'Mơ', 0.6, -5, 'person')
  const clock = {
    minutes: 17 * 60 + 30,
    hour: 17,
    minute: 30,
    formatted: '17:30',
  }
  const world = {
    activeMapId: 'hoanKiem',
    activeAreaName: 'outdoor',
    districts: {
      churchDistrict: {
        center: new THREE.Vector2(0, -28),
      },
    },
    getActiveDistrictNames: () => ['hoanKiem', 'churchDistrict'],
    getPhotoSubjectCandidates: () => [mo],
    getPhotoLandmarkCandidates: () => [church],
    getActiveEventContext: () => ({
      active: true,
      id: 'church-service',
      name: 'Thánh lễ buổi tối',
    }),
  }
  const builder = new PhotoMetadataBuilder({
    camera,
    clock,
    world,
    dayNight: { getLightingPhase: () => 'goldenHour' },
    now: () => new Date('2026-07-26T10:30:00.000Z'),
  })

  const metadata = builder.buildPhotoMetadata({
    focalLength: 50,
    width: 1280,
    height: 720,
  })
  camera.position.set(99, 99, 99)
  clock.formatted = '22:00'

  assert.match(metadata.capture.id, /^photo-\d+-1$/)
  assert.equal(metadata.capture.timestamp, '2026-07-26T10:30:00.000Z')
  assert.equal(metadata.capture.gameTime.formatted, '17:30')
  assert.deepEqual(metadata.capture.playerPosition, { x: 0, y: 1.6, z: 0 })
  assert.equal(metadata.capture.focalLength, 50)
  assert.equal(metadata.capture.fov, 50)
  assert.equal(metadata.location.place, 'Khu Nhà thờ Lớn')
  assert.equal(metadata.location.areaName, 'Ngoài trời')
  assert.equal(metadata.lighting.phase, 'goldenHour')
  assert.deepEqual(metadata.subjects.map(({ name }) => name), ['Mơ'])
  assert.deepEqual(metadata.landmarks.map(({ name }) => name), ['Nhà thờ Lớn Hà Nội'])
  assert.deepEqual(metadata.eventContext, {
    active: true,
    events: [{ id: 'church-service', name: 'Thánh lễ buổi tối' }],
  })
  assert.equal(metadata.classification.label, 'người–cảnh')
})

test('a capture without an NPC keeps an empty subject list and scene classification', () => {
  const camera = createCamera()
  const builder = new PhotoMetadataBuilder({
    camera,
    clock: { minutes: 720, hour: 12, minute: 0, formatted: '12:00' },
    world: {
      activeMapId: 'hoanKiem',
      activeAreaName: 'outdoor',
      getActiveDistrictNames: () => ['hoanKiem'],
      getPhotoSubjectCandidates: () => [],
      getPhotoLandmarkCandidates: () => [],
    },
    dayNight: { getLightingPhase: () => 'day' },
    now: () => new Date('2026-07-26T05:00:00.000Z'),
  })
  const metadata = builder.buildPhotoMetadata({
    focalLength: 35,
    width: 800,
    height: 450,
  })

  assert.deepEqual(metadata.subjects, [])
  assert.deepEqual(metadata.landmarks, [])
  assert.equal(metadata.classification.label, 'cảnh–cảnh')
})
