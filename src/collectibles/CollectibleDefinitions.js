/**
 * Collectible definitions — Golden Turtles and Khuê Văn Các icons
 * scattered throughout Hanoi.
 */

export const COLLECTIBLE_TYPES = Object.freeze({
  GOLDEN_TURTLE: 'goldenTurtle',
  KHUAE_VAN_CAC: 'khaueVanCac',
  LOTUS: 'lotus',
})

export const COLLECTIBLES = Object.freeze([
  // ─── Golden Turtles (ẩn quanh Hồ Gươm) ───
  Object.freeze({
    id: 'turtle-lake-west',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Bờ Tây',
    description: 'Rùa Vàng ẩn sau hàng cây bên bờ tây Hồ Gươm.',
    position: [70, 0.5, -15],
    radius: 1.5,
    hint: 'Gần hàng cây bên bờ tây hồ, nhìn về phía Tháp Rùa.',
  }),
  Object.freeze({
    id: 'turtle-lake-north',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Bờ Bắc',
    description: 'Rùa Vàng trên bờ bắc, gần lan can.',
    position: [95, 0.5, 33],
    radius: 1.5,
    hint: 'Bờ bắc Hồ Gươm, gần lan can đá.',
  }),
  Object.freeze({
    id: 'turtle-tower-island',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Đảo Tháp Rùa',
    description: 'Rùa Vàng canh giữ đảo Tháp Rùa.',
    position: [103, 0.8, -3],
    radius: 1.2,
    hint: 'Ngay trên đảo Tháp Rùa, phía sau tháp.',
  }),
  Object.freeze({
    id: 'turtle-bridge',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Cầu Thê Húc',
    description: 'Rùa Vàng dưới chân Cầu Thê Húc.',
    position: [119, 0.3, 35],
    radius: 1.2,
    hint: 'Đầu cầu Thê Húc phía tây.',
  }),
  Object.freeze({
    id: 'turtle-temple',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Đền Ngọc Sơn',
    description: 'Rùa Vàng trong khuôn viên Đền Ngọc Sơn.',
    position: [122, 0.5, 52],
    radius: 1.2,
    hint: 'Sân trong Đền Ngọc Sơn.',
  }),
  Object.freeze({
    id: 'turtle-church',
    type: COLLECTIBLE_TYPES.GOLDEN_TURTLE,
    name: 'Rùa Vàng — Nhà thờ',
    description: 'Rùa Vàng ẩn trong sân Nhà thờ Lớn.',
    position: [8, 0.5, -8],
    radius: 1.2,
    hint: 'Sân sau Nhà thờ Lớn.',
  }),

  // ─── Khuê Văn Các icons (khắp thành phố) ───
  Object.freeze({
    id: 'kvc-old-quarter',
    type: COLLECTIBLE_TYPES.KHUAE_VAN_CAC,
    name: 'Khuê Văn Các — Phố Cổ',
    description: 'Biểu tượng Khuê Văn Các trong khu Phố Cổ.',
    position: [50, 0.5, 33],
    radius: 1.5,
    hint: 'Trên phố đi bộ Phố Cổ.',
  }),
  Object.freeze({
    id: 'kvc-pedestrian',
    type: COLLECTIBLE_TYPES.KHUAE_VAN_CAC,
    name: 'Khuê Văn Các — Phố đi bộ',
    description: 'Biểu tượng Khuê Văn Các ở phố đi bộ.',
    position: [145, 0.5, 110],
    radius: 1.5,
    hint: 'Phố đi bộ gần nhà hát.',
  }),
  Object.freeze({
    id: 'kvc-connector',
    type: COLLECTIBLE_TYPES.KHUAE_VAN_CAC,
    name: 'Khuê Văn Các — Phố nối',
    description: 'Biểu tượng Khuê Văn Các trên phố nối.',
    position: [55, 0.5, 22],
    radius: 1.5,
    hint: 'Trên phố nối giữa Nhà thờ và Phố Cổ.',
  }),
  Object.freeze({
    id: 'kvc-lake-south',
    type: COLLECTIBLE_TYPES.KHUAE_VAN_CAC,
    name: 'Khuê Văn Các — Bờ Nam',
    description: 'Biểu tượng Khuê Văn Các bên bờ nam hồ.',
    position: [105, 0.5, -33],
    radius: 1.5,
    hint: 'Bờ nam Hồ Gươm.',
  }),

  // ─── Lotus flowers (sen — quốc hoa) ───
  Object.freeze({
    id: 'lotus-lake',
    type: COLLECTIBLE_TYPES.LOTUS,
    name: 'Bông Sen — Hồ Gươm',
    description: 'Bông sen nổi trên mặt hồ.',
    position: [85, 0.1, -10],
    radius: 1.8,
    hint: 'Trên mặt nước Hồ Gươm, phía tây.',
  }),
  Object.freeze({
    id: 'lotus-temple',
    type: COLLECTIBLE_TYPES.LOTUS,
    name: 'Bông Sen — Đền Ngọc Sơn',
    description: 'Bông sen trong hồ Đền Ngọc Sơn.',
    position: [115, 0.1, 48],
    radius: 1.8,
    hint: 'Hồ nước trước Đền Ngọc Sơn.',
  }),
])

/**
 * Get total count by type.
 */
export function getCollectibleCountByType(type) {
  return COLLECTIBLES.filter((c) => c.type === type).length
}

/**
 * Get total collectible count.
 */
export function getTotalCollectibleCount() {
  return COLLECTIBLES.length
}
