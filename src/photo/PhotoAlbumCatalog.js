const EMPTY_LIST = Object.freeze([])

export const PHOTO_ALBUM_THEME_IDS = Object.freeze({
  PEOPLE_TOGETHER: 'people-together',
  PEOPLE_IN_CITY: 'people-in-city',
  HANOI_LIGHT: 'hanoi-light',
  ARCHITECTURE: 'architecture-landmarks',
  SECRET: 'secret-moments',
})

export const PHOTO_ALBUM_THEMES = Object.freeze([
  Object.freeze({
    id: PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER,
    name: 'Con người với con người',
    target: 6,
  }),
  Object.freeze({
    id: PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY,
    name: 'Con người trong thành phố',
    target: 6,
  }),
  Object.freeze({
    id: PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT,
    name: 'Hà Nội và ánh sáng',
    target: 6,
  }),
  Object.freeze({
    id: PHOTO_ALBUM_THEME_IDS.ARCHITECTURE,
    name: 'Kiến trúc và landmark',
    target: 6,
  }),
  Object.freeze({
    id: PHOTO_ALBUM_THEME_IDS.SECRET,
    name: 'Khoảnh khắc bí mật',
    target: 5,
  }),
])

const THEME_BY_ID = new Map(PHOTO_ALBUM_THEMES.map((theme) => [theme.id, theme]))
const EXPRESSIVE_LIGHTING = new Set([
  'dawn',
  'goldenHour',
  'sunset',
  'blueHour',
  'night',
])
const PEOPLE_QUEST_GROUPS = new Set(['hanoi-rhythm', 'encounters'])
const LIGHT_QUEST_GROUPS = new Set(['hanoi-dawn', 'last-light'])

const SECRET_MOMENTS = Object.freeze([
  Object.freeze({
    id: 'secret-church-sun',
    name: 'Mặt trời giữa tháp chuông',
    description: 'Mặt trời lọt đúng giữa hai tháp Nhà thờ trong khoảnh khắc hoàng hôn.',
    sceneMomentId: 'scene-sun-between-church-towers',
    landmarkId: 'nhaThoLon',
    lightingPhase: 'sunset',
    minimumScore: 68,
  }),
  Object.freeze({
    id: 'secret-turtle-blue-mirror',
    name: 'Gương xanh Tháp Rùa',
    description: 'Tháp Rùa và phần phản chiếu cùng sáng lên trong blue hour.',
    sceneMomentId: 'scene-turtle-tower-reflection',
    landmarkId: 'thapRua',
    lightingPhase: 'blueHour',
    minimumScore: 72,
  }),
  Object.freeze({
    id: 'secret-the-huc-foliage',
    name: 'Cầu đỏ sau tán lá',
    description: 'Tán cây khép thành khung tự nhiên quanh Cầu Thê Húc.',
    sceneMomentId: 'scene-the-huc-through-foliage',
    landmarkId: 'cauTheHuc',
    lightingPhase: 'goldenHour',
    minimumScore: 66,
  }),
  Object.freeze({
    id: 'secret-old-quarter-silhouette',
    name: 'Dây phố cuối ngày',
    description: 'Dây điện và mái phố xếp thành silhouette trong ánh hoàng hôn.',
    sceneMomentId: 'scene-sunset-wire-silhouette',
    landmarkId: 'phoCoMoRong',
    lightingPhase: 'sunset',
    minimumScore: 68,
  }),
  Object.freeze({
    id: 'secret-ngoc-son-layers',
    name: 'Ba lớp Ngọc Sơn',
    description: 'Lá cây, phố và Đền Ngọc Sơn tạo thành ba lớp không gian rõ ràng.',
    sceneMomentId: 'scene-leaves-street-landmark-layers',
    landmarkId: 'denNgocSon',
    lightingPhase: 'goldenHour',
    minimumScore: 70,
  }),
])

function metadataOf(photo = {}) {
  return photo.metadata ?? photo
}

function peopleOf(metadata) {
  return (metadata.subjects ?? EMPTY_LIST).filter(
    (subject) => subject.kind === 'person',
  )
}

function sceneMomentsOf(metadata) {
  const context = metadata.sceneMomentContext ?? {}
  if (Array.isArray(context.moments)) return context.moments
  return context.available ? [context] : EMPTY_LIST
}

function eventsOf(metadata) {
  const context = metadata.eventContext ?? {}
  if (Array.isArray(context.events)) return context.events
  return context.active ? [context] : EMPTY_LIST
}

function normalizeClassificationId(metadata) {
  const id = metadata.classification?.id
  if (['people-people', 'people-scene', 'scene-scene'].includes(id)) return id
  const peopleCount = peopleOf(metadata).length
  if (peopleCount >= 2) return 'people-people'
  if (peopleCount === 1) return 'people-scene'
  return 'scene-scene'
}

function scoreValue(photo) {
  const score = metadataOf(photo).scoring?.total
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null
}

export function getPhotoStars(photo) {
  const scoring = metadataOf(photo).scoring
  if (Number.isFinite(scoring?.stars)) {
    return Math.max(1, Math.min(5, Math.round(scoring.stars)))
  }
  const total = scoreValue(photo)
  if (!Number.isFinite(total)) return 0
  if (total >= 90) return 5
  if (total >= 75) return 4
  if (total >= 60) return 3
  if (total >= 40) return 2
  return 1
}

function questThemeBonus(quest, scores) {
  if (!quest) return
  if (PEOPLE_QUEST_GROUPS.has(quest.groupId)) {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER] += 3
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY] += 2
  }
  if (LIGHT_QUEST_GROUPS.has(quest.groupId)) {
    scores[PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT] += 3
  }
  if ((quest.landmarkIds ?? EMPTY_LIST).length) {
    scores[PHOTO_ALBUM_THEME_IDS.ARCHITECTURE] += 2
  }
}

function themeDescription(themeId, metadata) {
  const location = metadata.location?.place
    ?? metadata.location?.mapName
    ?? 'Hà Nội'
  const people = peopleOf(metadata)
  const landmarks = metadata.landmarks ?? EMPTY_LIST
  const subjectNames = people.map((subject) => subject.name).filter(Boolean)
  const landmarkNames = landmarks.map((landmark) => landmark.name).filter(Boolean)
  const phase = metadata.lighting?.phase

  if (themeId === PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER) {
    return subjectNames.length
      ? `${subjectNames.slice(0, 2).join(' và ')} trong một cuộc gặp ở ${location}.`
      : `Một cuộc gặp giữa nhịp phố ${location}.`
  }
  if (themeId === PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY) {
    return subjectNames.length
      ? `${subjectNames[0]} giữa không gian ${location}.`
      : `Dấu người trong không gian ${location}.`
  }
  if (themeId === PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT) {
    const focus = landmarkNames[0] ?? location
    const labels = {
      dawn: 'bình minh',
      goldenHour: 'golden hour',
      sunset: 'hoàng hôn',
      blueHour: 'blue hour',
      night: 'ánh đêm',
    }
    return `${focus} trong ${labels[phase] ?? 'ánh sáng Hà Nội'}.`
  }
  if (themeId === PHOTO_ALBUM_THEME_IDS.ARCHITECTURE) {
    return landmarkNames.length
      ? `${landmarkNames.slice(0, 2).join(' và ')} tại ${location}.`
      : `Nhịp kiến trúc tại ${location}.`
  }
  return 'Ảnh trong phiên chơi hiện tại.'
}

export function classifyPhotoTheme(photo, { relatedQuest = null } = {}) {
  const metadata = metadataOf(photo)
  const classificationId = normalizeClassificationId(metadata)
  const people = peopleOf(metadata)
  const landmarks = metadata.landmarks ?? EMPTY_LIST
  const sceneMoments = sceneMomentsOf(metadata)
  const events = eventsOf(metadata)
  const phase = metadata.lighting?.phase
  const scores = {
    [PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER]: 0,
    [PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY]: 0,
    [PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT]: 0,
    [PHOTO_ALBUM_THEME_IDS.ARCHITECTURE]: 0,
  }

  if (classificationId === 'people-people') {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER] += 10
  }
  if (people.length >= 2) {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER] += Math.min(5, people.length)
  }
  if (classificationId === 'people-scene') {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY] += 10
  }
  if (people.length && landmarks.length) {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY] += 5
  }
  if (events.length && people.length) {
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER] += 2
    scores[PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY] += 1
  }

  if (classificationId === 'scene-scene') {
    scores[PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT] += 2
    scores[PHOTO_ALBUM_THEME_IDS.ARCHITECTURE] += 3
  }
  if (EXPRESSIVE_LIGHTING.has(phase)) {
    scores[PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT] += 6
  }
  if (sceneMoments.length) {
    scores[PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT] += 2
    scores[PHOTO_ALBUM_THEME_IDS.ARCHITECTURE] += 1
  }
  if (landmarks.length) {
    scores[PHOTO_ALBUM_THEME_IDS.ARCHITECTURE] += 4 + Math.min(2, landmarks.length)
  }
  questThemeBonus(relatedQuest, scores)

  const ordering = [
    PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER,
    PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY,
    PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT,
    PHOTO_ALBUM_THEME_IDS.ARCHITECTURE,
  ]
  const primaryThemeId = ordering.reduce((best, id) => (
    scores[id] > scores[best] ? id : best
  ), ordering[0])
  const theme = THEME_BY_ID.get(primaryThemeId)

  return Object.freeze({
    primaryThemeId,
    primaryThemeName: theme.name,
    themeIds: Object.freeze([primaryThemeId]),
    description: themeDescription(primaryThemeId, metadata),
    stars: getPhotoStars(photo),
    score: scoreValue(photo),
    relatedQuestId: relatedQuest?.id ?? null,
    relatedQuestName: relatedQuest?.name ?? null,
    classificationId,
    themeScores: Object.freeze({ ...scores }),
    secretIds: Object.freeze([]),
  })
}

export function evaluateSecretMoment(definition, photo) {
  const metadata = metadataOf(photo)
  const matchedMoment = sceneMomentsOf(metadata).find(
    (moment) => moment.id === definition.sceneMomentId,
  )
  const landmarkVisible = (metadata.landmarks ?? EMPTY_LIST).some(
    (landmark) => landmark.id === definition.landmarkId,
  )
  const checks = Object.freeze({
    sceneMoment: Boolean(matchedMoment),
    angle: Boolean(matchedMoment?.angleMatched),
    time: Boolean(matchedMoment?.timeMatched),
    lighting: Boolean(
      matchedMoment?.lightingMatched
      && metadata.lighting?.phase === definition.lightingPhase,
    ),
    landmark: Boolean(matchedMoment?.landmarkVisible && landmarkVisible),
    climax: Boolean(matchedMoment?.inClimax),
    classification: normalizeClassificationId(metadata) === 'scene-scene',
    score: (scoreValue(photo) ?? 0) >= definition.minimumScore,
  })
  return Object.freeze({
    secretId: definition.id,
    eligible: Object.values(checks).every(Boolean),
    checks,
  })
}

function freezeQuestReference(quest, questResult) {
  if (!quest && !questResult?.completed) return null
  return Object.freeze({
    id: quest?.id ?? questResult.questId,
    name: quest?.name ?? questResult.questName ?? 'Nhiệm vụ chụp ảnh',
    groupId: quest?.groupId ?? null,
    landmarkIds: Object.freeze([...(quest?.landmarkIds ?? EMPTY_LIST)]),
  })
}

export class PhotoAlbumCatalog {
  constructor({ questSystem = null } = {}) {
    this.questSystem = questSystem
    this.entries = new Map()
    this.unlockedSecrets = new Map()
    this.listeners = new Set()
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('PhotoAlbumCatalog subscriber must be a function')
    }
    this.listeners.add(listener)
    listener(this.getUnlockedSecrets())
    return () => this.listeners.delete(listener)
  }

  processPhoto(record, { questResult = null } = {}) {
    if (!record?.id || !record.photo) {
      throw new TypeError('PhotoAlbumCatalog requires a stored photo record')
    }
    const relatedQuest = this.#resolveQuest(record.id, questResult)
    const base = classifyPhotoTheme(record.photo, { relatedQuest })
    const existingSecretIds = this.entries.get(record.id)?.secretIds ?? EMPTY_LIST
    const secretIds = [...existingSecretIds]
    let unlockedSecret = null

    for (const definition of SECRET_MOMENTS) {
      if (this.unlockedSecrets.has(definition.id)) continue
      const evaluation = evaluateSecretMoment(definition, record.photo)
      if (!evaluation.eligible) continue
      unlockedSecret = Object.freeze({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        photoId: record.id,
        unlockedAt: new Date().toISOString(),
      })
      this.unlockedSecrets.set(definition.id, unlockedSecret)
      secretIds.push(definition.id)
      break
    }

    const isSecret = secretIds.length > 0
    const entry = Object.freeze({
      ...base,
      themeIds: Object.freeze([
        base.primaryThemeId,
        ...(isSecret ? [PHOTO_ALBUM_THEME_IDS.SECRET] : []),
      ]),
      secretIds: Object.freeze([...new Set(secretIds)]),
      secret: isSecret
        ? this.unlockedSecrets.get(secretIds[0]) ?? null
        : null,
      relatedQuest,
    })
    this.entries.set(record.id, entry)
    this.#notify()
    return Object.freeze({ entry, unlockedSecret })
  }

  getEntry(record) {
    if (!record?.id) return null
    const existing = this.entries.get(record.id)
    if (existing) return existing

    // Legacy/session records are classified defensively, but merely opening
    // the album never unlocks a secret retroactively.
    const relatedQuest = this.#resolveQuest(record.id, null)
    const entry = classifyPhotoTheme(record.photo ?? record, { relatedQuest })
    this.entries.set(record.id, entry)
    return entry
  }

  decorate(records) {
    return records.map((record) => Object.freeze({
      ...record,
      album: this.getEntry(record),
    }))
  }

  syncRecords(records) {
    const liveIds = new Set(records.map((record) => record.id))
    for (const id of this.entries.keys()) {
      if (liveIds.has(id)) continue
      this.entries.delete(id)
    }
  }

  getThemeProgress(records) {
    const decorated = this.decorate(records)
    return PHOTO_ALBUM_THEMES.map((theme) => {
      const count = theme.id === PHOTO_ALBUM_THEME_IDS.SECRET
        ? this.unlockedSecrets.size
        : decorated.filter(
            (record) => record.album.themeIds.includes(theme.id),
          ).length
      return Object.freeze({
        ...theme,
        count,
        completed: count >= theme.target,
      })
    })
  }

  getUnlockedSecrets() {
    return Object.freeze([...this.unlockedSecrets.values()])
  }

  exportState() {
    return Object.freeze({
      entries: Object.freeze([...this.entries.entries()]),
      unlockedSecrets: Object.freeze([...this.unlockedSecrets.entries()]),
    })
  }

  restoreState(state = {}, records = []) {
    const liveIds = new Set(records.map((record) => record.id))
    this.entries.clear()
    for (const [photoId, entry] of state.entries ?? []) {
      if (!liveIds.has(photoId) || !entry?.primaryThemeId) continue
      this.entries.set(photoId, Object.freeze({
        ...entry,
        themeIds: Object.freeze([...(entry.themeIds ?? [])]),
        secretIds: Object.freeze([...(entry.secretIds ?? [])]),
      }))
    }
    this.unlockedSecrets.clear()
    for (const [secretId, secret] of state.unlockedSecrets ?? []) {
      if (!secretId || !secret?.photoId) continue
      this.unlockedSecrets.set(secretId, Object.freeze({ ...secret }))
    }
    for (const record of records) this.getEntry(record)
    this.#notify()
  }

  dispose() {
    this.listeners.clear()
    this.entries.clear()
    this.unlockedSecrets.clear()
  }

  #resolveQuest(photoId, questResult) {
    const groups = this.questSystem?.getGroups?.() ?? EMPTY_LIST
    for (const group of groups) {
      for (const quest of group.quests ?? EMPTY_LIST) {
        const matched = quest.id === questResult?.questId
          || quest.completion?.photoId === photoId
        if (matched) return freezeQuestReference({ ...quest, groupId: group.id }, questResult)
      }
    }
    return freezeQuestReference(null, questResult)
  }

  #notify() {
    const secrets = this.getUnlockedSecrets()
    for (const listener of this.listeners) listener(secrets)
  }
}

export const PHOTO_SECRET_MOMENT_COUNT = SECRET_MOMENTS.length
