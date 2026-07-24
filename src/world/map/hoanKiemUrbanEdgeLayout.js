const house = ({
  id,
  x,
  z,
  width,
  depth,
  height,
  front,
  material,
  roof = 'flat',
  variant = 'residential',
  sign = null,
  signColor = '#315c55',
}) => ({
  id,
  name: `Nhà phố mở rộng · ${id}`,
  x,
  z,
  width,
  depth,
  height,
  front,
  material,
  roof,
  variant,
  sign,
  signColor,
})

const cluster = (id, name, center, activationRadius, buildings) => ({
  id,
  name,
  center,
  activationRadius,
  buildings,
})

export const HOAN_KIEM_URBAN_CLUSTERS = deepFreeze([
  cluster('north-west-row', 'Dãy phố phía bắc · đoạn tây', [-4, -158], 118, [
    house({ id: 'north-west-01', x: -48, z: -158, width: 13, depth: 22, height: 10.2, front: 'positiveZ', material: 'oldYellow', roof: 'tile', sign: 'PHỞ GIA TRUYỀN', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'north-west-02', x: -32, z: -159, width: 14, depth: 24, height: 13.8, front: 'positiveZ', material: 'plaster' }),
    house({ id: 'north-west-03', x: -15, z: -158, width: 15, depth: 22, height: 11.4, front: 'positiveZ', material: 'sage', roof: 'tile' }),
    house({ id: 'north-west-04', x: 3, z: -159, width: 15, depth: 24, height: 15.2, front: 'positiveZ', material: 'brick', sign: 'BÁNH CỐM', variant: 'shop', signColor: '#315c55' }),
    house({ id: 'north-west-05', x: 22, z: -158, width: 17, depth: 22, height: 12.6, front: 'positiveZ', material: 'oldYellow', roof: 'tile' }),
    house({ id: 'north-west-06', x: 40, z: -159, width: 15, depth: 24, height: 9.8, front: 'positiveZ', material: 'plaster', variant: 'awning' }),
  ]),
  cluster('north-east-row', 'Dãy phố phía bắc · đoạn đông', [116, -158], 128, [
    house({ id: 'north-east-01', x: 60, z: -158, width: 14, depth: 22, height: 12.2, front: 'positiveZ', material: 'brick', sign: 'CÀ PHÊ BỜ BẮC', variant: 'cafe', signColor: '#315c55' }),
    house({ id: 'north-east-02', x: 77, z: -159, width: 15, depth: 24, height: 10.8, front: 'positiveZ', material: 'sage', roof: 'tile' }),
    house({ id: 'north-east-03', x: 96, z: -158, width: 17, depth: 22, height: 14.6, front: 'positiveZ', material: 'oldYellow' }),
    house({ id: 'north-east-04', x: 116, z: -159, width: 17, depth: 24, height: 11.6, front: 'positiveZ', material: 'plaster', sign: 'TẠP HÓA BỜ HỒ', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'north-east-05', x: 137, z: -158, width: 18, depth: 22, height: 15.8, front: 'positiveZ', material: 'brick' }),
    house({ id: 'north-east-06', x: 158, z: -159, width: 17, depth: 24, height: 12.9, front: 'positiveZ', material: 'sage', roof: 'tile', variant: 'awning' }),
    house({ id: 'north-east-07', x: 178, z: -158, width: 17, depth: 22, height: 10.4, front: 'positiveZ', material: 'oldYellow', sign: 'NƯỚC MÁT', variant: 'shop' }),
  ]),
  cluster('south-west-row', 'Dãy phố phía nam · đoạn tây', [0, 179], 122, [
    house({ id: 'south-west-01', x: -44, z: 179, width: 16, depth: 27, height: 12.4, front: 'negativeZ', material: 'sage', roof: 'tile' }),
    house({ id: 'south-west-02', x: -25, z: 178, width: 17, depth: 25, height: 9.8, front: 'negativeZ', material: 'oldYellow', sign: 'CƠM NHÀ', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'south-west-03', x: -5, z: 179, width: 18, depth: 27, height: 14.5, front: 'negativeZ', material: 'plaster' }),
    house({ id: 'south-west-04', x: 16, z: 178, width: 18, depth: 25, height: 11.2, front: 'negativeZ', material: 'brick', sign: 'TRÀ SEN', variant: 'cafe' }),
    house({ id: 'south-west-05', x: 38, z: 179, width: 19, depth: 27, height: 15.6, front: 'negativeZ', material: 'sage', roof: 'tile' }),
  ]),
  cluster('south-east-row', 'Dãy phố phía nam · đoạn đông', [151, 179], 132, [
    house({ id: 'south-east-01', x: 78, z: 179, width: 17, depth: 27, height: 10.6, front: 'negativeZ', material: 'oldYellow', sign: 'BÚN RIÊU', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'south-east-02', x: 98, z: 178, width: 18, depth: 25, height: 13.8, front: 'negativeZ', material: 'brick' }),
    house({ id: 'south-east-03', x: 120, z: 179, width: 19, depth: 27, height: 11.6, front: 'negativeZ', material: 'plaster', roof: 'tile' }),
    house({ id: 'south-east-04', x: 143, z: 178, width: 20, depth: 25, height: 15.1, front: 'negativeZ', material: 'sage', sign: 'CÀ PHÊ PHỐ', variant: 'cafe' }),
    house({ id: 'south-east-05', x: 166, z: 179, width: 18, depth: 27, height: 9.9, front: 'negativeZ', material: 'oldYellow', roof: 'tile' }),
    house({ id: 'south-east-06', x: 188, z: 178, width: 19, depth: 25, height: 13.2, front: 'negativeZ', material: 'brick', sign: 'BÁNH MÌ HÀ NỘI', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'south-east-07', x: 211, z: 179, width: 20, depth: 27, height: 16.2, front: 'negativeZ', material: 'plaster', variant: 'awning' }),
  ]),
  cluster('the-huc-square-edge', 'Mặt phố quảng trường Cầu Thê Húc', [206, 20], 112, [
    house({ id: 'square-edge-01', x: 206, z: -79, width: 16, depth: 24, height: 11.3, front: 'negativeX', material: 'oldYellow', roof: 'tile' }),
    house({ id: 'square-edge-02', x: 207, z: -60, width: 17, depth: 22, height: 14.2, front: 'negativeX', material: 'plaster', sign: 'CÀ PHÊ THÊ HÚC', variant: 'cafe', signColor: '#8a463c' }),
    house({ id: 'square-edge-03', x: 206, z: -40, width: 17, depth: 24, height: 10.1, front: 'negativeX', material: 'sage' }),
    house({ id: 'square-edge-04', x: 207, z: -20, width: 17, depth: 22, height: 15.4, front: 'negativeX', material: 'brick', sign: 'BÁNH NGỌT', variant: 'shop' }),
    house({ id: 'square-edge-05', x: 206, z: 76, width: 18, depth: 24, height: 12.7, front: 'negativeX', material: 'oldYellow', sign: 'ĐỒ THỦ CÔNG', variant: 'shop', signColor: '#8a463c' }),
  ]),
  cluster('old-quarter-east-row', 'Dãy nhà ống Phố Cổ mở rộng', [283, -14], 126, [
    house({ id: 'old-quarter-east-01', x: 283, z: -104, width: 15, depth: 22, height: 13.2, front: 'negativeX', material: 'brick', sign: 'PHỞ BÒ', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'old-quarter-east-02', x: 284, z: -86, width: 15, depth: 24, height: 9.6, front: 'negativeX', material: 'oldYellow', roof: 'tile' }),
    house({ id: 'old-quarter-east-03', x: 283, z: -67, width: 16, depth: 22, height: 15.5, front: 'negativeX', material: 'plaster', sign: 'LỤA HÀ NỘI', variant: 'shop' }),
    house({ id: 'old-quarter-east-04', x: 284, z: -47, width: 17, depth: 24, height: 11.5, front: 'negativeX', material: 'sage' }),
    house({ id: 'old-quarter-east-05', x: 283, z: -27, width: 17, depth: 22, height: 14.1, front: 'negativeX', material: 'brick', roof: 'tile' }),
    house({ id: 'old-quarter-east-06', x: 284, z: -7, width: 17, depth: 24, height: 10.4, front: 'negativeX', material: 'oldYellow', sign: 'GỐM VIỆT', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'old-quarter-east-07', x: 283, z: 14, width: 18, depth: 22, height: 16.1, front: 'negativeX', material: 'plaster' }),
    house({ id: 'old-quarter-east-08', x: 284, z: 36, width: 19, depth: 24, height: 12.8, front: 'negativeX', material: 'sage', sign: 'BÚN CHẢ PHỐ CỔ', variant: 'shop' }),
    house({ id: 'old-quarter-east-09', x: 283, z: 85, width: 18, depth: 22, height: 10.8, front: 'negativeX', material: 'oldYellow', roof: 'tile' }),
    house({ id: 'old-quarter-east-10', x: 284, z: 106, width: 19, depth: 24, height: 14.7, front: 'negativeX', material: 'brick', sign: 'TIỆM SÁCH CŨ', variant: 'shop', signColor: '#8a463c' }),
  ]),
  cluster('west-neighbourhood-row', 'Dãy phố phía tây khu Nhà thờ', [-103, 0], 120, [
    house({ id: 'west-row-01', x: -103, z: -91, width: 18, depth: 24, height: 11.8, front: 'positiveX', material: 'plaster', roof: 'tile' }),
    house({ id: 'west-row-02', x: -104, z: -69, width: 19, depth: 22, height: 14.9, front: 'positiveX', material: 'oldYellow', sign: 'BÚN ỐC', variant: 'shop', signColor: '#8a463c' }),
    house({ id: 'west-row-03', x: -103, z: -46, width: 20, depth: 24, height: 9.9, front: 'positiveX', material: 'sage' }),
    house({ id: 'west-row-04', x: -104, z: 47, width: 19, depth: 22, height: 12.7, front: 'positiveX', material: 'brick', sign: 'TIỆM SÁCH', variant: 'shop' }),
    house({ id: 'west-row-05', x: -103, z: 69, width: 19, depth: 24, height: 15.3, front: 'positiveX', material: 'plaster' }),
    house({ id: 'west-row-06', x: -104, z: 92, width: 20, depth: 22, height: 10.6, front: 'positiveX', material: 'oldYellow', roof: 'tile', variant: 'awning' }),
  ]),
])

export const HOAN_KIEM_URBAN_SIDE_ROADS = deepFreeze([
  { id: 'urban-north-alley', name: 'Ngõ phía bắc Hồ Gươm', x: 50.25, z: -160, width: 5, depth: 40, orientation: 'vertical' },
  { id: 'urban-south-alley', name: 'Ngõ phía nam Hồ Gươm', x: 59, z: 184, width: 10, depth: 50, orientation: 'vertical' },
  { id: 'urban-the-huc-side-street', name: 'Đường phụ quảng trường Cầu Thê Húc', x: 214, z: 35, width: 76, depth: 9, orientation: 'horizontal' },
  { id: 'urban-old-quarter-alley', name: 'Ngõ nhỏ Phố Cổ mở rộng', x: 319, z: 60, width: 74, depth: 8, orientation: 'horizontal' },
  { id: 'urban-west-side-street', name: 'Đường phụ phía tây Nhà thờ', x: -94, z: 12, width: 52, depth: 9, orientation: 'horizontal' },
])

export const HOAN_KIEM_URBAN_PROPS = deepFreeze({
  trees: [
    [-52, -144, 0.94], [-22, -144, 1.03], [12, -144, 0.9],
    [70, -144, 1.06], [112, -144, 0.95], [154, -144, 1.02],
    [-40, 161, 1.04], [7, 161, 0.92], [86, 161, 1.08],
    [130, 161, 0.96], [178, 161, 1.02], [222, 161, 0.92],
    [188, -80, 1.02], [188, -41, 0.92], [188, -2, 1.05],
    [188, 79, 0.94], [188, 116, 1.03],
    [180, 14, 0.92], [180, 57, 1.02],
  ],
  benches: [
    [16, -144, 0], [138, -144, 0],
    [45, 162.5, Math.PI], [198, 162.5, Math.PI],
    [184, -61, Math.PI / 2], [184, 96, Math.PI / 2],
    [178, 4, Math.PI / 2], [178, 67, Math.PI / 2],
    [267, -96, Math.PI / 2], [267, 104, Math.PI / 2],
  ],
  lamps: [
    [-66, -144], [-36, -144], [30, -144], [82, -144],
    [126, -144], [170, -144], [220, -144],
    [-56, 162], [-8, 162], [72, 162], [116, 162],
    [158, 162], [208, 162],
    [184, -96], [184, -20], [184, 34], [184, 112],
    [267, -112], [267, -72], [267, -20], [267, 24], [267, 96],
  ],
  bollards: [
    [182, 29], [190, 29], [198, 29], [206, 29], [214, 29], [222, 29],
  ],
  motorbikes: [
    [-41, -146, Math.PI / 2, 'bridgeRed'],
    [29, -146, Math.PI / 2, 'greenDoor'],
    [90, -146, Math.PI / 2, 'oldYellow'],
    [-35, 163, Math.PI / 2, 'greenDoor'],
    [108, 163, Math.PI / 2, 'bridgeRed'],
    [193, -48, 0, 'oldYellow'],
    [193, 104, 0, 'greenDoor'],
    [269, -76, 0, 'bridgeRed'],
    [269, 16, 0, 'oldYellow'],
    [-88, -52, 0, 'greenDoor'],
  ],
  bins: [
    [-63, -144], [52, -144], [218, -144],
    [-54, 162], [154, 162], [184, 50], [267, 58],
  ],
  planters: [
    [177, 20, 0.68], [177, 51, 0.72],
    [188, 12, 0.62], [188, 64, 0.68],
    [264, -109, 0.62], [264, 110, 0.66],
  ],
})

export function getUrbanBuildingFootprint(building) {
  const facesXAxis = building.front === 'negativeX' || building.front === 'positiveX'
  return {
    x: building.x,
    z: building.z,
    width: facesXAxis ? building.depth : building.width,
    depth: facesXAxis ? building.width : building.depth,
  }
}

export function getUrbanShopBuildings() {
  return HOAN_KIEM_URBAN_CLUSTERS.flatMap((entry) => (
    entry.buildings.filter((building) => building.sign)
  ))
}

function deepFreeze(value) {
  if (Array.isArray(value)) value.forEach(deepFreeze)
  else if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}
