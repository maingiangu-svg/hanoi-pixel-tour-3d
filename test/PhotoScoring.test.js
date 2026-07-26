import test from 'node:test'
import assert from 'node:assert/strict'
import {
  scoreAdvancedComposition,
  scoreBasicComposition,
  scoreLandmarkContext,
  scoreLighting,
  scoreOcclusion,
  scorePhoto,
  scorePhotoClassification,
  scoreSubjectDistance,
  scoreSubjectPresence,
} from '../src/photo/PhotoScoring.js'

function frame({
  x = 1 / 3,
  y = 1 / 3,
  width = 0.2,
  height = 0.42,
  edgeMargin = 0.18,
  distance = 4,
} = {}) {
  return Object.freeze({
    center: Object.freeze({ x, y }),
    bounds: Object.freeze({
      minX: Math.max(0, x - width / 2),
      minY: Math.max(0, y - height / 2),
      maxX: Math.min(1, x + width / 2),
      maxY: Math.min(1, y + height / 2),
    }),
    widthRatio: width,
    heightRatio: height,
    coverage: width * height,
    edgeMargin,
    distance,
  })
}

function metadata({
  subjects = [],
  landmarks = [],
  phase = 'day',
  quality = 0.72,
  classification = null,
} = {}) {
  const resolvedClassification = classification ?? (
    subjects.length >= 2
      ? { id: 'people-people', label: 'người–người' }
      : subjects.length === 1
        ? { id: 'people-scene', label: 'người–cảnh' }
        : { id: 'scene-scene', label: 'cảnh–cảnh' }
  )
  return Object.freeze({
    subjects: Object.freeze(subjects),
    landmarks: Object.freeze(landmarks),
    lighting: Object.freeze({
      phase,
      quality,
      goldenHourScore: phase === 'goldenHour' ? 1 : 0,
      blueHourScore: phase === 'blueHour' ? 1 : 0,
    }),
    classification: Object.freeze(resolvedClassification),
  })
}

const mo = (overrides = {}) => Object.freeze({
  id: 'mo',
  name: 'Mơ',
  kind: 'person',
  frame: frame(overrides),
})

const church = (overrides = {}) => Object.freeze({
  id: 'nhaThoLon',
  name: 'Nhà thờ Lớn Hà Nội',
  kind: 'cathedral',
  frame: frame({ width: 0.52, height: 0.58, distance: 22, ...overrides }),
})

test('a well-framed NPC photo receives all criteria and a 1–5 star result', () => {
  const result = scorePhoto(metadata({
    subjects: [mo()],
    landmarks: [church({ x: 0.65, y: 0.42 })],
    phase: 'goldenHour',
    quality: 0.92,
  }))

  assert.equal(result.max, 100)
  assert.ok(result.total >= 80)
  assert.ok(result.stars >= 1 && result.stars <= 5)
  assert.equal(result.criteria.subjectPresence.score, 25)
  assert.equal(result.criteria.classification.score, 10)
  assert.ok(result.comment.length > 0)
  assert.ok(result.strengths.length > 0)
  assert.ok(result.improvements.length > 0)
})

test('a landmark-only scene is not heavily penalized for having no NPC', () => {
  const input = metadata({ landmarks: [church()] })
  const presence = scoreSubjectPresence(input)
  const context = scoreLandmarkContext(input)
  const result = scorePhoto(input)

  assert.equal(presence.score, 25)
  assert.equal(context.score, 10)
  assert.equal(result.criteria.classification.score, 10)
  assert.ok(result.total >= 70)
})

test('a subject that is too far scores lower for distance', () => {
  const ideal = scoreSubjectDistance(metadata({ subjects: [mo()] }))
  const tooFar = scoreSubjectDistance(metadata({
    subjects: [mo({ width: 0.012, height: 0.025, distance: 45 })],
  }))

  assert.ok(ideal.score > tooFar.score)
  assert.match(tooFar.feedback, /quá nhỏ|hơi xa/i)
})

test('a subject touching the image edge loses basic composition points', () => {
  const onThirds = scoreBasicComposition(metadata({ subjects: [mo()] }))
  const atEdge = scoreBasicComposition(metadata({
    subjects: [mo({ x: 0.98, y: 0.45, edgeMargin: 0 })],
  }))

  assert.ok(onThirds.score > atEdge.score)
  assert.match(atEdge.feedback, /sát mép/i)
})

test('golden hour scores better than equivalent night lighting', () => {
  const golden = scoreLighting(metadata({
    subjects: [mo()],
    phase: 'goldenHour',
    quality: 0.9,
  }))
  const night = scoreLighting(metadata({
    subjects: [mo()],
    phase: 'night',
    quality: 0.38,
  }))

  assert.equal(golden.score, 20)
  assert.ok(golden.score > night.score)
})

test('the requested scoring APIs return bounded criterion results', () => {
  const input = metadata({ subjects: [mo()], landmarks: [church()] })
  const results = [
    scoreSubjectPresence(input),
    scoreSubjectDistance(input),
    scoreBasicComposition(input),
    scoreLighting(input),
    scoreLandmarkContext(input),
    scorePhotoClassification(input),
  ]

  for (const result of results) {
    assert.ok(result.score >= 0)
    assert.ok(result.score <= result.max)
    assert.ok(result.feedback.length > 0)
  }
})

test('face occlusion is penalized while a scenery-only photo remains neutral', () => {
  const clearPerson = mo()
  const blockedPerson = Object.freeze({
    ...clearPerson,
    occlusion: Object.freeze({
      percentage: 2 / 3,
      faceOccluded: true,
    }),
  })
  const blocked = scorePhoto(metadata({ subjects: [blockedPerson] }))
  const scenery = scoreOcclusion(metadata({ landmarks: [church()] }))

  assert.ok(blocked.occlusionScore.score < 50)
  assert.match(blocked.occlusionScore.feedback, /Khuôn mặt chủ thể bị che/)
  assert.equal(scenery.score, 100)
})

test('a cropped landmark reports its missing top and loses advanced composition points', () => {
  const clean = church()
  const cropped = Object.freeze({
    ...church({ y: 0.08, edgeMargin: 0 }),
    crop: Object.freeze({ importantPartCut: true, top: true }),
  })
  const cleanScore = scoreAdvancedComposition(metadata({ landmarks: [clean] }))
  const croppedInput = metadata({ landmarks: [cropped] })
  const croppedScore = scoreAdvancedComposition(croppedInput)

  assert.ok(cleanScore.score > croppedScore.score)
  assert.match(croppedScore.feedback.join(' '), /Landmark bị cắt mất phần trên/)
  assert.equal(scoreLandmarkContext(croppedInput).score, 5)
})

test('a foreground, midground and background layout earns explicit depth feedback', () => {
  const layeredInput = {
    ...metadata({ subjects: [mo()], landmarks: [church()] }),
    sceneAnalysis: Object.freeze({
      depth: Object.freeze({
        foreground: 1,
        midground: 1,
        background: 1,
        observedLayerCount: 3,
        authoredLayerCount: 0,
        hasThreeLayers: true,
      }),
      compositionContext: Object.freeze({
        naturalFrame: true,
        leadingLines: true,
      }),
    }),
  }
  const flatInput = {
    ...layeredInput,
    sceneAnalysis: Object.freeze({
      depth: Object.freeze({
        foreground: 0,
        midground: 1,
        background: 0,
        observedLayerCount: 1,
        authoredLayerCount: 0,
        hasThreeLayers: false,
      }),
      compositionContext: null,
    }),
  }
  const layered = scoreAdvancedComposition(layeredInput)
  const flat = scoreAdvancedComposition(flatInput)

  assert.ok(layered.score > flat.score)
  assert.match(layered.feedback.join(' '), /Ảnh có chiều sâu tốt/)
})
