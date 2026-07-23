// Exact fields mixed into the four source maps by hanoi-pixel-tour-2d/src/data/maps.js.
// Parking pads are static map scenery in 3D. Vehicle-only restricted zones and
// animated traffic routes remain audited metadata: they must not become player
// colliders or vehicle gameplay during this map-only migration.

export const MAP_MOBILITY_POLICY = Object.freeze({
  parkingSpots: 'static-environment',
  vehicleRestrictedZones: 'metadata-only-vehicle-rule',
  ambientVehicles: 'metadata-only-gameplay-excluded',
})

export const MAP_MOBILITY_METADATA = deepFreeze({
  hoanKiem: {
    parkingSpots: [
      {
        id: 'parkingHoGuom',
        name: 'Bãi gửi xe Bờ Hồ',
        x: 1040,
        y: 1110,
        width: 82,
        height: 54,
        standingPosition: { x: 1098, y: 1152 },
        interactionPoint: {
          x: 1112, y: 1184, radius: 50, visibleRange: 220, labelOffsetY: -34,
        },
      },
    ],
    vehicleRestrictedZones: [
      {
        id: 'hoGuomWalking',
        name: 'Phố đi bộ Hồ Gươm',
        x: 1148,
        y: 150,
        width: 1082,
        height: 1118,
        message: 'Khu phố đi bộ Hồ Gươm cần đi bộ. Hãy gửi xe tại bãi gần đường ven hồ.',
      },
    ],
    ambientVehicles: [
      { id: 'hkHangDaoEast', start: { x: 116, y: 374 }, end: { x: 1118, y: 374 }, speed: 0.075, offset: 0.08, areaPriority: 0.12, color: '#d8484f', riderColor: '#315f8f' },
      { id: 'hkLeThaiToWest', start: { x: 1248, y: 1382 }, end: { x: 32, y: 1382 }, speed: 0.062, offset: 0.42, areaPriority: 0.42, color: '#f2bd45', riderColor: '#2f7d4c' },
      { id: 'hkHangBacSouth', start: { x: 572, y: 160 }, end: { x: 572, y: 1690 }, speed: 0.065, offset: 0.63, areaPriority: 0.68, color: '#7bdff2', riderColor: '#c9413a' },
      { id: 'hkHangBacNorthNight', start: { x: 898, y: 1408 }, end: { x: 898, y: 258 }, speed: 0.058, offset: 0.27, areaPriority: 0.54, nightOnly: true, color: '#d95a48', riderColor: '#e0b75a' },
      { id: 'hkOldQuarterWestNight', start: { x: 1112, y: 768 }, end: { x: 132, y: 768 }, speed: 0.052, offset: 0.76, areaPriority: 0.64, nightOnly: true, color: '#6daec1', riderColor: '#8f6f9e' },
    ],
  },
  baDinh: {
    parkingSpots: [
      {
        id: 'parkingBaDinh',
        name: 'Điểm gửi xe Ba Đình',
        x: 408,
        y: 824,
        width: 88,
        height: 54,
        standingPosition: { x: 450, y: 850 },
        interactionPoint: {
          x: 482, y: 888, radius: 50, visibleRange: 220, labelOffsetY: -34,
        },
      },
      {
        id: 'parkingVanMieu',
        name: 'Điểm gửi xe Văn Miếu',
        x: 478,
        y: 1528,
        width: 86,
        height: 54,
        standingPosition: { x: 520, y: 1545 },
        interactionPoint: {
          x: 552, y: 1586, radius: 50, visibleRange: 220, labelOffsetY: -34,
        },
      },
    ],
    vehicleRestrictedZones: [
      {
        id: 'baDinhSquareWalking',
        name: 'Quảng trường Ba Đình',
        x: 520,
        y: 106,
        width: 1100,
        height: 838,
        message: 'Quảng trường Ba Đình là không gian tham quan đi bộ. Hãy gửi xe ở cổng phía tây.',
      },
      {
        id: 'vanMieuWalking',
        name: 'Khuôn viên Văn Miếu',
        x: 586,
        y: 1240,
        width: 1044,
        height: 748,
        message: 'Khuôn viên Văn Miếu cần đi bộ. Hãy gửi xe tại bãi gần cổng ngoài.',
      },
    ],
    ambientVehicles: [
      { id: 'bdHungVuongEast', start: { x: 236, y: 1020 }, end: { x: 2640, y: 1020 }, speed: 0.05, offset: 0.12, areaPriority: 0.12, color: '#d8484f', riderColor: '#f2bd45' },
      { id: 'bdQuocTuGiamWest', start: { x: 2720, y: 1888 }, end: { x: 1700, y: 1888 }, speed: 0.064, offset: 0.44, color: '#8de097', riderColor: '#7650b8' },
      { id: 'bdHungVuongSouth', start: { x: 466, y: 150 }, end: { x: 466, y: 1200 }, speed: 0.078, offset: 0.74, color: '#f7a072', riderColor: '#315f8f' },
    ],
  },
  longBien: {
    parkingSpots: [
      {
        id: 'parkingDongXuan',
        name: 'Bãi gửi xe Đồng Xuân',
        x: 424,
        y: 326,
        width: 88,
        height: 54,
        standingPosition: { x: 470, y: 350 },
        interactionPoint: {
          x: 494, y: 398, radius: 50, visibleRange: 220, labelOffsetY: -34,
        },
      },
    ],
    vehicleRestrictedZones: [
      {
        id: 'dongXuanWalking',
        name: 'Phố chợ Đồng Xuân',
        x: 480,
        y: 420,
        width: 600,
        height: 312,
        message: 'Khu chợ Đồng Xuân đông người đi bộ. Hãy gửi xe ở đầu phố trước khi vào chợ.',
      },
    ],
    ambientVehicles: [
      { id: 'lbPhoCoEast', start: { x: 20, y: 930 }, end: { x: 1020, y: 930 }, speed: 0.075, offset: 0.18, areaPriority: 0.12, color: '#d8484f', riderColor: '#f2bd45' },
      { id: 'lbChoDongXuanWest', start: { x: 1160, y: 332 }, end: { x: 430, y: 332 }, speed: 0.08, offset: 0.58, areaPriority: 0.34, color: '#7bdff2', riderColor: '#c9413a' },
      { id: 'lbCauLongBienEast', start: { x: 1092, y: 624 }, end: { x: 2820, y: 624 }, speed: 0.045, offset: 0.35, areaPriority: 0.2, color: '#f2bd45', riderColor: '#2f7d4c' },
      { id: 'lbCauLongBienWestNight', start: { x: 2820, y: 688 }, end: { x: 1092, y: 688 }, speed: 0.041, offset: 0.7, areaPriority: 0.3, nightOnly: true, color: '#cf5548', riderColor: '#7896a4' },
      { id: 'lbMarketLaneNight', start: { x: 1350, y: 1215 }, end: { x: 430, y: 1215 }, speed: 0.052, offset: 0.46, areaPriority: 0.5, nightOnly: true, color: '#68a99b', riderColor: '#d7ad54' },
    ],
  },
  churchInterior: {
    parkingSpots: [],
    vehicleRestrictedZones: [],
    ambientVehicles: [],
  },
})

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}
