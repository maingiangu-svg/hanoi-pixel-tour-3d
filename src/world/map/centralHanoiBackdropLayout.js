const building = ({
  x,
  z,
  width,
  depth,
  height,
  front,
  material,
  setback = 0.62,
  roof = 'flat',
  baseY = 0,
}) => ({
  x,
  z,
  width,
  depth,
  height,
  front,
  material,
  setback,
  roof,
  baseY,
})

const cluster = (id, name, center, activationRadius, buildings) => ({
  id,
  name,
  center,
  activationRadius,
  buildings,
})

/**
 * Low-detail buildings sit behind the authored street walls. They deliberately
 * have no collider: their job is to close wide views and create a varied Hanoi
 * centre skyline without changing the playable footprint.
 */
export const CENTRAL_HANOI_SKYLINE_CLUSTERS = deepFreeze([
  cluster('east-lake-skyline', 'Skyline khách sạn phía đông Hồ Gươm', [206, -25], 142, [
    building({ x: 206, z: -79, width: 16, depth: 18, height: 24, baseY: 10, front: 'negativeX', material: 'plaster', setback: 0.72 }),
    building({ x: 207, z: -60, width: 18, depth: 19, height: 31, baseY: 13.5, front: 'negativeX', material: 'oldYellow', setback: 0.6 }),
    building({ x: 206, z: -40, width: 17, depth: 18, height: 22, baseY: 9.5, front: 'negativeX', material: 'sage', roof: 'service' }),
    building({ x: 207, z: -20, width: 20, depth: 22, height: 35, baseY: 14.5, front: 'negativeX', material: 'plaster', setback: 0.66 }),
    building({ x: 206, z: 76, width: 17, depth: 20, height: 27, baseY: 11.5, front: 'negativeX', material: 'brick', setback: 0.72 }),
  ]),
  cluster('old-quarter-skyline', 'Skyline Phố Cổ nhiều nhịp', [306, -22], 116, [
    building({ x: 306, z: -102, width: 17, depth: 18, height: 21, front: 'negativeX', material: 'brick' }),
    building({ x: 311, z: -78, width: 19, depth: 19, height: 29, front: 'negativeX', material: 'plaster', setback: 0.68 }),
    building({ x: 307, z: -51, width: 18, depth: 17, height: 25, front: 'negativeX', material: 'oldYellow', roof: 'service' }),
    building({ x: 312, z: -24, width: 21, depth: 20, height: 34, front: 'negativeX', material: 'sage', setback: 0.59 }),
    building({ x: 307, z: 7, width: 17, depth: 18, height: 23, front: 'negativeX', material: 'brick' }),
    building({ x: 311, z: 34, width: 20, depth: 19, height: 30, front: 'negativeX', material: 'plaster', setback: 0.7 }),
    building({ x: 307, z: 63, width: 18, depth: 18, height: 26, front: 'negativeX', material: 'oldYellow' }),
    building({ x: 311, z: 93, width: 20, depth: 20, height: 32, front: 'negativeX', material: 'sage', roof: 'service' }),
  ]),
  cluster('north-lake-skyline', 'Skyline bờ bắc Hồ Gươm', [92, -181], 128, [
    building({ x: 17, z: -181, width: 20, depth: 18, height: 21, front: 'positiveZ', material: 'oldYellow' }),
    building({ x: 45, z: -184, width: 22, depth: 20, height: 28, front: 'positiveZ', material: 'plaster', setback: 0.68 }),
    building({ x: 75, z: -180, width: 20, depth: 18, height: 24, front: 'positiveZ', material: 'brick', roof: 'service' }),
    building({ x: 104, z: -184, width: 22, depth: 20, height: 32, front: 'positiveZ', material: 'sage', setback: 0.61 }),
    building({ x: 135, z: -181, width: 21, depth: 18, height: 25, front: 'positiveZ', material: 'oldYellow' }),
    building({ x: 166, z: -184, width: 23, depth: 20, height: 30, front: 'positiveZ', material: 'plaster', setback: 0.7 }),
  ]),
  cluster('south-lake-skyline', 'Skyline bờ nam Hồ Gươm', [116, 205], 132, [
    building({ x: 46, z: 203, width: 20, depth: 18, height: 22, front: 'negativeZ', material: 'sage' }),
    building({ x: 74, z: 207, width: 22, depth: 20, height: 29, front: 'negativeZ', material: 'plaster', setback: 0.65 }),
    building({ x: 104, z: 203, width: 20, depth: 18, height: 25, front: 'negativeZ', material: 'brick', roof: 'service' }),
    building({ x: 135, z: 207, width: 23, depth: 20, height: 33, front: 'negativeZ', material: 'oldYellow', setback: 0.6 }),
    building({ x: 168, z: 203, width: 21, depth: 18, height: 24, front: 'negativeZ', material: 'sage' }),
    building({ x: 198, z: 207, width: 22, depth: 20, height: 29, front: 'negativeZ', material: 'plaster', setback: 0.7 }),
  ]),
])

/**
 * Visual-only upgrades mounted just in front of existing collision-authority
 * facades. Positions are authored against the current buildings so they never
 * narrow the first-person route.
 */
export const CENTRAL_HANOI_COMMERCIAL_ZONES = deepFreeze([
  {
    id: 'nha-chung-connector',
    name: 'Mặt phố thương mại Nhà Chung',
    center: [48, 12],
    activationRadius: 82,
    fronts: [
      { position: [38, 1.62, 18.08], axis: 'x', width: 4.35, normal: -1, label: 'TIỆM BÁNH', family: 'brick' },
      { position: [45.5, 1.62, 7.36], axis: 'x', width: 4.45, normal: 1, label: 'NHÀ THUỐC', family: 'green' },
      { position: [55.86, 1.62, 6.4], axis: 'z', width: 4.25, normal: -1, label: 'CÀ PHÊ PHỐ', family: 'cream' },
      { position: [57.5, 1.62, -8.12], axis: 'x', width: 4.5, normal: 1, label: 'MINIMART', family: 'green' },
    ],
  },
  {
    id: 'old-quarter-retail',
    name: 'Mặt phố thương mại Phố Cổ',
    center: [272, -18],
    activationRadius: 92,
    fronts: [
      { position: [246, 1.62, -89.8], axis: 'x', width: 5.2, normal: 1, label: 'SÁCH & LỤA', family: 'green' },
      { position: [258.5, 1.62, -89.8], axis: 'x', width: 5.4, normal: 1, label: 'CÀ PHÊ NGÕ', family: 'cream' },
      { position: [246.5, 1.62, -76.4], axis: 'x', width: 5.0, normal: -1, label: 'TIỆM BÁNH', family: 'brick' },
      { position: [259, 1.62, -76.4], axis: 'x', width: 5.5, normal: -1, label: 'THỜI TRANG', family: 'green' },
      { position: [271.88, 1.62, -86], axis: 'z', width: 4.6, normal: -1, label: 'LỤA HÀ NỘI', family: 'cream' },
      { position: [271.88, 1.62, -47], axis: 'z', width: 4.8, normal: -1, label: 'THỜI TRANG', family: 'brick' },
      { position: [271.88, 1.62, -7], axis: 'z', width: 4.8, normal: -1, label: 'MINIMART 24H', family: 'green' },
      { position: [271.88, 1.62, 36], axis: 'z', width: 5.1, normal: -1, label: 'KHÁCH SẠN PHỐ', family: 'cream' },
    ],
  },
  {
    id: 'lakefront-retail',
    name: 'Mặt phố thương mại bờ hồ',
    center: [193, 5],
    activationRadius: 105,
    fronts: [
      { position: [194.08, 1.62, -60], axis: 'z', width: 4.8, normal: -1, label: 'CÀ PHÊ BỜ HỒ', family: 'brick' },
      { position: [194.08, 1.62, -20], axis: 'z', width: 4.65, normal: -1, label: 'TIỆM BÁNH', family: 'cream' },
      { position: [194.08, 1.62, 76], axis: 'z', width: 5.0, normal: -1, label: 'THỦ CÔNG VIỆT', family: 'green' },
    ],
  },
])

export const CENTRAL_HANOI_LAKE_REFLECTIONS = deepFreeze([
  { position: [102.2, 0.075, -17], size: [0.18, 0.015, 8.2], rotation: [0, -0.12, 0] },
  { position: [103.4, 0.076, -7], size: [0.26, 0.015, 6.4], rotation: [0, 0.09, 0] },
  { position: [104.1, 0.077, 1.5], size: [0.2, 0.015, 7.8], rotation: [0, -0.07, 0] },
  { position: [105.2, 0.078, 12], size: [0.3, 0.015, 6.6], rotation: [0, 0.1, 0] },
  { position: [149.2, 0.074, -35], size: [0.16, 0.014, 5.8], rotation: [0, 0.16, 0] },
  { position: [150.1, 0.075, -12], size: [0.22, 0.014, 7.1], rotation: [0, -0.08, 0] },
  { position: [148.8, 0.076, 18], size: [0.18, 0.014, 6.5], rotation: [0, 0.12, 0] },
])

function deepFreeze(value) {
  if (Array.isArray(value)) value.forEach(deepFreeze)
  else if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}
