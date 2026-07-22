import * as THREE from 'three'

export class ChurchInterior {
  constructor({ kit, parent }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Interior Nhà thờ'
    this.group.visible = false
    this.colliders = []
    this.lighting = {
      ambient: null,
      pendantLights: [],
      altarLight: null,
    }
    this.bounds = { minX: -10, maxX: 10, minZ: -20, maxZ: 16 }
    parent.add(this.group)

    this.#buildShell()
    this.#buildPews()
    this.#buildColumns()
    this.#buildAltar()
    this.#buildWindows()
    this.#buildLighting()
  }

  #buildShell() {
    this.kit.box(this.group, {
      name: 'Sàn Nhà thờ',
      size: [20, 0.24, 36],
      position: [0, -0.12, -2],
      material: 'plaza',
      receiveShadow: true,
    })
    for (const x of [-9.7, 9.7]) {
      this.kit.box(this.group, {
        name: 'Tường bên Nhà thờ',
        size: [0.6, 10, 36],
        position: [x, 5, -2],
        material: 'stone',
        collision: true,
        colliders: this.colliders,
        receiveShadow: true,
      })
    }
    for (const z of [-19.7, 15.7]) {
      this.kit.box(this.group, {
        name: 'Tường đầu hồi Nhà thờ',
        size: [20, 10, 0.6],
        position: [0, 5, z],
        material: 'stone',
        collision: true,
        colliders: this.colliders,
        receiveShadow: true,
      })
    }

    const leftRoof = this.kit.box(this.group, {
      name: 'Mái trong bên trái',
      size: [11.2, 0.5, 36],
      position: [-4.65, 11.6, -2],
      material: 'darkWood',
      receiveShadow: true,
    })
    leftRoof.rotation.z = -0.42
    const rightRoof = this.kit.box(this.group, {
      name: 'Mái trong bên phải',
      size: [11.2, 0.5, 36],
      position: [4.65, 11.6, -2],
      material: 'darkWood',
      receiveShadow: true,
    })
    rightRoof.rotation.z = 0.42

    for (const z of [-15, -9, -3, 3, 9]) {
      const beam = this.kit.box(this.group, {
        name: 'Dầm mái Nhà thờ',
        size: [18.6, 0.28, 0.34],
        position: [0, 10.65, z],
        material: 'wood',
      })
      beam.rotation.z = 0
    }

    this.#addExitDoor()
  }

  #addExitDoor() {
    this.kit.arch(this.group, {
      name: 'Viền cửa ra',
      width: 4.2,
      height: 5.8,
      position: [0, 0.2, 15.34],
      material: 'stoneLight',
      rotationY: Math.PI,
    })
    this.kit.arch(this.group, {
      name: 'Cửa ra',
      width: 3.45,
      height: 5.2,
      position: [0, 0.35, 15.22],
      material: 'darkWood',
      rotationY: Math.PI,
    })
  }

  #buildPews() {
    const rows = [8.5, 6, 3.5, 1, -1.5, -4, -6.5, -9]
    for (const z of rows) {
      for (const side of [-1, 1]) {
        const x = side * 3.15
        const pew = new THREE.Group()
        pew.name = 'Hàng ghế Nhà thờ'
        pew.position.set(x, 0, z)
        this.group.add(pew)
        this.kit.box(pew, {
          name: 'Mặt ghế Nhà thờ',
          size: [3.8, 0.18, 0.62],
          position: [0, 0.64, 0],
          material: 'pew',
          castShadow: true,
        })
        this.kit.box(pew, {
          name: 'Lưng ghế Nhà thờ',
          size: [3.8, 1.2, 0.16],
          position: [0, 1.05, 0.28],
          material: 'pew',
          castShadow: true,
        })
        for (const supportX of [-1.45, 1.45]) {
          this.kit.box(pew, {
            name: 'Chân ghế Nhà thờ',
            size: [0.16, 0.65, 0.62],
            position: [supportX, 0.33, 0],
            material: 'darkWood',
          })
        }
        this.kit.addCollider(this.colliders, x, z, 3.95, 0.86, 'Ghế Nhà thờ')
      }
    }
  }

  #buildColumns() {
    for (const z of [-12, -6.5, -1, 4.5, 10]) {
      for (const x of [-6.2, 6.2]) {
        this.kit.cylinder(this.group, {
          name: 'Cột Nhà thờ',
          radius: 0.48,
          height: 9.4,
          position: [x, 4.7, z],
          material: 'stoneLight',
          castShadow: true,
        })
        this.kit.cylinder(this.group, {
          name: 'Chân cột Nhà thờ',
          radius: 0.67,
          height: 0.34,
          position: [x, 0.17, z],
          material: 'stoneDark',
        })
        this.kit.addCollider(this.colliders, x, z, 0.86, 0.86, 'Cột Nhà thờ')
      }
    }
  }

  #buildAltar() {
    this.kit.box(this.group, {
      name: 'Bậc cung thánh',
      size: [10.5, 0.32, 4],
      position: [0, 0.16, -16.8],
      material: 'stoneLight',
      collision: true,
      colliders: this.colliders,
    })
    this.kit.box(this.group, {
      name: 'Bàn thờ',
      size: [4.8, 1.35, 1.4],
      position: [0, 0.98, -17.2],
      material: 'altar',
      collision: true,
      colliders: this.colliders,
      castShadow: true,
    })
    this.kit.arch(this.group, {
      name: 'Hậu cung',
      width: 5.8,
      height: 8.2,
      position: [0, 0.5, -19.32],
      material: 'stone',
    })
    this.kit.arch(this.group, {
      name: 'Kính màu hậu cung',
      width: 3.8,
      height: 6.8,
      position: [0, 0.85, -19.18],
      material: 'blueGlass',
    })
    this.kit.box(this.group, {
      name: 'Thánh giá bàn thờ',
      size: [0.22, 2.6, 0.18],
      position: [0, 5.7, -18.96],
      material: 'altar',
    })
    this.kit.box(this.group, {
      name: 'Thánh giá bàn thờ',
      size: [1.35, 0.2, 0.18],
      position: [0, 6.2, -18.95],
      material: 'altar',
    })
  }

  #buildWindows() {
    for (const side of [-1, 1]) {
      const x = side * 9.36
      const rotationY = side < 0 ? Math.PI / 2 : -Math.PI / 2
      const innerX = x - side * 0.08
      for (const [index, z] of [-12.5, -7, -1.5, 4, 9.5].entries()) {
        this.kit.arch(this.group, {
          name: 'Viền cửa sổ vòm interior',
          width: 1.8,
          height: 4.2,
          position: [x, 3.2, z],
          material: 'stoneLight',
          rotationY,
        })
        this.kit.arch(this.group, {
          name: 'Kính màu interior',
          width: 1.35,
          height: 3.65,
          position: [innerX, 3.4, z],
          material: index % 2 === 0 ? 'redGlass' : 'blueGlass',
          rotationY,
        })
      }
    }
  }

  #buildLighting() {
    const ambient = new THREE.AmbientLight(0x9299a2, 1.18)
    this.lighting.ambient = ambient
    this.group.add(ambient)
    for (const z of [7, 0, -7, -14]) {
      const light = new THREE.PointLight(0xe7aa66, 9, 12, 2)
      light.position.set(0, 6.8, z)
      this.group.add(light)
      this.lighting.pendantLights.push(light)
      this.kit.sphere(this.group, {
        name: 'Đèn treo Nhà thờ',
        scale: [0.18, 0.28, 0.18],
        position: [0, 6.65, z],
        material: 'warmGlass',
      })
      this.kit.cylinder(this.group, {
        name: 'Dây đèn treo',
        radius: 0.025,
        height: 3.5,
        position: [0, 8.55, z],
        material: 'metal',
      })
    }
    const altarLight = new THREE.SpotLight(0xf3c27f, 20, 24, Math.PI / 5, 0.7, 1.2)
    altarLight.position.set(0, 8, -10)
    altarLight.target.position.set(0, 1.4, -17)
    this.group.add(altarLight, altarLight.target)
    this.lighting.altarLight = altarLight
  }
}
