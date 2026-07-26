import { classifyPhotoType } from './PhotoMetadataBuilder.js'

export const PHOTO_SCORE_MAX = 100

const CRITERIA = Object.freeze({
  subjectPresence: Object.freeze({ label: 'Đúng chủ thể', max: 25 }),
  subjectDistance: Object.freeze({ label: 'Khoảng cách chủ thể', max: 15 }),
  composition: Object.freeze({ label: 'Bố cục cơ bản', max: 20 }),
  lighting: Object.freeze({ label: 'Ánh sáng', max: 20 }),
  landmarkContext: Object.freeze({ label: 'Landmark / bối cảnh', max: 10 }),
  classification: Object.freeze({ label: 'Đúng loại ảnh', max: 10 }),
})

const PHASE_LIGHTING_SCORES = Object.freeze({
  dawn: 18,
  day: 16,
  goldenHour: 20,
  sunset: 18,
  blueHour: 18,
  night: 15,
})

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function criterion(id, score, feedback) {
  const definition = CRITERIA[id]
  return Object.freeze({
    id,
    label: definition.label,
    score: clamp(Math.round(score), 0, definition.max),
    max: definition.max,
    feedback,
  })
}

function normalizeMetadata(input = {}) {
  return input.metadata ?? input
}

function getPeople(metadata) {
  return (metadata.subjects ?? []).filter((subject) => subject.kind === 'person')
}

function getFramedTargets(metadata) {
  const people = getPeople(metadata)
  const source = people.length ? people : metadata.landmarks ?? []
  return source
    .filter((candidate) => candidate.frame)
    .sort((left, right) => (
      (right.frame.coverage ?? 0) - (left.frame.coverage ?? 0)
    ))
}

export function scoreOcclusion(input) {
  const metadata = normalizeMetadata(input)
  const people = getPeople(metadata)
  if (!people.length) {
    return Object.freeze({
      score: 100,
      max: 100,
      averageOcclusion: 0,
      faceOccludedCount: 0,
      feedback: 'Ảnh cảnh không có NPC nên không bị phạt che khuất.',
    })
  }

  let qualityTotal = 0
  let occlusionTotal = 0
  let faceOccludedCount = 0
  for (const person of people) {
    const occlusion = person.occlusion
    const percentage = clamp(occlusion?.percentage ?? 0, 0, 1)
    const faceOccluded = Boolean(occlusion?.faceOccluded)
    occlusionTotal += percentage
    faceOccludedCount += Number(faceOccluded)
    let quality = percentage <= 0.05
      ? 1
      : percentage <= 0.34
        ? 0.78
        : percentage <= 0.67
          ? 0.38
          : 0.12
    if (faceOccluded) quality *= percentage >= 0.67 ? 0.38 : 0.62
    qualityTotal += quality
  }

  const averageOcclusion = occlusionTotal / people.length
  const score = Math.round((qualityTotal / people.length) * 100)
  const feedback = faceOccludedCount > 0
    ? 'Khuôn mặt chủ thể bị che.'
    : averageOcclusion <= 0.05
      ? 'Chủ thể gần như không bị che.'
      : averageOcclusion <= 0.34
        ? 'Một phần nhỏ chủ thể bị che, vẫn tạo được chiều sâu.'
        : 'Phần lớn chủ thể bị vật thể phía trước che khuất.'
  return Object.freeze({
    score,
    max: 100,
    averageOcclusion,
    faceOccludedCount,
    feedback,
  })
}

export function scoreSubjectPresence(input) {
  const metadata = normalizeMetadata(input)
  const people = getPeople(metadata)
  const landmarks = metadata.landmarks ?? []
  const classificationId = metadata.classification?.id

  if (classificationId === 'scene-scene') {
    if (landmarks.length) {
      return criterion('subjectPresence', 25, 'Chủ thể cảnh quan hiện diện rõ trong khung.')
    }
    return criterion(
      'subjectPresence',
      17,
      'Ảnh cảnh vẫn đọc được, nhưng chưa có landmark làm điểm tựa rõ.',
    )
  }
  if (people.length) {
    const occlusion = scoreOcclusion(metadata)
    const visibilityFactor = 0.25 + (occlusion.score / occlusion.max) * 0.75
    return criterion(
      'subjectPresence',
      25 * visibilityFactor,
      occlusion.score < 70
        ? occlusion.feedback
        : people.length > 1
          ? 'Nhóm người cần chụp đều nằm trong khung.'
          : 'Chủ thể người nằm trong khung.',
    )
  }
  return criterion('subjectPresence', 0, 'Chưa bắt được chủ thể người trong khung.')
}

function scoreTargetScale(target, isPerson) {
  const frame = target.frame
  if (!frame) return 0.67
  const size = isPerson
    ? frame.heightRatio ?? 0
    : Math.sqrt(Math.max(frame.coverage ?? 0, 0))

  const idealMin = isPerson ? 0.18 : 0.16
  const idealMax = isPerson ? 0.68 : 0.76
  let scaleQuality
  if (size >= idealMin && size <= idealMax) scaleQuality = 1
  else if (size < idealMin) scaleQuality = clamp(size / idealMin, 0.18, 1)
  else {
    scaleQuality = clamp(
      1 - (size - idealMax) / Math.max(1 - idealMax, 0.01),
      0.22,
      1,
    )
  }

  const bounds = frame.bounds
  const cropped = bounds && (
    bounds.minY <= 0.01
    || bounds.maxY >= 0.99
    || bounds.minX <= 0.01
    || bounds.maxX >= 0.99
  )
  if (cropped) scaleQuality *= isPerson ? 0.58 : 0.76

  if (isPerson && Number.isFinite(frame.distance)) {
    const distance = frame.distance
    const distanceQuality = distance < 0.75
      ? 0.3
      : distance <= 14
        ? 1
        : clamp(1 - (distance - 14) / 38, 0.28, 1)
    scaleQuality = scaleQuality * 0.82 + distanceQuality * 0.18
  }
  return scaleQuality
}

export function scoreSubjectDistance(input) {
  const metadata = normalizeMetadata(input)
  const targets = getFramedTargets(metadata)
  if (!targets.length) {
    return criterion(
      'subjectDistance',
      9,
      'Không có chủ thể đo được; khoảng cách cảnh được giữ trung tính.',
    )
  }

  const people = getPeople(metadata)
  const scaleScore = targets
    .slice(0, 5)
    .reduce(
      (sum, target) => sum + scoreTargetScale(
        target,
        people.some((person) => person.id === target.id),
      ),
      0,
    ) / Math.min(targets.length, 5)
  const score = 15 * scaleScore
  const hasCrop = targets.some((target) => (
    target.frame?.bounds?.minY <= 0.01
    || target.frame?.bounds?.maxY >= 0.99
  ))
  const feedback = hasCrop
    ? 'Chủ thể quá gần hoặc bị cắt khỏi khung.'
    : score >= 13
    ? 'Kích thước chủ thể cân đối với khung hình.'
    : score >= 8
      ? 'Chủ thể hơi xa hoặc hơi lớn, nhưng vẫn nhận ra được.'
      : 'Chủ thể quá nhỏ hoặc chiếm khung quá lớn.'
  return criterion('subjectDistance', score, feedback)
}

function distanceToNearestThirdsPoint(center) {
  const thirds = [1 / 3, 2 / 3]
  let nearest = Infinity
  for (const x of thirds) {
    for (const y of thirds) {
      nearest = Math.min(nearest, Math.hypot(center.x - x, center.y - y))
    }
  }
  return nearest
}

export function scoreBasicComposition(input) {
  const metadata = normalizeMetadata(input)
  const targets = getFramedTargets(metadata)
  if (!targets.length) {
    return criterion(
      'composition',
      13,
      'Ảnh cảnh không có chủ thể chính; bố cục được giữ ở mức trung tính.',
    )
  }

  let total = 0
  let edgeIssue = false
  const evaluated = targets.slice(0, 3)
  for (const target of evaluated) {
    const frame = target.frame
    const thirdsDistance = distanceToNearestThirdsPoint(frame.center)
    const gridQuality = clamp(1 - thirdsDistance / 0.48, 0.25, 1)
    const margin = frame.edgeMargin ?? 0
    const edgeQuality = margin < 0.01
      ? 0.42
      : margin < 0.04
        ? 0.68
        : margin < 0.08
          ? 0.88
          : 1
    edgeIssue ||= edgeQuality < 0.88
    total += (0.38 + gridQuality * 0.62) * edgeQuality
  }
  const quality = total / evaluated.length
  const feedback = edgeIssue
    ? 'Chủ thể hơi sát mép; nên chừa thêm khoảng thở.'
    : quality >= 0.82
      ? 'Chủ thể nằm gần điểm mạnh của lưới 3×3.'
      : 'Bố cục ổn; có thể đặt chủ thể gần giao điểm lưới hơn.'
  return criterion('composition', quality * 20, feedback)
}

function getVisualBalance(targets) {
  if (!targets.length) return 0.65
  let left = 0
  let right = 0
  for (const target of targets) {
    const frame = target.frame
    const weight = Math.max(Math.sqrt(frame.coverage ?? 0), 0.08)
    const x = frame.center?.x ?? 0.5
    if (x < 0.48) left += weight
    else if (x > 0.52) right += weight
    else {
      left += weight * 0.5
      right += weight * 0.5
    }
  }
  if (left === 0 || right === 0) return targets.length === 1 ? 0.74 : 0.48
  return 1 - Math.abs(left - right) / (left + right)
}

export function scoreAdvancedComposition(input) {
  const metadata = normalizeMetadata(input)
  const targets = getFramedTargets(metadata)
  const depth = metadata.sceneAnalysis?.depth ?? {}
  const context = metadata.sceneAnalysis?.compositionContext
  const basic = scoreBasicComposition(metadata)
  const thirdsQuality = basic.score / basic.max
  const balanceQuality = getVisualBalance(targets)
  const gazeTargets = getPeople(metadata).filter((person) => (
    person.gaze?.direction !== 0
  ))
  const lookSpaceQuality = gazeTargets.length
    ? gazeTargets.reduce(
        (sum, person) => sum + clamp((person.gaze?.lookSpace ?? 0) / 0.2, 0.25, 1),
        0,
      ) / gazeTargets.length
    : 0.82
  const observedLayers = depth.observedLayerCount ?? 0
  const depthQuality = depth.hasThreeLayers
    ? 1
    : observedLayers >= 2
      ? 0.78
      : observedLayers === 1
        ? 0.58
        : 0.52
  const croppedLandmarks = (metadata.landmarks ?? []).filter(
    (landmark) => landmark.crop?.importantPartCut,
  )
  const landmarkQuality = croppedLandmarks.length ? 0.28 : 1
  const supportBonus = (
    Number(Boolean(context?.naturalFrame)) * 0.045
    + Number(Boolean(context?.leadingLines)) * 0.045
  )
  const quality = clamp(
    thirdsQuality * 0.28
    + balanceQuality * 0.17
    + lookSpaceQuality * 0.15
    + depthQuality * 0.22
    + landmarkQuality * 0.18
    + supportBonus,
    0,
    1,
  )

  const feedback = []
  if (thirdsQuality >= 0.8) feedback.push('Chủ thể nằm gần điểm mạnh bố cục.')
  if (croppedLandmarks.length) feedback.push('Landmark bị cắt mất phần trên.')
  if (depth.hasThreeLayers) feedback.push('Ảnh có chiều sâu tốt.')
  if (lookSpaceQuality < 0.55) feedback.push('Nên chừa thêm khoảng trống theo hướng nhìn.')
  if (balanceQuality < 0.58) feedback.push('Trọng lượng hình ảnh đang lệch về một phía.')
  if (context?.leadingLines) feedback.push('Đường dẫn hỗ trợ hướng mắt vào cảnh.')
  if (context?.naturalFrame) feedback.push('Tiền cảnh tạo khung tự nhiên.')
  if (!feedback.length) feedback.push('Bố cục nâng cao ở mức cân bằng.')

  return Object.freeze({
    score: Math.round(quality * 100),
    max: 100,
    thirdsQuality,
    balanceQuality,
    lookSpaceQuality,
    depthQuality,
    landmarkQuality,
    feedback: Object.freeze(feedback),
  })
}

function scoreCombinedComposition(
  input,
  basic = scoreBasicComposition(input),
  advanced = scoreAdvancedComposition(input),
) {
  const score = (
    (basic.score / basic.max) * 0.42
    + (advanced.score / advanced.max) * 0.58
  ) * CRITERIA.composition.max
  return criterion(
    'composition',
    score,
    advanced.feedback.join(' '),
  )
}

export function scoreLighting(input) {
  const metadata = normalizeMetadata(input)
  const lighting = metadata.lighting ?? {}
  const phaseScore = PHASE_LIGHTING_SCORES[lighting.phase] ?? 14
  const qualityScore = Number.isFinite(lighting.quality)
    ? 10 + clamp(lighting.quality, 0, 1) * 10
    : phaseScore
  const phaseBonus = (
    clamp(lighting.goldenHourScore ?? 0, 0, 1) * 2
    + clamp(lighting.blueHourScore ?? 0, 0, 1)
  )
  const score = Math.min(20, qualityScore * 0.65 + phaseScore * 0.35 + phaseBonus)
  const feedback = score >= 18
    ? 'Ánh sáng có chất lượng tốt và hỗ trợ chủ thể.'
    : score >= 14
      ? 'Ánh sáng đủ rõ, tương đối phù hợp với thời điểm.'
      : 'Ánh sáng chưa nâng được chủ thể; thử đổi góc hoặc thời điểm.'
  return criterion('lighting', score, feedback)
}

export function scoreLandmarkContext(input) {
  const metadata = normalizeMetadata(input)
  const landmarks = metadata.landmarks ?? []
  if (landmarks.length) {
    const cropped = landmarks.some((landmark) => landmark.crop?.importantPartCut)
    return criterion(
      'landmarkContext',
      cropped ? 5 : 10,
      cropped
        ? 'Landmark bị cắt mất phần trên.'
        : landmarks.length > 1
        ? 'Nhiều landmark tạo được bối cảnh rõ.'
        : 'Landmark giúp nhận diện địa điểm.',
    )
  }

  const peopleCount = getPeople(metadata).length
  return criterion(
    'landmarkContext',
    peopleCount >= 2 ? 7 : peopleCount === 1 ? 6 : 4,
    peopleCount
      ? 'Chủ thể rõ nhưng bối cảnh chưa có landmark nhận diện.'
      : 'Khung cảnh chưa có landmark làm điểm nhấn.',
  )
}

export function scorePhotoClassification(input) {
  const metadata = normalizeMetadata(input)
  const expected = classifyPhotoType(metadata.subjects ?? [], metadata.landmarks ?? [])
  const actual = metadata.classification
  if (!actual?.id) {
    return criterion(
      'classification',
      6,
      `Ảnh phù hợp loại ${expected.label}, nhưng metadata cũ chưa lưu phân loại.`,
    )
  }
  if (actual.id === expected.id) {
    return criterion('classification', 10, `Phân loại ${actual.label} phù hợp nội dung.`)
  }
  return criterion(
    'classification',
    2,
    `Nội dung hiện phù hợp loại ${expected.label} hơn.`,
  )
}

function buildSummary(total) {
  if (total >= 88) return 'Khoảnh khắc rất tốt, rõ chủ thể và giàu bối cảnh.'
  if (total >= 72) return 'Ảnh tốt, chỉ cần tinh chỉnh nhẹ để nổi bật hơn.'
  if (total >= 55) return 'Ảnh đạt yêu cầu cơ bản và còn dư địa cải thiện.'
  return 'Ảnh đã ghi lại được cảnh, nhưng cần điều chỉnh bố cục hoặc khoảng cách.'
}

export function scorePhoto(input) {
  const metadata = normalizeMetadata(input)
  const occlusionScore = scoreOcclusion(metadata)
  const basicCompositionScore = scoreBasicComposition(metadata)
  const advancedCompositionScore = scoreAdvancedComposition(metadata)
  const criteria = Object.freeze({
    subjectPresence: scoreSubjectPresence(metadata),
    subjectDistance: scoreSubjectDistance(metadata),
    composition: scoreCombinedComposition(
      metadata,
      basicCompositionScore,
      advancedCompositionScore,
    ),
    lighting: scoreLighting(metadata),
    landmarkContext: scoreLandmarkContext(metadata),
    classification: scorePhotoClassification(metadata),
  })
  const entries = Object.values(criteria)
  const total = clamp(
    entries.reduce((sum, entry) => sum + entry.score, 0),
    0,
    PHOTO_SCORE_MAX,
  )
  const roundedTotal = Math.round(total)
  const strengths = entries
    .filter((entry) => entry.score / entry.max >= 0.8)
    .map((entry) => entry.label)
  const improvements = entries
    .filter((entry) => entry.score / entry.max < 0.65)
    .map((entry) => entry.feedback)
  const resolvedStrengths = [
    ...strengths,
    ...(occlusionScore.score >= 90 && getPeople(metadata).length
      ? ['Chủ thể không bị che']
      : []),
    ...(metadata.sceneAnalysis?.depth?.hasThreeLayers ? ['Chiều sâu ba lớp'] : []),
  ].filter((value, index, values) => values.indexOf(value) === index)
  const resolvedImprovements = [
    ...improvements,
    ...(occlusionScore.score < 70 ? [occlusionScore.feedback] : []),
  ].filter((value, index, values) => values.indexOf(value) === index)

  return Object.freeze({
    total: roundedTotal,
    max: PHOTO_SCORE_MAX,
    stars: clamp(Math.ceil(roundedTotal / 20), 1, 5),
    criteria,
    occlusionScore,
    advancedCompositionScore,
    comment: buildSummary(roundedTotal),
    strengths: Object.freeze(
      resolvedStrengths.length ? resolvedStrengths : ['Khoảnh khắc tự nhiên'],
    ),
    improvements: Object.freeze(
      resolvedImprovements.length
        ? resolvedImprovements
        : ['Có thể thử thêm một góc chụp khác.'],
    ),
  })
}
