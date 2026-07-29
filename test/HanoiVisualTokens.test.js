import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HANOI_VISUAL_TOKENS,
  getBenchVariant,
  getFacadeKit,
  getSignFamily,
  getTreeVariant,
} from '../src/world/style/HanoiVisualTokens.js'

test('Hà Nội visual tokens expose the approved shared palette', () => {
  assert.deepEqual(HANOI_VISUAL_TOKENS.colors, {
    limeYellow: 0xE8C86A,
    agedCream: 0xF0E2C8,
    brickRed: 0xB85A3C,
    doorGreen: 0x2D5A4E,
    foliageGreen: 0x3D6B3A,
    warmStone: 0xC4B89A,
    charcoal: 0x2E3334,
    lakeWater: 0x1E5A66,
    lampYellow: 0xF5BE58,
    blueHour: 0x4A5D78,
    terracotta: 0xC46D3A,
    mossyGreen: 0x4A6B42,
    silkWhite: 0xF5EDE0,
    lacquerRed: 0xA02020,
    bambooYellow: 0xD4A84B,
    concreteGray: 0x9A9590,
    wetAsphalt: 0x4A4E52,
    nightSky: 0x1A2538,
    lanternRed: 0xE83030,
    lanternGold: 0xF5A623,
    phoSteam: 0xE8DDD0,
    aoDaiWhite: 0xF2EBE0,
    nonLaYellow: 0xDCC68A,
  })
})

test('facades, signs and props have bounded reusable style variants', () => {
  assert.equal(HANOI_VISUAL_TOKENS.facadeKits.length, 8)
  assert.equal(HANOI_VISUAL_TOKENS.signFamilies.length, 5)
  assert.equal(HANOI_VISUAL_TOKENS.treeVariants.length, 4)
  assert.equal(HANOI_VISUAL_TOKENS.benchVariants.length, 3)
  assert.equal(getFacadeKit(8), getFacadeKit(0))
  assert.equal(getSignFamily(5), getSignFamily(0))
  assert.equal(getTreeVariant(4), getTreeVariant(0))
  assert.equal(getBenchVariant(3), getBenchVariant(0))
})

test('shared material families remain matte and stylized', () => {
  for (const descriptor of Object.values(HANOI_VISUAL_TOKENS.materials)) {
    if ('roughness' in descriptor) {
      assert.ok(descriptor.roughness >= 0.15)
      assert.ok(descriptor.roughness <= 1)
    }
    if ('metalness' in descriptor) {
      assert.ok(descriptor.metalness >= 0)
      assert.ok(descriptor.metalness <= 0.6)
    }
  }
})
