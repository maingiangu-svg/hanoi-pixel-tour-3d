import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  getShopCustomerRule,
  getShopCustomerTarget,
  SHOP_CUSTOMER_STATES,
} from '../src/world/shops/shopCustomerProfiles.js'
import {
  createShopCustomerSlots,
  ShopCustomerPool,
} from '../src/world/shops/ShopCustomerPool.js'
import { getMinutesUntilShopCloses } from '../src/world/shops/shopSchedules.js'
import { getNpcPreset } from '../src/npcs/npcPresets.js'
import { SHOP_FRONT_PROFILES } from '../src/world/shops/shopProfiles.js'

test('shop customers expose the complete bounded state vocabulary', () => {
  assert.deepEqual(SHOP_CUSTOMER_STATES, [
    'entering',
    'ordering',
    'waiting',
    'sitting',
    'eatingOrDrinking',
    'leaving',
  ])
})

test('customer density follows the intended meal and cafe peaks', () => {
  assert.equal(getShopCustomerTarget('pho', 8 * 60), 5)
  assert.equal(getShopCustomerTarget('rice', 12 * 60), 5)
  assert.equal(getShopCustomerTarget('cafe', 15 * 60), 4)
  assert.equal(getShopCustomerTarget('tea', 19 * 60), 4)
  assert.equal(getShopCustomerTarget('bakery', 11 * 60), 1)
  assert.equal(getShopCustomerTarget('pho', 12 * 60), 0)
})

test('closing and closed shops cannot request new customers', () => {
  assert.equal(
    getShopCustomerTarget('tea', 22 * 60 + 45, { closingSoon: true }),
    0,
  )
  assert.equal(
    getShopCustomerTarget('cafe', 12 * 60, { open: false }),
    0,
  )
  assert.equal(getMinutesUntilShopCloses('cafe', 22 * 60 + 15), 15)
  assert.equal(getMinutesUntilShopCloses('breakfastDinner', 12 * 60), 0)
})

test('per-shop pools have fixed maximums and non-overlapping stations', () => {
  for (const profileId of ['pho', 'bun', 'rice', 'cafe', 'tea', 'bakery', 'drinks']) {
    const rule = getShopCustomerRule(profileId)
    const slots = createShopCustomerSlots(profileId, 4.8)
    assert.equal(slots.length, rule.maxCustomers)
    const occupied = new Set(slots.map(({ x, z }) => `${x.toFixed(3)}:${z.toFixed(3)}`))
    assert.equal(occupied.size, slots.length)
  }
})

test('customer presets cover student, worker, tourist, middle-aged and elderly variants', () => {
  const presets = ['student', 'officeWorker', 'tourist', 'middleAged', 'elderly']
    .map((name) => getNpcPreset(name))
  assert.equal(new Set(presets.map(({ id }) => id)).size, 5)
  assert.ok(new Set(presets.map(({ top }) => top)).size >= 4)
})

test('shop customer slot rotations remain valid after a quarter-turn storefront', () => {
  const slots = createShopCustomerSlots('pho', 5, Math.PI / 2)
  assert.ok(slots.every(({ rotationY }) => Number.isFinite(rotationY)))
  assert.ok(slots.some(({ role }) => role === 'counter'))
  assert.equal(slots.filter(({ role }) => role === 'seat').length, 4)
  const station = new THREE.Vector2(slots[1].x, slots[1].z)
  assert.ok(station.length() > 0)
})

test('a detailed shop reuses a bounded pool and clears every customer when closed', () => {
  const pool = new ShopCustomerPool({
    shopId: 'pho-pool-test',
    profile: SHOP_FRONT_PROFILES.pho,
    width: 5,
    position: [0, 0, 0],
    rotationY: 0,
    variantIndex: 0,
    actorParent: new THREE.Group(),
    activityParent: null,
    kit: null,
  })

  pool.update(0, {
    minutes: 8 * 60,
    open: true,
    closingSoon: false,
    detailed: true,
  })
  assert.equal(pool.customers.length, 5)
  assert.equal(pool.activeCount, 5)

  for (let frame = 0; frame < 60 * 35; frame += 1) {
    pool.update(1 / 60, {
      minutes: 8 * 60 + frame / 60,
      open: true,
      closingSoon: false,
      detailed: true,
    })
    assert.ok(pool.customers.length <= 5)
  }

  pool.update(0, {
    minutes: 12 * 60,
    open: false,
    closingSoon: false,
    detailed: true,
  })
  assert.equal(pool.customers.length, 5)
  assert.equal(pool.activeCount, 0)
  pool.dispose()
})
