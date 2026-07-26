import * as THREE from 'three'
import portraitIdleUrl from './characters/mo/portrait-idle.png?url'
import portraitSmileUrl from './characters/mo/portrait-smile.png?url'
import portraitSuspectUrl from './characters/mo/portrait-suspect.png?url'
import portraitWorriedUrl from './characters/mo/portrait-worried.png?url'
import portraitSurprisedUrl from './characters/mo/portrait-surprised.png?url'
import portraitSadUrl from './characters/mo/portrait-sad.png?url'
import fullbodyIdleUrl from './characters/mo/fullbody-idle-clean.png?url'
import fullbodyChurchUrl from './characters/mo/fullbody-church-clean.png?url'
import gymmerFaceUrl from './characters/special/gymmer/face-front.png?url'
import basketballFaceUrl from './characters/special/basketball/face-front.png?url'

export const MO_EXPRESSIONS = Object.freeze({
  idle: portraitIdleUrl,
  smile: portraitSmileUrl,
  suspect: portraitSuspectUrl,
  worried: portraitWorriedUrl,
  surprised: portraitSurprisedUrl,
  sad: portraitSadUrl,
})

export const MO_WORLD_OUTFITS = Object.freeze({
  idle: fullbodyIdleUrl,
  church: fullbodyChurchUrl,
})

export const SPECIAL_NPC_FACES = Object.freeze({
  gymmer: gymmerFaceUrl,
  basketball: basketballFaceUrl,
})

const PORTRAIT_ASSET_KEYS = Object.freeze({
  idle: 'portraitIdle',
  smile: 'portraitSmile',
  suspect: 'portraitSuspect',
  worried: 'portraitWorried',
  surprised: 'portraitSurprised',
  sad: 'portraitSad',
})

const WORLD_OUTFIT_ASSET_KEYS = Object.freeze({
  idle: 'worldIdle',
  church: 'worldChurch',
})

const SPECIAL_FACE_ASSET_KEYS = Object.freeze({
  gymmer: 'specialFaceGymmer',
  basketball: 'specialFaceBasketball',
})

export const MO_ASSETS = Object.freeze({
  portraitIdle: MO_EXPRESSIONS.idle,
  portraitSmile: MO_EXPRESSIONS.smile,
  portraitSuspect: MO_EXPRESSIONS.suspect,
  portraitWorried: MO_EXPRESSIONS.worried,
  portraitSurprised: MO_EXPRESSIONS.surprised,
  portraitSad: MO_EXPRESSIONS.sad,
  worldIdle: MO_WORLD_OUTFITS.idle,
  worldChurch: MO_WORLD_OUTFITS.church,
  specialFaceGymmer: SPECIAL_NPC_FACES.gymmer,
  specialFaceBasketball: SPECIAL_NPC_FACES.basketball,
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
 * Single source of truth for every Mơ image. Dialogue uses the portrait URLs;
 * the two clean full-body textures are decoded once and retained for the
 * current world billboard.
 */
export class MoAssetLoader {
  constructor({ textureLoader = null, assets = MO_ASSETS } = {}) {
    this.textureLoader = textureLoader
    this.assets = assets
    this.cache = new Map()
    this.urlCache = new Map()
    this.failedUrls = new Set()
    this.ready = Promise.all([
      this.load(WORLD_OUTFIT_ASSET_KEYS.idle),
      this.load(WORLD_OUTFIT_ASSET_KEYS.church),
    ])
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
    const key = Object.hasOwn(PORTRAIT_ASSET_KEYS, expression)
      ? expression
      : 'idle'
    const texture = await this.load(PORTRAIT_ASSET_KEYS[key])
    if (texture || key === 'idle') return texture
    return this.load(PORTRAIT_ASSET_KEYS.idle)
  }

  getPortraitUrl(expression = 'idle') {
    const expressionId = Object.hasOwn(PORTRAIT_ASSET_KEYS, expression)
      ? expression
      : 'idle'
    const key = PORTRAIT_ASSET_KEYS[expressionId]
    const url = this.assets[key]
    if (this.failedUrls.has(url)) {
      const idleUrl = this.assets[PORTRAIT_ASSET_KEYS.idle]
      return this.failedUrls.has(idleUrl) ? null : idleUrl
    }
    return url
  }

  async getWorldOutfit(outfitId = 'idle') {
    const id = Object.hasOwn(WORLD_OUTFIT_ASSET_KEYS, outfitId)
      ? outfitId
      : 'idle'
    const texture = await this.load(WORLD_OUTFIT_ASSET_KEYS[id])
    if (texture || id === 'idle') return texture
    return this.load(WORLD_OUTFIT_ASSET_KEYS.idle)
  }

  getWorldOutfitUrl(outfitId = 'idle') {
    const id = Object.hasOwn(WORLD_OUTFIT_ASSET_KEYS, outfitId)
      ? outfitId
      : 'idle'
    return this.assets[WORLD_OUTFIT_ASSET_KEYS[id]]
  }

  getSpecialFace(profileId) {
    const assetKey = SPECIAL_FACE_ASSET_KEYS[profileId]
    return assetKey ? this.load(assetKey) : this.getPortrait('idle')
  }

  getFullbody(outfitId = 'idle') {
    return this.getWorldOutfit(outfitId)
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
