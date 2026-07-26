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
    limeYellow: 0xcda765,
    agedCream: 0xe2d5ba,
    brickRed: 0x995343,
    doorGreen: 0x315f57,
    foliageGreen: 0x506d58,
    warmStone: 0xaaa79d,
    charcoal: 0x34393a,
    lakeWater: 0x35646c,
    lampYellow: 0xe7ac62,
    blueHour: 0x53647b,
  })
})

test('facades, signs and props have bounded reusable style variants', () => {
  assert.equal(HANOI_VISUAL_TOKENS.facadeKits.length, 6)
  assert.equal(HANOI_VISUAL_TOKENS.signFamilies.length, 3)
  assert.equal(HANOI_VISUAL_TOKENS.treeVariants.length, 3)
  assert.equal(HANOI_VISUAL_TOKENS.benchVariants.length, 2)
  assert.equal(getFacadeKit(6), getFacadeKit(0))
  assert.equal(getSignFamily(3), getSignFamily(0))
  assert.equal(getTreeVariant(3), getTreeVariant(0))
  assert.equal(getBenchVariant(2), getBenchVariant(0))
})

test('shared material families remain matte and low-poly friendly', () => {
  for (const descriptor of Object.values(HANOI_VISUAL_TOKENS.materials)) {
    if ('roughness' in descriptor) {
      assert.ok(descriptor.roughness >= 0.3)
      assert.ok(descriptor.roughness <= 1)
    }
    if ('metalness' in descriptor) {
      assert.ok(descriptor.metalness >= 0)
      assert.ok(descriptor.metalness <= 0.4)
    }
  }
})
