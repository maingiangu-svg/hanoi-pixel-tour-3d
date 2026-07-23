const WIDTH_TOTAL = 20.5
const LENGTH_TOTAL = 64.5
const FACADE_Z = -15
const REAR_Z = FACADE_Z - LENGTH_TOTAL
const TOWER_WIDTH = 5.4
const TOWER_DEPTH = 8.7
const NAVE_START_Z = -23
const APSE_START_Z = -75
const BAY_COUNT = 8

const HALF_WIDTH = WIDTH_TOTAL / 2
const TOWER_CENTER_X = HALF_WIDTH - TOWER_WIDTH / 2
const CENTRAL_FACADE_WIDTH = WIDTH_TOTAL - TOWER_WIDTH * 2
const AISLE_WIDTH = (WIDTH_TOTAL - 12.4) / 2
const BAY_PITCH = (NAVE_START_Z - APSE_START_Z) / BAY_COUNT

export const CHURCH_DIMENSIONS = Object.freeze({
  widthTotal: WIDTH_TOTAL,
  lengthTotal: LENGTH_TOTAL,
  facadeZ: FACADE_Z,
  rearZ: REAR_Z,
  towerHeight: 31.5,
  towerWidth: TOWER_WIDTH,
  towerDepth: TOWER_DEPTH,
  towerCentersX: Object.freeze([-TOWER_CENTER_X, TOWER_CENTER_X]),
  centralFacadeWidth: CENTRAL_FACADE_WIDTH,
  facadeGableHeight: 22.5,
  naveRidgeHeight: 17.8,
  naveWallHeight: 12.8,
  naveWidth: 12.4,
  aisleWallHeight: 7.6,
  aisleWidth: AISLE_WIDTH,
  naveStartZ: NAVE_START_Z,
  apseStartZ: APSE_START_Z,
  apseDepth: APSE_START_Z - REAR_Z,
  bayCount: BAY_COUNT,

  // Shared derived values keep every church module on the same coordinate system.
  halfWidth: HALF_WIDTH,
  towerRearZ: FACADE_Z - TOWER_DEPTH,
  towerInnerX: TOWER_CENTER_X - TOWER_WIDTH / 2,
  bayPitch: BAY_PITCH,
  portalHalfWidth: 2.1,
  portalRecessRearZ: -18,
  colliderFrontZ: -15.65,
})

export const CHURCH_EXTENTS = Object.freeze({
  minX: -HALF_WIDTH,
  maxX: HALF_WIDTH,
  minZ: REAR_Z,
  maxZ: FACADE_Z,
  width: WIDTH_TOTAL,
  depth: LENGTH_TOTAL,
  centerX: 0,
  centerZ: (FACADE_Z + REAR_Z) / 2,
})

export function getNaveBayCenters(dimensions = CHURCH_DIMENSIONS) {
  const pitch = (dimensions.naveStartZ - dimensions.apseStartZ) / dimensions.bayCount
  return Object.freeze(Array.from(
    { length: dimensions.bayCount },
    (_, index) => dimensions.naveStartZ - pitch * (index + 0.5),
  ))
}

export function getButtressZPositions(dimensions = CHURCH_DIMENSIONS) {
  const pitch = (dimensions.naveStartZ - dimensions.apseStartZ) / dimensions.bayCount
  return Object.freeze(Array.from(
    { length: dimensions.bayCount + 1 },
    (_, index) => dimensions.naveStartZ - pitch * index,
  ))
}
