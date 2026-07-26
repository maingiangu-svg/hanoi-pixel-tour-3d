import test from 'node:test'
import assert from 'node:assert/strict'
import { createChurchOldQuarterMoments } from '../src/moments/ChurchOldQuarterMoments.js'
import { createLakeBridgeTempleMoments } from '../src/moments/LakeBridgeTempleMoments.js'
import { createPedestrianMoments } from '../src/moments/PedestrianMoments.js'
import { HOAN_KIEM_SCENE_MOMENTS } from '../src/moments/HoanKiemSceneMoments.js'
import {
  PhotoQuestSystem,
  evaluatePhotoQuest,
} from '../src/quests/PhotoQuestSystem.js'
import {
  PHOTO_QUEST_GROUPS,
  PHOTO_QUEST_STATUS,
} from '../src/quests/photoQuestDefinitions.js'

function flowerPhoto({
  id = 'photo-flower',
  minutes = 10 * 60,
  phase = 'day',
  districtIds = ['churchDistrict'],
  state = 'climax',
  inClimax = true,
  score = 72,
} = {}) {
  return {
    metadata: {
      capture: {
        id,
        timestamp: '2026-07-26T03:00:00.000Z',
        gameTime: { minutes, formatted: '10:00' },
      },
      location: {
        mapId: 'hoanKiem',
        districtIds,
      },
      lighting: { phase },
      subjects: [
        { id: 'npc-1', name: 'Bạn trẻ 1', kind: 'person' },
        { id: 'npc-2', name: 'Bạn trẻ 2', kind: 'person' },
      ],
      landmarks: [],
      eventContext: {
        active: true,
        events: [{
          id: 'church-flower-gift',
          state,
          inClimax,
        }],
      },
      sceneMomentContext: { available: false, moments: [] },
      scoring: { total: score },
    },
  }
}

test('photo quest registry contains only the four requested groups and 15 objectives', () => {
  assert.deepEqual(
    PHOTO_QUEST_GROUPS.map((group) => [group.id, group.quests.length]),
    [
      ['hanoi-dawn', 3],
      ['hanoi-rhythm', 4],
      ['encounters', 4],
      ['last-light', 4],
    ],
  )
  const quests = PHOTO_QUEST_GROUPS.flatMap((group) => group.quests)
  assert.equal(quests.length, 15)
  assert.equal(new Set(quests.map((quest) => quest.id)).size, quests.length)
  assert.ok(quests.every((quest) => Number.isFinite(quest.minimumScore)))
  assert.ok(quests.every((quest) => typeof quest.climaxRequired === 'boolean'))

  const eventIds = new Set([
    ...createChurchOldQuarterMoments(),
    ...createPedestrianMoments(),
    ...createLakeBridgeTempleMoments(),
  ].map((moment) => moment.id))
  const sceneIds = new Set(HOAN_KIEM_SCENE_MOMENTS.map((moment) => moment.id))
  for (const quest of quests) {
    quest.eventIds.forEach((id) => assert.ok(eventIds.has(id), `Unknown event ${id}`))
    quest.sceneMomentIds.forEach((id) => assert.ok(sceneIds.has(id), `Unknown scene ${id}`))
  }
})

test('quest validation rejects wrong location, time, pre-climax and low score independently', () => {
  const flowerQuest = PHOTO_QUEST_GROUPS[1].quests[0]
  const wrongSubject = flowerPhoto()
  wrongSubject.metadata.subjects.pop()
  assert.equal(
    evaluatePhotoQuest(flowerQuest, wrongSubject).checks.subjects,
    false,
  )
  const wrongMoment = flowerPhoto()
  wrongMoment.metadata.eventContext.events[0].id = 'church-friends-review-photo'
  assert.equal(
    evaluatePhotoQuest(flowerQuest, wrongMoment).checks.moment,
    false,
  )
  assert.equal(
    evaluatePhotoQuest(flowerQuest, flowerPhoto({
      districtIds: ['hoanKiemDistrict'],
    })).checks.location,
    false,
  )
  assert.equal(
    evaluatePhotoQuest(flowerQuest, flowerPhoto({
      minutes: 7 * 60,
    })).checks.time,
    false,
  )
  assert.equal(
    evaluatePhotoQuest(flowerQuest, flowerPhoto({
      state: 'active',
      inClimax: false,
    })).checks.climax,
    false,
  )
  assert.equal(
    evaluatePhotoQuest(flowerQuest, flowerPhoto({
      score: flowerQuest.minimumScore - 1,
    })).checks.score,
    false,
  )
})

test('an exact event capture completes one quest once and stores its photo reference', () => {
  const system = new PhotoQuestSystem({ initialUnlockedGroupCount: 4 })
  const first = system.evaluatePhoto(flowerPhoto(), { photoId: 'photo-flower' })
  assert.equal(first.completed, true)
  assert.equal(first.questId, 'rhythm-flower-gift')
  assert.equal(system.getQuest('rhythm-flower-gift').status, PHOTO_QUEST_STATUS.COMPLETED)
  assert.equal(
    system.getQuest('rhythm-flower-gift').completion.photoId,
    'photo-flower',
  )

  const duplicate = system.evaluatePhoto(flowerPhoto(), { photoId: 'photo-flower' })
  assert.equal(duplicate.completed, false)
  assert.equal(duplicate.reason, 'photo-already-used')
  assert.equal(system.completions.size, 1)
  system.dispose()
})

test('scene objectives require the authored angle, time, landmark and climax metadata', () => {
  const quest = PHOTO_QUEST_GROUPS[0].quests[0]
  const createScenePhoto = (overrides = {}) => ({
    metadata: {
      capture: {
        id: 'photo-birds',
        gameTime: { minutes: 6 * 60, formatted: '06:00' },
      },
      location: {
        mapId: 'hoanKiem',
        districtIds: ['churchDistrict', 'sceneChurch'],
      },
      lighting: { phase: 'dawn' },
      subjects: [],
      landmarks: [{ id: 'nhaThoLon', name: 'Nhà thờ Lớn' }],
      eventContext: { active: false, events: [] },
      sceneMomentContext: {
        available: true,
        moments: [{
          id: 'scene-birds-cross-landmark',
          angleMatched: true,
          timeMatched: true,
          lightingMatched: true,
          landmarkVisible: true,
          inClimax: true,
          ...overrides,
        }],
      },
      scoring: { total: 70 },
    },
  })

  assert.equal(evaluatePhotoQuest(quest, createScenePhoto()).eligible, true)
  assert.equal(
    evaluatePhotoQuest(quest, createScenePhoto({ angleMatched: false })).checks.moment,
    false,
  )
  assert.equal(
    evaluatePhotoQuest(quest, createScenePhoto({ inClimax: false })).checks.climax,
    false,
  )
})

test('only the first group starts active and completing a group unlocks the next', () => {
  const createQuest = (id) => ({
    id,
    name: id,
    description: id,
    subject: 'free',
    eventIds: [],
    sceneMomentIds: [],
    subjectIds: [],
    landmarkIds: [],
    location: { label: 'Hoàn Kiếm', mapId: 'hoanKiem', districtIds: [] },
    time: { start: 0, end: 0, phases: [] },
    climaxRequired: false,
    minimumScore: 1,
  })
  const groups = [
    { id: 'first', name: 'First', description: '', quests: [createQuest('first-q')] },
    { id: 'second', name: 'Second', description: '', quests: [createQuest('second-q')] },
  ]
  const system = new PhotoQuestSystem({ groups })
  assert.equal(system.getGroups()[0].status, PHOTO_QUEST_STATUS.ACTIVE)
  assert.equal(system.getGroups()[1].status, PHOTO_QUEST_STATUS.LOCKED)

  const result = system.evaluatePhoto({
    metadata: {
      capture: {
        id: 'unlock-photo',
        gameTime: { minutes: 600, formatted: '10:00' },
      },
      location: { mapId: 'hoanKiem', districtIds: [] },
      lighting: { phase: 'day' },
      subjects: [],
      landmarks: [],
      scoring: { total: 50 },
    },
  })
  assert.equal(result.completed, true)
  assert.equal(system.getGroups()[0].status, PHOTO_QUEST_STATUS.COMPLETED)
  assert.equal(system.getGroups()[1].status, PHOTO_QUEST_STATUS.ACTIVE)
})

test('one photo completes at most one objective even when requirements overlap', () => {
  const freeQuest = (id) => ({
    id,
    name: id,
    description: id,
    subject: 'free',
    eventIds: [],
    sceneMomentIds: [],
    subjectIds: [],
    landmarkIds: [],
    location: { label: 'Hoàn Kiếm', mapId: 'hoanKiem', districtIds: [] },
    time: { start: 0, end: 0, phases: [] },
    climaxRequired: false,
    minimumScore: 1,
  })
  const system = new PhotoQuestSystem({
    groups: [{
      id: 'overlap',
      name: 'Overlap',
      description: '',
      quests: [freeQuest('first-match'), freeQuest('second-match')],
    }],
  })
  const photo = {
    metadata: {
      capture: {
        id: 'single-photo',
        gameTime: { minutes: 600, formatted: '10:00' },
      },
      location: { mapId: 'hoanKiem', districtIds: [] },
      lighting: { phase: 'day' },
      subjects: [],
      landmarks: [],
      scoring: { total: 50 },
    },
  }
  assert.equal(system.evaluatePhoto(photo).questId, 'first-match')
  assert.equal(system.completions.size, 1)
  assert.equal(system.getQuest('second-match').status, PHOTO_QUEST_STATUS.ACTIVE)
})
