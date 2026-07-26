export const DEFAULT_PHOTO_LIMIT = 24
export const DEFAULT_THUMBNAIL_SIZE = Object.freeze({
  width: 480,
  height: 320,
})

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function createFingerprint(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return bytesToHex(new Uint8Array(digest))
  }

  // Deterministic fallback for environments without Web Crypto. It is only
  // used after a capture, never during the render loop.
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `${blob.size}:${(hash >>> 0).toString(16)}`
}

function encodeCanvas(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Không thể tạo thumbnail cho ảnh vừa chụp'))
    }, type, quality)
  })
}

export async function createPhotoThumbnail(
  source,
  {
    maxWidth = DEFAULT_THUMBNAIL_SIZE.width,
    maxHeight = DEFAULT_THUMBNAIL_SIZE.height,
    quality = 0.72,
    documentRef = globalThis.document,
    createBitmap = globalThis.createImageBitmap?.bind(globalThis),
  } = {},
) {
  if (!(source instanceof Blob)) {
    throw new TypeError('Photo thumbnail source must be a Blob')
  }
  if (!documentRef?.createElement || !createBitmap) {
    throw new Error('This browser cannot create photo thumbnails')
  }

  const bitmap = await createBitmap(source)
  try {
    const scale = Math.min(
      1,
      maxWidth / Math.max(bitmap.width, 1),
      maxHeight / Math.max(bitmap.height, 1),
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = documentRef.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Không thể khởi tạo canvas thumbnail')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    return await encodeCanvas(canvas, 'image/jpeg', quality)
  } finally {
    bitmap.close?.()
  }
}

function validatePhoto(photo) {
  if (!(photo?.image instanceof Blob)) {
    throw new TypeError('PhotoStore requires a captured photo Blob')
  }
}

export class PhotoStore {
  constructor({
    limit = DEFAULT_PHOTO_LIMIT,
    thumbnailFactory = createPhotoThumbnail,
    fingerprintFactory = createFingerprint,
    urlApi = globalThis.URL,
  } = {}) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('PhotoStore limit must be a positive integer')
    }
    if (!urlApi?.createObjectURL || !urlApi?.revokeObjectURL) {
      throw new TypeError('PhotoStore requires an object URL implementation')
    }

    this.limit = limit
    this.thumbnailFactory = thumbnailFactory
    this.fingerprintFactory = fingerprintFactory
    this.urlApi = urlApi
    this.records = []
    this.recordsByFingerprint = new Map()
    this.pendingByFingerprint = new Map()
    this.listeners = new Set()
    this.nextId = 1
    this.disposed = false
  }

  get size() {
    return this.records.length
  }

  getAll() {
    return [...this.records]
  }

  get(id) {
    return this.records.find((record) => record.id === id) ?? null
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('PhotoStore subscriber must be a function')
    }
    this.listeners.add(listener)
    listener(this.getAll())
    return () => this.listeners.delete(listener)
  }

  async add(photo) {
    if (this.disposed) throw new Error('PhotoStore has been disposed')
    validatePhoto(photo)
    const fingerprint = await this.fingerprintFactory(photo.image)
    if (this.disposed) throw new Error('PhotoStore has been disposed')

    const existing = this.recordsByFingerprint.get(fingerprint)
    if (existing) {
      this.#promoteDuplicate(existing, photo)
      return { record: existing, duplicate: true }
    }

    const pending = this.pendingByFingerprint.get(fingerprint)
    if (pending) {
      const result = await pending
      this.#promoteDuplicate(result.record, photo)
      return { record: result.record, duplicate: true }
    }

    const task = this.#createRecord(photo, fingerprint)
    this.pendingByFingerprint.set(fingerprint, task)
    try {
      return await task
    } finally {
      this.pendingByFingerprint.delete(fingerprint)
    }
  }

  delete(id) {
    const index = this.records.findIndex((record) => record.id === id)
    if (index < 0) return false
    const [record] = this.records.splice(index, 1)
    this.recordsByFingerprint.delete(record.fingerprint)
    this.#releaseRecord(record)
    this.#notify()
    return true
  }

  clear() {
    for (const record of this.records) this.#releaseRecord(record)
    this.records.length = 0
    this.recordsByFingerprint.clear()
    this.#notify()
  }

  async #createRecord(photo, fingerprint) {
    const thumbnail = await this.thumbnailFactory(photo.image)
    if (!(thumbnail instanceof Blob)) {
      throw new TypeError('Photo thumbnail factory must return a Blob')
    }
    if (this.disposed) throw new Error('PhotoStore has been disposed')

    let fullUrl = null
    let thumbnailUrl = null
    try {
      fullUrl = this.urlApi.createObjectURL(photo.image)
      thumbnailUrl = this.urlApi.createObjectURL(thumbnail)
      if (this.disposed) throw new Error('PhotoStore has been disposed')

      const record = {
        id: photo.capture?.id ?? photo.id ?? `photo-${this.nextId++}`,
        fingerprint,
        photo,
        thumbnail,
        fullUrl,
        thumbnailUrl,
      }
      this.records.unshift(record)
      this.recordsByFingerprint.set(fingerprint, record)
      while (this.records.length > this.limit) {
        const evicted = this.records.pop()
        this.recordsByFingerprint.delete(evicted.fingerprint)
        this.#releaseRecord(evicted)
      }
      this.#notify()
      return { record, duplicate: false }
    } catch (error) {
      if (fullUrl) this.urlApi.revokeObjectURL(fullUrl)
      if (thumbnailUrl) this.urlApi.revokeObjectURL(thumbnailUrl)
      throw error
    }
  }

  #promoteDuplicate(record, photo) {
    // Keep the already-owned image Blob and URL. Only its capture metadata is
    // refreshed, so repeated identical captures do not retain another full
    // image in the album.
    const capture = photo.capture
      ? Object.freeze({ ...photo.capture, id: record.id })
      : null
    const metadata = photo.metadata && capture
      ? Object.freeze({ ...photo.metadata, capture })
      : photo.metadata
    record.photo = {
      ...photo,
      id: record.id,
      capture: capture ?? photo.capture,
      metadata,
      image: record.photo.image,
    }
    const currentIndex = this.records.indexOf(record)
    if (currentIndex > 0) {
      this.records.splice(currentIndex, 1)
      this.records.unshift(record)
    }
    this.#notify()
  }

  #releaseRecord(record) {
    this.urlApi.revokeObjectURL(record.fullUrl)
    this.urlApi.revokeObjectURL(record.thumbnailUrl)
  }

  #notify() {
    const snapshot = this.getAll()
    for (const listener of this.listeners) listener(snapshot)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.clear()
    this.listeners.clear()
    this.pendingByFingerprint.clear()
  }
}
