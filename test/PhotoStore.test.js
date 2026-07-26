import test from 'node:test'
import assert from 'node:assert/strict'
import { PhotoStore } from '../src/photo/PhotoStore.js'

function createPhoto(contents, timestamp) {
  return {
    image: new Blob([contents], { type: 'image/png' }),
    timestamp,
    gameTime: { formatted: '17:30' },
    focalLength: 35,
    mapId: 'hoanKiem',
    lightingPhase: 'goldenHour',
  }
}

test('PhotoStore creates one thumbnail per unique image and promotes duplicates', async () => {
  const created = []
  const revoked = []
  let thumbnails = 0
  const store = new PhotoStore({
    limit: 3,
    fingerprintFactory: (blob) => blob.text(),
    thumbnailFactory: async (blob) => {
      thumbnails += 1
      return new Blob([`thumb:${await blob.text()}`], { type: 'image/jpeg' })
    },
    urlApi: {
      createObjectURL: (blob) => {
        const url = `blob:test-${created.length + 1}`
        created.push({ url, blob })
        return url
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
  })

  const firstPhoto = createPhoto('same pixels', 'first')
  const first = await store.add(firstPhoto)
  const second = await store.add(createPhoto('different pixels', 'second'))
  const duplicate = await store.add(createPhoto('same pixels', 'latest'))

  assert.equal(first.duplicate, false)
  assert.equal(second.duplicate, false)
  assert.equal(duplicate.duplicate, true)
  assert.equal(store.size, 2)
  assert.equal(thumbnails, 2)
  assert.equal(created.length, 4)
  assert.equal(store.getAll()[0].id, first.record.id)
  assert.equal(store.getAll()[0].photo.timestamp, 'latest')
  assert.equal(store.getAll()[0].photo.image, firstPhoto.image)
  assert.deepEqual(revoked, [])
  store.dispose()
  assert.equal(revoked.length, 4)
})

test('PhotoStore evicts the oldest photo and revokes every object URL', async () => {
  const revoked = []
  let nextUrl = 1
  const store = new PhotoStore({
    limit: 2,
    fingerprintFactory: (blob) => blob.text(),
    thumbnailFactory: async (blob) => new Blob(
      [`thumbnail:${await blob.text()}`],
      { type: 'image/jpeg' },
    ),
    urlApi: {
      createObjectURL: () => `blob:test-${nextUrl++}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  })

  const first = await store.add(createPhoto('one', 'one'))
  const second = await store.add(createPhoto('two', 'two'))
  const third = await store.add(createPhoto('three', 'three'))

  assert.deepEqual(
    store.getAll().map((record) => record.photo.timestamp),
    ['three', 'two'],
  )
  assert.equal(store.get(first.record.id), null)
  assert.equal(revoked.length, 2)
  assert.equal(store.delete(second.record.id), true)
  assert.equal(revoked.length, 4)
  store.dispose()
  assert.equal(revoked.length, 6)
  assert.equal(store.size, 0)
  assert.equal(third.record.thumbnail.type, 'image/jpeg')
})

test('PhotoStore uses the captured metadata id and preserves it when de-duplicating', async () => {
  const store = new PhotoStore({
    fingerprintFactory: (blob) => blob.text(),
    thumbnailFactory: async () => new Blob(['thumb'], { type: 'image/jpeg' }),
    urlApi: {
      createObjectURL: (() => {
        let id = 0
        return () => `blob:metadata-${++id}`
      })(),
      revokeObjectURL: () => {},
    },
  })
  const createStructured = (id, timestamp) => {
    const capture = Object.freeze({ id, timestamp })
    return {
      id,
      image: new Blob(['same frame'], { type: 'image/png' }),
      capture,
      metadata: Object.freeze({
        capture,
        location: Object.freeze({ place: 'Hồ Gươm' }),
      }),
    }
  }

  const first = await store.add(createStructured('capture-original', 'first'))
  const duplicate = await store.add(createStructured('capture-later', 'later'))

  assert.equal(first.record.id, 'capture-original')
  assert.equal(duplicate.record.id, 'capture-original')
  assert.equal(duplicate.record.photo.id, 'capture-original')
  assert.equal(duplicate.record.photo.capture.id, 'capture-original')
  assert.equal(duplicate.record.photo.metadata.capture.id, 'capture-original')
  assert.equal(duplicate.record.photo.capture.timestamp, 'later')
  store.dispose()
})
