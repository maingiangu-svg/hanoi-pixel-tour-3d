/**
 * Shared art direction for "Hà Nội Stylized Realistic — Street Life Edition".
 *
 * Warm, saturated Vietnamese palette inspired by real Hanoi:
 * golden yellows, aged cream, terracotta reds, deep greens,
 * weathered stone, and lantern-lit night atmospheres.
 *
 * Keep authored geometry and gameplay data outside this module. Builders consume
 * these tokens so a facade, landmark or prop never invents its own visual
 * language.
 */
export const HANOI_VISUAL_TOKENS = Object.freeze({
  colors: Object.freeze({
    // ── Primary Vietnamese palette ──
    limeYellow: 0xE8C86A,       // Vàng tường Hà Nội — warm golden yellow
    agedCream: 0xF0E2C8,        // Kem cũ — warm ivory, aged plaster
    brickRed: 0xB85A3C,         // Gạch đỏ — terracotta, not too saturated
    doorGreen: 0x2D5A4E,        // Xanh cửa — deep teal green (traditional doors)
    foliageGreen: 0x3D6B3A,     // Xanh lá cây — lush tropical green
    warmStone: 0xC4B89A,        // Đá ấm — weathered limestone
    charcoal: 0x2E3334,         // Than — deep charcoal for shadows
    lakeWater: 0x1E5A66,        // Xanh nước hồ — deep teal, Hoan Kiem
    lampYellow: 0xF5BE58,       // Vàng đèn — warm amber lamp
    blueHour: 0x4A5D78,         // Giờ xanh — twilight blue

    // ── Extended Vietnamese palette ──
    terracotta: 0xC46D3A,       // Ngói đất nung — roof tile
    mossyGreen: 0x4A6B42,       // Xanh rêu — moss on old walls
    silkWhite: 0xF5EDE0,        // Trắng lụa — áo dài white
    lacquerRed: 0xA02020,       // Sơn mài đỏ — traditional lacquer
    bambooYellow: 0xD4A84B,     // Vàng tre — bamboo/scaffolding
    concreteGray: 0x9A9590,     // Xám bê tông — modern concrete
    wetAsphalt: 0x4A4E52,       // Đường nhựa ướt — after rain
    nightSky: 0x1A2538,         // Trời đêm — deep navy
    lanternRed: 0xE83030,       // Đèn lồng đỏ — vibrant lantern red
    lanternGold: 0xF5A623,      // Đèn lồng vàng — golden lantern
    phoSteam: 0xE8DDD0,         // Khói phở — warm steam white
    aoDaiWhite: 0xF2EBE0,       // Áo dài — slightly warm white
    nonLaYellow: 0xDCC68A,      // Nón lá — straw yellow
  }),
  materials: Object.freeze({
    // ── Stylized PBR materials — rougher, more character ──
    masonry: Object.freeze({ roughness: 0.92, metalness: 0.02 }),
    paintedWood: Object.freeze({ roughness: 0.78, metalness: 0.02 }),
    stone: Object.freeze({ roughness: 0.95, metalness: 0.01 }),
    metal: Object.freeze({ roughness: 0.55, metalness: 0.42 }),
    glass: Object.freeze({ roughness: 0.28, metalness: 0.05 }),
    water: Object.freeze({ roughness: 0.22, metalness: 0.08 }),
    emissive: Object.freeze({ intensity: 0.75 }),

    // ── New Vietnamese-specific materials ──
    roofTile: Object.freeze({ roughness: 0.88, metalness: 0.03 }),       // Ngói đỏ
    agedPlaster: Object.freeze({ roughness: 0.96, metalness: 0.0 }),     // Tường vôi cũ
    woodenShutter: Object.freeze({ roughness: 0.82, metalness: 0.02 }),  // Cửa chớp gỗ
    ironRailing: Object.freeze({ roughness: 0.48, metalness: 0.55 }),    // Lan can sắt
    marbleFloor: Object.freeze({ roughness: 0.35, metalness: 0.08 }),    // Sàn đá cẩm thạch
    ceramicTile: Object.freeze({ roughness: 0.42, metalness: 0.04 }),    // Gạch men
    concrete: Object.freeze({ roughness: 0.88, metalness: 0.02 }),       // Bê tông
    asphalt: Object.freeze({ roughness: 0.92, metalness: 0.0 }),         // Đường nhựa
    silkFabric: Object.freeze({ roughness: 0.45, metalness: 0.02 }),     // Lụa
    bamboo: Object.freeze({ roughness: 0.72, metalness: 0.02 }),         // Tre
  }),
  facadeKits: Object.freeze([
    Object.freeze({
      id: 'narrow-bay',
      bayCount: 2,
      recess: 0.22,
      balcony: 'alternating',
      roofline: 'parapet',
    }),
    Object.freeze({
      id: 'recessed-shop',
      bayCount: 3,
      recess: 0.32,
      balcony: 'none',
      roofline: 'cornice',
    }),
    Object.freeze({
      id: 'balcony-stack',
      bayCount: 2,
      recess: 0.18,
      balcony: 'stacked',
      roofline: 'stepped',
    }),
    Object.freeze({
      id: 'shutter-house',
      bayCount: 3,
      recess: 0.15,
      balcony: 'sparse',
      roofline: 'tile',
    }),
    Object.freeze({
      id: 'cafe-awning',
      bayCount: 2,
      recess: 0.36,
      balcony: 'single',
      roofline: 'cornice',
    }),
    Object.freeze({
      id: 'stepped-roof',
      bayCount: 3,
      recess: 0.24,
      balcony: 'alternating',
      roofline: 'stepped',
    }),
    Object.freeze({
      id: 'tube-house',            // Nhà ống classic — very narrow, very tall
      bayCount: 1,
      recess: 0.12,
      balcony: 'stacked',
      roofline: 'tile',
    }),
    Object.freeze({
      id: 'colonial-french',       // Kiểu Pháp — wider, ornate
      bayCount: 3,
      recess: 0.28,
      balcony: 'alternating',
      roofline: 'parapet',
    }),
  ]),
  signFamilies: Object.freeze([
    Object.freeze({
      id: 'painted-green',
      background: '#2D5A4E',
      foreground: '#F0E2C8',
      trim: 'agedCream',
    }),
    Object.freeze({
      id: 'brick-panel',
      background: '#B85A3C',
      foreground: '#F5EDE0',
      trim: 'brick',
    }),
    Object.freeze({
      id: 'cream-letterboard',
      background: '#E8C86A',
      foreground: '#2E3334',
      trim: 'stoneWarm',
    }),
    Object.freeze({
      id: 'lacquer-gold',
      background: '#A02020',
      foreground: '#F5BE58',
      trim: 'lacquer',
    }),
    Object.freeze({
      id: 'modern-white',
      background: '#F5EDE0',
      foreground: '#2E3334',
      trim: 'concrete',
    }),
  ]),
  treeVariants: Object.freeze([
    Object.freeze({
      id: 'compact',
      crownScale: [1.45, 1.25, 1.3],
      crownOffset: [0.18, 0, 0.12],
      secondaryScale: 0.68,
    }),
    Object.freeze({
      id: 'street-canopy',
      crownScale: [1.75, 1.3, 1.45],
      crownOffset: [-0.22, 0.08, 0],
      secondaryScale: 0.76,
    }),
    Object.freeze({
      id: 'lake-canopy',
      crownScale: [1.95, 1.45, 1.6],
      crownOffset: [-0.28, 0.12, 0.18],
      secondaryScale: 0.72,
    }),
    Object.freeze({
      id: 'tropical-palm',       // Cọ — iconic Vietnamese tree
      crownScale: [0.8, 2.2, 0.8],
      crownOffset: [0, 0.4, 0],
      secondaryScale: 0.5,
    }),
  ]),
  benchVariants: Object.freeze([
    Object.freeze({ id: 'stone', seat: 'stoneLight', back: 'stoneWarm', legs: 'stoneDark' }),
    Object.freeze({ id: 'wood-metal', seat: 'wood', back: 'wood', legs: 'metal' }),
    Object.freeze({ id: 'plastic-street', seat: 'stoneLight', back: 'stoneLight', legs: 'metal' }), // Ghế nhựa vỉa hè
  ]),
  // ── Vietnamese street props ──
  streetProps: Object.freeze({
    motorbikeColors: Object.freeze([
      0x2E3334, 0x4A4E52, 0x8B1A1A, 0x1A3A6B,
      0xF5EDE0, 0x3D6B3A, 0xA02020, 0xDCC68A,
      0x6B4226, 0x1A1A2E,
    ]),
    vendorCartColors: Object.freeze([
      0xB85A3C, 0xE8C86A, 0x2D5A4E, 0xA02020,
    ]),
    lanternStringColors: Object.freeze([
      0xE83030, // Đỏ
      0xF5A623, // Vàng
      0xFF6B35, // Cam
      0xE83030, // Đỏ (more red than others)
      0xF5BE58, // Vàng ấm
    ]),
  }),
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
