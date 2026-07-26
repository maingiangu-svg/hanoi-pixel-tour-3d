const building = ({
  id,
  x,
  width,
  height,
  material,
  sign,
  door = 'glass',
  awning = true,
}) => Object.freeze({
  id,
  x,
  z: -93.5,
  width,
  depth: 4,
  height,
  material,
  sign,
  door,
  awning,
})

/**
 * A shallow south-side row closes the currently one-sided Old Quarter street.
 * Its front sits at z=-91.5, leaving a 9 m canyon to the retained source row
 * at z=-82.5. Mid-tier ambient staging remains just outside at z=-96 and the
 * far silhouette route remains behind the row at z=-109.
 */
export const OLD_QUARTER_CANYON_BUILDINGS = Object.freeze([
  building({ id: 'canyon-01', x: 215.5, width: 10, height: 12.2, material: 'oldYellow', sign: 'PHỞ GIA TRUYỀN', door: 'wood' }),
  building({ id: 'canyon-02', x: 226, width: 10.2, height: 16.4, material: 'brick', sign: 'HIỆU SÁCH', door: 'glass' }),
  building({ id: 'canyon-03', x: 236.8, width: 10.4, height: 19.1, material: 'plaster', sign: 'CÀ PHÊ PHỐ', door: 'glass' }),
  building({ id: 'canyon-04', x: 247.8, width: 10.6, height: 23.1, material: 'sage', sign: 'NHÀ THUỐC', door: 'green' }),
  building({ id: 'canyon-05', x: 259, width: 10.6, height: 14.7, material: 'oldYellow', sign: 'TIỆM BÁNH', door: 'metal' }),
  building({ id: 'canyon-06', x: 270.3, width: 10.8, height: 21.5, material: 'brick', sign: 'THỜI TRANG', door: 'glass' }),
  building({ id: 'canyon-07', x: 281.8, width: 11, height: 17.6, material: 'plaster', sign: 'HÀNG BẠC', door: 'wood' }),
  building({ id: 'canyon-08', x: 293.2, width: 10.8, height: 24.2, material: 'sage', sign: 'KHÁCH SẠN PHỐ', door: 'glass' }),
])

export const OLD_QUARTER_CANYON_BACKGROUND = Object.freeze([
  Object.freeze({ position: [224, 17.5, -102], size: [18, 21, 10], material: 'skylineFacadeWarm' }),
  Object.freeze({ position: [255, 20, -103], size: [20, 26, 10], material: 'skylineFacade' }),
  Object.freeze({ position: [286, 18.5, -102], size: [18, 23, 10], material: 'skylineFacadeWarm' }),
])

export const OLD_QUARTER_NORTH_ROOFTOP_EXTENSIONS = Object.freeze([
  Object.freeze({ position: [216.1, 16, -76.3], size: [7.3, 7, 11.8], material: 'plaster' }),
  Object.freeze({ position: [241.4, 15.4, -75.8], size: [8, 6.2, 12.4], material: 'oldYellow' }),
  Object.freeze({ position: [251.3, 17.4, -74.3], size: [8, 8.4, 15.2], material: 'brick' }),
  Object.freeze({ position: [271, 15.8, -75.8], size: [8, 7, 12.4], material: 'sage' }),
])

export const OLD_QUARTER_CANYON_PROPS = Object.freeze({
  planters: Object.freeze([
    Object.freeze([222.4, -90.15]),
    Object.freeze([244.2, -90.15]),
    Object.freeze([266.6, -90.15]),
    Object.freeze([289.6, -90.15]),
  ]),
  chairs: Object.freeze([
    Object.freeze([232.8, -89.85]),
    Object.freeze([234, -89.85]),
    Object.freeze([275.6, -89.85]),
    Object.freeze([276.8, -89.85]),
  ]),
  motorbikes: Object.freeze([
    Object.freeze([219.2, -89.55, 0.08]),
    Object.freeze([263.4, -89.55, -0.12]),
    Object.freeze([286.9, -89.55, 0.1]),
  ]),
})
