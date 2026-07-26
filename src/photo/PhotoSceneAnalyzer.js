import * as THREE from 'three'

const SAMPLE_NAMES = Object.freeze(['head', 'body', 'center'])
const DEFAULT_OCCLUSION = Object.freeze({
  percentage: 0,
  blockedSamples: 0,
  sampleCount: 3,
  faceOccluded: false,
  samples: Object.freeze({
    head: false,
    body: false,
    center: false,
  }),
})

function hierarchyVisible(object) {
  let current = object
  while (current) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
}

function isDescendantOf(object, ancestor) {
  let current = object
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}

function materialCanOcclude(material) {
  if (Array.isArray(material)) return material.some(materialCanOcclude)
  if (!material || material.visible === false) return false
  if (material.transparent && material.opacity < 0.28) return false
  return material.depthWrite !== false || material.opacity >= 0.65
}

function isScenerySurface(object) {
  return /nền|mặt nước|vệt sáng|phản chiếu/i.test(object.name ?? '')
}

function resolveBounds(candidate, target) {
  if (candidate?.bounds?.isBox3) return target.copy(candidate.bounds)
  if (!candidate?.object) return target.makeEmpty()
  return target.setFromObject(candidate.object, true)
}

function freezeOcclusion(samples) {
  const blockedSamples = SAMPLE_NAMES.reduce(
    (count, name) => count + Number(Boolean(samples[name])),
    0,
  )
  return Object.freeze({
    percentage: blockedSamples / SAMPLE_NAMES.length,
    blockedSamples,
    sampleCount: SAMPLE_NAMES.length,
    faceOccluded: Boolean(samples.head),
    samples: Object.freeze({
      head: Boolean(samples.head),
      body: Boolean(samples.body),
      center: Boolean(samples.center),
    }),
  })
}

function freezeCrop(frame) {
  const bounds = frame?.bounds
  if (!bounds) {
    return Object.freeze({
      top: false,
      bottom: false,
      left: false,
      right: false,
      importantPartCut: false,
    })
  }
  const top = bounds.minY <= 0.012
  const bottom = bounds.maxY >= 0.988
  const left = bounds.minX <= 0.012
  const right = bounds.maxX >= 0.988
  return Object.freeze({
    top,
    bottom,
    left,
    right,
    importantPartCut: top,
  })
}

function resolveDepthLayers(subjects, landmarks, compositionContext) {
  const counts = { foreground: 0, midground: 0, background: 0 }
  for (const candidate of [...subjects, ...landmarks]) {
    const distance = candidate.frame?.distance
    if (!Number.isFinite(distance)) continue
    if (distance < 7) counts.foreground += 1
    else if (distance < 24) counts.midground += 1
    else counts.background += 1
  }

  const authoredLayers = compositionContext?.layers ?? null
  const authoredCount = authoredLayers
    ? ['foreground', 'midground', 'background']
        .filter((layer) => (authoredLayers[layer]?.length ?? 0) > 0)
        .length
    : 0
  const observedCount = Object.values(counts).filter((count) => count > 0).length
  return Object.freeze({
    foreground: counts.foreground,
    midground: counts.midground,
    background: counts.background,
    observedLayerCount: observedCount,
    authoredLayerCount: authoredCount,
    hasThreeLayers: observedCount === 3 || authoredCount === 3,
  })
}

export class PhotoSceneAnalyzer {
  constructor({ camera, world }) {
    this.camera = camera
    this.world = world
    this.raycaster = new THREE.Raycaster()
    this.raycaster.firstHitOnly = true
    this.origin = new THREE.Vector3()
    this.direction = new THREE.Vector3()
    this.targetPoint = new THREE.Vector3()
    this.bounds = new THREE.Box3()
    this.center = new THREE.Vector3()
    this.forward = new THREE.Vector3()
    this.lookPoint = new THREE.Vector3()
    this.projectedCenter = new THREE.Vector3()
    this.projectedLook = new THREE.Vector3()
    this.sphere = new THREE.Sphere()
    this.occluderMeshes = []
    this.intersections = []
    this.meshSet = new Set()
  }

  analyze({
    subjectCandidates = [],
    landmarkCandidates = [],
    subjects = [],
    landmarks = [],
  }) {
    const rawSubjects = new Map(subjectCandidates.map((candidate) => [candidate.id, candidate]))
    const maxDistance = Math.max(
      12,
      ...subjects.map((subject) => subject.frame?.distance ?? 0),
    )
    const roots = [
      ...(this.world.getPhotoOccluderRoots?.(this.camera.position, maxDistance) ?? [
        this.world.areas?.[this.world.activeAreaName]?.group,
      ]),
      ...subjectCandidates.map((candidate) => candidate.object),
    ].filter(Boolean)
    this.#collectOccluders(roots, maxDistance + 8)

    const analyzedSubjects = subjects.map((subject) => {
      const candidate = rawSubjects.get(subject.id)
      const occlusion = candidate
        ? this.#analyzeOcclusion(candidate)
        : DEFAULT_OCCLUSION
      const gaze = candidate
        ? this.#analyzeGaze(candidate, subject.frame)
        : Object.freeze({ direction: 0, lookSpace: 0.5 })
      return Object.freeze({ ...subject, occlusion, gaze })
    })
    const analyzedLandmarks = landmarks.map((landmark) => Object.freeze({
      ...landmark,
      crop: freezeCrop(landmark.frame),
    }))
    const compositionContext = this.world.getPhotoCompositionContext?.(this.camera) ?? null

    return Object.freeze({
      subjects: Object.freeze(analyzedSubjects),
      landmarks: Object.freeze(analyzedLandmarks),
      sceneAnalysis: Object.freeze({
        depth: resolveDepthLayers(
          analyzedSubjects,
          analyzedLandmarks,
          compositionContext,
        ),
        compositionContext,
      }),
    })
  }

  #collectOccluders(roots, maxDistance) {
    this.occluderMeshes.length = 0
    this.meshSet.clear()
    this.camera.getWorldPosition(this.origin)

    for (const root of roots) {
      if (!root || !hierarchyVisible(root)) continue
      root.updateWorldMatrix(true, true)
      root.traverseVisible((object) => {
        if (
          (!object.isMesh && !object.isInstancedMesh)
          || this.meshSet.has(object)
          || !object.geometry
          || !materialCanOcclude(object.material)
          || isScenerySurface(object)
        ) return

        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere()
        if (object.geometry.boundingSphere) {
          this.sphere.copy(object.geometry.boundingSphere).applyMatrix4(object.matrixWorld)
          if (this.origin.distanceTo(this.sphere.center) > maxDistance + this.sphere.radius) {
            return
          }
        }
        this.meshSet.add(object)
        this.occluderMeshes.push(object)
      })
    }
  }

  #analyzeOcclusion(candidate) {
    resolveBounds(candidate, this.bounds)
    if (this.bounds.isEmpty()) return DEFAULT_OCCLUSION
    this.bounds.getCenter(this.center)
    const height = Math.max(this.bounds.max.y - this.bounds.min.y, 0.01)
    const blocked = {
      head: this.#isBlocked(this.targetPoint.set(
        this.center.x,
        this.bounds.max.y - height * 0.12,
        this.center.z,
      ), candidate.object),
      body: this.#isBlocked(this.targetPoint.set(
        this.center.x,
        this.bounds.min.y + height * 0.42,
        this.center.z,
      ), candidate.object),
      center: false,
    }
    blocked.center = this.#isBlocked(this.center, candidate.object)
    return freezeOcclusion(blocked)
  }

  #isBlocked(point, targetRoot) {
    this.camera.getWorldPosition(this.origin)
    this.direction.subVectors(point, this.origin)
    const distance = this.direction.length()
    if (distance <= 0.06) return false
    this.direction.multiplyScalar(1 / distance)
    this.raycaster.set(this.origin, this.direction)
    this.raycaster.near = 0.04
    this.raycaster.far = Math.max(0.04, distance - 0.045)
    this.intersections.length = 0
    this.raycaster.intersectObjects(
      this.occluderMeshes,
      false,
      this.intersections,
    )
    for (const intersection of this.intersections) {
      if (!hierarchyVisible(intersection.object)) continue
      if (targetRoot && isDescendantOf(intersection.object, targetRoot)) continue
      return true
    }
    return false
  }

  #analyzeGaze(candidate, frame) {
    if (!candidate.object || !frame?.center) {
      return Object.freeze({ direction: 0, lookSpace: 0.5 })
    }
    resolveBounds(candidate, this.bounds)
    if (this.bounds.isEmpty()) {
      return Object.freeze({ direction: 0, lookSpace: 0.5 })
    }
    this.bounds.getCenter(this.center)
    candidate.object.getWorldDirection(this.forward)
    this.lookPoint.copy(this.center).add(this.forward)
    this.projectedCenter.copy(this.center).project(this.camera)
    this.projectedLook.copy(this.lookPoint).project(this.camera)
    const screenDelta = this.projectedLook.x - this.projectedCenter.x
    const direction = Math.abs(screenDelta) < 0.025 ? 0 : Math.sign(screenDelta)
    const lookSpace = direction > 0
      ? 1 - (frame.bounds?.maxX ?? frame.center.x)
      : direction < 0
        ? frame.bounds?.minX ?? frame.center.x
        : 0.5
    return Object.freeze({
      direction,
      lookSpace: Math.min(Math.max(lookSpace, 0), 1),
    })
  }
}
