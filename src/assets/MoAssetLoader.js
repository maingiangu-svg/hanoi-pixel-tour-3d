import * as THREE from 'three'
import portraitIdleUrl from './characters/mo/portrait-idle.png?url'
import portraitSmileUrl from './characters/mo/portrait-smile.png?url'
import portraitSuspectUrl from './characters/mo/portrait-suspect.png?url'
import portraitWorriedUrl from './characters/mo/portrait-worried.png?url'
import portraitSurprisedUrl from './characters/mo/portrait-surprised.png?url'
import portraitSadUrl from './characters/mo/portrait-sad.png?url'
import fullbodyIdleUrl from './characters/mo/fullbody-idle-clean.png?url'
import fullbodyChurchUrl from './characters/mo/fullbody-church-clean.png?url'
import { MO_CLEAN_PADDING } from './MoBillboardProcessor.js'

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

const MO_OUTFIT_ASSET_KEYS = Object.freeze({
  idle: 'fullbodyIdle',
  church: 'fullbodyChurch',
})

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function configureCleanFullbodyTexture(texture) {
  configureTexture(texture)
  const imageHeight = texture.image?.naturalHeight ?? texture.image?.height ?? 1
  texture.name = `${texture.name || 'Mơ fullbody'} (build-time clean alpha)`
  texture.userData.moBillboard = {
    contentHeight: Math.max(1, imageHeight - MO_CLEAN_PADDING * 2),
    bottomPadding: MO_CLEAN_PADDING,
  }
  return texture
}

export const MO_ASSETS = Object.freeze({
  ...MO_EXPRESSIONS,
  fullbodyIdle: MO_WORLD_OUTFITS.idle,
  fullbodyChurch: MO_WORLD_OUTFITS.church,
})

export class MoAssetLoader {
  constructor({ textureLoader = new THREE.TextureLoader(), assets = MO_ASSETS } = {}) {
    this.textureLoader = textureLoader
    this.assets = assets
    this.cache = new Map()
    this.failed = new Set()
    this.ready = this.preload()
  }

  preload() {
    return Promise.all(Object.keys(this.assets).map((key) => this.load(key)))
  }

  load(key) {
    if (this.cache.has(key)) return this.cache.get(key)

    const url = this.assets[key]
    if (!url) return Promise.resolve(null)

    const request = new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (sourceTexture) => {
          const texture = (
            key === MO_OUTFIT_ASSET_KEYS.idle || key === MO_OUTFIT_ASSET_KEYS.church
          )
            ? configureCleanFullbodyTexture(sourceTexture)
            : configureTexture(sourceTexture)
          resolve(texture)
        },
        undefined,
        () => {
          this.failed.add(key)
          resolve(null)
        },
      )
    })

    this.cache.set(key, request)
    return request
  }

  async getPortrait(expression = 'idle') {
    const key = Object.hasOwn(MO_EXPRESSIONS, expression) ? expression : 'idle'
    const texture = await this.load(key)
    if (texture) return texture
    if (key === 'idle') return null
    return this.load('idle')
  }

  getPortraitUrl(expression = 'idle') {
    const key = Object.hasOwn(MO_EXPRESSIONS, expression) ? expression : 'idle'
    if (this.failed.has(key)) return this.failed.has('idle') ? null : this.assets.idle
    return this.assets[key]
  }

  async getFullbody(outfitId = 'idle') {
    const assetKey = MO_OUTFIT_ASSET_KEYS[outfitId] ?? MO_OUTFIT_ASSET_KEYS.idle
    const texture = await this.load(assetKey)
    if (texture || assetKey === MO_OUTFIT_ASSET_KEYS.idle) return texture
    return this.load(MO_OUTFIT_ASSET_KEYS.idle)
  }

  dispose() {
    for (const request of this.cache.values()) {
      request.then((texture) => texture?.dispose())
    }
    this.cache.clear()
    this.failed.clear()
  }
}
