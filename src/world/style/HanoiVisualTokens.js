/**
 * Shared art direction for “Hà Nội Low-Poly Đồng Bộ”.
 *
 * Keep authored geometry and gameplay data outside this module. Builders consume
 * these tokens so a facade, landmark or prop never invents its own visual
 * language.
 */
export const HANOI_VISUAL_TOKENS = Object.freeze({
  colors: Object.freeze({
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
  }),
  materials: Object.freeze({
    masonry: Object.freeze({ roughness: 0.9, metalness: 0 }),
    paintedWood: Object.freeze({ roughness: 0.82, metalness: 0 }),
    stone: Object.freeze({ roughness: 0.94, metalness: 0 }),
    metal: Object.freeze({ roughness: 0.62, metalness: 0.34 }),
    glass: Object.freeze({ roughness: 0.38, metalness: 0.03 }),
    water: Object.freeze({ roughness: 0.34, metalness: 0.06 }),
    emissive: Object.freeze({ intensity: 0.62 }),
  }),
  facadeKits: Object.freeze([
    Object.freeze({
      id: 'narrow-bay',
      bayCount: 2,
      recess: 0.18,
      balcony: 'alternating',
      roofline: 'parapet',
    }),
    Object.freeze({
      id: 'recessed-shop',
      bayCount: 3,
      recess: 0.28,
      balcony: 'none',
      roofline: 'cornice',
    }),
    Object.freeze({
      id: 'balcony-stack',
      bayCount: 2,
      recess: 0.14,
      balcony: 'stacked',
      roofline: 'stepped',
    }),
    Object.freeze({
      id: 'shutter-house',
      bayCount: 3,
      recess: 0.12,
      balcony: 'sparse',
      roofline: 'tile',
    }),
    Object.freeze({
      id: 'cafe-awning',
      bayCount: 2,
      recess: 0.32,
      balcony: 'single',
      roofline: 'cornice',
    }),
    Object.freeze({
      id: 'stepped-roof',
      bayCount: 3,
      recess: 0.2,
      balcony: 'alternating',
      roofline: 'stepped',
    }),
  ]),
  signFamilies: Object.freeze([
    Object.freeze({
      id: 'painted-green',
      background: '#315F57',
      foreground: '#E2D5BA',
      trim: 'agedCream',
    }),
    Object.freeze({
      id: 'brick-panel',
      background: '#995343',
      foreground: '#F0DDAE',
      trim: 'brick',
    }),
    Object.freeze({
      id: 'cream-letterboard',
      background: '#CDA765',
      foreground: '#34393A',
      trim: 'stoneWarm',
    }),
  ]),
  treeVariants: Object.freeze([
    Object.freeze({
      id: 'compact',
      crownScale: [1.35, 1.15, 1.2],
      crownOffset: [0.18, 0, 0.12],
      secondaryScale: 0.64,
    }),
    Object.freeze({
      id: 'street-canopy',
      crownScale: [1.65, 1.2, 1.35],
      crownOffset: [-0.22, 0.08, 0],
      secondaryScale: 0.72,
    }),
    Object.freeze({
      id: 'lake-canopy',
      crownScale: [1.85, 1.35, 1.5],
      crownOffset: [-0.28, 0.12, 0.18],
      secondaryScale: 0.68,
    }),
  ]),
  benchVariants: Object.freeze([
    Object.freeze({ id: 'stone', seat: 'stoneLight', back: 'stoneWarm', legs: 'stoneDark' }),
    Object.freeze({ id: 'wood-metal', seat: 'wood', back: 'wood', legs: 'metal' }),
  ]),
})

export const HANOI_COLORS = HANOI_VISUAL_TOKENS.colors

export function getFacadeKit(seed = 0) {
  const kits = HANOI_VISUAL_TOKENS.facadeKits
  return kits[Math.abs(Math.trunc(seed)) % kits.length]
}

export function getSignFamily(seed = 0) {
  const families = HANOI_VISUAL_TOKENS.signFamilies
  return families[Math.abs(Math.trunc(seed)) % families.length]
}

export function getTreeVariant(seed = 0) {
  const variants = HANOI_VISUAL_TOKENS.treeVariants
  return variants[Math.abs(Math.trunc(seed)) % variants.length]
}

export function getBenchVariant(seed = 0) {
  const variants = HANOI_VISUAL_TOKENS.benchVariants
  return variants[Math.abs(Math.trunc(seed)) % variants.length]
}
