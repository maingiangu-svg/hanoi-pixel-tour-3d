const viewpoint = ({
  id,
  name,
  position,
  target,
  recommendedFov,
  timeOfDay,
  landmarkId,
  standingRadius,
  layers,
}) => {
  const deltaX = target[0] - position[0]
  const deltaZ = target[2] - position[2]
  const length = Math.hypot(deltaX, deltaZ) || 1
  return {
    id,
    name,
    position,
    facing: [deltaX / length, deltaZ / length],
    target,
    recommendedFov,
    timeOfDay,
    landmarkId,
    standingRadius,
    layers,
  }
}

const timeWindow = (recommendedMinutes, startMinutes, endMinutes, label) => ({
  recommendedMinutes,
  window: [startMinutes, endMinutes],
  label,
})

const layers = (foreground, midground, background) => ({
  foreground,
  midground,
  background,
})

/**
 * Composition metadata only. It intentionally has no activation callback,
 * interaction radius or camera behavior; a later photo feature can consume it
 * without coupling the present world to a quest or fixed camera marker.
 */
export const HOAN_KIEM_PHOTO_VIEWPOINTS = deepFreeze([
  viewpoint({
    id: 'church-street-reveal',
    name: 'Nhà thờ Lớn từ cuối phố Nhà Chung',
    position: [0, 0, 10],
    target: [0, 12.5, -27],
    recommendedFov: 50,
    timeOfDay: timeWindow(1005, 930, 1080, 'Chiều dịu'),
    landmarkId: 'nhaThoLon',
    standingRadius: 2.5,
    layers: layers(
      ['street-lamps', 'church-plaza-planters'],
      ['nha-chung-road', 'church-plaza-staging'],
      ['nhaThoLon', 'church-towers', 'evening-sky'],
    ),
  }),
  viewpoint({
    id: 'turtle-tower-tree-aisle',
    name: 'Tháp Rùa giữa hai hàng cây',
    position: [108, 0, -91],
    target: [103, 2.4, 0],
    recommendedFov: 42,
    timeOfDay: timeWindow(465, 390, 570, 'Nắng sớm'),
    landmarkId: 'thapRua',
    standingRadius: 4,
    layers: layers(
      ['north-tree-grove-west', 'north-tree-grove-east'],
      ['north-promenade', 'future-walker-staging'],
      ['thapRua', 'lake-water', 'east-shore-skyline'],
    ),
  }),
  viewpoint({
    id: 'the-huc-through-foliage',
    name: 'Cầu Thê Húc qua tán lá',
    position: [160, 0, 60],
    target: [119, 1.2, 43.5],
    recommendedFov: 47,
    timeOfDay: timeWindow(990, 900, 1080, 'Chiều vàng'),
    landmarkId: 'cauTheHuc',
    standingRadius: 3.5,
    layers: layers(
      ['photo-bridge-framing-trees', 'east-lakeside-edge'],
      ['the-huc-bridge-deck', 'future-photo-staging'],
      ['cauTheHuc', 'ngoc-son-island', 'lake-water'],
    ),
  }),
  viewpoint({
    id: 'lakeside-pedestrian-depth',
    name: 'Nhịp người đi bộ trước mặt hồ',
    position: [58, 0, -3],
    target: [103, 2.1, 0],
    recommendedFov: 55,
    timeOfDay: timeWindow(1050, 960, 1140, 'Cuối chiều'),
    landmarkId: 'hoGuom',
    standingRadius: 2.5,
    layers: layers(
      ['west-promenade-lamps', 'future-pedestrian-foreground'],
      ['west-lakeside-walk', 'future-street-activity'],
      ['hoGuom', 'thapRua', 'east-shore-skyline'],
    ),
  }),
  viewpoint({
    id: 'old-quarter-sunset-corridor',
    name: 'Hoàng hôn xuyên qua dãy phố',
    position: [245, 0, 35],
    target: [188, 6, 35],
    recommendedFov: 50,
    timeOfDay: timeWindow(1055, 1020, 1100, 'Hoàng hôn'),
    landmarkId: 'phoCo',
    standingRadius: 4,
    layers: layers(
      ['photo-sunset-wires', 'old-quarter-side-signs'],
      ['the-huc-square-side-street', 'future-evening-staging'],
      ['west-building-row', 'church-district-silhouette', 'sunset-sky'],
    ),
  }),
  viewpoint({
    id: 'turtle-tower-reflection',
    name: 'Tháp Rùa và vệt phản chiếu',
    position: [84, 0, -86],
    target: [103, 1.35, 0],
    recommendedFov: 38,
    timeOfDay: timeWindow(1140, 1080, 1230, 'Chạng vạng'),
    landmarkId: 'thapRua',
    standingRadius: 3,
    layers: layers(
      ['north-lake-rail', 'low-tree-canopy'],
      ['photo-tower-reflection', 'lake-water'],
      ['thapRua', 'ngoc-son-trees', 'dusk-sky'],
    ),
  }),
  viewpoint({
    id: 'old-quarter-puddle-reflection',
    name: 'Phố Cổ phản chiếu trong vũng nước',
    position: [238, 0, -55],
    target: [274, 5, -47],
    recommendedFov: 52,
    timeOfDay: timeWindow(1090, 1020, 1200, 'Đầu tối'),
    landmarkId: 'phoCo',
    standingRadius: 3,
    layers: layers(
      ['photo-street-puddles', 'outer-road-curb'],
      ['old-quarter-road', 'future-passerby-staging'],
      ['old-quarter-east-04', 'layered-shopfronts', 'evening-sky'],
    ),
  }),
  viewpoint({
    id: 'cafe-street-frame',
    name: 'Từ hiên cà phê nhìn ra phố',
    position: [66.7, 0, -27],
    target: [84, 2, -24],
    recommendedFov: 58,
    timeOfDay: timeWindow(1065, 900, 1260, 'Quán lên đèn'),
    landmarkId: 'cafeBoHo',
    standingRadius: 0.7,
    layers: layers(
      ['photo-cafe-timber-frame', 'cafe-awning'],
      ['cafe-terrace', 'west-promenade', 'future-cafe-staging'],
      ['lake-tree-line', 'east-shore-buildings', 'evening-sky'],
    ),
  }),
  viewpoint({
    id: 'old-quarter-layered-signs',
    name: 'Biển hiệu nhiều lớp ở Phố Cổ',
    position: [235, 0, 35],
    target: [274, 5, 36],
    recommendedFov: 53,
    timeOfDay: timeWindow(1170, 1080, 1320, 'Phố lên đèn'),
    landmarkId: 'phoCo',
    standingRadius: 3.5,
    layers: layers(
      ['photo-old-quarter-hanging-signs', 'street-lamp'],
      ['old-quarter-side-road', 'future-shopper-staging'],
      ['old-quarter-east-08', 'stacked-balconies', 'shopfront-lights'],
    ),
  }),
  viewpoint({
    id: 'ngoc-son-bridge-entrance',
    name: 'Đền Ngọc Sơn từ đầu Cầu Thê Húc',
    position: [119, 0, 33],
    target: [119, 2.8, 53.6],
    recommendedFov: 48,
    timeOfDay: timeWindow(1110, 1020, 1230, 'Chạng vạng'),
    landmarkId: 'denNgocSon',
    standingRadius: 0.65,
    layers: layers(
      ['the-huc-red-rails', 'bridge-posts'],
      ['cauTheHuc', 'ngoc-son-gate', 'future-temple-staging'],
      ['denNgocSon', 'island-tree-canopy', 'evening-sky'],
    ),
  }),
])

export const HOAN_KIEM_PHOTO_COMPOSITION_TREES = deepFreeze([
  {
    id: 'the-huc-frame-south',
    position: [156, 53],
    scale: 1.08,
    material: 'foliageDark',
  },
  {
    id: 'the-huc-frame-north',
    position: [152, 65],
    scale: 0.94,
    material: 'foliageLight',
  },
])

export const HOAN_KIEM_PHOTO_REFLECTION_STRIPS = deepFreeze([
  { size: [0.28, 0.014, 9.5], position: [102.1, 0.036, -10.2] },
  { size: [0.18, 0.014, 7.2], position: [103.5, 0.038, -8.8] },
  { size: [0.42, 0.014, 5.4], position: [104.7, 0.04, -7.1] },
  { size: [0.12, 0.014, 6.5], position: [100.8, 0.039, -8.1] },
])

export const HOAN_KIEM_PHOTO_PUDDLES = deepFreeze([
  {
    id: 'old-quarter-puddle-main',
    size: [7.2, 0.018, 2.35],
    position: [245, 0.075, -52.5],
    rotationY: 0.09,
  },
  {
    id: 'old-quarter-puddle-small',
    size: [3.8, 0.016, 1.3],
    position: [249.2, 0.077, -49.7],
    rotationY: -0.12,
  },
])

export const HOAN_KIEM_PHOTO_HANGING_SIGNS = deepFreeze([
  {
    id: 'layered-sign-coffee',
    text: 'CÀ PHÊ',
    width: 2.35,
    height: 0.72,
    position: [267.5, 5.3, 28],
    rotationY: -Math.PI / 2,
    background: '#75433c',
  },
  {
    id: 'layered-sign-silk',
    text: 'LỤA VIỆT',
    width: 2.65,
    height: 0.78,
    position: [269, 4.3, 38.5],
    rotationY: -Math.PI / 2 + 0.08,
    background: '#315c55',
  },
  {
    id: 'layered-sign-tea',
    text: 'TRÀ SEN',
    width: 2.2,
    height: 0.66,
    position: [266.8, 6.15, 44],
    rotationY: -Math.PI / 2 - 0.06,
    background: '#8a613d',
  },
])

function deepFreeze(value) {
  if (Array.isArray(value)) value.forEach(deepFreeze)
  else if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}
