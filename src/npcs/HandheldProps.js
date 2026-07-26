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
  }
}
