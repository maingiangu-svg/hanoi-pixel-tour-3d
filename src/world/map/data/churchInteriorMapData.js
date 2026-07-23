import { MAP_MOBILITY_METADATA } from './mapMobilityMetadata.js'

const mobility = MAP_MOBILITY_METADATA.churchInterior
const PEW_ROWS = [276, 346, 416, 486, 556, 626]

const pews = PEW_ROWS.flatMap((y, rowIndex) => [
  { id: `pew-${rowIndex + 1}-left`, kind: 'pew', x: 154, y, width: 330, height: 28, side: 'left' },
  { id: `pew-${rowIndex + 1}-right`, kind: 'pew', x: 916, y, width: 330, height: 28, side: 'right' },
])

const columns = [
  { x: 120, y: 238 }, { x: 120, y: 442 }, { x: 120, y: 646 },
  { x: 1258, y: 238 }, { x: 1258, y: 442 }, { x: 1258, y: 646 },
].map((column, index) => ({ id: `column-${index + 1}`, kind: 'column', ...column }))

const windows = [
  { x: 76, y: 166 }, { x: 76, y: 334 }, { x: 76, y: 502 }, { x: 76, y: 670 },
  { x: 1296, y: 166 }, { x: 1296, y: 334 }, { x: 1296, y: 502 }, { x: 1296, y: 670 },
].map((window, index) => ({ id: `window-${index + 1}`, kind: 'stainedGlass', ...window }))

const shellCollision = [
  { id: 'shell-top', x: 0, y: 0, width: 1400, height: 50 },
  { id: 'shell-left', x: 0, y: 0, width: 54, height: 980 },
  { id: 'shell-right', x: 1346, y: 0, width: 54, height: 980 },
  { id: 'shell-bottom-left', x: 0, y: 920, width: 620, height: 60 },
  { id: 'shell-bottom-right', x: 780, y: 920, width: 620, height: 60 },
  { id: 'sanctuary-collision', x: 320, y: 52, width: 760, height: 172 },
]

export const churchInteriorMapData = Object.freeze({
  id: 'churchInterior',
  name: 'Nhà thờ Lớn - Bên trong',
  kind: 'churchInterior',
  width: 1400,
  height: 980,
  spawn: { x: 688, y: 850 },
  mobilitySourceCounts: Object.freeze({
    parkingSpots: mobility.parkingSpots.length,
    vehicleRestrictedZones: mobility.vehicleRestrictedZones.length,
    ambientVehicles: mobility.ambientVehicles.length,
  }),
  parkingSpots: mobility.parkingSpots,
  vehicleRestrictedZones: mobility.vehicleRestrictedZones,
  ambientVehicles: mobility.ambientVehicles,
  walkZones: [
    { id: 'walk-001', x: 54, y: 50, width: 1292, height: 870, kind: 'courtyard', vehicleAllowed: false },
  ],
  groundPatches: [
    { id: 'floor-001', x: 54, y: 50, width: 1292, height: 870, kind: 'interiorFloor' },
  ],
  water: [],
  buildings: [],
  shops: [],
  vehicleShops: [],
  landmarks: [],
  decorations: [],
  interiorFixtures: [
    { id: 'sanctuary', kind: 'sanctuary', x: 320, y: 52, width: 760, height: 172 },
    { id: 'altar', kind: 'altar', x: 540, y: 88, width: 320, height: 86 },
    ...pews,
    ...columns,
    ...windows,
  ],
  layout: {
    interiorDoor: { x: 664, y: 868, width: 72, height: 42 },
    exteriorDoor: { x: 2483, y: 752 },
    aisle: { x: 550, y: 224, width: 300, height: 690 },
    sanctuary: { x: 320, y: 52, width: 760, height: 172 },
    altar: { x: 540, y: 88, width: 320, height: 86 },
    pews,
    columns,
    windows,
  },
  collisionBlocks: [
    ...shellCollision,
    ...pews.map((pew) => ({ ...pew, id: `${pew.id}-collision` })),
    ...columns.map((column) => ({
      id: `${column.id}-collision`,
      x: column.x - 12,
      y: column.y,
      width: 28,
      height: 34,
    })),
  ],
  exits: [
    {
      id: 'churchDoorOut',
      name: 'Cửa chính Nhà thờ Lớn',
      kind: 'churchExit',
      x: 648,
      y: 862,
      width: 104,
      height: 48,
      interactionPoint: { x: 700, y: 876, radius: 54 },
      targetMap: 'hoanKiem',
      targetX: 2480,
      targetY: 764,
    },
  ],
  sourceCounts: Object.freeze({
    terrain: 1,
    walkZones: 1,
    buildings: 0,
    fixtures: 28,
    landmarks: 0,
    staticCollision: 24,
    exits: 1,
    decorations: 0,
    parkingSpots: 0,
  }),
})
