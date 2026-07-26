import * as THREE from 'three'

export const HANDHELD_PROP_TYPES = Object.freeze([
  'phone',
  'camera',
  'iceCream',
  'flowers',
  'newspaper',
  'cup',
  'pencil',
  'drawingBoard',
  'shoppingBag',
  'bicycle',
  'motorbike',
  'book',
])

export const DEFAULT_PROP_HAND = Object.freeze({
  phone: 'right',
  camera: 'right',
  iceCream: 'right',
  flowers: 'left',
  newspaper: 'left',
  cup: 'right',
  pencil: 'right',
  drawingBoard: 'left',
  shoppingBag: 'left',
  bicycle: 'right',
  motorbike: 'right',
  book: 'left',
})

function addPart(resources, parent, {
  name,
  geometry = 'box',
  material = 'charcoal',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) {
  const mesh = new THREE.Mesh(
    resources.getGeometry(geometry),
    resources.getMaterial(material),
  )
  mesh.name = name
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.scale.set(...scale)
  mesh.castShadow = false
  mesh.receiveShadow = false
  parent.add(mesh)
  return mesh
}

const BUILDERS = Object.freeze({
  phone(resources, root) {
    addPart(resources, root, {
      name: 'Điện thoại',
      material: 'charcoal',
      scale: [0.105, 0.18, 0.025],
    })
    addPart(resources, root, {
      name: 'Màn hình điện thoại',
      material: 'blue',
      position: [0, 0, 0.015],
      scale: [0.083, 0.145, 0.008],
    })
  },
  camera(resources, root) {
    addPart(resources, root, {
      name: 'Máy ảnh cầm tay',
      material: 'charcoal',
      scale: [0.22, 0.15, 0.11],
    })
    addPart(resources, root, {
      name: 'Ống kính máy ảnh',
      geometry: 'cylinder',
      material: 'metal',
      position: [0, 0, 0.09],
      rotation: [Math.PI / 2, 0, 0],
      scale: [0.08, 0.12, 0.08],
    })
  },
  iceCream(resources, root) {
    addPart(resources, root, {
      name: 'Ốc quế',
      geometry: 'cone',
      material: 'straw',
      position: [0, -0.055, 0],
      scale: [0.105, 0.24, 0.105],
    })
    addPart(resources, root, {
      name: 'Kem',
      geometry: 'sphere',
      material: 'cream',
      position: [0, 0.105, 0],
      scale: [0.14, 0.14, 0.14],
    })
  },
  flowers(resources, root) {
    for (let index = -1; index <= 1; index += 1) {
      addPart(resources, root, {
        name: `Cành hoa ${index + 2}`,
        geometry: 'cylinder',
        material: 'sage',
        position: [index * 0.035, 0.04, 0],
        rotation: [0, 0, index * 0.12],
        scale: [0.025, 0.34, 0.025],
      })
      addPart(resources, root, {
        name: `Bông hoa ${index + 2}`,
        geometry: 'sphere',
        material: index === 0 ? 'cream' : 'pink',
        position: [index * 0.075, 0.25, 0],
        scale: [0.1, 0.1, 0.1],
      })
    }
  },
  newspaper(resources, root) {
    addPart(resources, root, {
      name: 'Tờ báo trái',
      material: 'white',
      position: [-0.11, 0, 0],
      rotation: [0, 0.18, 0],
      scale: [0.23, 0.3, 0.018],
    })
    addPart(resources, root, {
      name: 'Tờ báo phải',
      material: 'cream',
      position: [0.11, 0, 0],
      rotation: [0, -0.18, 0],
      scale: [0.23, 0.3, 0.018],
    })
  },
  book(resources, root) {
    addPart(resources, root, {
      name: 'Bìa sách',
      material: 'maroon',
      scale: [0.25, 0.32, 0.035],
    })
    addPart(resources, root, {
      name: 'Trang sách',
      material: 'cream',
      position: [0, 0, 0.025],
      scale: [0.215, 0.285, 0.018],
    })
  },
  cup(resources, root) {
    addPart(resources, root, {
      name: 'Cốc nước',
      geometry: 'cylinder',
      material: 'cream',
      position: [0, 0.04, 0],
      scale: [0.105, 0.2, 0.105],
    })
    addPart(resources, root, {
      name: 'Mặt nước',
      geometry: 'cylinder',
      material: 'brown',
      position: [0, 0.145, 0],
      scale: [0.085, 0.012, 0.085],
    })
  },
  pencil(resources, root) {
    addPart(resources, root, {
      name: 'Bút vẽ',
      geometry: 'cylinder',
      material: 'mustard',
      rotation: [0, 0, 0.28],
      scale: [0.025, 0.34, 0.025],
    })
  },
  drawingBoard(resources, root) {
    addPart(resources, root, {
      name: 'Bảng vẽ',
      material: 'oldYellow',
      scale: [0.42, 0.52, 0.035],
    })
    addPart(resources, root, {
      name: 'Giấy vẽ',
      material: 'white',
      position: [0, 0, 0.024],
      scale: [0.35, 0.44, 0.012],
    })
  },
  shoppingBag(resources, root) {
    addPart(resources, root, {
      name: 'Túi hàng',
      material: 'terracotta',
      position: [0, -0.13, 0],
      scale: [0.3, 0.38, 0.13],
    })
    for (const side of [-1, 1]) {
      addPart(resources, root, {
        name: `Quai túi ${side < 0 ? 'trái' : 'phải'}`,
        geometry: 'cylinder',
        material: 'darkBrown',
        position: [side * 0.09, 0.12, 0],
        rotation: [0, 0, side * 0.2],
        scale: [0.02, 0.23, 0.02],
      })
    }
  },
  bicycle(resources, root) {
    for (const z of [-0.68, 0.68]) {
      addPart(resources, root, {
        name: 'Bánh xe đạp',
        geometry: 'cylinder',
        material: 'charcoal',
        position: [0, 0.38, z],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.34, 0.08, 0.34],
      })
      addPart(resources, root, {
        name: 'Moay-ơ xe đạp',
        geometry: 'cylinder',
        material: 'metal',
        position: [0, 0.38, z],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.08, 0.1, 0.08],
      })
    }
    for (const [name, position, rotation, scale] of [
      ['Khung xe đạp dưới', [0, 0.52, 0], [Math.PI / 2, 0, 0], [0.055, 0.72, 0.055]],
      ['Khung xe đạp trước', [0, 0.66, 0.32], [0.42, 0, 0], [0.055, 0.5, 0.055]],
      ['Khung xe đạp sau', [0, 0.65, -0.3], [-0.55, 0, 0], [0.055, 0.48, 0.055]],
      ['Cọc yên xe đạp', [0, 0.83, -0.08], [0, 0, 0], [0.05, 0.34, 0.05]],
      ['Cổ xe đạp', [0, 0.88, 0.55], [0.2, 0, 0], [0.045, 0.35, 0.045]],
    ]) {
      addPart(resources, root, {
        name,
        geometry: 'cylinder',
        material: 'teal',
        position,
        rotation,
        scale,
      })
    }
    addPart(resources, root, {
      name: 'Yên xe đạp',
      material: 'darkBrown',
      position: [0, 1.03, -0.12],
      scale: [0.2, 0.07, 0.3],
    })
    addPart(resources, root, {
      name: 'Ghi-đông xe đạp',
      geometry: 'cylinder',
      material: 'metal',
      position: [0, 1.08, 0.61],
      rotation: [0, 0, Math.PI / 2],
      scale: [0.045, 0.42, 0.045],
    })
  },
  motorbike(resources, root) {
    for (const z of [-0.62, 0.62]) {
      addPart(resources, root, {
        name: 'Bánh xe máy ambient',
        geometry: 'cylinder',
        material: 'charcoal',
        position: [0, 0.32, z],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.31, 0.11, 0.31],
      })
    }
    addPart(resources, root, {
      name: 'Thân xe máy ambient',
      material: 'terracotta',
      position: [0, 0.57, 0],
      scale: [0.36, 0.34, 0.88],
    })
    addPart(resources, root, {
      name: 'Yên xe máy ambient',
      material: 'darkBrown',
      position: [0, 0.82, -0.12],
      scale: [0.34, 0.1, 0.58],
    })
    addPart(resources, root, {
      name: 'Cổ xe máy ambient',
      material: 'teal',
      position: [0, 0.79, 0.48],
      rotation: [0.2, 0, 0],
      scale: [0.22, 0.46, 0.22],
    })
    addPart(resources, root, {
      name: 'Ghi-đông xe máy ambient',
      geometry: 'cylinder',
      material: 'metal',
      position: [0, 1.02, 0.56],
      rotation: [0, 0, Math.PI / 2],
      scale: [0.045, 0.48, 0.045],
    })
  },
})

export function createHandheldProp(resources, type, id) {
  if (!HANDHELD_PROP_TYPES.includes(type)) {
    throw new RangeError(`Unknown handheld prop type: ${type}`)
  }
  const root = new THREE.Group()
  root.name = `Handheld.${type}.${id}`
  root.userData.handheldPropId = id
  root.userData.handheldPropType = type
  BUILDERS[type](resources, root)
  return root
}

export function applyHandheldPropTransform(root, type, hand) {
  root.position.set(0, 0, 0)
  root.rotation.set(0, 0, 0)
  root.scale.setScalar(1)

  const side = hand === 'left' ? -1 : 1
  if (type === 'phone') {
    root.position.set(0, -0.01, 0.045)
    root.rotation.set(-0.18, side * 0.12, side * -0.08)
  } else if (type === 'camera') {
    root.position.set(side * -0.05, -0.02, 0.07)
    root.rotation.y = side * 0.08
  } else if (type === 'iceCream' || type === 'cup') {
    root.position.set(0, -0.02, 0.02)
  } else if (type === 'flowers') {
    root.position.set(0, 0.05, 0.025)
    root.rotation.z = side * -0.18
  } else if (type === 'newspaper') {
    root.position.set(side * 0.18, -0.02, 0.08)
    root.rotation.set(-0.15, side * -0.1, side * -0.08)
  } else if (type === 'pencil') {
    root.position.set(0, 0.02, 0.03)
  } else if (type === 'drawingBoard') {
    root.position.set(side * 0.2, 0.02, 0.08)
    root.rotation.set(-0.12, side * -0.12, side * -0.08)
  } else if (type === 'shoppingBag') {
    root.position.set(0, -0.2, 0)
  } else if (type === 'bicycle' || type === 'motorbike') {
    root.position.set(0, 0, 0)
  }
}
