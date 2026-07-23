import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  getShopProfileForSign,
  getShopSellerPreset,
  SHOP_FRONT_PROFILES,
} from '../src/world/shops/shopProfiles.js'
import { isShopOpen } from '../src/world/shops/shopSchedules.js'
import { ShopManager } from '../src/world/shops/ShopManager.js'

test('business signs resolve to the intended data-driven shop profiles', () => {
  assert.equal(getShopProfileForSign('PHỞ GÀ').id, 'pho')
  assert.equal(getShopProfileForSign('BÚN CHẢ').id, 'bun')
  assert.equal(getShopProfileForSign('CƠM BÌNH DÂN').id, 'rice')
  assert.equal(getShopProfileForSign('CÀ PHÊ NHÀ THỜ').id, 'cafe')
  assert.equal(getShopProfileForSign('TRÀ CHANH').id, 'tea')
  assert.equal(getShopProfileForSign('BÁNH MÌ').id, 'bakery')
  assert.equal(getShopProfileForSign('NƯỚC MÁT').id, 'drinks')
  assert.equal(getShopProfileForSign('TẠP HÓA').id, 'general')
  assert.equal(getShopProfileForSign('HÀNG BẠC'), null)
})

test('food, cafe, tea and general shops honor their opening boundaries', () => {
  assert.equal(isShopOpen('breakfastDinner', 5 * 60 + 59), false)
  assert.equal(isShopOpen('breakfastDinner', 6 * 60), true)
  assert.equal(isShopOpen('breakfastDinner', 12 * 60), false)
  assert.equal(isShopOpen('breakfastDinner', 17 * 60), true)
  assert.equal(isShopOpen('riceMeals', 12 * 60), true)
  assert.equal(isShopOpen('riceMeals', 15 * 60), false)
  assert.equal(isShopOpen('cafe', 22 * 60 + 29), true)
  assert.equal(isShopOpen('cafe', 22 * 60 + 30), false)
  assert.equal(isShopOpen('tea', 13 * 60 + 59), false)
  assert.equal(isShopOpen('tea', 14 * 60), true)
  assert.equal(isShopOpen('general', 21 * 60 + 59), true)
  assert.equal(isShopOpen('general', 22 * 60), false)
})

test('seller presets vary by shop type and expose the future purchase seam', () => {
  const phoSeller = getShopSellerPreset(SHOP_FRONT_PROFILES.pho, 0)
  const secondPhoSeller = getShopSellerPreset(SHOP_FRONT_PROFILES.pho, 1)
  const cafeSeller = getShopSellerPreset(SHOP_FRONT_PROFILES.cafe, 0)

  assert.notEqual(phoSeller.id, secondPhoSeller.id)
  assert.notEqual(phoSeller.id, cafeSeller.id)
  assert.equal(phoSeller.accessory, 'apron')
  assert.equal(cafeSeller.accessory, 'apron')
})

test('shop manager de-duplicates stable shop IDs', () => {
  const parent = new THREE.Group()
  const created = []
  const manager = new ShopManager({
    kit: null,
    parent,
    frontFactory(options) {
      const shop = {
        ...options,
        lights: [],
        seller: { active: false },
        customer: null,
        dispose() {},
      }
      created.push(shop)
      return shop
    },
  })
  const definition = {
    id: 'pho-test',
    parent,
    sign: 'PHỞ GÀ',
    width: 5,
    position: [0, 0, 0],
  }

  const first = manager.addShop(definition)
  const second = manager.addShop(definition)

  assert.equal(first, second)
  assert.equal(created.length, 1)
  manager.dispose()
})
