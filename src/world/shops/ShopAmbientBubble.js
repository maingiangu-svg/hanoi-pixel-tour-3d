import * as THREE from 'three'

const BUBBLE_CACHE = new Map()

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.fill()
  context.stroke()
}

function createBubbleMaterial(text) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 104
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = 'rgba(248, 239, 218, 0.94)'
  context.strokeStyle = 'rgba(57, 45, 40, 0.82)'
  context.lineWidth = 5
  roundedRect(context, 8, 8, 496, 88, 24)
  context.fillStyle = '#342c29'
  context.font = '600 28px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 256, 53, 452)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  BUBBLE_CACHE.set(text, { material, texture })
  return material
}

function getBubbleMaterial(text) {
  return BUBBLE_CACHE.get(text)?.material ?? createBubbleMaterial(text)
}

export class ShopAmbientBubble {
  constructor(parent) {
    this.sprite = new THREE.Sprite()
    this.sprite.name = 'Thoại ambient của khách'
    this.sprite.position.set(0, 2.03, 0)
    this.sprite.scale.set(2.45, 0.5, 1)
    this.sprite.renderOrder = 8
    this.sprite.visible = false
    this.ownsInitialMaterial = true
    this.remaining = 0
    parent.add(this.sprite)
  }

  show(text, duration = 2.4) {
    const material = getBubbleMaterial(text)
    if (!material) return
    if (this.ownsInitialMaterial) {
      this.sprite.material.dispose()
      this.ownsInitialMaterial = false
    }
    this.sprite.material = material
    this.sprite.visible = true
    this.remaining = duration
  }

  update(deltaTime) {
    if (!this.sprite.visible) return
    this.remaining -= deltaTime
    if (this.remaining <= 0) this.hide()
  }

  hide() {
    this.remaining = 0
    this.sprite.visible = false
  }

  dispose() {
    if (this.ownsInitialMaterial) this.sprite.material.dispose()
    this.sprite.removeFromParent()
  }
}

export function disposeShopAmbientBubbleResources() {
  BUBBLE_CACHE.forEach(({ material, texture }) => {
    material.dispose()
    texture.dispose()
  })
  BUBBLE_CACHE.clear()
}
