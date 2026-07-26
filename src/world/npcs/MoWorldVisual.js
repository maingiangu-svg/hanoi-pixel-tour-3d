import * as THREE from 'three'

export const MO_WORLD_HEIGHT = 1.72
export const MO_WORLD_FOCUS_RATIO = 0.82

function textureAspect(texture) {
  const image = texture?.image
  const width = image?.naturalWidth ?? image?.videoWidth ?? image?.width
  const height = image?.naturalHeight ?? image?.videoHeight ?? image?.height
  return Number.isFinite(width) && Number.isFinite(height) && height > 0
    ? width / height
    : 446 / 1493
}

export class MoWorldVisual {
  constructor({ parent, assetLoader }) {
    this.assetLoader = assetLoader
    this.profile = Object.freeze({
      id: 'mo',
      height: MO_WORLD_HEIGHT,
      focusRatio: MO_WORLD_FOCUS_RATIO,
    })
    this.currentOutfit = null
    this.walking = false
    this.active = true
    this.debugLookFrozen = false
    this.disposed = false

    this.group = new THREE.Group()
    this.group.name = 'Mơ.AssetBillboard'
    parent.add(this.group)

    this.visual = new THREE.Group()
    this.visual.name = 'Mơ.FullbodyAsset'
    this.group.add(this.visual)

    this.geometry = new THREE.PlaneGeometry(1, 1)
    this.material = new THREE.MeshLambertMaterial({
      // A restrained warm grade keeps the authored illustration in the same
      // material family as the low-poly masonry without changing the asset.
      color: 0xf5eee5,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
      side: THREE.FrontSide,
    })
    this.billboard = new THREE.Mesh(this.geometry, this.material)
    this.billboard.name = 'Mơ.FullbodyBillboard'
    this.billboard.renderOrder = 2
    this.billboard.castShadow = false
    this.billboard.receiveShadow = false
    this.billboard.visible = false
    this.visual.add(this.billboard)

    this.shadowGeometry = new THREE.CircleGeometry(0.32, 18)
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x101311,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      toneMapped: false,
    })
    this.contactShadow = new THREE.Mesh(
      this.shadowGeometry,
      this.shadowMaterial,
    )
    this.contactShadow.name = 'Mơ.ContactShadow'
    this.contactShadow.rotation.x = -Math.PI / 2
    this.contactShadow.position.set(0, 0.009, 0)
    this.group.add(this.contactShadow)
  }

  applyOutfit(texture, outfitId) {
    if (this.disposed || !texture) return false
    const width = MO_WORLD_HEIGHT * textureAspect(texture)
    this.material.map = texture
    this.material.needsUpdate = true
    this.billboard.scale.set(width, MO_WORLD_HEIGHT, 1)
    this.billboard.position.set(0, MO_WORLD_HEIGHT * 0.5, 0)
    this.billboard.visible = true
    this.currentOutfit = outfitId
    return true
  }

  update(elapsed) {
    if (!this.active || !this.billboard.visible) return
    const breath = Math.sin(elapsed * 1.25) * 0.003
    const walkLift = this.walking
      ? Math.max(0, Math.sin(elapsed * 6.2)) * 0.004
      : 0
    this.visual.scale.set(
      1 - breath * 0.18,
      1 + breath,
      1,
    )
    this.visual.position.y = walkLift
  }

  setActive(active) {
    this.active = Boolean(active)
    this.group.visible = this.active
  }

  setWalking(walking) {
    this.walking = Boolean(walking)
  }

  setDebugLookFrozen(frozen) {
    this.debugLookFrozen = Boolean(frozen)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.geometry.dispose()
    this.material.dispose()
    this.shadowGeometry.dispose()
    this.shadowMaterial.dispose()
    this.group.removeFromParent()
  }
}
