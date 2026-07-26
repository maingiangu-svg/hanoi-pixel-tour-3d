const DATABASE_NAME = 'hanoi-pixel-tour-3d'
const DATABASE_VERSION = 1
const STATE_STORE = 'state'
const PHOTO_STORE = 'photos'
const SAVE_KEY = 'demo-save'

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(
      transaction.error ?? new Error('IndexedDB transaction aborted'),
    )
    transaction.onerror = () => reject(
      transaction.error ?? new Error('IndexedDB transaction failed'),
    )
  })
}

export class IndexedDbSaveStorage {
  constructor({
    indexedDb = globalThis.indexedDB,
    databaseName = DATABASE_NAME,
  } = {}) {
    this.indexedDb = indexedDb
    this.databaseName = databaseName
    this.databasePromise = null
  }

  async load() {
    const database = await this.#open()
    const transaction = database.transaction([STATE_STORE, PHOTO_STORE], 'readonly')
    const stateRequest = transaction.objectStore(STATE_STORE).get(SAVE_KEY)
    const photosRequest = transaction.objectStore(PHOTO_STORE).getAll()
    const [stateEntry, photoEntries] = await Promise.all([
      requestResult(stateRequest),
      requestResult(photosRequest),
      transactionDone(transaction),
    ])
    if (!stateEntry?.value) return null
    return {
      state: stateEntry.value,
      photos: photoEntries
        .sort((left, right) => left.order - right.order)
        .map((entry) => entry.record),
    }
  }

  async save({ state, photos }, { photosDirty = true } = {}) {
    const database = await this.#open()
    const storeNames = photosDirty
      ? [STATE_STORE, PHOTO_STORE]
      : [STATE_STORE]
    const transaction = database.transaction(storeNames, 'readwrite')
    transaction.objectStore(STATE_STORE).put({ key: SAVE_KEY, value: state })
    if (photosDirty) {
      const photoStore = transaction.objectStore(PHOTO_STORE)
      photoStore.clear()
      photos.forEach((record, order) => {
        photoStore.put({ id: record.id, order, record })
      })
    }
    await transactionDone(transaction)
  }

  async clear() {
    const database = await this.#open()
    const transaction = database.transaction([STATE_STORE, PHOTO_STORE], 'readwrite')
    transaction.objectStore(STATE_STORE).delete(SAVE_KEY)
    transaction.objectStore(PHOTO_STORE).clear()
    await transactionDone(transaction)
  }

  close() {
    this.databasePromise?.then((database) => database.close()).catch(() => {})
    this.databasePromise = null
  }

  #open() {
    if (this.databasePromise) return this.databasePromise
    if (!this.indexedDb) {
      return Promise.reject(new Error('IndexedDB is unavailable'))
    }
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDb.open(this.databaseName, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STATE_STORE)) {
          database.createObjectStore(STATE_STORE, { keyPath: 'key' })
        }
        if (!database.objectStoreNames.contains(PHOTO_STORE)) {
          database.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        this.databasePromise = null
        reject(request.error ?? new Error('Could not open IndexedDB'))
      }
    })
    return this.databasePromise
  }
}
