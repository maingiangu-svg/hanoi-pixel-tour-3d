import * as THREE from 'three'
import { ShopFront } from './ShopFront.js'
import { getShopProfileForSign, getShopSellerPreset } from './shopProfiles.js'
import { isShopOpen } from './shopSchedules.js'
import { disposeShopAmbientBubbleResources } from './ShopAmbientBubble.js'

const DETAIL_DISTANCE_SQUARED = 42 * 42
const CUSTOMER_DETAIL_DISTANCE_SQUARED = 16 * 16

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export class ShopManager {
  constructor({
    kit,
    parent,
    colliders = null,
    playerPosition = null,
    frontFactory = (options) => new ShopFront(options),
  }) {
    this.kit = kit
    this.colliders = colliders
    this.playerPosition = playerPosition
    this.frontFactory = frontFactory
    this.shops = []
    this.shopsById = new Map()
    this.profileCounts = new Map()
    this.lights = []

    this.actorRoot = new THREE.Group()
    this.actorRoot.name = 'Người bán và khách cửa hàng'
    parent.add(this.actorRoot)
  }

  addShop({
    id = null,
    parent,
    sign,
    width,
    position,
    rotationY = 0,
  }) {
    const profile = getShopProfileForSign(sign)
    if (!profile) return null

    const profileIndex = this.profileCounts.get(profile.id) ?? 0
    const shopId = id ?? `${slugify(sign)}-${profileIndex + 1}`
    const existing = this.shopsById.get(shopId)
    if (existing) return existing

    const shop = this.frontFactory({
      id: shopId,
      kit: this.kit,
      parent,
      actorParent: this.actorRoot,
      colliders: this.colliders,
      profile,
      sellerPreset: getShopSellerPreset(profile, profileIndex),
      sign,
      width,
      position,
      rotationY,
      variantIndex: profileIndex,
    })
    this.profileCounts.set(profile.id, profileIndex + 1)
    this.shops.push(shop)
    this.shopsById.set(shopId, shop)
    this.lights.push(...(shop.lights ?? []))
    return shop
  }

  update(deltaTime, clock, activeAreaName = 'outdoor') {
    const minutes = clock?.minutes
    const outdoor = activeAreaName === 'outdoor'

    this.shops.forEach((shop) => {
      const open = isShopOpen(shop.profile.scheduleId, minutes)
      shop.syncOpenState(open)

      const dx = (this.playerPosition?.x ?? 0) - shop.interactionPosition.x
      const dz = (this.playerPosition?.z ?? 0) - shop.interactionPosition.z
      const nearby = dx * dx + dz * dz <= DETAIL_DISTANCE_SQUARED
      const active = outdoor && nearby && shop.visibleInWorld
      const customerDetailed = (
        outdoor
        && dx * dx + dz * dz <= CUSTOMER_DETAIL_DISTANCE_SQUARED
        && shop.visibleInWorld
      )
      shop.setActorsActive(active, { customerDetailed })
      shop.updateActors(deltaTime, this.playerPosition, minutes)
    })
  }

  getInteractions(activeAreaName = 'outdoor') {
    if (activeAreaName !== 'outdoor') return []
    return this.shops.map((shop) => shop.getInteraction()).filter(Boolean)
  }

  getActiveCount() {
    return this.shops.reduce((count, shop) => (
      count
      + (shop.seller.active ? 1 : 0)
      + (shop.customerPool?.activeCount ?? 0)
    ), 0)
  }

  getProfileCounts() {
    return Object.fromEntries(this.profileCounts)
  }

  getInspectionTarget(profileId) {
    const shop = this.shops.find((candidate) => candidate.profile.id === profileId)
    if (!shop) return null
    return {
      position: shop.interactionPosition.clone(),
      lookAt: shop.focusPoint.clone(),
      shop,
    }
  }

  dispose() {
    this.shops.forEach((shop) => shop.dispose())
    this.shops.length = 0
    this.shopsById.clear()
    this.actorRoot.removeFromParent()
    disposeShopAmbientBubbleResources()
  }
}
