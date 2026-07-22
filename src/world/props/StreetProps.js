import * as THREE from 'three'

export class StreetProps {
  constructor({ kit, parent, colliders }) {
    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Đạo cụ khu phố'
    this.lineGeometries = []
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x2d3333 })
    parent.add(this.group)

    this.#addPlazaFurniture(colliders)
    this.#addStreetLamps(colliders)
    this.#addCafeFurniture(colliders)
    this.#addMotorbikes(colliders)
    this.#addStreetFurniture(colliders)
    this.#addUtilityDetails()
  }

  #addPlazaFurniture(colliders) {
    for (const [x, z] of [[-11.5, -6], [11.5, -6], [-11.5, 3.5], [11.5, 3.5]]) {
      this.#addPlanter(x, z, colliders)
    }
    this.#addBench(-9.5, 1, 0, colliders)
    this.#addBench(9.5, 1, Math.PI, colliders)
    this.#addPlanter(13.2, 18.45, colliders)
    this.#addPlanter(25.1, 18.45, colliders)
  }

  #addPlanter(x, z, colliders) {
    this.kit.cylinder(this.group, {
      name: 'Chậu cây',
      radius: 0.55,
      height: 0.72,
      position: [x, 0.36, z],
      material: 'terracotta',
      castShadow: true,
    })
    this.kit.sphere(this.group, {
      name: 'Tán cây thấp',
      scale: [0.72, 1.05, 0.72],
      position: [x, 1.32, z],
      material: 'foliage',
      castShadow: true,
    })
    this.kit.addCollider(colliders, x, z, 0.95, 0.95, 'Chậu cây')
  }

  #addBench(x, z, rotationY, colliders) {
    const bench = new THREE.Group()
    bench.name = 'Ghế sân Nhà thờ'
    bench.position.set(x, 0, z)
    bench.rotation.y = rotationY
    this.group.add(bench)
    this.kit.box(bench, {
      name: 'Mặt ghế',
      size: [2.2, 0.14, 0.5],
      position: [0, 0.62, 0],
      material: 'wood',
      castShadow: true,
    })
    for (const y of [0.82, 1.08, 1.34]) {
      this.kit.box(bench, {
        name: 'Nan lưng ghế',
        size: [2.2, 0.13, 0.11],
        position: [0, y, 0.22],
        material: 'wood',
      })
    }
    for (const side of [-1, 1]) {
      this.kit.box(bench, {
        name: 'Chân ghế',
        size: [0.12, 0.62, 0.42],
        position: [side * 0.82, 0.31, 0],
        material: 'metal',
      })
    }
    this.kit.addCollider(colliders, x, z, 2.35, 0.85, 'Ghế sân Nhà thờ')
  }

  #addStreetLamps(colliders) {
    for (const [x, z] of [[-14, 6], [14, 6], [-15, -8], [15, -8]]) {
      this.kit.cylinder(this.group, {
        name: 'Cột đèn đường',
        radius: 0.1,
        height: 4.4,
        position: [x, 2.2, z],
        material: 'metal',
        castShadow: true,
      })
      this.kit.box(this.group, {
        name: 'Tay đèn',
        size: [0.62, 0.08, 0.08],
        position: [x + (x < 0 ? 0.26 : -0.26), 4.22, z],
        material: 'metal',
      })
      this.kit.sphere(this.group, {
        name: 'Bóng đèn đường',
        scale: [0.22, 0.18, 0.22],
        position: [x + (x < 0 ? 0.56 : -0.56), 4.1, z],
        material: 'warmGlass',
      })
      this.kit.cylinder(this.group, {
        name: 'Đế cột đèn đường',
        radius: 0.24,
        height: 0.3,
        position: [x, 0.15, z],
        material: 'metal',
      })
      this.kit.cylinder(this.group, {
        name: 'Vệt sáng đèn đường',
        radius: 2.15,
        height: 0.012,
        position: [x + (x < 0 ? 0.56 : -0.56), 0.07, z],
        material: 'lampPool',
        receiveShadow: false,
      })
      const light = new THREE.PointLight(0xf1b86f, 6.3, 10, 2)
      light.position.set(x + (x < 0 ? 0.56 : -0.56), 4, z)
      this.group.add(light)
      this.kit.addCollider(colliders, x, z, 0.32, 0.32, 'Cột đèn đường')
    }
  }

  #addCafeFurniture(colliders) {
    for (const [x, z] of [[15.5, 18.2], [19, 18.2], [22.5, 18.2]]) {
      this.kit.cylinder(this.group, {
        name: 'Bàn cà phê',
        radius: 0.55,
        height: 0.12,
        position: [x, 0.78, z],
        material: 'wood',
        castShadow: true,
      })
      this.kit.cylinder(this.group, {
        name: 'Chân bàn cà phê',
        radius: 0.08,
        height: 0.72,
        position: [x, 0.38, z],
        material: 'metal',
      })
      for (const side of [-1, 1]) {
        this.kit.box(this.group, {
          name: 'Ghế cà phê',
          size: [0.48, 0.58, 0.48],
          position: [x + side * 0.9, 0.3, z],
          material: 'greenDoor',
        })
        this.kit.box(this.group, {
          name: 'Lưng ghế cà phê',
          size: [0.48, 0.48, 0.1],
          position: [x + side * 0.9, 0.7, z + 0.18],
          material: 'greenDoor',
        })
      }
      this.kit.sphere(this.group, {
        name: 'Đèn bàn cà phê',
        scale: [0.09, 0.12, 0.09],
        position: [x, 0.94, z],
        material: 'warmGlass',
      })
      this.kit.addCollider(colliders, x, z, 1.15, 1.15, 'Bàn cà phê')
    }
  }

  #addMotorbikes(colliders) {
    this.#addMotorbike(-25, 18.2, 0.08, 'brick', colliders)
    this.#addMotorbike(-21.8, 18.35, -0.12, 'greenDoor', colliders)
    this.#addMotorbike(7.8, 18.15, 0.16, 'oldYellow', colliders)
    this.#addMotorbike(26.6, 18.35, -0.1, 'plaster', colliders)
  }

  #addMotorbike(x, z, rotationY, color, colliders) {
    const bike = new THREE.Group()
    bike.name = 'Xe máy đỗ'
    bike.position.set(x, 0, z)
    bike.rotation.y = rotationY
    this.group.add(bike)

    for (const wheelZ of [-0.7, 0.7]) {
      this.kit.cylinder(bike, {
        name: 'Bánh xe máy',
        radius: 0.34,
        height: 0.16,
        position: [0, 0.35, wheelZ],
        material: 'soot',
        rotation: [0, 0, Math.PI / 2],
        castShadow: true,
      })
    }
    const body = this.kit.box(bike, {
      name: 'Thân xe máy',
      size: [0.48, 0.42, 1.25],
      position: [0, 0.72, 0],
      material: color,
      castShadow: true,
    })
    body.rotation.x = -0.08
    this.kit.box(bike, {
      name: 'Yên xe máy',
      size: [0.42, 0.16, 0.75],
      position: [0, 1.02, 0.12],
      material: 'darkWood',
    })
    this.kit.box(bike, {
      name: 'Cổ xe máy',
      size: [0.18, 0.9, 0.18],
      position: [0, 1.1, -0.5],
      material: 'metal',
    })
    this.kit.box(bike, {
      name: 'Tay lái',
      size: [0.78, 0.08, 0.08],
      position: [0, 1.48, -0.54],
      material: 'metal',
    })
    for (const side of [-1, 1]) {
      const stem = this.kit.box(bike, {
        name: 'Cần gương xe máy',
        size: [0.04, 0.42, 0.04],
        position: [side * 0.3, 1.68, -0.53],
        material: 'metal',
      })
      stem.rotation.z = side * -0.42
      this.kit.sphere(bike, {
        name: 'Gương xe máy',
        scale: [0.12, 0.15, 0.06],
        position: [side * 0.39, 1.86, -0.53],
        material: 'glass',
      })
    }
    this.kit.sphere(bike, {
      name: 'Đèn xe máy',
      scale: [0.18, 0.18, 0.14],
      position: [0, 1.3, -0.7],
      material: 'warmGlass',
    })
    this.kit.addCollider(colliders, x, z, 0.85, 2, 'Xe máy đỗ')
  }

  #addStreetFurniture(colliders) {
    this.kit.cylinder(this.group, {
      name: 'Thùng rác',
      radius: 0.34,
      height: 0.82,
      position: [-16.2, 0.41, 18.2],
      material: 'greenDoor',
    })
    this.kit.addCollider(colliders, -16.2, 18.2, 0.7, 0.7, 'Thùng rác')

    this.kit.box(this.group, {
      name: 'Cột biển phố',
      size: [0.1, 2.5, 0.1],
      position: [28.8, 1.25, 8.8],
      material: 'metal',
    })
    this.kit.sign(this.group, {
      text: 'PHỐ NHÀ CHUNG',
      width: 2.7,
      height: 0.58,
      position: [28.8, 2.35, 8.72],
      background: '#315c55',
      foreground: '#f5e9c9',
    })
    this.kit.addCollider(colliders, 28.8, 8.8, 0.28, 0.28, 'Cột biển phố')

    this.kit.cylinder(this.group, {
      name: 'Biển giao thông',
      radius: 0.48,
      height: 0.08,
      position: [-29, 2.35, 9],
      material: 'brick',
      rotation: [Math.PI / 2, 0, 0],
    })
    this.kit.box(this.group, {
      name: 'Cột biển giao thông',
      size: [0.1, 2.4, 0.1],
      position: [-29, 1.2, 9.12],
      material: 'metal',
    })
  }

  #addUtilityDetails() {
    for (const x of [-7.3, 26.5]) {
      this.kit.cylinder(this.group, {
        name: 'Cột điện',
        radius: 0.12,
        height: 6.5,
        position: [x, 3.25, 19.2],
        material: 'metal',
      })
      this.kit.box(this.group, {
        name: 'Xà cột điện',
        size: [1.35, 0.1, 0.12],
        position: [x, 6.12, 19.2],
        material: 'metal',
      })
      for (const offset of [-0.48, 0, 0.48]) {
        this.kit.cylinder(this.group, {
          name: 'Sứ cách điện',
          radius: 0.07,
          height: 0.22,
          position: [x + offset, 6.29, 19.2],
          material: 'stoneLight',
        })
      }
    }
    const wirePairs = [
      [[-31, 6.4, 20], [-7.3, 6.35, 19.2]],
      [[-7.3, 6.35, 19.2], [8, 6.15, 20]],
      [[8, 6.15, 20], [26.5, 6.4, 19.2]],
    ]
    for (const pair of wirePairs) {
      const points = pair.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      points.splice(1, 0, new THREE.Vector3(
        (pair[0][0] + pair[1][0]) / 2,
        Math.min(pair[0][1], pair[1][1]) - 0.55,
        (pair[0][2] + pair[1][2]) / 2,
      ))
      const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2])
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12))
      this.lineGeometries.push(geometry)
      this.group.add(new THREE.Line(geometry, this.lineMaterial))
    }
  }

  dispose() {
    this.lineGeometries.forEach((geometry) => geometry.dispose())
    this.lineMaterial.dispose()
  }
}
