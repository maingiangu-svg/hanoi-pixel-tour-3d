// Geometry-only transfer of the Hoan Kiem map from hanoi-pixel-tour-2d.
// Coordinates remain in the original 2800 x 1900 source-map space.

import { MAP_MOBILITY_METADATA } from './mapMobilityMetadata.js'

const mobility = MAP_MOBILITY_METADATA.hoanKiem

export const sourceCounts = Object.freeze({
  walkZones: 30,
  water: 1,
  groundPatches: 6,
  buildings: 57,
  shops: 2,
  vehicleShops: 1,
  landmarks: 5,
  collisionBlocks: 5,
  exits: 3,
  decorations: 74,
  parkingSpots: 1,
})

export const hoanKiemMapData = Object.freeze({
  id: 'hoanKiem',
  name: 'Hoàn Kiếm - Phố Cổ',
  arrivalName: 'khu Hoàn Kiếm - Phố Cổ',
  width: 2800,
  height: 1900,
  dimensions: Object.freeze({ width: 2800, height: 1900 }),
  background: '#85847b',
  spawn: Object.freeze({ x: 610, y: 1370 }),
  sourceCounts,
  mobilitySourceCounts: Object.freeze({
    parkingSpots: mobility.parkingSpots.length,
    vehicleRestrictedZones: mobility.vehicleRestrictedZones.length,
    ambientVehicles: mobility.ambientVehicles.length,
  }),
  parkingSpots: mobility.parkingSpots,
  vehicleRestrictedZones: mobility.vehicleRestrictedZones,
  ambientVehicles: mobility.ambientVehicles,

  walkZones: Object.freeze([
    { id: 'walk-zone-001', x: 112, y: 128, width: 1128, height: 1506, kind: 'sidewalk' },
    { id: 'walk-zone-002', x: 1148, y: 150, width: 132, height: 1128, kind: 'sidewalk' },
    { id: 'walk-zone-003', x: 1278, y: 150, width: 820, height: 132, kind: 'sidewalk' },
    { id: 'walk-zone-004', x: 1278, y: 1156, width: 840, height: 162, kind: 'sidewalk' },
    { id: 'walk-zone-005', x: 2080, y: 230, width: 180, height: 1050, kind: 'sidewalk' },
    { id: 'walk-zone-006', x: 2190, y: 438, width: 522, height: 632, kind: 'sidewalk' },
    { id: 'walk-zone-007', x: 2240, y: 730, width: 420, height: 214, kind: 'plaza' },
    { id: 'walk-zone-008', x: 2180, y: 480, width: 536, height: 86, kind: 'road' },
    { id: 'walk-zone-009', x: 2600, y: 418, width: 96, height: 654, kind: 'road' },
    { id: 'walk-zone-010', x: 2380, y: 1058, width: 304, height: 262, kind: 'sidewalk' },
    { id: 'walk-zone-011', x: 0, y: 1328, width: 1280, height: 112, kind: 'road' },
    { id: 'walk-zone-012', x: 112, y: 326, width: 1160, height: 104, kind: 'road' },
    { id: 'walk-zone-013', x: 118, y: 720, width: 1160, height: 96, kind: 'road' },
    { id: 'walk-zone-014', x: 520, y: 150, width: 104, height: 1560, kind: 'road' },
    { id: 'walk-zone-015', x: 850, y: 238, width: 96, height: 1200, kind: 'road' },
    { id: 'walk-zone-016', x: 1110, y: 650, width: 126, height: 790, kind: 'road' },
    { id: 'walk-zone-017', x: 610, y: 548, width: 520, height: 82, kind: 'sidewalk' },
    { id: 'walk-zone-018', x: 620, y: 842, width: 560, height: 84, kind: 'sidewalk' },
    { id: 'walk-zone-019', x: 1160, y: 170, width: 1040, height: 104, kind: 'sidewalk' },
    { id: 'walk-zone-020', x: 1150, y: 1188, width: 1100, height: 116, kind: 'sidewalk' },
    { id: 'walk-zone-021', x: 1160, y: 220, width: 116, height: 1048, kind: 'sidewalk' },
    { id: 'walk-zone-022', x: 2110, y: 238, width: 122, height: 1030, kind: 'sidewalk' },
    { id: 'walk-zone-023', x: 2028, y: 602, width: 292, height: 206, kind: 'plaza' },
    { id: 'walk-zone-024', x: 1848, y: 690, width: 292, height: 54, kind: 'bridge' },
    { id: 'walk-zone-025', x: 2200, y: 1320, width: 430, height: 108, kind: 'road' },
    { id: 'walk-zone-026', x: 2498, y: 1320, width: 112, height: 390, kind: 'road' },
    { id: 'walk-zone-027', x: 2100, y: 1240, width: 244, height: 92, kind: 'sidewalk' },
    { id: 'walk-zone-028', x: 2360, y: 1510, width: 310, height: 112, kind: 'sidewalk' },
    { id: 'walk-zone-029', x: 2180, y: 1072, width: 612, height: 88, kind: 'sidewalk' },
    { id: 'walk-zone-030', x: 2696, y: 418, width: 96, height: 742, kind: 'sidewalk' }
  ]),

  water: Object.freeze([
    { id: 'water-001', x: 1318, y: 294, width: 760, height: 860, label: 'Hồ Gươm', kind: 'lake' }
  ]),

  groundPatches: Object.freeze([
    { id: 'ground-patch-001', x: 0, y: 0, width: 1300, height: 1900, kind: 'paving' },
    { id: 'ground-patch-002', x: 1142, y: 120, width: 1128, height: 1220, kind: 'plaza' },
    { id: 'ground-patch-003', x: 2140, y: 390, width: 620, height: 760, kind: 'brick' },
    { id: 'ground-patch-004', x: 2140, y: 1190, width: 650, height: 560, kind: 'paving' },
    { id: 'ground-patch-005', x: 1260, y: 280, width: 56, height: 850, kind: 'grass' },
    { id: 'ground-patch-006', x: 2076, y: 300, width: 52, height: 820, kind: 'grass' }
  ]),

  buildings: Object.freeze([
    { id: 'building-001', kind: 'tubeHouse', x: 190, y: 168, width: 72, height: 112, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'PHỞ', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-002', kind: 'tubeHouse', x: 272, y: 168, width: 72, height: 124, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'CÀ PHÊ', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-003', kind: 'tubeHouse', x: 354, y: 168, width: 72, height: 136, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'TẠP HÓA', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-004', kind: 'tubeHouse', x: 436, y: 168, width: 72, height: 112, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'BÁNH', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-005', kind: 'tubeHouse', x: 650, y: 166, width: 66, height: 108, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'ÁO', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-006', kind: 'tubeHouse', x: 726, y: 166, width: 66, height: 120, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'SÁCH', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-007', kind: 'tubeHouse', x: 802, y: 166, width: 66, height: 132, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'CHÈ', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-008', kind: 'tubeHouse', x: 878, y: 166, width: 66, height: 108, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'BÚN', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-009', kind: 'tubeHouse', x: 954, y: 166, width: 66, height: 120, color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'LỤA', facadeVariant: 4, balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-010', kind: 'tubeHouse', x: 1030, y: 166, width: 66, height: 132, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'TRÀ', facadeVariant: 0, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-011', kind: 'tubeHouse', x: 170, y: 456, width: 74, height: 100, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'PHỐ', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-012', kind: 'tubeHouse', x: 254, y: 456, width: 74, height: 112, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'CAFE', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-013', kind: 'tubeHouse', x: 338, y: 456, width: 74, height: 124, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'BIA', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-014', kind: 'tubeHouse', x: 422, y: 456, width: 74, height: 100, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'NÓN', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-015', kind: 'tubeHouse', x: 640, y: 456, width: 70, height: 106, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'BÚN', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-016', kind: 'tubeHouse', x: 720, y: 456, width: 70, height: 118, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'GIÀY', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-017', kind: 'tubeHouse', x: 800, y: 456, width: 70, height: 130, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'CỐM', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-018', kind: 'tubeHouse', x: 880, y: 456, width: 70, height: 106, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'TRÀ', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-019', kind: 'tubeHouse', x: 960, y: 456, width: 70, height: 118, color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'SÁCH', facadeVariant: 4, balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-020', kind: 'tubeHouse', x: 1040, y: 456, width: 70, height: 130, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'PHỞ', facadeVariant: 0, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-021', kind: 'tubeHouse', x: 170, y: 842, width: 78, height: 98, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'BÁNH', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-022', kind: 'tubeHouse', x: 258, y: 842, width: 78, height: 110, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'ĐÈN', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-023', kind: 'tubeHouse', x: 346, y: 842, width: 78, height: 122, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'MAY', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-024', kind: 'tubeHouse', x: 434, y: 842, width: 78, height: 98, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'PHỞ', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-025', kind: 'tubeHouse', x: 642, y: 960, width: 74, height: 106, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'NƯỚC', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-026', kind: 'tubeHouse', x: 726, y: 960, width: 74, height: 118, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'CAFE', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-027', kind: 'tubeHouse', x: 810, y: 960, width: 74, height: 130, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'BÚN', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-028', kind: 'tubeHouse', x: 894, y: 960, width: 74, height: 106, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'CHÈ', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-029', kind: 'tubeHouse', x: 978, y: 960, width: 74, height: 118, color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'LỤA', facadeVariant: 4, balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-030', kind: 'tubeHouse', x: 166, y: 1465, width: 78, height: 98, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'XE', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-031', kind: 'tubeHouse', x: 254, y: 1465, width: 78, height: 110, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'QUÀ', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-032', kind: 'tubeHouse', x: 342, y: 1465, width: 78, height: 122, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'TRÀ', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-033', kind: 'tubeHouse', x: 430, y: 1465, width: 78, height: 98, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'PHỐ', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-034', kind: 'tubeHouse', x: 646, y: 1462, width: 72, height: 104, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'PHỞ', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-035', kind: 'tubeHouse', x: 728, y: 1462, width: 72, height: 116, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'BÚN', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-036', kind: 'tubeHouse', x: 810, y: 1462, width: 72, height: 128, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'ÁO', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-037', kind: 'tubeHouse', x: 892, y: 1462, width: 72, height: 104, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'SÁCH', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-038', kind: 'tubeHouse', x: 974, y: 1462, width: 72, height: 116, color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'TRÀ', facadeVariant: 4, balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-039', kind: 'tubeHouse', x: 1056, y: 1462, width: 72, height: 128, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'CỐM', facadeVariant: 0, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-040', kind: 'tubeHouse', x: 2195, y: 328, width: 82, height: 110, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'CAFE', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-041', kind: 'tubeHouse', x: 2291, y: 328, width: 82, height: 122, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'SÁCH', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-042', kind: 'tubeHouse', x: 2387, y: 328, width: 82, height: 134, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'HOA', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-043', kind: 'tubeHouse', x: 2483, y: 328, width: 82, height: 110, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'BÁNH', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-044', kind: 'tubeHouse', x: 2208, y: 960, width: 78, height: 104, color: '#d8b95e', roof: '#9f3e35', door: '#27647d', sign: 'CÀ PHÊ', facadeVariant: 0, balconySide: 'left', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-045', kind: 'tubeHouse', x: 2298, y: 960, width: 78, height: 116, color: '#efc66e', roof: '#315f8f', door: '#5d3b28', sign: 'TRÀ', facadeVariant: 1, balconySide: 'right', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-046', kind: 'tubeHouse', x: 2388, y: 960, width: 78, height: 128, color: '#d9d477', roof: '#8f4a2f', door: '#2d6b58', sign: 'ẢNH', facadeVariant: 2, balconySide: 'left', hasAwning: true, hasAirConditioner: false, hasWaterTank: false },
    { id: 'building-047', kind: 'tubeHouse', x: 2478, y: 960, width: 78, height: 104, color: '#e8a866', roof: '#734a91', door: '#5b3726', sign: 'KEM', facadeVariant: 3, balconySide: 'right', hasAwning: true, hasAirConditioner: true, hasWaterTank: true },
    { id: 'building-048', kind: 'tubeHouse', x: 2568, y: 960, width: 78, height: 116, color: '#91c2b4', roof: '#9d4138', door: '#304a72', sign: 'BÁNH', facadeVariant: 4, balconySide: 'left', hasAwning: false, hasAirConditioner: true, hasWaterTank: false },
    { id: 'building-049', kind: 'collective', x: 2220, y: 1168, width: 118, height: 148, color: '#c8b58b', roof: '#8c4a35', facadeVariant: 0 },
    { id: 'building-050', kind: 'apartment', x: 2356, y: 1168, width: 118, height: 168, color: '#aeb3aa', roof: '#5e646a', facadeVariant: 1 },
    { id: 'building-051', kind: 'collective', x: 2492, y: 1168, width: 118, height: 148, color: '#c8b58b', roof: '#8c4a35', facadeVariant: 2 },
    { id: 'building-052', kind: 'tubeHouse', x: 1028, y: 470, width: 92, height: 134, color: '#e7c067', roof: '#9e4038', door: '#244f6b' },
    { id: 'building-053', kind: 'tubeHouse', x: 1000, y: 946, width: 112, height: 124, color: '#8fcbbd', roof: '#315f8f', door: '#5d3b28' },
    { id: 'building-054', kind: 'cafeFront', x: 2630, y: 586, width: 118, height: 94, color: '#d8b35f', roof: '#9e4038', sign: 'CAFE' },
    { id: 'building-055', kind: 'cafeFront', x: 2634, y: 948, width: 112, height: 88, color: '#d2a061', roof: '#315f8f', sign: 'TRÀ' },
    { id: 'building-056', kind: 'wall', x: 1242, y: 210, width: 46, height: 1048, color: '#d6c57a' },
    { id: 'building-057', kind: 'wall', x: 2070, y: 244, width: 44, height: 1020, color: '#d6c57a' }
  ]),

  shops: Object.freeze([
    { id: 'shop-001', sourceId: 'shopBunCha', kind: 'foodShop', foodId: 'bunCha', x: 646, y: 626, width: 158, height: 78 },
    { id: 'shop-002', sourceId: 'shopCaPheTrung', kind: 'foodShop', foodId: 'caPheTrung', x: 976, y: 826, width: 166, height: 78 }
  ]),

  vehicleShops: Object.freeze([
    {
      id: 'vehicle-shop-001',
      sourceId: 'vinfastHoanKiem',
      name: 'Đại lý VinFast Bờ Hồ',
      kind: 'vehicleShop',
      vehicleId: 'vinfast-electric',
      x: 2160,
      y: 1342,
      width: 178,
      height: 92,
      interactionPoint: { x: 2180, y: 1304, radius: 48, visibleRange: 220, labelOffsetY: -34 }
    }
  ]),

  landmarks: Object.freeze([
    {
      id: 'landmark-001', sourceId: 'hoGuom', name: 'Hồ Gươm', kind: 'lake',
      x: 1318, y: 294, width: 760, height: 860, solid: false, priority: 6, range: 105,
      interactionPoint: { x: 1226, y: 1020, radius: 50, visibleRange: 240, labelOffsetY: -34 },
      description: 'Mặt hồ xanh nằm giữa trung tâm Hà Nội.'
    },
    {
      id: 'landmark-002', sourceId: 'denNgocSon', name: 'Đền Ngọc Sơn', kind: 'temple',
      x: 2126, y: 638, width: 154, height: 124, solid: true, range: 112,
      interactionPoint: { x: 2162, y: 790, radius: 48, visibleRange: 220, labelOffsetY: -34 },
      description: 'Ngôi đền nhỏ nổi bật bên Hồ Gươm.'
    },
    {
      id: 'landmark-003', sourceId: 'cauTheHuc', name: 'Cầu Thê Húc', kind: 'redBridge',
      x: 1848, y: 690, width: 292, height: 54, solid: false, range: 84,
      interactionPoint: { x: 1858, y: 718, radius: 44, visibleRange: 220, labelOffsetY: -32 },
      description: 'Cây cầu đỏ dẫn vào Đền Ngọc Sơn.'
    },
    {
      id: 'landmark-004', sourceId: 'phoCo', name: 'Phố Cổ', kind: 'oldQuarter',
      x: 188, y: 168, width: 920, height: 420, solid: false, range: 120,
      interactionPoint: { x: 878, y: 620, radius: 50, visibleRange: 230, labelOffsetY: -34 },
      description: 'Khu phố buôn bán lâu đời với những ngôi nhà nhỏ san sát.'
    },
    {
      id: 'landmark-005', sourceId: 'nhaThoLon', name: 'Nhà thờ Lớn Hà Nội', kind: 'cathedral',
      x: 2348, y: 548, width: 270, height: 194, solid: false, range: 90,
      interactionPoint: { x: 2483, y: 792, radius: 50, visibleRange: 240, labelOffsetY: -36 },
      description: 'Công trình kiến trúc nổi bật giữa khu phố trung tâm với quảng trường nhỏ phía trước.'
    }
  ]),

  collisionBlocks: Object.freeze([
    { id: 'collision-block-001', x: 2354, y: 570, width: 62, height: 172 },
    { id: 'collision-block-002', x: 2548, y: 570, width: 62, height: 172 },
    { id: 'collision-block-003', x: 2416, y: 582, width: 132, height: 102 },
    { id: 'collision-block-004', x: 2416, y: 684, width: 44, height: 58 },
    { id: 'collision-block-005', x: 2506, y: 684, width: 42, height: 58 }
  ]),

  // The source wall crosses the only walk-zone overlap between the east-bank
  // plaza and Cau The Huc. Preserve its footprint, but split its 3D collider
  // and mesh at the bridge so the landmark route is actually traversable.
  navigationRepairs: Object.freeze([
    {
      id: 'navigation-repair-cau-the-huc-gate',
      kind: 'colliderOpening',
      targetId: 'building-057',
      opening: Object.freeze({ x: 2070, y: 690, width: 44, height: 54 }),
      reason: 'Cau The Huc bridge walk zone must connect to the Ngoc Son plaza',
    },
  ]),

  exits: Object.freeze([
    {
      id: 'exit-001', sourceId: 'enterNhaThoLon', name: 'Cửa chính Nhà thờ Lớn', kind: 'churchEntrance',
      prompt: 'E · Vào nhà thờ', x: 2460, y: 710, width: 48, height: 42,
      interactionPoint: { x: 2484, y: 750, radius: 54, visibleRange: 190, labelOffsetY: -34, label: 'Cửa chính' },
      targetMap: 'churchInterior', targetX: 688, targetY: 850,
      message: 'Bạn bước vào bên trong Nhà thờ Lớn Hà Nội.'
    },
    {
      id: 'exit-002', sourceId: 'busToBaDinh', name: 'Xe buýt Ba Đình', kind: 'bus',
      x: 2448, y: 1540, width: 126, height: 76,
      targetMap: 'baDinh', targetX: 340, targetY: 1850,
      message: 'Bạn đã đi xe buýt đến khu Ba Đình - Văn Miếu.'
    },
    {
      id: 'exit-003', sourceId: 'roadToLongBien', name: 'Lối Long Biên', kind: 'road',
      x: 36, y: 1324, width: 102, height: 118,
      targetMap: 'longBien', targetX: 150, targetY: 890,
      message: 'Bạn đã theo đường phố cổ đến khu Long Biên - Đồng Xuân.'
    }
  ]),

  decorations: Object.freeze([
    { id: 'decoration-001', type: 'skyline', x: 120, y: 20, width: 1040, height: 118 },
    { id: 'decoration-002', type: 'skyline', x: 2180, y: 210, width: 560, height: 120 },
    { id: 'decoration-003', type: 'pocketParking', x: 150, y: 1080, width: 300, height: 112 },
    { id: 'decoration-004', type: 'pocketParking', x: 654, y: 1120, width: 168, height: 102 },
    { id: 'decoration-005', type: 'alleyMouth', x: 960, y: 1118, width: 120, text: 'NGÕ NHỎ' },
    { id: 'decoration-006', type: 'alleyMouth', x: 650, y: 586, width: 138, text: 'NGÕ PHỐ CỔ' },
    { id: 'decoration-007', type: 'turtleTower', x: 1640, y: 690 },
    { id: 'decoration-008', type: 'lakeRail', x: 1290, y: 266, width: 820, height: 924 },
    { id: 'decoration-009', type: 'tree', x: 1212, y: 292 },
    { id: 'decoration-010', type: 'tree', x: 1168, y: 520 },
    { id: 'decoration-011', type: 'tree', x: 1168, y: 1020 },
    { id: 'decoration-012', type: 'tree', x: 2136, y: 318 },
    { id: 'decoration-013', type: 'tree', x: 2180, y: 1000 },
    { id: 'decoration-014', type: 'tree', x: 1274, y: 1260 },
    { id: 'decoration-015', type: 'tree', x: 2060, y: 1248 },
    { id: 'decoration-016', type: 'tree', x: 238, y: 1280 },
    { id: 'decoration-017', type: 'tree', x: 1000, y: 1276 },
    { id: 'decoration-018', type: 'lamp', x: 1220, y: 420 },
    { id: 'decoration-019', type: 'lamp', x: 1218, y: 640 },
    { id: 'decoration-020', type: 'lamp', x: 1218, y: 832 },
    { id: 'decoration-021', type: 'lamp', x: 2148, y: 430 },
    { id: 'decoration-022', type: 'lamp', x: 2148, y: 650 },
    { id: 'decoration-023', type: 'lamp', x: 2148, y: 890 },
    { id: 'decoration-024', type: 'lamp', x: 1510, y: 1226 },
    { id: 'decoration-025', type: 'lamp', x: 1700, y: 1226 },
    { id: 'decoration-026', type: 'lamp', x: 1890, y: 1226 },
    { id: 'decoration-027', type: 'lamp', x: 580, y: 1336 },
    { id: 'decoration-028', type: 'lamp', x: 1128, y: 1358 },
    { id: 'decoration-029', type: 'lamp', x: 2480, y: 1450 },
    { id: 'decoration-030', type: 'bench', x: 1300, y: 1228 },
    { id: 'decoration-031', type: 'bench', x: 1450, y: 1228 },
    { id: 'decoration-032', type: 'bench', x: 1620, y: 1228 },
    { id: 'decoration-033', type: 'bench', x: 1890, y: 1228 },
    { id: 'decoration-034', type: 'bench', x: 2060, y: 1178 },
    { id: 'decoration-035', type: 'bench', x: 1190, y: 530 },
    { id: 'decoration-036', type: 'bench', x: 2134, y: 534 },
    { id: 'decoration-037', type: 'bench', x: 2134, y: 800 },
    { id: 'decoration-038', type: 'motorbike', x: 452, y: 444 },
    { id: 'decoration-039', type: 'motorbike', x: 782, y: 444 },
    { id: 'decoration-040', type: 'motorbike', x: 548, y: 820 },
    { id: 'decoration-041', type: 'motorbike', x: 1032, y: 924 },
    { id: 'decoration-042', type: 'motorbike', x: 190, y: 1136 },
    { id: 'decoration-043', type: 'motorbike', x: 250, y: 1136 },
    { id: 'decoration-044', type: 'motorbike', x: 700, y: 1170 },
    { id: 'decoration-045', type: 'motorbike', x: 2485, y: 1492 },
    { id: 'decoration-046', type: 'powerPole', x: 510, y: 230 },
    { id: 'decoration-047', type: 'powerPole', x: 510, y: 610 },
    { id: 'decoration-048', type: 'powerPole', x: 510, y: 1020 },
    { id: 'decoration-049', type: 'powerPole', x: 850, y: 330 },
    { id: 'decoration-050', type: 'powerPole', x: 850, y: 1070 },
    { id: 'decoration-051', type: 'bicycle', x: 2260, y: 706 },
    { id: 'decoration-052', type: 'bicycle', x: 2630, y: 812 },
    { id: 'decoration-053', type: 'bicycle', x: 720, y: 704 },
    { id: 'decoration-054', type: 'trashBin', x: 2294, y: 746 },
    { id: 'decoration-055', type: 'trashBin', x: 1230, y: 1174 },
    { id: 'decoration-056', type: 'trashBin', x: 2118, y: 1284 },
    { id: 'decoration-057', type: 'electricBox', x: 2220, y: 676 },
    { id: 'decoration-058', type: 'electricBox', x: 1048, y: 1320 },
    { id: 'decoration-059', type: 'planter', x: 340, y: 1220 },
    { id: 'decoration-060', type: 'planter', x: 760, y: 1240 },
    { id: 'decoration-061', type: 'planter', x: 2248, y: 812 },
    { id: 'decoration-062', type: 'planter', x: 2570, y: 820 },
    { id: 'decoration-063', type: 'zebra', x: 506, y: 1328, width: 132, height: 112, direction: 'vertical' },
    { id: 'decoration-064', type: 'zebra', x: 1120, y: 720, width: 116, height: 96, direction: 'vertical' },
    { id: 'decoration-065', type: 'sign', x: 2512, y: 1490, text: 'XE' },
    { id: 'decoration-066', type: 'streetSign', x: 2298, y: 710, text: 'NHÀ THỜ' },
    { id: 'decoration-067', type: 'streetSign', x: 876, y: 604, text: 'HÀNG BẠC' },
    { id: 'decoration-068', type: 'streetSign', x: 1168, y: 1260, text: 'LÊ THÁI TỔ' },
    { id: 'decoration-069', type: 'trafficSign', x: 480, y: 1268, direction: 'right' },
    { id: 'decoration-070', type: 'trafficSign', x: 1084, y: 672, direction: 'left' },
    { id: 'decoration-071', type: 'teaCorner', x: 1010, y: 1200, color: '#2f8ec5' },
    { id: 'decoration-072', type: 'plasticStools', x: 260, y: 1240 },
    { id: 'decoration-073', type: 'streetVendor', x: 390, y: 1200, text: 'QUÀ VẶT' },
    { id: 'decoration-074', type: 'banner', x: 892, y: 646, color: '#c9413a' }
  ])
})
