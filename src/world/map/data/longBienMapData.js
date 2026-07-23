import { MAP_MOBILITY_METADATA } from './mapMobilityMetadata.js'

const SOURCE = 'hanoi-pixel-tour-2d/src/data/mapLongBien.js'
const mobility = MAP_MOBILITY_METADATA.longBien

export const sourceCounts = Object.freeze({
  walkZones: 14,
  water: 1,
  groundPatches: 5,
  buildings: 32,
  shops: 3,
  landmarks: 3,
  exits: 2,
  decorations: 69,
  parkingSpots: 1,
  totalGeometryEntries: 130,
})

const walkZones = Object.freeze([
  { id: 'lb-zone-west-sidewalk', x: 350, y: 88, width: 900, height: 1540, kind: 'sidewalk', sourceRef: `${SOURCE}:13` },
  { id: 'lb-zone-embankment-sidewalk', x: 1010, y: 420, width: 690, height: 1040, kind: 'sidewalk', sourceRef: `${SOURCE}:14` },
  { id: 'lb-zone-riverside-plaza', x: 1460, y: 520, width: 270, height: 950, kind: 'plaza', sourceRef: `${SOURCE}:15` },
  { id: 'lb-zone-west-east-road', x: 0, y: 840, width: 1240, height: 118, kind: 'road', sourceRef: `${SOURCE}:16` },
  { id: 'lb-zone-west-north-road', x: 232, y: 250, width: 116, height: 1360, kind: 'road', sourceRef: `${SOURCE}:17` },
  { id: 'lb-zone-market-north-road', x: 420, y: 280, width: 760, height: 106, kind: 'road', sourceRef: `${SOURCE}:18` },
  { id: 'lb-zone-market-south-road', x: 420, y: 1160, width: 980, height: 110, kind: 'road', sourceRef: `${SOURCE}:19` },
  { id: 'lb-zone-market-cross-road', x: 760, y: 720, width: 110, height: 560, kind: 'road', sourceRef: `${SOURCE}:20` },
  { id: 'lb-zone-dong-xuan-plaza', x: 500, y: 430, width: 560, height: 270, kind: 'plaza', sourceRef: `${SOURCE}:21` },
  { id: 'lb-zone-bridge-approach', x: 856, y: 592, width: 265, height: 104, kind: 'sidewalk', sourceRef: `${SOURCE}:22` },
  { id: 'lb-zone-bridge-upper-deck', x: 1080, y: 530, width: 1760, height: 128, kind: 'bridge', sourceRef: `${SOURCE}:23` },
  { id: 'lb-zone-bridge-lower-deck', x: 1090, y: 660, width: 1760, height: 64, kind: 'bridge', sourceRef: `${SOURCE}:24` },
  { id: 'lb-zone-bus-stop-sidewalk', x: 1240, y: 1268, width: 410, height: 138, kind: 'sidewalk', sourceRef: `${SOURCE}:25` },
  { id: 'lb-zone-residential-sidewalk', x: 1030, y: 1080, width: 360, height: 92, kind: 'sidewalk', sourceRef: `${SOURCE}:26` },
])

const water = Object.freeze([
  {
    id: 'lb-water-song-hong',
    x: 1760,
    y: 0,
    width: 1240,
    height: 1800,
    label: 'Sông Hồng',
    kind: 'river',
    sourceRef: `${SOURCE}:29`,
  },
])

const groundPatches = Object.freeze([
  { id: 'lb-ground-west-paving', x: 0, y: 0, width: 1760, height: 1800, kind: 'paving', layer: 0, sourceRef: `${SOURCE}:32` },
  { id: 'lb-ground-market-brick', x: 362, y: 98, width: 860, height: 1228, kind: 'brick', layer: 1, sourceRef: `${SOURCE}:33` },
  { id: 'lb-ground-embankment', x: 1000, y: 420, width: 760, height: 1040, kind: 'embankment', layer: 2, sourceRef: `${SOURCE}:34` },
  { id: 'lb-ground-residential-brick', x: 1010, y: 1060, width: 660, height: 390, kind: 'brick', layer: 3, sourceRef: `${SOURCE}:35` },
  { id: 'lb-ground-river-grass-edge', x: 1742, y: 0, width: 18, height: 1800, kind: 'grass', layer: 4, sourceRef: `${SOURCE}:36` },
])

const buildings = Object.freeze([
  {
    id: 'lb-building-north-row-01', kind: 'tubeHouse', x: 420, y: 130, width: 74, height: 104,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'SẮT', facadeVariant: 0,
    balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 0, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-02', kind: 'tubeHouse', x: 504, y: 130, width: 74, height: 116,
    color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'TRÀ', facadeVariant: 1,
    balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 1, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-03', kind: 'tubeHouse', x: 588, y: 130, width: 74, height: 128,
    color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'PHỞ', facadeVariant: 2,
    balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false,
    generatedIndex: 2, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-04', kind: 'tubeHouse', x: 672, y: 130, width: 74, height: 104,
    color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'KHO', facadeVariant: 3,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 3, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-05', kind: 'tubeHouse', x: 756, y: 130, width: 74, height: 116,
    color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'XE', facadeVariant: 4,
    balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 4, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-06', kind: 'tubeHouse', x: 840, y: 130, width: 74, height: 128,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'BÚN', facadeVariant: 0,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 5, sourceRef: `${SOURCE}:39`,
  },
  {
    id: 'lb-building-north-row-07', kind: 'tubeHouse', x: 924, y: 130, width: 74, height: 104,
    color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'ĐIỆN', facadeVariant: 1,
    balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: true,
    generatedIndex: 6, sourceRef: `${SOURCE}:39`,
  },

  {
    id: 'lb-building-middle-row-01', kind: 'tubeHouse', x: 420, y: 980, width: 78, height: 102,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'PHỞ', facadeVariant: 0,
    balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 0, sourceRef: `${SOURCE}:40`,
  },
  {
    id: 'lb-building-middle-row-02', kind: 'tubeHouse', x: 508, y: 980, width: 78, height: 114,
    color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'TRÀ', facadeVariant: 1,
    balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 1, sourceRef: `${SOURCE}:40`,
  },
  {
    id: 'lb-building-middle-row-03', kind: 'tubeHouse', x: 596, y: 980, width: 78, height: 126,
    color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'CƠM', facadeVariant: 2,
    balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false,
    generatedIndex: 2, sourceRef: `${SOURCE}:40`,
  },
  {
    id: 'lb-building-middle-row-04', kind: 'tubeHouse', x: 684, y: 980, width: 78, height: 102,
    color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'BIA', facadeVariant: 3,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 3, sourceRef: `${SOURCE}:40`,
  },
  {
    id: 'lb-building-middle-row-05', kind: 'tubeHouse', x: 772, y: 980, width: 78, height: 114,
    color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'XE', facadeVariant: 4,
    balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 4, sourceRef: `${SOURCE}:40`,
  },

  {
    id: 'lb-building-south-row-01', kind: 'tubeHouse', x: 430, y: 1310, width: 76, height: 106,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'CỐM', facadeVariant: 0,
    balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 0, sourceRef: `${SOURCE}:41`,
  },
  {
    id: 'lb-building-south-row-02', kind: 'tubeHouse', x: 516, y: 1310, width: 76, height: 118,
    color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'TRÀ', facadeVariant: 1,
    balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 1, sourceRef: `${SOURCE}:41`,
  },
  {
    id: 'lb-building-south-row-03', kind: 'tubeHouse', x: 602, y: 1310, width: 76, height: 130,
    color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'BÚN', facadeVariant: 2,
    balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false,
    generatedIndex: 2, sourceRef: `${SOURCE}:41`,
  },
  {
    id: 'lb-building-south-row-04', kind: 'tubeHouse', x: 688, y: 1310, width: 76, height: 106,
    color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'CAFE', facadeVariant: 3,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 3, sourceRef: `${SOURCE}:41`,
  },
  {
    id: 'lb-building-south-row-05', kind: 'tubeHouse', x: 774, y: 1310, width: 76, height: 118,
    color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'SÁCH', facadeVariant: 4,
    balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 4, sourceRef: `${SOURCE}:41`,
  },
  {
    id: 'lb-building-south-row-06', kind: 'tubeHouse', x: 860, y: 1310, width: 76, height: 130,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'CHỢ', facadeVariant: 0,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 5, sourceRef: `${SOURCE}:41`,
  },

  {
    id: 'lb-building-upper-east-row-01', kind: 'tubeHouse', x: 900, y: 138, width: 76, height: 108,
    color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'GẠCH', facadeVariant: 0,
    balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 0, sourceRef: `${SOURCE}:42`,
  },
  {
    id: 'lb-building-upper-east-row-02', kind: 'tubeHouse', x: 988, y: 138, width: 76, height: 120,
    color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'SƠN', facadeVariant: 1,
    balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false,
    generatedIndex: 1, sourceRef: `${SOURCE}:42`,
  },
  {
    id: 'lb-building-upper-east-row-03', kind: 'tubeHouse', x: 1076, y: 138, width: 76, height: 132,
    color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'GỖ', facadeVariant: 2,
    balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false,
    generatedIndex: 2, sourceRef: `${SOURCE}:42`,
  },
  {
    id: 'lb-building-upper-east-row-04', kind: 'tubeHouse', x: 1164, y: 138, width: 76, height: 108,
    color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'BIA', facadeVariant: 3,
    balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true,
    generatedIndex: 3, sourceRef: `${SOURCE}:42`,
  },

  { id: 'lb-building-apartment-01', kind: 'collective', x: 1070, y: 900, width: 118, height: 146, color: '#c8b58b', roof: '#8c4a35', facadeVariant: 0, generatedIndex: 0, sourceRef: `${SOURCE}:43` },
  { id: 'lb-building-apartment-02', kind: 'apartment', x: 1206, y: 900, width: 118, height: 166, color: '#aeb3aa', roof: '#5e646a', facadeVariant: 1, generatedIndex: 1, sourceRef: `${SOURCE}:43` },
  { id: 'lb-building-apartment-03', kind: 'collective', x: 1342, y: 900, width: 118, height: 146, color: '#c8b58b', roof: '#8c4a35', facadeVariant: 2, generatedIndex: 2, sourceRef: `${SOURCE}:43` },

  { id: 'lb-building-cho-dong-xuan-hall', kind: 'marketHall', x: 540, y: 392, width: 470, height: 246, color: '#f0c46b', roof: '#c73c35', sourceRef: `${SOURCE}:44` },
  { id: 'lb-building-west-tube-house', kind: 'tubeHouse', x: 90, y: 680, width: 104, height: 126, color: '#9eced6', roof: '#9e4038', door: '#274e68', sourceRef: `${SOURCE}:45` },
  { id: 'lb-building-embankment-tube-house', kind: 'tubeHouse', x: 1040, y: 780, width: 102, height: 118, color: '#e7a768', roof: '#88443d', door: '#5d3b28', sourceRef: `${SOURCE}:46` },
  { id: 'lb-building-tra-da-cafe', kind: 'cafeFront', x: 1136, y: 760, width: 118, height: 92, color: '#d7a65b', roof: '#88443d', sign: 'TRÀ ĐÁ', sourceRef: `${SOURCE}:47` },
  { id: 'lb-building-com-cafe', kind: 'cafeFront', x: 1520, y: 1168, width: 120, height: 92, color: '#d8b35f', roof: '#315f8f', sign: 'CỐM', sourceRef: `${SOURCE}:48` },
  { id: 'lb-building-river-wall-north', kind: 'wall', x: 1700, y: 0, width: 42, height: 500, color: '#c28d54', sourceRef: `${SOURCE}:49` },
  { id: 'lb-building-river-wall-south', kind: 'wall', x: 1700, y: 730, width: 42, height: 1070, color: '#c28d54', sourceRef: `${SOURCE}:50` },
])

const shops = Object.freeze([
  { id: 'shopPhoGanh', foodId: 'phoGanh', x: 404, y: 1080, width: 164, height: 78, sourceRef: `${SOURCE}:99` },
  { id: 'shopComLangVong', foodId: 'comLangVong', x: 1212, y: 1182, width: 170, height: 78, sourceRef: `${SOURCE}:100` },
  { id: 'shopTraDa', foodId: 'traDa', x: 910, y: 760, width: 150, height: 70, sourceRef: `${SOURCE}:101` },
])

const landmarks = Object.freeze([
  {
    id: 'cauLongBien', name: 'Cầu Long Biên', kind: 'longBridge',
    x: 1060, y: 470, width: 1800, height: 270, solid: false, range: 110,
    interactionPoint: { x: 1125, y: 610, radius: 52, visibleRange: 250, labelOffsetY: -34 },
    quizId: 'cauLongBien', stamp: 'Tem Cầu Long Biên',
    description: 'Cây cầu lịch sử bắc qua Sông Hồng.', sourceRef: `${SOURCE}:53-67`,
  },
  {
    id: 'choDongXuan', name: 'Chợ Đồng Xuân', kind: 'market',
    x: 540, y: 392, width: 470, height: 246, solid: true, range: 112,
    interactionPoint: { x: 508, y: 665, radius: 50, visibleRange: 230, labelOffsetY: -34 },
    quizId: 'choDongXuan', stamp: 'Tem Chợ Đồng Xuân',
    description: 'Khu chợ lâu đời nằm trong vùng phố cổ Hà Nội.', sourceRef: `${SOURCE}:68-81`,
    duplicateGeometryBuildingId: 'lb-building-cho-dong-xuan-hall',
  },
  {
    id: 'songHong', name: 'Sông Hồng', kind: 'riverLabel',
    x: 1760, y: 0, width: 1240, height: 1800, solid: false, priority: 9, range: 90,
    interactionPoint: { x: 1690, y: 610, radius: 50, visibleRange: 240, labelOffsetY: -34 },
    stamp: 'Tem Sông Hồng',
    description: 'Dòng sông lớn tạo nên cảnh quan đặc biệt cho khu vực Long Biên.', sourceRef: `${SOURCE}:82-96`,
  },
])

const exits = Object.freeze([
  {
    id: 'roadBackHoanKiem', name: 'Lối Hoàn Kiếm', kind: 'road',
    x: 36, y: 832, width: 112, height: 128,
    targetMap: 'hoanKiem', targetX: 90, targetY: 1370,
    message: 'Bạn đã theo con đường cũ quay về khu Hoàn Kiếm - Phố Cổ.',
    sourceRef: `${SOURCE}:223-235`,
  },
  {
    id: 'busToBaDinhFromLongBien', name: 'Xe buýt Ba Đình', kind: 'bus',
    x: 1402, y: 1310, width: 128, height: 76,
    targetMap: 'baDinh', targetX: 2550, targetY: 960,
    message: 'Bạn đã đi xe buýt đến khu Ba Đình - Văn Miếu.',
    sourceRef: `${SOURCE}:236-248`,
  },
])

const decorations = Object.freeze([
  { id: 'lb-decor-skyline-river', type: 'skyline', x: 1820, y: 80, width: 880, height: 150, sourceRef: `${SOURCE}:251` },
  { id: 'lb-decor-skyline-market', type: 'skyline', x: 420, y: 18, width: 760, height: 118, sourceRef: `${SOURCE}:252` },
  { id: 'lb-decor-parking-market', type: 'pocketParking', x: 370, y: 704, width: 300, height: 102, sourceRef: `${SOURCE}:253` },
  { id: 'lb-decor-parking-residential', type: 'pocketParking', x: 1040, y: 1288, width: 260, height: 98, sourceRef: `${SOURCE}:254` },
  { id: 'lb-decor-alley-ven-cau', type: 'alleyMouth', x: 1050, y: 1040, width: 132, text: 'NGÕ VEN CẦU', sourceRef: `${SOURCE}:255` },
  { id: 'lb-decor-alley-cho', type: 'alleyMouth', x: 880, y: 1098, width: 112, text: 'NGÕ CHỢ', sourceRef: `${SOURCE}:256` },

  { id: 'lb-decor-tree-01', type: 'tree', x: 360, y: 790, sourceRef: `${SOURCE}:257` },
  { id: 'lb-decor-tree-02', type: 'tree', x: 360, y: 1030, sourceRef: `${SOURCE}:257` },
  { id: 'lb-decor-tree-03', type: 'tree', x: 1150, y: 970, sourceRef: `${SOURCE}:257` },
  { id: 'lb-decor-tree-04', type: 'tree', x: 1180, y: 1320, sourceRef: `${SOURCE}:257` },
  { id: 'lb-decor-tree-05', type: 'tree', x: 1660, y: 780, sourceRef: `${SOURCE}:257` },
  { id: 'lb-decor-tree-06', type: 'tree', x: 1640, y: 1220, sourceRef: `${SOURCE}:257` },

  { id: 'lb-decor-bridge-lamp-01', type: 'lamp', x: 1040, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-02', type: 'lamp', x: 1240, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-03', type: 'lamp', x: 1440, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-04', type: 'lamp', x: 1640, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-05', type: 'lamp', x: 1840, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-06', type: 'lamp', x: 2040, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-07', type: 'lamp', x: 2240, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-08', type: 'lamp', x: 2440, y: 560, sourceRef: `${SOURCE}:258` },
  { id: 'lb-decor-bridge-lamp-09', type: 'lamp', x: 2640, y: 560, sourceRef: `${SOURCE}:258` },

  { id: 'lb-decor-power-pole-01', type: 'powerPole', x: 238, y: 420, sourceRef: `${SOURCE}:259` },
  { id: 'lb-decor-power-pole-02', type: 'powerPole', x: 238, y: 740, sourceRef: `${SOURCE}:259` },
  { id: 'lb-decor-power-pole-03', type: 'powerPole', x: 238, y: 1080, sourceRef: `${SOURCE}:259` },
  { id: 'lb-decor-power-pole-04', type: 'powerPole', x: 760, y: 720, sourceRef: `${SOURCE}:259` },
  { id: 'lb-decor-power-pole-05', type: 'powerPole', x: 760, y: 1060, sourceRef: `${SOURCE}:259` },

  { id: 'lb-decor-motorbike-01', type: 'motorbike', x: 370, y: 968, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-02', type: 'motorbike', x: 620, y: 968, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-03', type: 'motorbike', x: 870, y: 968, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-04', type: 'motorbike', x: 420, y: 754, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-05', type: 'motorbike', x: 500, y: 754, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-06', type: 'motorbike', x: 580, y: 754, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-07', type: 'motorbike', x: 1130, y: 1272, sourceRef: `${SOURCE}:260` },
  { id: 'lb-decor-motorbike-08', type: 'motorbike', x: 1300, y: 1412, sourceRef: `${SOURCE}:260` },

  { id: 'lb-decor-crate-01', type: 'crate', x: 1014, y: 660, sourceRef: `${SOURCE}:261` },
  { id: 'lb-decor-crate-02', type: 'crate', x: 1042, y: 660, sourceRef: `${SOURCE}:261` },
  { id: 'lb-decor-crate-03', type: 'crate', x: 510, y: 670, sourceRef: `${SOURCE}:261` },
  { id: 'lb-decor-crate-04', type: 'crate', x: 540, y: 670, sourceRef: `${SOURCE}:261` },
  { id: 'lb-decor-crate-05', type: 'crate', x: 570, y: 670, sourceRef: `${SOURCE}:261` },

  { id: 'lb-decor-stall-01', type: 'stall', x: 620, y: 710, sourceRef: `${SOURCE}:262` },
  { id: 'lb-decor-stall-02', type: 'stall', x: 660, y: 710, sourceRef: `${SOURCE}:262` },
  { id: 'lb-decor-stall-03', type: 'stall', x: 930, y: 720, sourceRef: `${SOURCE}:262` },
  { id: 'lb-decor-stall-04', type: 'stall', x: 970, y: 720, sourceRef: `${SOURCE}:262` },

  { id: 'lb-decor-bicycle-01', type: 'bicycle', x: 480, y: 840, sourceRef: `${SOURCE}:263` },
  { id: 'lb-decor-bicycle-02', type: 'bicycle', x: 1080, y: 1166, sourceRef: `${SOURCE}:263` },
  { id: 'lb-decor-bicycle-03', type: 'bicycle', x: 1480, y: 1264, sourceRef: `${SOURCE}:263` },

  { id: 'lb-decor-street-sign-01', type: 'streetSign', x: 250, y: 810, text: 'LONG BIÊN', sourceRef: `${SOURCE}:264` },
  { id: 'lb-decor-street-sign-02', type: 'streetSign', x: 1520, y: 1260, text: 'LONG BIÊN', sourceRef: `${SOURCE}:264` },
  { id: 'lb-decor-trash-bin-01', type: 'trashBin', x: 390, y: 838, sourceRef: `${SOURCE}:265` },
  { id: 'lb-decor-trash-bin-02', type: 'trashBin', x: 1010, y: 1158, sourceRef: `${SOURCE}:265` },
  { id: 'lb-decor-trash-bin-03', type: 'trashBin', x: 1540, y: 1406, sourceRef: `${SOURCE}:265` },
  { id: 'lb-decor-electric-box-01', type: 'electricBox', x: 776, y: 842, sourceRef: `${SOURCE}:266` },
  { id: 'lb-decor-electric-box-02', type: 'electricBox', x: 1190, y: 1070, sourceRef: `${SOURCE}:266` },
  { id: 'lb-decor-planter-01', type: 'planter', x: 700, y: 760, sourceRef: `${SOURCE}:267` },
  { id: 'lb-decor-planter-02', type: 'planter', x: 990, y: 760, sourceRef: `${SOURCE}:267` },
  { id: 'lb-decor-planter-03', type: 'planter', x: 1080, y: 1420, sourceRef: `${SOURCE}:267` },
  { id: 'lb-decor-planter-04', type: 'planter', x: 1590, y: 1410, sourceRef: `${SOURCE}:267` },

  { id: 'lb-decor-bridge-truss', type: 'bridgeTruss', x: 1100, y: 462, width: 1720, sourceRef: `${SOURCE}:268` },
  { id: 'lb-decor-bridge-rail-upper', type: 'rail', x: 1120, y: 590, width: 1680, sourceRef: `${SOURCE}:269` },
  { id: 'lb-decor-bridge-rail-lower', type: 'rail', x: 1120, y: 672, width: 1680, sourceRef: `${SOURCE}:270` },
  { id: 'lb-decor-zebra-west', type: 'zebra', x: 220, y: 832, width: 140, height: 128, direction: 'vertical', sourceRef: `${SOURCE}:271` },
  { id: 'lb-decor-bus-sign', type: 'sign', x: 1468, y: 1260, text: 'XE', sourceRef: `${SOURCE}:272` },
  { id: 'lb-decor-residential-bench', type: 'bench', x: 1010, y: 1090, sourceRef: `${SOURCE}:273` },
  { id: 'lb-decor-traffic-sign-west', type: 'trafficSign', x: 208, y: 790, direction: 'right', sourceRef: `${SOURCE}:274` },
  { id: 'lb-decor-traffic-sign-bridge', type: 'trafficSign', x: 1010, y: 520, direction: 'right', sourceRef: `${SOURCE}:275` },
  { id: 'lb-decor-tea-corner', type: 'teaCorner', x: 1160, y: 1090, color: '#d8484f', sourceRef: `${SOURCE}:276` },
  { id: 'lb-decor-plastic-stools', type: 'plasticStools', x: 690, y: 744, sourceRef: `${SOURCE}:277` },
  { id: 'lb-decor-street-vendor', type: 'streetVendor', x: 790, y: 700, text: 'HÀNG RONG', sourceRef: `${SOURCE}:278` },
  { id: 'lb-decor-market-banner', type: 'banner', x: 610, y: 380, color: '#c9413a', sourceRef: `${SOURCE}:279` },
])

const bridgeSafety = Object.freeze({
  bridgeLandmarkId: 'cauLongBien',
  decks: Object.freeze([
    {
      zoneId: 'lb-zone-bridge-upper-deck',
      x: 1080, y: 530, width: 1760, height: 128,
      riverSpan: { x: 1760, y: 530, width: 1080, height: 128 },
    },
    {
      zoneId: 'lb-zone-bridge-lower-deck',
      x: 1090, y: 660, width: 1760, height: 64,
      riverSpan: { x: 1760, y: 660, width: 1090, height: 64 },
    },
  ]),
  rails: Object.freeze([
    {
      decorationId: 'lb-decor-bridge-rail-upper',
      x: 1120, y: 590, width: 1680, sourceVisualOnly: true, collisionRequiredIn3d: true,
    },
    {
      decorationId: 'lb-decor-bridge-rail-lower',
      x: 1120, y: 672, width: 1680, sourceVisualOnly: true, collisionRequiredIn3d: true,
    },
  ]),
  water: {
    waterId: 'lb-water-song-hong',
    x: 1760, y: 0, width: 1240, height: 1800,
    sourceHadDedicatedCollider: false,
    fallHazardIn3d: true,
  },
  fallEdges: Object.freeze([
    { id: 'lb-fall-edge-upper-north', deckZoneId: 'lb-zone-bridge-upper-deck', x1: 1760, y1: 530, x2: 2840, y2: 530, side: 'north' },
    { id: 'lb-fall-edge-upper-south', deckZoneId: 'lb-zone-bridge-upper-deck', x1: 1760, y1: 658, x2: 2840, y2: 658, side: 'south' },
    { id: 'lb-fall-edge-lower-north', deckZoneId: 'lb-zone-bridge-lower-deck', x1: 1760, y1: 660, x2: 2850, y2: 660, side: 'north' },
    { id: 'lb-fall-edge-lower-south', deckZoneId: 'lb-zone-bridge-lower-deck', x1: 1760, y1: 724, x2: 2850, y2: 724, side: 'south' },
    { id: 'lb-fall-edge-terminal-east', x1: 2850, y1: 530, x2: 2850, y2: 724, side: 'east' },
  ]),
  scenicDeadEnd: {
    enabled: true,
    direction: 'east',
    lastWalkableX: 2850,
    bridgeHasMapExit: false,
    terminalBarrierRequiredIn3d: true,
  },
})

export const longBienMapData = Object.freeze({
  id: 'longBien',
  name: 'Long Biên - Đồng Xuân',
  arrivalName: 'khu Long Biên - Đồng Xuân',
  width: 3000,
  height: 1800,
  dimensions: Object.freeze({ width: 3000, height: 1800 }),
  coordinateSystem: Object.freeze({ origin: 'top-left', xAxis: 'east', yAxis: 'south' }),
  background: '#817d73',
  spawn: Object.freeze({ x: 150, y: 890 }),
  mobilitySourceCounts: Object.freeze({
    parkingSpots: mobility.parkingSpots.length,
    vehicleRestrictedZones: mobility.vehicleRestrictedZones.length,
    ambientVehicles: mobility.ambientVehicles.length,
  }),
  parkingSpots: mobility.parkingSpots,
  vehicleRestrictedZones: mobility.vehicleRestrictedZones,
  ambientVehicles: mobility.ambientVehicles,
  walkZones,
  water,
  groundPatches,
  buildings,
  shops,
  landmarks,
  exits,
  decorations,
  bridgeSafety,
  sourceCounts,
  sourceRef: `${SOURCE}:4-281`,
})

export default longBienMapData
