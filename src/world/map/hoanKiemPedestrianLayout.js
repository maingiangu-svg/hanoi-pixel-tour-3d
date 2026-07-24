export const HOAN_KIEM_LAKESIDE_OUTLINE = deepFreeze([
  [79, -78],
  [105, -85],
  [134, -75],
  [152, -52],
  [158, -20],
  [157, 11],
  [151, 33],
  [141, 41],
  [141, 69],
  [132, 83],
  [109, 85],
  [98, 73],
  [98, 44],
  [89, 41],
  [80, 35],
  [75, 21],
  [73, 0],
  [74, -26],
  [77, -54],
])

export const HOAN_KIEM_PEDESTRIAN_ZONES = deepFreeze([
  {
    id: 'pedestrian-performance-court',
    kind: 'performance',
    name: 'Sân biểu diễn',
    x: 66,
    z: 113,
    width: 50,
    depth: 24,
    material: 'terracotta',
    stagingCapacity: 24,
  },
  {
    id: 'pedestrian-crowd-court',
    kind: 'crowd',
    name: 'Khoảng trống cho đám đông',
    x: 146,
    z: 113,
    width: 50,
    depth: 24,
    material: 'plaza',
    stagingCapacity: 36,
  },
  {
    id: 'pedestrian-future-stalls',
    kind: 'reservedStalls',
    name: 'Vị trí dự kiến cho quầy hàng',
    x: 205,
    z: 111,
    width: 34,
    depth: 18,
    material: 'sidewalk',
    stagingCapacity: 10,
  },
  {
    id: 'pedestrian-portrait-court',
    kind: 'portrait',
    name: 'Khu vẽ chân dung',
    x: 30,
    z: 92,
    width: 26,
    depth: 16,
    material: 'sidewalk',
    stagingCapacity: 8,
  },
  {
    id: 'pedestrian-photo-court',
    kind: 'photo',
    name: 'Khu chụp ảnh',
    x: 165,
    z: 45,
    width: 20,
    depth: 14,
    material: 'plaza',
    stagingCapacity: 10,
  },
  {
    id: 'pedestrian-ice-cream-court',
    kind: 'iceCream',
    name: 'Khu bán kem dự kiến',
    x: 195,
    z: -105,
    width: 26,
    depth: 14,
    material: 'sidewalk',
    stagingCapacity: 8,
  },
  {
    id: 'pedestrian-rest-court',
    kind: 'rest',
    name: 'Khu nghỉ và ghế ngồi',
    x: 28,
    z: -105,
    width: 26,
    depth: 16,
    material: 'stoneWarm',
    stagingCapacity: 10,
  },
  {
    id: 'pedestrian-tree-grove-west',
    kind: 'treeGrove',
    name: 'Hàng cây phía tây',
    x: 72,
    z: -106,
    width: 42,
    depth: 16,
    material: 'stoneWarm',
    stagingCapacity: 8,
  },
  {
    id: 'pedestrian-tree-grove-east',
    kind: 'treeGrove',
    name: 'Hàng cây phía đông',
    x: 152,
    z: -106,
    width: 42,
    depth: 16,
    material: 'stoneWarm',
    stagingCapacity: 8,
  },
])

export const HOAN_KIEM_TREE_POSITIONS = deepFreeze([
  [55, -105, 0.9],
  [65, -108, 1.05],
  [76, -106, 0.94],
  [86, -110, 1.08],
  [136, -109, 1.02],
  [147, -105, 0.92],
  [158, -109, 1.08],
  [169, -105, 0.96],
])

export const HOAN_KIEM_BENCH_POSITIONS = deepFreeze([
  [20, -105, 0],
  [28, -105, 0],
  [36, -105, 0],
])

export const HOAN_KIEM_LAMP_POSITIONS = deepFreeze([
  [45, -116],
  [75, -116],
  [140, -116],
  [170, -116],
  [35, 132],
  [70, 132],
  [145, 132],
  [190, 132],
  [225, 132],
  [230, -75],
  [230, -30],
  [230, 15],
  [230, 90],
])

export const HOAN_KIEM_BOLLARD_POSITIONS = deepFreeze([
  ...createHorizontalBollards(-118, -20, 225, [[94, 122]]),
  ...createHorizontalBollards(132, -20, 225, [[94, 122]]),
  ...createVerticalBollards(232, -110, 120, [
    [-47, -33],
    [25, 39],
    [55, 73],
    [98, 114],
  ]),
  ...createVerticalBollards(-55.5, -110, 120, [
    [-47, -33],
    [3, 23],
    [55, 73],
  ]),
])

export const HOAN_KIEM_OUTER_VEHICLE_LANES = deepFreeze([
  {
    id: 'outer-vehicle-north',
    kind: 'vehicleRoad',
    name: 'Lối phương tiện phía bắc',
    x: 116,
    z: -132,
    width: 284,
    depth: 18,
    orientation: 'horizontal',
  },
  {
    id: 'outer-vehicle-south',
    kind: 'vehicleRoad',
    name: 'Lối phương tiện phía nam',
    x: 118,
    z: 148,
    width: 304,
    depth: 20,
    orientation: 'horizontal',
  },
  {
    id: 'outer-vehicle-east',
    kind: 'vehicleRoad',
    name: 'Lối phương tiện phía đông',
    x: 252,
    z: -4,
    width: 20,
    depth: 256,
    orientation: 'vertical',
  },
  {
    id: 'outer-vehicle-west',
    kind: 'vehicleRoad',
    name: 'Lối phương tiện phía tây',
    x: -72,
    z: 18,
    width: 18,
    depth: 264,
    orientation: 'vertical',
  },
])

function createHorizontalBollards(z, minX, maxX, gaps) {
  const positions = []
  for (let x = minX; x <= maxX; x += 8) {
    if (gaps.some(([start, end]) => x >= start && x <= end)) continue
    positions.push([x, z])
  }
  return positions
}

function createVerticalBollards(x, minZ, maxZ, gaps) {
  const positions = []
  for (let z = minZ; z <= maxZ; z += 10) {
    if (gaps.some(([start, end]) => z >= start && z <= end)) continue
    positions.push([x, z])
  }
  return positions
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze)
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
  }
  return Object.freeze(value)
}
