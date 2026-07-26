import * as THREE from 'three'
import { MAP_REGISTRY } from '../world/map/MapRegistry.js'
import { PhotoSceneAnalyzer } from './PhotoSceneAnalyzer.js'

export const PHOTO_CLASSIFICATIONS = Object.freeze({
  PEOPLE_PEOPLE: Object.freeze({ id: 'people-people', label: 'người–người' }),
  PEOPLE_SCENE: Object.freeze({ id: 'people-scene', label: 'người–cảnh' }),
  SCENE_SCENE: Object.freeze({ id: 'scene-scene', label: 'cảnh–cảnh' }),
})

const AREA_LABELS = Object.freeze({
  outdoor: 'Ngoài trời',
  interior: 'Nội thất Nhà thờ',
  baDinh: 'Ba Đình',
  longBien: 'Long Biên',
})

const DISTRICT_LABELS = Object.freeze({
  churchDistrict: 'Khu Nhà thờ Lớn',
  oldQuarterConnector: 'Phố Nhà Chung',
  hoanKiemDistrict: 'Hồ Gươm',
  ngocSonBranch: 'Cầu Thê Húc – Đền Ngọc Sơn',
})

function copyVector(vector) {
  return Object.freeze({
    x: vector.x,
    y: vector.y,
    z: vector.z,
  })
}

function hierarchyVisible(object) {
  let current = object
  while (current) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
}

function updateFrustum(camera, projectionView, frustum) {
  camera.updateMatrixWorld(true)
  projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  frustum.setFromProjectionMatrix(projectionView)
  return frustum
}

function candidateIntersectsFrustum(candidate, frustum, workingBounds) {
  const visibilityObject = candidate.visibilityObject ?? candidate.object
  if (visibilityObject && !hierarchyVisible(visibilityObject)) return false

  if (candidate.bounds?.isBox3) {
    return !candidate.bounds.isEmpty() && frustum.intersectsBox(candidate.bounds)
  }
  if (!candidate.object) return false
  workingBounds.setFromObject(candidate.object, true)
  return !workingBounds.isEmpty() && frustum.intersectsBox(workingBounds)
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1)
}

function getFrameMetrics(camera, bounds) {
  const center = bounds.getCenter(new THREE.Vector3())
  const projectedCenter = center.clone().project(camera)
  const point = new THREE.Vector3()
  const cameraPoint = new THREE.Vector3()
  let minNdcX = Infinity
  let maxNdcX = -Infinity
  let minNdcY = Infinity
  let maxNdcY = -Infinity

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        point.set(x, y, z)
        cameraPoint.copy(point).applyMatrix4(camera.matrixWorldInverse)
        if (cameraPoint.z >= -camera.near) continue
        point.project(camera)
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
        minNdcX = Math.min(minNdcX, point.x)
        maxNdcX = Math.max(maxNdcX, point.x)
        minNdcY = Math.min(minNdcY, point.y)
        maxNdcY = Math.max(maxNdcY, point.y)
      }
    }
  }

  if (!Number.isFinite(minNdcX)) {
    minNdcX = maxNdcX = projectedCenter.x
    minNdcY = maxNdcY = projectedCenter.y
  }

  const minX = clamp01((Math.max(-1, minNdcX) + 1) * 0.5)
  const maxX = clamp01((Math.min(1, maxNdcX) + 1) * 0.5)
  const minY = clamp01((1 - Math.min(1, maxNdcY)) * 0.5)
  const maxY = clamp01((1 - Math.max(-1, minNdcY)) * 0.5)
  const widthRatio = Math.max(0, maxX - minX)
  const heightRatio = Math.max(0, maxY - minY)
  const centerX = Number.isFinite(projectedCenter.x)
    ? clamp01((projectedCenter.x + 1) * 0.5)
    : (minX + maxX) * 0.5
  const centerY = Number.isFinite(projectedCenter.y)
    ? clamp01((1 - projectedCenter.y) * 0.5)
    : (minY + maxY) * 0.5

  return Object.freeze({
    center: Object.freeze({ x: centerX, y: centerY }),
    bounds: Object.freeze({ minX, minY, maxX, maxY }),
    widthRatio,
    heightRatio,
    coverage: widthRatio * heightRatio,
    edgeMargin: Math.min(minX, minY, 1 - maxX, 1 - maxY),
    distance: camera.position.distanceTo(center),
  })
}

function normalizeVisibleCandidate(candidate, camera, bounds) {
  return Object.freeze({
    id: candidate.id,
    name: candidate.name ?? 'Không rõ',
    kind: candidate.kind ?? 'unknown',
    role: candidate.role ?? null,
    presetId: candidate.presetId ?? null,
    frame: getFrameMetrics(camera, bounds),
  })
}

function uniqueVisibleCandidates(candidates, camera, frustum, workingBounds) {
  const seen = new Set()
  const visible = []
  for (const candidate of candidates ?? []) {
    if (!candidate?.id || seen.has(candidate.id)) continue
    if (!candidateIntersectsFrustum(candidate, frustum, workingBounds)) continue
    const bounds = candidate.bounds?.isBox3 ? candidate.bounds : workingBounds
    seen.add(candidate.id)
    visible.push(normalizeVisibleCandidate(candidate, camera, bounds))
  }
  return Object.freeze(visible)
}

export function getVisibleSubjects({
  camera,
  candidates = [],
  projectionView = new THREE.Matrix4(),
  frustum = new THREE.Frustum(),
  workingBounds = new THREE.Box3(),
} = {}) {
  if (!camera?.isCamera) throw new TypeError('getVisibleSubjects requires a camera')
  updateFrustum(camera, projectionView, frustum)
  return uniqueVisibleCandidates(candidates, camera, frustum, workingBounds)
}

export function getVisibleLandmarks({
  camera,
  candidates = [],
  projectionView = new THREE.Matrix4(),
  frustum = new THREE.Frustum(),
  workingBounds = new THREE.Box3(),
} = {}) {
  if (!camera?.isCamera) throw new TypeError('getVisibleLandmarks requires a camera')
  updateFrustum(camera, projectionView, frustum)
  return uniqueVisibleCandidates(candidates, camera, frustum, workingBounds)
}

export function classifyPhotoType(subjects = [], landmarks = []) {
  const peopleCount = subjects.filter((subject) => subject.kind === 'person').length
  if (peopleCount >= 2) return PHOTO_CLASSIFICATIONS.PEOPLE_PEOPLE
  if (peopleCount === 1) return PHOTO_CLASSIFICATIONS.PEOPLE_SCENE
  return PHOTO_CLASSIFICATIONS.SCENE_SCENE
}

function normalizeEventContext(context) {
  if (!context) {
    return Object.freeze({
      active: false,
      events: Object.freeze([]),
    })
  }
  const rawEvents = Array.isArray(context)
    ? context
    : Array.isArray(context.events)
      ? context.events
      : context.active
        ? [context]
        : []
  const events = rawEvents.map((event, index) => Object.freeze({
    id: event.id ?? `event-${index + 1}`,
    name: event.name ?? event.label ?? 'Sự kiện đang hoạt động',
  }))
  return Object.freeze({
    active: events.length > 0,
    events: Object.freeze(events),
  })
}

function resolveLocation(world, camera) {
  const definition = MAP_REGISTRY[world.activeMapId]
  const mapName = definition?.name ?? world.activeMapId ?? 'Không rõ'
  const activeDistrictIds = world.getActiveDistrictNames?.(camera.position) ?? []
  let nearestDistrictId = null
  let nearestDistance = Infinity
  for (const districtId of activeDistrictIds) {
    const district = world.districts?.[districtId]
    if (!district) continue
    const distance = Math.hypot(
      district.center.x - camera.position.x,
      district.center.y - camera.position.z,
    ) / Math.max(district.activationRadius ?? 1, 1)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestDistrictId = districtId
    }
  }

  const place = world.activeAreaName === 'interior'
    ? 'Nhà thờ Lớn'
    : DISTRICT_LABELS[nearestDistrictId] ?? mapName
  return Object.freeze({
    mapId: world.activeMapId,
    mapName,
    place,
    areaId: world.activeAreaName,
    areaName: AREA_LABELS[world.activeAreaName] ?? world.activeAreaName ?? 'Không rõ',
    districtId: nearestDistrictId,
    districtIds: Object.freeze([...activeDistrictIds]),
  })
}

export function buildPhotoMetadata({
  id,
  capturedAt,
  camera,
  clock,
  world,
  dayNight,
  focalLength,
  width,
  height,
  subjects,
  landmarks,
  eventContext,
  sceneAnalysis = null,
} = {}) {
  if (!id) throw new TypeError('buildPhotoMetadata requires an id')
  if (!camera?.isCamera) throw new TypeError('buildPhotoMetadata requires a camera')
  const captureDirection = new THREE.Vector3()
  camera.getWorldDirection(captureDirection)
  const capture = Object.freeze({
    id,
    timestamp: capturedAt.toISOString(),
    gameTime: Object.freeze({
      minutes: clock.minutes,
      hour: clock.hour,
      minute: clock.minute,
      formatted: clock.formatted,
    }),
    playerPosition: copyVector(camera.position),
    cameraDirection: copyVector(captureDirection),
    focalLength,
    fov: camera.fov,
    width,
    height,
  })
  const classification = classifyPhotoType(subjects, landmarks)
  const lightQuality = dayNight.getLightQualityAt?.(camera.position)
  const goldenHourScore = dayNight.getGoldenHourScore?.()
  const blueHourScore = dayNight.getBlueHourScore?.()
  return Object.freeze({
    capture,
    location: resolveLocation(world, camera),
    lighting: Object.freeze({
      phase: dayNight.getLightingPhase(),
      quality: Number.isFinite(lightQuality) ? clamp01(lightQuality) : null,
      goldenHourScore: Number.isFinite(goldenHourScore) ? clamp01(goldenHourScore) : 0,
      blueHourScore: Number.isFinite(blueHourScore) ? clamp01(blueHourScore) : 0,
    }),
    subjects: Object.freeze([...subjects]),
    landmarks: Object.freeze([...landmarks]),
    eventContext: normalizeEventContext(eventContext),
    classification,
    sceneAnalysis: sceneAnalysis ?? Object.freeze({
      depth: Object.freeze({
        foreground: 0,
        midground: 0,
        background: 0,
        observedLayerCount: 0,
        authoredLayerCount: 0,
        hasThreeLayers: false,
      }),
      compositionContext: null,
    }),
  })
}

export class PhotoMetadataBuilder {
  constructor({
    camera,
    clock,
    world,
    dayNight,
    now = () => new Date(),
    sceneAnalyzer = null,
  }) {
    this.camera = camera
    this.clock = clock
    this.world = world
    this.dayNight = dayNight
    this.now = now
    this.sequence = 0
    this.projectionView = new THREE.Matrix4()
    this.frustum = new THREE.Frustum()
    this.workingBounds = new THREE.Box3()
    this.sceneAnalyzer = sceneAnalyzer ?? new PhotoSceneAnalyzer({ camera, world })
  }

  getVisibleSubjects(candidates = this.world.getPhotoSubjectCandidates?.() ?? []) {
    return getVisibleSubjects({
      camera: this.camera,
      candidates,
      projectionView: this.projectionView,
      frustum: this.frustum,
      workingBounds: this.workingBounds,
    })
  }

  getVisibleLandmarks(candidates = this.world.getPhotoLandmarkCandidates?.() ?? []) {
    return getVisibleLandmarks({
      camera: this.camera,
      candidates,
      projectionView: this.projectionView,
      frustum: this.frustum,
      workingBounds: this.workingBounds,
    })
  }

  classifyPhotoType(subjects, landmarks) {
    return classifyPhotoType(subjects, landmarks)
  }

  buildPhotoMetadata({ focalLength, width, height, capturedAt = this.now() }) {
    const subjectCandidates = this.world.getPhotoSubjectCandidates?.() ?? []
    const landmarkCandidates = this.world.getPhotoLandmarkCandidates?.() ?? []
    const visibleSubjects = this.getVisibleSubjects(subjectCandidates)
    const visibleLandmarks = this.getVisibleLandmarks(landmarkCandidates)
    const sceneSnapshot = this.sceneAnalyzer.analyze({
      subjectCandidates,
      landmarkCandidates,
      subjects: visibleSubjects,
      landmarks: visibleLandmarks,
    })
    const id = `photo-${capturedAt.getTime()}-${++this.sequence}`
    const eventContext = this.world.getActiveEventContext?.() ?? null
    return buildPhotoMetadata({
      id,
      capturedAt,
      camera: this.camera,
      clock: this.clock,
      world: this.world,
      dayNight: this.dayNight,
      focalLength,
      width,
      height,
      subjects: sceneSnapshot.subjects,
      landmarks: sceneSnapshot.landmarks,
      eventContext,
      sceneAnalysis: sceneSnapshot.sceneAnalysis,
    })
  }
}
