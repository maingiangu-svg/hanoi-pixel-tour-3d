import * as THREE from 'three'

export class ChurchBuilding {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Nhà thờ Lớn Hà Nội'
    this.facadeLights = []
    parent.add(this.group)

    this.#buildMasses(colliders)
    this.#buildFacade()
    this.#buildSteps()
    this.#buildLighting()
  }

  #buildMasses(colliders) {
    this.kit.box(this.group, {
      name: 'Khối gian chính Nhà thờ',
      size: [12, 10.8, 22],
      position: [0, 5.4, -27],
      material: 'stone',
      collision: true,
      colliders,
      castShadow: true,
    })
    this.kit.gable(this.group, {
      name: 'Mái gian chính',
      width: 13.2,
      height: 5.4,
      depth: 22.8,
      position: [0, 10.7, -27],
      material: 'roof',
      castShadow: true,
    })
    for (const side of [-1, 1]) {
      const roofEdge = this.kit.box(this.group, {
        name: 'Diềm mái gian chính',
        size: [7.2, 0.34, 23.2],
        position: [side * 3.25, 13.15, -27],
        material: 'stoneDark',
        castShadow: true,
      })
      roofEdge.rotation.z = side * -0.42
    }

    for (const side of [-1, 1]) {
      const x = side * 8
      this.kit.box(this.group, {
        name: 'Tháp chuông',
        size: [5.6, 16.5, 14],
        position: [x, 8.25, -23],
        material: 'stone',
        collision: true,
        colliders,
        castShadow: true,
      })
      this.kit.box(this.group, {
        name: 'Tầng chuông',
        size: [4.8, 3.2, 5.4],
        position: [x, 17.2, -18.6],
        material: 'stoneDark',
        castShadow: true,
      })
      this.kit.box(this.group, {
        name: 'Gờ chân mái tháp',
        size: [5.5, 0.38, 5.9],
        position: [x, 18.88, -18.6],
        material: 'stoneLight',
        castShadow: true,
      })
      this.kit.cone(this.group, {
        name: 'Mái tháp',
        sides: 4,
        radius: 3.65,
        height: 4.6,
        position: [x, 21.1, -19.2],
        rotationY: Math.PI / 4,
        material: 'roof',
        castShadow: true,
      })
      this.#addCross(x, 23.8, -19.2)

      for (const z of [-19, -27.5]) {
        this.kit.box(this.group, {
          name: 'Trụ chống Nhà thờ',
          size: [0.75, 8.2, 1.15],
          position: [side * 11, 4.1, z],
          material: 'stoneDark',
          castShadow: true,
        })
      }
    }
  }

  #buildFacade() {
    this.kit.box(this.group, {
      name: 'Lớp mặt tiền trung tâm',
      size: [11.4, 10.5, 0.85],
      position: [0, 5.25, -15.45],
      material: 'stoneLight',
      castShadow: true,
    })
    this.kit.gable(this.group, {
      name: 'Tam giác mặt tiền',
      width: 11.5,
      height: 5.2,
      depth: 0.9,
      position: [0, 10.35, -15.42],
      material: 'stoneLight',
      castShadow: true,
    })

    for (const side of [-1, 1]) {
      const towerX = side * 8
      this.kit.box(this.group, {
        name: 'Lớp mặt tiền tháp',
        size: [5.15, 15.8, 0.75],
        position: [towerX, 7.9, -15.62],
        material: 'stoneLight',
        castShadow: true,
      })
      for (const pilasterX of [towerX - 2.05, towerX + 2.05]) {
        this.kit.box(this.group, {
          name: 'Trụ đứng mặt tiền',
          size: [0.46, 15.6, 0.55],
          position: [pilasterX, 7.8, -15.15],
          material: 'stoneDark',
          castShadow: true,
        })
      }

      this.#addFramedArch({
        x: towerX,
        y: 3.1,
        z: -15.08,
        outer: [2.15, 4.1],
        inner: [1.62, 3.55],
        innerMaterial: 'blueGlass',
        name: 'Cửa sổ vòm tầng dưới',
      })
      this.#addWindowMullions(towerX, 3.28, -14.88, 1.42, 3.15)
      this.#addFramedArch({
        x: towerX,
        y: 10.6,
        z: -15.06,
        outer: [1.9, 3.7],
        inner: [1.36, 3.15],
        innerMaterial: 'soot',
        name: 'Hốc chuông',
      })
      this.kit.cylinder(this.group, {
        name: 'Chuông',
        radius: 0.34,
        height: 0.8,
        position: [towerX, 11.3, -14.9],
        material: 'altar',
      })
    }

    this.#addFramedArch({
      x: 0,
      y: 0.35,
      z: -14.96,
      outer: [4.15, 5.9],
      inner: [3.35, 5.25],
      innerMaterial: 'darkWood',
      name: 'Cửa chính Nhà thờ',
    })
    this.kit.box(this.group, {
      name: 'Đường ghép cửa',
      size: [0.08, 4.2, 0.12],
      position: [0, 2.45, -14.78],
      material: 'altar',
    })
    for (const side of [-1, 1]) {
      this.kit.box(this.group, {
        name: 'Tay nắm cửa',
        size: [0.1, 0.48, 0.13],
        position: [side * 0.27, 2.25, -14.67],
        material: 'altar',
      })
    }

    this.#addRoseWindow()

    for (const x of [-4.4, 4.4]) {
      this.kit.box(this.group, {
        name: 'Trụ giữa mặt tiền',
        size: [0.5, 10, 0.5],
        position: [x, 5, -14.96],
        material: 'stoneDark',
        castShadow: true,
      })
    }

    this.#addFacadeLayers()
  }

  #addFramedArch({ x, y, z, outer, inner, innerMaterial, name }) {
    this.kit.arch(this.group, {
      name: `${name} viền đá`,
      width: outer[0],
      height: outer[1],
      position: [x, y, z],
      material: 'stoneDark',
    })
    this.kit.arch(this.group, {
      name: `${name} viền nổi`,
      width: (outer[0] + inner[0]) / 2,
      height: (outer[1] + inner[1]) / 2,
      position: [x, y + 0.09, z + 0.055],
      material: 'stoneWarm',
      castShadow: true,
    })
    this.kit.arch(this.group, {
      name,
      width: inner[0],
      height: inner[1],
      position: [x, y + 0.18, z + 0.115],
      material: innerMaterial,
    })
  }

  #addWindowMullions(x, y, z, width, height) {
    this.kit.box(this.group, {
      name: 'Đố đứng kính màu',
      size: [0.11, height * 0.82, 0.09],
      position: [x, y + height * 0.42, z],
      material: 'altar',
    })
    this.kit.box(this.group, {
      name: 'Đố ngang kính màu',
      size: [width * 0.9, 0.11, 0.09],
      position: [x, y + height * 0.36, z],
      material: 'altar',
    })
  }

  #addRoseWindow() {
    this.kit.cylinder(this.group, {
      name: 'Cửa sổ hoa hồng',
      radius: 1.52,
      height: 0.14,
      position: [0, 8.35, -14.86],
      material: 'redGlass',
      rotation: [Math.PI / 2, 0, 0],
    })
    this.kit.cylinder(this.group, {
      name: 'Viền cửa sổ hoa hồng',
      radius: 1.72,
      height: 0.1,
      position: [0, 8.35, -14.92],
      material: 'stoneDark',
      rotation: [Math.PI / 2, 0, 0],
    })
    this.kit.cylinder(this.group, {
      name: 'Kính hoa hồng lớp trước',
      radius: 1.46,
      height: 0.11,
      position: [0, 8.35, -14.78],
      material: 'redGlass',
      rotation: [Math.PI / 2, 0, 0],
    })
    for (const rotation of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2]) {
      const bar = this.kit.box(this.group, {
        name: 'Nan kính màu',
        size: [0.11, 2.85, 0.09],
        position: [0, 8.35, -14.63],
        material: 'altar',
      })
      bar.rotation.z = rotation
    }
    const glassMaterials = [
      'amberGlass',
      'tealGlass',
      'blueGlass',
      'redGlass',
      'amberGlass',
      'tealGlass',
      'blueGlass',
      'redGlass',
    ]
    glassMaterials.forEach((material, index) => {
      const angle = (index / glassMaterials.length) * Math.PI * 2
      this.kit.cylinder(this.group, {
        name: 'Ô kính màu hoa hồng',
        radius: 0.33,
        height: 0.08,
        position: [Math.cos(angle) * 0.87, 8.35 + Math.sin(angle) * 0.87, -14.53],
        material,
        rotation: [Math.PI / 2, 0, 0],
      })
    })
    this.kit.cylinder(this.group, {
      name: 'Tâm cửa sổ hoa hồng',
      radius: 0.29,
      height: 0.09,
      position: [0, 8.35, -14.49],
      material: 'amberGlass',
      rotation: [Math.PI / 2, 0, 0],
    })
  }

  #addFacadeLayers() {
    const courses = [
      { size: [12.2, 0.34, 1.12], position: [0, 4.65, -14.92] },
      { size: [12.4, 0.28, 1.1], position: [0, 10.18, -14.96] },
    ]
    for (const side of [-1, 1]) {
      courses.push(
        { size: [5.7, 0.36, 1.06], position: [side * 8, 7.92, -15.08] },
        { size: [5.9, 0.42, 1.12], position: [side * 8, 15.62, -15.02] },
      )
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Gờ ngang mặt tiền Nhà thờ',
      material: 'stoneDark',
      castShadow: true,
      instances: courses,
    })

    const centralColumns = []
    for (const x of [-2.55, 2.55]) {
      centralColumns.push(
        { size: [0.52, 6.45, 0.62], position: [x, 3.23, -14.78] },
        { size: [0.82, 0.34, 0.74], position: [x, 0.18, -14.75] },
        { size: [0.82, 0.36, 0.74], position: [x, 6.45, -14.75] },
      )
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Cột viền cửa chính',
      material: 'stoneWarm',
      castShadow: true,
      instances: centralColumns,
    })

    const quoins = []
    for (const towerX of [-8, 8]) {
      for (const edge of [-1, 1]) {
        for (const y of [1.1, 2.8, 4.5, 6.2, 9.1, 11.1, 13.1, 14.8]) {
          quoins.push({
            size: [0.72, 0.42, 0.48],
            position: [towerX + edge * 2.28, y, -14.76],
          })
        }
      }
    }
    this.kit.instancedBoxes(this.group, {
      name: 'Đá góc tháp chuông',
      material: 'stoneWarm',
      castShadow: true,
      instances: quoins,
    })

    for (const side of [-1, 1]) {
      const gableTrim = this.kit.box(this.group, {
        name: 'Viền mái mặt tiền',
        size: [6.45, 0.34, 1.16],
        position: [side * 2.92, 14.28, -14.9],
        material: 'stoneDark',
        castShadow: true,
      })
      gableTrim.rotation.z = side * -0.42
    }
  }

  #buildSteps() {
    const steps = [
      { width: 13, depth: 2.4, y: 0.08, z: -13.6 },
      { width: 11.4, depth: 1.85, y: 0.22, z: -14.15 },
      { width: 9.8, depth: 1.25, y: 0.38, z: -14.65 },
    ]
    for (const step of steps) {
      this.kit.box(this.group, {
        name: 'Bậc thềm Nhà thờ',
        size: [step.width, 0.18, step.depth],
        position: [0, step.y, step.z],
        material: 'stoneLight',
        receiveShadow: true,
      })
    }
  }

  #addCross(x, y, z) {
    this.kit.box(this.group, {
      name: 'Thánh giá',
      size: [0.18, 1.35, 0.18],
      position: [x, y, z],
      material: 'metal',
    })
    this.kit.box(this.group, {
      name: 'Thánh giá',
      size: [0.78, 0.16, 0.18],
      position: [x, y + 0.2, z],
      material: 'metal',
    })
  }

  #buildLighting() {
    for (const x of [-7.4, 0, 7.4]) {
      const intensity = x === 0 ? 24 : 21
      const light = new THREE.SpotLight(0xf2bd76, intensity, 28, Math.PI / 7, 0.68, 1.35)
      light.position.set(x, 1.05, -6.8)
      light.target.position.set(x, x === 0 ? 9 : 10.5, -16)
      this.group.add(light, light.target)
      this.facadeLights.push(light)
    }
  }
}
