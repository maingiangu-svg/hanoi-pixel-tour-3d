import { mapCoordinates } from '../world/map/MapCoordinateSystem.js'

export const AMBIENT_QUALITY_PRESETS = Object.freeze({
  high: Object.freeze({ near: 16, mid: 24, far: 48, shadowCasters: 5 }),
  medium: Object.freeze({ near: 12, mid: 18, far: 36, shadowCasters: 3 }),
  low: Object.freeze({ near: 8, mid: 12, far: 24, shadowCasters: 0 }),
})

const ACTIVITY_PATTERN = Object.freeze([
  'walk', 'walk', 'idle', 'viewPhoto', 'sit', 'takePhoto', 'drink', 'read',
  'wave', 'recordVideo', 'walk', 'idle', 'cycle', 'pose', 'walk', 'sit',
])

function point(x, z, activity = 'walk', facing = 0) {
  return Object.freeze({ x, z, activity, facing })
}

function line(x1, z1, x2, z2, count, offset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1)
    const lane = ((index + offset) % 2 ? 1 : -1) * 0.7
    const dx = x2 - x1
    const dz = z2 - z1
    const length = Math.hypot(dx, dz) || 1
    return point(
      x1 + dx * t - (dz / length) * lane,
      z1 + dz * t + (dx / length) * lane,
      ACTIVITY_PATTERN[(index + offset) % ACTIVITY_PATTERN.length],
      Math.atan2(dx, dz),
    )
  })
}

function ring(cx, cz, radiusX, radiusZ, count, offset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((index + 0.5) / count) * Math.PI * 2
    return point(
      cx + Math.cos(angle) * radiusX,
      cz + Math.sin(angle) * radiusZ,
      ACTIVITY_PATTERN[(index + offset) % ACTIVITY_PATTERN.length],
      angle + Math.PI / 2,
    )
  })
}

function sourcePoint(mapId, x, y, activity = 'walk', facing = 0) {
  const world = mapCoordinates.point(mapId, x, y)
  return point(world.x, world.z, activity, facing)
}

function sourceLine(mapId, x1, y1, x2, y2, count, offset = 0) {
  const start = mapCoordinates.point(mapId, x1, y1)
  const end = mapCoordinates.point(mapId, x2, y2)
  return line(start.x, start.z, end.x, end.z, count, offset)
}

function makeProfile({
  id,
  area,
  label,
  center,
  radius,
  near,
  mid,
  far,
  density = 1,
}) {
  return Object.freeze({
    id,
    area,
    label,
    center: Object.freeze(center),
    radius,
    density,
    near: Object.freeze(near),
    mid: Object.freeze(mid),
    far: Object.freeze(far),
  })
}

const oldQuarterNear = [
  ...line(226, -84, 277, -84, 8, 1),
  ...line(238, -71, 270, -71, 4, 4),
  point(246, -77, 'sit', Math.PI),
  point(251, -77, 'drink', Math.PI),
  point(262, -77, 'idle', Math.PI),
  Object.freeze({ ...point(269, -77, 'cycle', Math.PI), vehicle: 'motorbike' }),
]

const pedestrianNear = [
  ...line(119, 112, 171, 112, 7, 2),
  ...line(126, 122, 166, 122, 4, 6),
  point(137, 103, 'sit', 0),
  point(143, 103, 'viewPhoto', 0),
  point(151, 103, 'recordVideo', 0),
  point(158, 103, 'takePhoto', 0),
  point(165, 103, 'idle', 0),
]

const lakeWestNear = [
  ...line(66, -62, 72, 30, 8, 0),
  point(61, -42, 'sit', Math.PI / 2),
  point(62, -20, 'read', Math.PI / 2),
  point(63, 4, 'takePhoto', Math.PI / 2),
  point(64, 22, 'viewPhoto', Math.PI / 2),
  ...line(59, -55, 59, 20, 4, 8),
]

const lakeNorthNear = [
  ...line(78, -94, 149, -83, 9, 3),
  point(93, -99, 'sit', 0),
  point(106, -99, 'read', 0),
  point(119, -96, 'takePhoto', 0),
  point(132, -93, 'viewPhoto', 0),
  point(145, -89, 'idle', 0),
  point(153, -78, 'recordVideo', 0),
  point(84, -88, 'cycle', 0),
]

const lakeEastNear = [
  ...line(166, -58, 166, 30, 9, 5),
  point(172, -43, 'sit', -Math.PI / 2),
  point(173, -20, 'drink', -Math.PI / 2),
  point(173, 0, 'takePhoto', -Math.PI / 2),
  point(172, 21, 'viewPhoto', -Math.PI / 2),
  point(160, -31, 'recordVideo', -Math.PI / 2),
  point(160, 13, 'idle', -Math.PI / 2),
  point(166, 38, 'cycle', Math.PI),
]

const lakeSouthNear = [
  ...line(82, 91, 145, 91, 8, 9),
  ...line(91, 99, 139, 99, 4, 2),
  point(102, 86, 'sit', Math.PI),
  point(119, 86, 'takePhoto', Math.PI),
  point(135, 86, 'viewPhoto', Math.PI),
  point(149, 85, 'recordVideo', Math.PI),
]

const bridgeNear = [
  ...line(108, 29, 116, 44, 5, 2),
  ...line(122, 31, 126, 44, 4, 7),
  point(107, 26, 'takePhoto', 0),
  point(112, 27, 'viewPhoto', 0),
  point(126, 28, 'point', 0),
  point(130, 31, 'pose', 0),
  point(112, 50, 'respectfulPause', Math.PI),
  point(122, 51, 'lookAtLandmark', Math.PI),
  point(127, 48, 'sit', Math.PI),
]

const connectorNear = [
  ...line(40, 8, 73, 34, 8, 0),
  ...line(47, 14, 76, 39, 4, 6),
  point(54, 23, 'idle', -Math.PI / 2),
  point(59, 27, 'drink', -Math.PI / 2),
  point(66, 32, 'takePhoto', -Math.PI / 2),
  point(71, 36, 'cycle', 0),
]

const baDinhNear = [
  ...sourceLine('baDinh', 720, 720, 1440, 720, 7, 0),
  ...sourceLine('baDinh', 760, 820, 1320, 820, 4, 5),
  sourcePoint('baDinh', 820, 650, 'takePhoto'),
  sourcePoint('baDinh', 980, 650, 'lookAtLandmark'),
  sourcePoint('baDinh', 1160, 650, 'sit'),
  sourcePoint('baDinh', 1320, 650, 'read'),
  sourcePoint('baDinh', 1480, 720, 'walk'),
]

const longBienNear = [
  ...sourceLine('longBien', 430, 720, 1060, 720, 7, 0),
  ...sourceLine('longBien', 470, 820, 1030, 820, 4, 5),
  sourcePoint('longBien', 520, 680, 'idle'),
  sourcePoint('longBien', 670, 680, 'viewPhoto'),
  sourcePoint('longBien', 820, 680, 'drink'),
  Object.freeze({
    ...sourcePoint('longBien', 970, 680, 'cycle'),
    vehicle: 'motorbike',
  }),
  sourcePoint('longBien', 1100, 790, 'walk'),
]

export const AMBIENT_LIFE_PROFILES = Object.freeze([
  makeProfile({
    id: 'oldQuarter', area: 'outdoor', label: 'Phố Cổ', center: { x: 252, z: -80 },
    radius: 68, near: oldQuarterNear,
    mid: [...line(218, -96, 286, -96, 12), ...line(221, -60, 286, -60, 12, 4)],
    far: [...line(206, -109, 294, -109, 24), ...line(210, -45, 294, -45, 24, 8)],
    density: 1.08,
  }),
  makeProfile({
    id: 'pedestrian', area: 'outdoor', label: 'Phố đi bộ', center: { x: 146, z: 113 },
    radius: 70, near: pedestrianNear,
    mid: [...line(95, 127, 207, 127, 12), ...line(97, 99, 210, 99, 12, 7)],
    far: [...line(64, 142, 225, 142, 24), ...line(77, 78, 220, 78, 24, 3)],
    density: 1.05,
  }),
  makeProfile({
    id: 'lakeWest', area: 'outdoor', label: 'Bờ tây Hồ Gươm', center: { x: 66, z: -14 },
    radius: 67, near: lakeWestNear, density: 1.2,
    mid: [...line(55, -74, 58, 47, 12), ...line(76, -75, 75, 43, 12, 5)],
    far: ring(111, 0, 54, 91, 48, 2),
  }),
  makeProfile({
    id: 'lakeNorth', area: 'outdoor', label: 'Bờ bắc Hồ Gươm', center: { x: 116, z: -88 },
    radius: 58, near: lakeNorthNear, density: 1.15,
    mid: [...line(73, -105, 158, -92, 12), ...line(78, -78, 155, -68, 12, 6)],
    far: ring(112, -28, 65, 70, 48, 3),
  }),
  makeProfile({
    id: 'lakeEast', area: 'outdoor', label: 'Bờ đông Hồ Gươm', center: { x: 167, z: -12 },
    radius: 65, near: lakeEastNear, density: 1.15,
    mid: [...line(180, -70, 180, 47, 12), ...line(153, -66, 154, 44, 12, 8)],
    far: ring(115, -3, 68, 84, 48, 5),
  }),
  makeProfile({
    id: 'lakeSouth', area: 'outdoor', label: 'Bờ nam Hồ Gươm', center: { x: 116, z: 89 },
    radius: 58, near: lakeSouthNear, density: 1.15,
    mid: [...line(76, 108, 158, 108, 12), ...line(80, 78, 155, 78, 12, 4)],
    far: ring(116, 38, 64, 74, 48, 7),
  }),
  makeProfile({
    id: 'theHuc', area: 'outdoor', label: 'Cầu Thê Húc', center: { x: 119, z: 39 },
    radius: 28, near: bridgeNear,
    mid: [...ring(119, 38, 22, 18, 18), ...line(99, 60, 139, 60, 6, 4)],
    far: ring(119, 40, 38, 30, 48, 2),
    density: 0.82,
  }),
  makeProfile({
    id: 'connector', area: 'outdoor', label: 'Phố nối', center: { x: 58, z: 24 },
    radius: 33, near: connectorNear,
    mid: [...line(32, 0, 83, 43, 12), ...line(35, 8, 86, 50, 12, 3)],
    far: [...line(24, -5, 91, 50, 24), ...line(32, 2, 99, 58, 24, 9)],
    density: 0.9,
  }),
  makeProfile({
    id: 'baDinh', area: 'baDinh', label: 'Ba Đình', center: mapCoordinates.point('baDinh', 1080, 720),
    radius: 150, near: baDinhNear,
    mid: [...sourceLine('baDinh', 520, 950, 1650, 950, 12), ...sourceLine('baDinh', 560, 1080, 1650, 1080, 12, 3)],
    far: [...sourceLine('baDinh', 420, 1170, 1700, 1170, 24), ...sourceLine('baDinh', 520, 220, 1700, 220, 24, 7)],
    density: 0.78,
  }),
  makeProfile({
    id: 'longBien', area: 'longBien', label: 'Long Biên · Đồng Xuân', center: mapCoordinates.point('longBien', 760, 760),
    radius: 170, near: longBienNear,
    mid: [...sourceLine('longBien', 350, 960, 1260, 960, 12), ...sourceLine('longBien', 420, 1160, 1370, 1160, 12, 5)],
    far: [...sourceLine('longBien', 300, 280, 1300, 280, 24), ...sourceLine('longBien', 330, 1320, 1420, 1320, 24, 8)],
    density: 1.08,
  }),
])

export function getAmbientProfile(areaName, position) {
  let best = null
  let bestDistance = Infinity
  for (const profile of AMBIENT_LIFE_PROFILES) {
    if (profile.area !== areaName) continue
    const dx = position.x - profile.center.x
    const dz = position.z - profile.center.z
    const distance = Math.hypot(dx, dz)
    if (distance > profile.radius || distance >= bestDistance) continue
    best = profile
    bestDistance = distance
  }
  return best
}

export function getAmbientTimeDensity(hour) {
  if (hour >= 6 && hour < 9) return 0.9
  if (hour >= 9 && hour < 16.5) return 0.82
  if (hour >= 16.5 && hour < 21.5) return 1
  if (hour >= 21.5 || hour < 5.5) return 0.58
  return 0.72
}
