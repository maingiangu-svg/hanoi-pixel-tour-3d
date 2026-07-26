import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PHOTO_ALBUM_THEME_IDS,
  PhotoAlbumCatalog,
  classifyPhotoTheme,
  getPhotoStars,
} from '../src/photo/PhotoAlbumCatalog.js'

function photo({
  id,
  classification = 'scene-scene',
  people = [],
  landmarks = [],
  phase = 'day',
  score = 74,
  stars = 4,
  sceneMoments = [],
} = {}) {
  return {
    id,
    metadata: {
      capture: {
        id,
        timestamp: '2026-07-26T10:00:00.000Z',
        gameTime: { minutes: 17 * 60 + 30, formatted: '17:30' },
      },
      location: {
        mapId: 'hoanKiem',
        mapName: 'Hoàn Kiếm',
        place: 'Hồ Gươm',
      },
      lighting: { phase },
      subjects: people.map((name, index) => ({
        id: `person-${index + 1}`,
        name,
        kind: 'person',
      })),
      landmarks,
      eventContext: { active: false, events: [] },
      sceneMomentContext: {
        available: sceneMoments.length > 0,
        moments: sceneMoments,
      },
      classification: { id: classification },
      scoring: { total: score, max: 100, stars },
    },
  }
}

test('album classifier separates people–people, people–scene and scene–scene safely', () => {
  const together = classifyPhotoTheme(photo({
    id: 'together',
    classification: 'people-people',
    people: ['Lan', 'Minh'],
  }))
  assert.equal(together.primaryThemeId, PHOTO_ALBUM_THEME_IDS.PEOPLE_TOGETHER)

  const inCity = classifyPhotoTheme(photo({
    id: 'in-city',
    classification: 'people-scene',
    people: ['Du khách'],
    landmarks: [{ id: 'thapRua', name: 'Tháp Rùa' }],
    phase: 'sunset',
  }))
  assert.equal(inCity.primaryThemeId, PHOTO_ALBUM_THEME_IDS.PEOPLE_IN_CITY)

  const architecture = classifyPhotoTheme(photo({
    id: 'architecture',
    landmarks: [{ id: 'nhaThoLon', name: 'Nhà thờ Lớn' }],
  }))
  assert.equal(architecture.primaryThemeId, PHOTO_ALBUM_THEME_IDS.ARCHITECTURE)

  const light = classifyPhotoTheme(photo({
    id: 'light',
    phase: 'blueHour',
    landmarks: [{ id: 'thapRua', name: 'Tháp Rùa' }],
    sceneMoments: [{ id: 'scene-blue-hour-lake-lights' }],
  }))
  assert.equal(light.primaryThemeId, PHOTO_ALBUM_THEME_IDS.HANOI_LIGHT)

  const legacy = classifyPhotoTheme({ timestamp: 'legacy-photo' })
  assert.equal(legacy.primaryThemeId, PHOTO_ALBUM_THEME_IDS.ARCHITECTURE)
  assert.equal(legacy.stars, 0)
  assert.equal(getPhotoStars({}), 0)
  assert.match(legacy.description, /Hà Nội/)
})

test('secret moment requires the exact scene, angle, time, light, landmark and climax', () => {
  const catalog = new PhotoAlbumCatalog()
  const secretPhoto = photo({
    id: 'secret-frame',
    phase: 'sunset',
    score: 82,
    stars: 5,
    landmarks: [{ id: 'nhaThoLon', name: 'Nhà thờ Lớn' }],
    sceneMoments: [{
      id: 'scene-sun-between-church-towers',
      angleMatched: true,
      timeMatched: true,
      lightingMatched: true,
      landmarkVisible: true,
      inClimax: true,
    }],
  })
  const first = catalog.processPhoto({ id: 'secret-frame', photo: secretPhoto })

  assert.equal(first.unlockedSecret?.id, 'secret-church-sun')
  assert.equal(
    first.entry.themeIds.includes(PHOTO_ALBUM_THEME_IDS.SECRET),
    true,
  )
  assert.equal(catalog.getUnlockedSecrets().length, 1)

  const secondPhoto = photo({
    id: 'same-secret-later',
    phase: 'sunset',
    score: 86,
    landmarks: [{ id: 'nhaThoLon', name: 'Nhà thờ Lớn' }],
    sceneMoments: secretPhoto.metadata.sceneMomentContext.moments,
  })
  const repeated = catalog.processPhoto({
    id: 'same-secret-later',
    photo: secondPhoto,
  })
  assert.equal(repeated.unlockedSecret, null)
  assert.equal(catalog.getUnlockedSecrets().length, 1)
  assert.equal(repeated.entry.themeIds.includes(PHOTO_ALBUM_THEME_IDS.SECRET), false)
  catalog.dispose()
})

test('incorrect secret angle stays hidden and theme progress never reveals answers', () => {
  const catalog = new PhotoAlbumCatalog()
  const wrongAngle = photo({
    id: 'wrong-angle',
    phase: 'blueHour',
    score: 92,
    stars: 5,
    landmarks: [{ id: 'thapRua', name: 'Tháp Rùa' }],
    sceneMoments: [{
      id: 'scene-turtle-tower-reflection',
      angleMatched: false,
      timeMatched: true,
      lightingMatched: true,
      landmarkVisible: true,
      inClimax: true,
    }],
  })
  const result = catalog.processPhoto({ id: 'wrong-angle', photo: wrongAngle })
  assert.equal(result.unlockedSecret, null)
  assert.deepEqual(catalog.getUnlockedSecrets(), [])

  const progress = catalog.getThemeProgress([
    { id: 'wrong-angle', photo: wrongAngle },
  ])
  const secretProgress = progress.find(
    (theme) => theme.id === PHOTO_ALBUM_THEME_IDS.SECRET,
  )
  assert.deepEqual(
    Object.keys(secretProgress).sort(),
    ['completed', 'count', 'id', 'name', 'target'],
  )
  assert.equal(secretProgress.count, 0)
  catalog.dispose()
})
