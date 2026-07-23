import * as THREE from 'three'

export class StreetBuilding {
  constructor({ kit, parent, colliders, config, shopManager = null }) {
    this.kit = kit
    this.config = config
    this.lights = []
    this.group = new THREE.Group()
    this.group.name = config.name
    parent.add(this.group)

    this.#buildBody(colliders)
    this.#buildFrontage()
    this.#buildUpperFloors()
    this.#buildRoofline()

    this.shop = config.sign
      ? shopManager?.addShop({
          parent: this.group,
          sign: config.sign,
          width: Math.min(config.width - 0.4, 6.2),
          position: [config.x, 0, config.z - config.depth / 2 - 0.16],
          rotationY: 0,
        })
      : null
  }

  #buildBody(colliders) {
    const { x, z, width, depth, height, material } = this.config
    this.kit.box(this.group, {
      name: this.config.name,
      size: [width, height, depth],
      position: [x, height / 2, z],
      material,
      collision: true,
      colliders,
      castShadow: this.config.castShadow ?? false,
    })
    this.kit.box(this.group, {
      name: 'Chân tường nhà phố',
      size: [width + 0.06, 0.48, depth + 0.08],
      position: [x, 0.24, z],
      material: 'stoneDark',
    })
    const frontZ = z - depth / 2 - 0.03
    this.kit.instancedBoxes(this.group, {
      name: 'Nẹp đứng mặt tiền nhà phố',
      material: 'stoneDark',
      instances: [-1, 1].map((side) => ({
        size: [0.22, height - 0.7, 0.2],
        position: [x + side * (width / 2 - 0.16), height / 2 + 0.15, frontZ],
      })),
    })
  }

  #buildFrontage() {
    const { x, z, width, depth, variant, sign } = this.config
    const frontZ = z - depth / 2 - 0.07

    if (variant === 'cafe') {
      const windowWidth = (width - 1.2) / 2
      for (const side of [-1, 1]) {
        this.kit.box(this.group, {
          name: 'Cửa kính quán cà phê',
          size: [windowWidth, 2.65, 0.12],
          position: [x + side * (width * 0.24), 1.55, frontZ],
          material: 'warmGlass',
        })
      }
      this.kit.box(this.group, {
        name: 'Khung cửa quán cà phê',
        size: [0.16, 2.9, 0.16],
        position: [x, 1.55, frontZ - 0.04],
        material: 'darkWood',
      })
      const awning = this.kit.box(this.group, {
        name: 'Mái hiên quán cà phê',
        size: [width - 0.4, 0.16, 1.35],
        position: [x, 3.35, frontZ - 0.55],
        material: 'greenDoor',
        castShadow: true,
      })
      awning.rotation.x = -0.16
      const stripeWidth = (width - 0.65) / 7
      for (const index of [0, 2, 4, 6]) {
        const stripe = this.kit.box(this.group, {
          name: 'Sọc mái hiên quán cà phê',
          size: [stripeWidth * 0.72, 0.035, 1.24],
          position: [x - (width - 0.65) / 2 + stripeWidth * (index + 0.5), 3.43, frontZ - 0.57],
          material: 'stoneLight',
        })
        stripe.rotation.x = -0.16
      }
      const warmLight = new THREE.PointLight(0xf0ad63, 11, 9, 2)
      warmLight.position.set(x, 2.7, frontZ - 1.15)
      this.group.add(warmLight)
      this.lights.push(warmLight)
    } else if (variant === 'shop') {
      this.kit.box(this.group, {
        name: 'Cửa cuốn',
        size: [width - 1.15, 2.75, 0.12],
        position: [x, 1.55, frontZ],
        material: 'metal',
      })
      for (let y = 0.55; y < 2.75; y += 0.28) {
        this.kit.box(this.group, {
          name: 'Nan cửa cuốn',
          size: [width - 1.3, 0.035, 0.06],
          position: [x, y, frontZ - 0.08],
          material: 'stoneLight',
        })
      }
    } else {
      this.kit.box(this.group, {
        name: 'Cửa gỗ nhà phố',
        size: [1.45, 2.7, 0.14],
        position: [x - width * 0.22, 1.48, frontZ],
        material: 'greenDoor',
      })
      this.kit.box(this.group, {
        name: 'Cửa sổ tầng trệt',
        size: [Math.max(1.8, width * 0.35), 1.85, 0.14],
        position: [x + width * 0.18, 1.65, frontZ],
        material: 'warmGlass',
      })
    }

    if (sign) {
      this.kit.sign(this.group, {
        text: sign,
        width: Math.min(width - 0.6, 5.8),
        height: 0.78,
        position: [x, 3.75, frontZ - 0.12],
        rotation: [0, Math.PI, 0],
        background: this.config.signColor ?? '#315c55',
        foreground: '#f4dfad',
      })
    }
    this.kit.box(this.group, {
      name: 'Gờ phân tầng nhà phố',
      size: [width + 0.12, 0.24, 0.34],
      position: [x, 4.18, frontZ - 0.04],
      material: 'stoneDark',
      castShadow: true,
    })
  }

  #buildUpperFloors() {
    const { x, z, width, depth, height, variant } = this.config
    const frontZ = z - depth / 2 - 0.09
    const floors = Math.max(1, Math.floor((height - 3.8) / 2.55))
    const windowFrames = []
    const mullions = []

    for (let floor = 0; floor < floors; floor += 1) {
      const y = 5.1 + floor * 2.45
      const windowMaterial = variant === 'cafe' && floor === 0 ? 'warmGlass' : 'glass'
      for (const side of [-1, 1]) {
        const windowWidth = Math.min(1.45, width * 0.25)
        const windowX = x + side * width * 0.25
        windowFrames.push({
          size: [windowWidth + 0.24, 1.74, 0.1],
          position: [windowX, y, frontZ + 0.045],
        })
        mullions.push(
          { size: [0.065, 1.34, 0.06], position: [windowX, y, frontZ - 0.075] },
          { size: [windowWidth * 0.84, 0.065, 0.06], position: [windowX, y, frontZ - 0.075] },
        )
        this.kit.box(this.group, {
          name: 'Cửa sổ nhà phố',
          size: [windowWidth, 1.5, 0.12],
          position: [windowX, y, frontZ],
          material: windowMaterial,
        })
        this.kit.box(this.group, {
          name: 'Bậu cửa sổ',
          size: [Math.min(1.65, width * 0.28), 0.12, 0.3],
          position: [x + side * width * 0.25, y - 0.83, frontZ - 0.05],
          material: 'stoneLight',
        })
      }

      if ((floor + this.config.detailSeed) % 2 === 0) {
        this.#addBalcony(y - 0.95)
      } else {
        this.#addAirConditioner(y - 0.6)
      }
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Viền cửa sổ nhà phố',
      material: 'stoneDark',
      instances: windowFrames,
    })
    this.kit.instancedBoxes(this.group, {
      name: 'Đố cửa sổ nhà phố',
      material: 'altar',
      instances: mullions,
    })
  }

  #addBalcony(y) {
    const { x, z, width, depth } = this.config
    const frontZ = z - depth / 2
    const balconyWidth = Math.min(width - 0.7, 4.8)
    this.kit.box(this.group, {
      name: 'Sàn ban công',
      size: [balconyWidth, 0.16, 0.9],
      position: [x, y, frontZ - 0.42],
      material: 'stoneDark',
      castShadow: true,
    })
    this.kit.box(this.group, {
      name: 'Lan can ban công',
      size: [balconyWidth, 0.08, 0.08],
      position: [x, y + 0.82, frontZ - 0.84],
      material: 'metal',
    })
    for (let offset = -balconyWidth / 2; offset <= balconyWidth / 2; offset += 0.55) {
      this.kit.box(this.group, {
        name: 'Nan lan can',
        size: [0.05, 0.78, 0.05],
        position: [x + offset, y + 0.42, frontZ - 0.84],
        material: 'metal',
      })
    }
  }

  #addAirConditioner(y) {
    const { x, z, width, depth } = this.config
    const frontZ = z - depth / 2 - 0.18
    const acX = x + width * 0.32
    this.kit.box(this.group, {
      name: 'Điều hòa',
      size: [1.05, 0.58, 0.38],
      position: [acX, y, frontZ],
      material: 'stoneLight',
    })
    for (let offset = -0.35; offset <= 0.35; offset += 0.18) {
      this.kit.box(this.group, {
        name: 'Khe điều hòa',
        size: [0.07, 0.4, 0.03],
        position: [acX + offset, y, frontZ - 0.21],
        material: 'stoneDark',
      })
    }
  }

  #buildRoofline() {
    const { x, z, width, depth, height, roof } = this.config
    this.kit.box(this.group, {
      name: 'Diềm mái nhà phố',
      size: [width + 0.3, 0.28, depth + 0.3],
      position: [x, height + 0.05, z],
      material: 'stoneDark',
      castShadow: true,
    })
    if (roof === 'tile') {
      const roofMesh = this.kit.box(this.group, {
        name: 'Mái ngói nhà phố',
        size: [width + 0.45, 0.34, depth * 0.62],
        position: [x, height + 0.45, z - depth * 0.12],
        material: 'brick',
        castShadow: true,
      })
      roofMesh.rotation.x = -0.1
    } else {
      for (const side of [-1, 1]) {
        this.kit.box(this.group, {
          name: 'Tường sân thượng',
          size: [0.2, 0.8, depth],
          position: [x + side * (width / 2 - 0.1), height + 0.45, z],
          material: this.config.material,
        })
      }
    }
  }
}
