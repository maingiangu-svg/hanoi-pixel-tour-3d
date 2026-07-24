import * as THREE from 'three'
import gymmerFaceUrl from './characters/special/gymmer/face-front.png?url'
import basketballFaceUrl from './characters/special/basketball/face-front.png?url'
import moFaceUrl from './characters/special/mo/face-front.png?url'

export const MO_EXPRESSIONS = Object.freeze({
  idle: moFaceUrl,
  smile: moFaceUrl,
  suspect: moFaceUrl,
  worried: moFaceUrl,
  surprised: moFaceUrl,
  sad: moFaceUrl,
})

export const MO_WORLD_OUTFITS = Object.freeze({
  idle: 'idle',
  church: 'church',
})

export const SPECIAL_NPC_FACES = Object.freeze({
  gymmer: gymmerFaceUrl,
  basketball: basketballFaceUrl,
  mo: moFaceUrl,
})

const SPECIAL_FACE_ASSET_KEYS = Object.freeze({
  gymmer: 'specialFaceGymmer',
  basketball: 'specialFaceBasketball',
  mo: 'specialFaceMo',
})

export const MO_ASSETS = Object.freeze({
  ...MO_EXPRESSIONS,
  specialFaceGymmer: SPECIAL_NPC_FACES.gymmer,
  specialFaceBasketball: SPECIAL_NPC_FACES.basketball,
  specialFaceMo: SPECIAL_NPC_FACES.mo,
})

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/**
 * Dialogue portraits stay URL-only at startup. The three cut-out world faces
 * are decoded lazily when their NPC becomes active.
 */
export class MoAssetLoader {
  constructor({ textureLoader = null, assets = MO_ASSETS } = {}) {
    this.textureLoader = textureLoader
    this.assets = assets
    this.cache = new Map()
    this.urlCache = new Map()
    this.failedUrls = new Set()
    // DialogueUI consumes portrait URLs through an <img>. Keep startup URL-only
    // so the 1254px portrait is not decoded into an unused THREE.Texture.
    this.ready = Promise.resolve([])
  }

  preload() {
    return Promise.all(Object.keys(this.assets).map((key) => this.load(key)))
  }

  load(key) {
    if (this.cache.has(key)) return this.cache.get(key)
    const url = this.assets[key]
    if (!url) return Promise.resolve(null)

    let request = this.urlCache.get(url)
    if (!request) {
      const textureLoader = this.textureLoader ??= new THREE.TextureLoader()
      request = new Promise((resolve) => {
        textureLoader.load(
          url,
          (texture) => resolve(configureTexture(texture)),
          undefined,
          () => {
            this.failedUrls.add(url)
            resolve(null)
          },
        )
      })
      this.urlCache.set(url, request)
    }
    this.cache.set(key, request)
    return request
  }

  async getPortrait(expression = 'idle') {
    const key = Object.hasOwn(MO_EXPRESSIONS, expression) ? expression : 'idle'
    const texture = await this.load(key)
    if (texture || key === 'idle') return texture
    return this.load('idle')
  }

  getPortraitUrl(expression = 'idle') {
    const key = Object.hasOwn(MO_EXPRESSIONS, expression) ? expression : 'idle'
    const url = this.assets[key]
    if (this.failedUrls.has(url)) {
      return this.failedUrls.has(this.assets.idle) ? null : this.assets.idle
    }
    return url
  }

  getSpecialFace(profileId = 'mo') {
    const assetKey = SPECIAL_FACE_ASSET_KEYS[profileId] ?? SPECIAL_FACE_ASSET_KEYS.mo
    return this.load(assetKey)
  }

  getFullbody() {
    return this.getSpecialFace('mo')
  }

  dispose() {
    for (const request of new Set(this.urlCache.values())) {
      request.then((texture) => texture?.dispose())
    }
    this.cache.clear()
    this.urlCache.clear()
    this.failedUrls.clear()
  }
}
