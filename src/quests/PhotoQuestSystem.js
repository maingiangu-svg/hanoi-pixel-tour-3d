import {
  PHOTO_QUEST_GROUPS,
  PHOTO_QUEST_STATUS,
} from './photoQuestDefinitions.js'

const EMPTY_LIST = Object.freeze([])

function normalizeMinutes(value) {
  return ((value % 1440) + 1440) % 1440
}

function isWithinTimeWindow(minutes, window) {
  if (!Number.isFinite(minutes) || !window) return false
  const current = normalizeMinutes(minutes)
  if (window.start === window.end) return true
  if (window.start < window.end) {
    return current >= window.start && current <= window.end
  }
  return current >= window.start || current <= window.end
}

function photoMetadata(photo) {
  return photo?.metadata ?? photo ?? {}
}

function visibleSubjectTokens(metadata) {
  const tokens = new Set()
  for (const subject of metadata.subjects ?? EMPTY_LIST) {
    if (subject.id) tokens.add(subject.id)
    if (subject.name) tokens.add(subject.name)
  }
  return tokens
}

function visibleLandmarkIds(metadata) {
  return new Set((metadata.landmarks ?? EMPTY_LIST).map((landmark) => landmark.id))
}

function eventCandidates(metadata) {
  const context = metadata.eventContext ?? {}
  if (Array.isArray(context.events)) return context.events
  return context.active ? [context] : EMPTY_LIST
}

function sceneMomentCandidates(metadata) {
  const context = metadata.sceneMomentContext ?? {}
  if (Array.isArray(context.moments) && context.moments.length) return context.moments
  return context.available ? [{
    id: context.sceneMomentId,
    ...context,
  }] : EMPTY_LIST
}

function scoreTotal(metadata) {
  const value = metadata.scoring?.total
  return Number.isFinite(value) ? value : 0
}

export function evaluatePhotoQuest(quest, photo) {
  const metadata = photoMetadata(photo)
  const subjectTokens = visibleSubjectTokens(metadata)
  const landmarkIds = visibleLandmarkIds(metadata)
  const events = eventCandidates(metadata)
  const sceneMoments = sceneMomentCandidates(metadata)
  const matchedEvent = quest.eventIds.length
    ? events.find((event) => quest.eventIds.includes(event.id)) ?? null
    : null
  const matchedSceneMoment = quest.sceneMomentIds.length
    ? sceneMoments.find((moment) => quest.sceneMomentIds.includes(moment.id)) ?? null
    : null
  const requiresMoment = quest.eventIds.length > 0 || quest.sceneMomentIds.length > 0
  const momentMatched = !requiresMoment || Boolean(matchedEvent || matchedSceneMoment)
  const subjectsMatched = quest.subjectIds.every((id) => subjectTokens.has(id))
  const landmarksMatched = quest.landmarkIds.every((id) => landmarkIds.has(id))
  const locationData = metadata.location ?? {}
  const activeDistrictIds = new Set(locationData.districtIds ?? EMPTY_LIST)
  const mapMatched = !quest.location.mapId
    || locationData.mapId === quest.location.mapId
  const districtMatched = !quest.location.districtIds.length
    || quest.location.districtIds.some((id) => activeDistrictIds.has(id))
  const locationMatched = mapMatched && districtMatched
  const gameMinutes = metadata.capture?.gameTime?.minutes
  const timeMatched = isWithinTimeWindow(gameMinutes, quest.time)
  const phase = metadata.lighting?.phase
  const lightingMatched = !quest.time.phases.length
    || quest.time.phases.includes(phase)
  const sceneAngleMatched = !matchedSceneMoment || (
    matchedSceneMoment.angleMatched
    && matchedSceneMoment.timeMatched
    && matchedSceneMoment.lightingMatched
    && matchedSceneMoment.landmarkVisible
  )
  const climaxMatched = !quest.climaxRequired
    || Boolean((matchedEvent ?? matchedSceneMoment)?.inClimax)
  const score = scoreTotal(metadata)
  const scoreMatched = score >= quest.minimumScore
  const checks = Object.freeze({
    subjects: subjectsMatched && landmarksMatched,
    location: locationMatched,
    moment: momentMatched && sceneAngleMatched,
    time: timeMatched && lightingMatched,
    climax: climaxMatched,
    score: scoreMatched,
  })
  return Object.freeze({
    questId: quest.id,
    eligible: Object.values(checks).every(Boolean),
    checks,
    score,
    matchedEventId: matchedEvent?.id ?? null,
    matchedSceneMomentId: matchedSceneMoment?.id ?? null,
  })
}

function cloneCompletion(completion) {
  return completion ? Object.freeze({ ...completion }) : null
}

export class PhotoQuestSystem {
  constructor({
    groups = PHOTO_QUEST_GROUPS,
    initialUnlockedGroupCount = 1,
  } = {}) {
    this.definitions = Object.freeze([...groups])
    this.unlockedGroupIds = new Set(
      this.definitions
        .slice(0, Math.max(1, initialUnlockedGroupCount))
        .map((group) => group.id),
    )
    this.completions = new Map()
    this.usedPhotoIds = new Set()
    this.listeners = new Set()
  }

  getGroups() {
    return this.definitions.map((definition) => {
      const quests = definition.quests.map((quest) => {
        const completion = this.completions.get(quest.id) ?? null
        return Object.freeze({
          ...quest,
          status: completion
            ? PHOTO_QUEST_STATUS.COMPLETED
            : this.unlockedGroupIds.has(definition.id)
              ? PHOTO_QUEST_STATUS.ACTIVE
              : PHOTO_QUEST_STATUS.LOCKED,
          completion: cloneCompletion(completion),
        })
      })
      const completedCount = quests.filter(
        (quest) => quest.status === PHOTO_QUEST_STATUS.COMPLETED,
      ).length
      const status = completedCount === quests.length
        ? PHOTO_QUEST_STATUS.COMPLETED
        : this.unlockedGroupIds.has(definition.id)
          ? PHOTO_QUEST_STATUS.ACTIVE
          : PHOTO_QUEST_STATUS.LOCKED
      return Object.freeze({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        status,
        completedCount,
        totalCount: quests.length,
        quests: Object.freeze(quests),
      })
    })
  }

  getQuest(id) {
    for (const group of this.getGroups()) {
      const quest = group.quests.find((candidate) => candidate.id === id)
      if (quest) return quest
    }
    return null
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('PhotoQuestSystem subscriber must be a function')
    }
    this.listeners.add(listener)
    listener(this.getGroups())
    return () => this.listeners.delete(listener)
  }

  evaluatePhoto(photo, { photoId = null } = {}) {
    const metadata = photoMetadata(photo)
    const resolvedPhotoId = photoId
      ?? metadata.capture?.id
      ?? photo?.id
      ?? null
    if (!resolvedPhotoId) {
      return Object.freeze({ completed: false, reason: 'missing-photo-id' })
    }
    if (this.usedPhotoIds.has(resolvedPhotoId)) {
      return Object.freeze({ completed: false, reason: 'photo-already-used' })
    }

    const diagnostics = []
    for (const group of this.definitions) {
      if (!this.unlockedGroupIds.has(group.id)) continue
      for (const quest of group.quests) {
        if (this.completions.has(quest.id)) continue
        const evaluation = evaluatePhotoQuest(quest, photo)
        diagnostics.push(evaluation)
        if (!evaluation.eligible) continue

        const completion = Object.freeze({
          photoId: resolvedPhotoId,
          completedAt: new Date().toISOString(),
          capturedAt: metadata.capture?.timestamp ?? null,
          gameTime: metadata.capture?.gameTime?.formatted ?? null,
          score: evaluation.score,
        })
        this.completions.set(quest.id, completion)
        this.usedPhotoIds.add(resolvedPhotoId)
        this.#unlockFollowingGroup()
        this.#notify()
        return Object.freeze({
          completed: true,
          reason: 'completed',
          questId: quest.id,
          questName: quest.name,
          completion,
          evaluation,
        })
      }
    }
    return Object.freeze({
      completed: false,
      reason: 'requirements-not-met',
      diagnostics: Object.freeze(diagnostics),
    })
  }

  exportState() {
    return Object.freeze({
      unlockedGroupIds: Object.freeze([...this.unlockedGroupIds]),
      completions: Object.freeze([...this.completions.entries()].map(
        ([questId, completion]) => Object.freeze([questId, { ...completion }]),
      )),
      usedPhotoIds: Object.freeze([...this.usedPhotoIds]),
    })
  }

  restoreState(state = {}) {
    const validGroupIds = new Set(this.definitions.map((group) => group.id))
    const validQuestIds = new Set(this.definitions.flatMap(
      (group) => group.quests.map((quest) => quest.id),
    ))
    this.unlockedGroupIds = new Set(
      (state.unlockedGroupIds ?? []).filter((id) => validGroupIds.has(id)),
    )
    if (!this.unlockedGroupIds.size && this.definitions[0]) {
      this.unlockedGroupIds.add(this.definitions[0].id)
    }
    this.completions.clear()
    for (const [questId, completion] of state.completions ?? []) {
      if (!validQuestIds.has(questId) || !completion?.photoId) continue
      this.completions.set(questId, Object.freeze({ ...completion }))
    }
    this.usedPhotoIds = new Set(state.usedPhotoIds ?? [])
    for (const completion of this.completions.values()) {
      this.usedPhotoIds.add(completion.photoId)
    }
    this.#unlockFollowingGroup()
    this.#notify()
  }

  dispose() {
    this.listeners.clear()
  }

  #unlockFollowingGroup() {
    for (let index = 0; index < this.definitions.length - 1; index += 1) {
      const current = this.definitions[index]
      const complete = current.quests.every((quest) => this.completions.has(quest.id))
      if (complete) this.unlockedGroupIds.add(this.definitions[index + 1].id)
    }
  }

  #notify() {
    const groups = this.getGroups()
    for (const listener of this.listeners) listener(groups)
  }
}
