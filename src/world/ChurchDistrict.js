import * as THREE from 'three'
import { SceneKit } from './shared/SceneKit.js'
import { ChurchBuilding } from './buildings/ChurchBuilding.js'
import { StreetBuilding } from './buildings/StreetBuilding.js'
import { ChurchInterior } from './interiors/ChurchInterior.js'
import { StreetProps } from './props/StreetProps.js'

const OUTDOOR_SKY = 0x596777
const INTERIOR_SKY = 0x17191b

export class ChurchDistrict {
  constructor(scene) {
    this.scene = scene
    this.kit = new SceneKit()
    this.root = new THREE.Group()
    this.root.name = 'Vertical slice Nhà thờ Lớn'
    this.outdoor = new THREE.Group()
    this.outdoor.name = 'Khu Nhà thờ Lớn'
    this.root.add(this.outdoor)
    scene.add(this.root)

    const outdoorColliders = []
    this.#buildOutdoorLighting()
    this.#buildGround(outdoorColliders)
    this.church = new ChurchBuilding({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.#buildStreet(outdoorColliders)
    this.props = new StreetProps({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.interior = new ChurchInterior({ kit: this.kit, parent: this.root })

    this.areas = {
      outdoor: {
        name: 'outdoor',
        group: this.outdoor,
        colliders: outdoorColliders,
        bounds: { minX: -34, maxX: 34, minZ: -38, maxZ: 32 },
        spawn: { x: 0, z: 6, yaw: 0 },
        returnSpawn: { x: 0, z: -9.7, yaw: Math.PI },
        portal: {
          position: new THREE.Vector3(0, 0, -12.65),
          radius: 2.5,
          label: 'Vào Nhà thờ',
          target: 'interior',
        },
      },
      interior: {
        name: 'interior',
        group: this.interior.group,
        colliders: this.interior.colliders,
        bounds: this.interior.bounds,
        spawn: { x: 0, z: 10.7, yaw: 0 },
        portal: {
          position: new THREE.Vector3(0, 0, 13.15),
          radius: 2.25,
          label: 'Ra ngoài',
          target: 'outdoor',
        },
      },
    }
    this.activeAreaName = 'outdoor'
    this.colliders = this.areas.outdoor.colliders
    this.bounds = this.areas.outdoor.bounds
    this.spawn = this.areas.outdoor.spawn
    this.#applyAtmosphere('outdoor')
  }

  getActivePortal() {
    return this.areas[this.activeAreaName].portal
  }

  transition(targetAreaName) {
    if (targetAreaName === this.activeAreaName || !this.areas[targetAreaName]) {
      return this.areas[this.activeAreaName]
    }

    this.activeAreaName = targetAreaName
    this.outdoor.visible = targetAreaName === 'outdoor'
    this.interior.group.visible = targetAreaName === 'interior'
    this.#applyAtmosphere(targetAreaName)

    const area = this.areas[targetAreaName]
    const spawn = targetAreaName === 'outdoor' ? area.returnSpawn : area.spawn
    this.colliders = area.colliders
    this.bounds = area.bounds
    return { ...area, spawn }
  }

  #buildOutdoorLighting() {
    const ambient = new THREE.AmbientLight(0x84909f, 0.5)
    const sky = new THREE.HemisphereLight(0x8d9caf, 0x4c4137, 1.2)
    const sun = new THREE.DirectionalLight(0xffd39b, 1.9)
    sun.name = 'Ánh chiều tối'
    sun.position.set(-18, 26, 18)
    sun.target.position.set(0, 5, -16)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -34
    sun.shadow.camera.right = 34
    sun.shadow.camera.top = 34
    sun.shadow.camera.bottom = -34
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 74
    sun.shadow.bias = -0.0005
    const rim = new THREE.DirectionalLight(0x8498b6, 0.42)
    rim.name = 'Ánh trời xanh cuối ngày'
    rim.position.set(22, 18, -30)
    rim.target.position.set(0, 8, -12)
    this.outdoor.add(ambient, sky, sun, sun.target, rim, rim.target)
  }

  #buildGround(colliders) {
    this.kit.box(this.outdoor, {
      name: 'Nền khu phố',
      size: [70, 0.32, 72],
      position: [0, -0.22, -3],
      material: 'stoneDark',
      receiveShadow: true,
    })
    this.kit.box(this.outdoor, {
      name: 'Sân Nhà thờ lát đá',
      size: [30, 0.16, 25],
      position: [0, -0.02, -3.5],
      material: 'plaza',
      receiveShadow: true,
    })
    this.kit.box(this.outdoor, {
      name: 'Lòng đường Nhà Chung',
      size: [68, 0.12, 8],
      position: [0, -0.02, 13],
      material: 'asphalt',
      receiveShadow: true,
    })
    for (const z of [8.4, 17.6]) {
      this.kit.box(this.outdoor, {
        name: 'Vỉa hè phố Nhà Chung',
        size: [68, 0.18, 1.2],
        position: [0, 0.04, z],
        material: 'sidewalk',
        receiveShadow: true,
      })
      this.kit.box(this.outdoor, {
        name: 'Bó vỉa',
        size: [68, 0.24, 0.18],
        position: [0, 0.08, z + (z < 13 ? 0.62 : -0.62)],
        material: 'curb',
      })
    }
    for (let x = -29; x <= 29; x += 7.2) {
      this.kit.box(this.outdoor, {
        name: 'Vạch giữa đường',
        size: [3.4, 0.025, 0.12],
        position: [x, 0.05, 13],
        material: 'whiteMarking',
      })
    }
    for (const x of [-18, 5, 27]) {
      this.kit.cylinder(this.outdoor, {
        name: 'Nắp cống',
        radius: 0.46,
        height: 0.035,
        position: [x, 0.055, 14.7],
        material: 'metal',
      })
    }
    this.kit.box(this.outdoor, {
      name: 'Mặt ngõ Ấu Triệu',
      size: [3.15, 0.14, 14],
      position: [-9.9, 0, 25],
      material: 'sidewalk',
      receiveShadow: true,
    })

    this.#buildPlazaAccents()
    this.#buildSurfaceDetails()
    this.#buildSideBoundaries(colliders)
  }

  #buildPlazaAccents() {
    for (const x of [-7.2, 0, 7.2]) {
      this.kit.box(this.outdoor, {
        name: 'Dải đá sân Nhà thờ',
        size: [0.12, 0.025, 21],
        position: [x, 0.075, -3.3],
        material: 'stoneLight',
      })
    }
    for (const z of [-10, -3, 4]) {
      this.kit.box(this.outdoor, {
        name: 'Dải đá ngang sân Nhà thờ',
        size: [27, 0.025, 0.12],
        position: [0, 0.075, z],
        material: 'stoneLight',
      })
    }
  }

  #buildSurfaceDetails() {
    this.kit.instancedBoxes(this.outdoor, {
      name: 'Đá lát sân đổi sắc',
      material: 'stoneWarm',
      receiveShadow: true,
      instances: [
        [-10.5, -8.2], [-4.2, -6.1], [3.7, -8.8], [9.4, -4.8],
        [-12.2, -0.9], [-5.8, 2.1], [2.4, -1.7], [10.8, 2.6],
        [-9.1, 5.8], [-1.6, 5.1], [5.7, 4.6], [12.1, 6.3],
      ].map(([x, z], index) => ({
        size: [1.15 + (index % 3) * 0.22, 0.018, 0.28],
        position: [x, 0.078, z],
        rotation: [0, index % 2 === 0 ? 0 : Math.PI / 2, 0],
      })),
    })
    this.kit.instancedBoxes(this.outdoor, {
      name: 'Miếng vá mặt đường',
      material: 'roadPatch',
      receiveShadow: true,
      instances: [
        { size: [3.2, 0.018, 1.2], position: [-22, 0.052, 11.8], rotation: [0, 0.1, 0] },
        { size: [2.4, 0.018, 0.8], position: [-2.5, 0.052, 14.4], rotation: [0, -0.08, 0] },
        { size: [3.8, 0.018, 1.05], position: [18.5, 0.052, 12.1], rotation: [0, 0.06, 0] },
      ],
    })
  }

  #buildSideBoundaries(colliders) {
    for (const side of [-1, 1]) {
      const x = side * 31.65
      const segments = side < 0
        ? [
            { z: -9.2, depth: 11.2, height: 8.4, material: 'oldYellow', sign: 'TRÀ CHANH' },
            { z: 1.4, depth: 9.6, height: 11.6, material: 'brick', sign: null },
            { z: 10, depth: 7.4, height: 9.3, material: 'sage', sign: 'MAY ĐO' },
          ]
        : [
            { z: -9.4, depth: 10.8, height: 11.2, material: 'plaster', sign: null },
            { z: 1.2, depth: 10, height: 8.7, material: 'oldYellow', sign: 'BÁNH MÌ' },
            { z: 10.1, depth: 7.4, height: 12.2, material: 'brick', sign: null },
          ]

      for (const [index, segment] of segments.entries()) {
        this.kit.box(this.outdoor, {
          name: `Dãy nhà phố bên ${side < 0 ? 'tây' : 'đông'}`,
          size: [4.3, segment.height, segment.depth],
          position: [x, segment.height / 2, segment.z],
          material: segment.material,
          collision: true,
          colliders,
          castShadow: index === 1,
        })
        const frontX = x - side * 2.2
        const windowLevels = segment.height > 10 ? [3.1, 6.1, 8.8] : [3.1, 6.2]
        for (const y of windowLevels) {
          for (const offset of [-segment.depth * 0.24, segment.depth * 0.24]) {
            this.kit.box(this.outdoor, {
              name: 'Cửa sổ dãy nhà bên',
              size: [0.12, 1.45, 1.35],
              position: [frontX, y, segment.z + offset],
              material: y === 3.1 && (index + side) % 2 === 0 ? 'warmGlass' : 'glass',
            })
          }
        }
        this.kit.box(this.outdoor, {
          name: 'Gờ mái dãy nhà bên',
          size: [4.65, 0.3, segment.depth + 0.2],
          position: [x, segment.height + 0.04, segment.z],
          material: 'stoneDark',
          castShadow: true,
        })
        if (index === 1) {
          const balcony = this.kit.box(this.outdoor, {
            name: 'Ban công dãy nhà bên',
            size: [0.86, 0.16, segment.depth * 0.55],
            position: [frontX - side * 0.36, 5.05, segment.z],
            material: 'stoneDark',
            castShadow: true,
          })
          balcony.rotation.z = side * 0.04
        }
        if (segment.sign) {
          this.kit.sign(this.outdoor, {
            text: segment.sign,
            width: Math.min(3.9, segment.depth * 0.55),
            height: 0.62,
            position: [frontX - side * 0.09, 2.2, segment.z],
            rotation: [0, -side * Math.PI / 2, 0],
            background: index % 2 === 0 ? '#80443c' : '#315c55',
            foreground: '#f4e3bd',
          })
        }
      }
    }
  }

  #buildStreet(colliders) {
    const buildings = [
      { x: -29, width: 6, height: 8.2, material: 'brick', variant: 'home', sign: 'TẠP HÓA', roof: 'tile' },
      { x: -22.5, width: 6.5, height: 11.5, material: 'oldYellow', variant: 'shop', sign: 'PHỞ GÀ', roof: 'flat' },
      { x: -15.5, width: 6.7, height: 9.6, material: 'sage', variant: 'home', sign: null, roof: 'tile' },
      { x: -4.2, width: 6.8, height: 12.5, material: 'plaster', variant: 'shop', sign: 'TIỆM SÁCH', roof: 'flat' },
      { x: 2.1, width: 6.9, height: 9.7, material: 'brick', variant: 'home', sign: null, roof: 'tile' },
      { x: 9.9, width: 8.2, height: 11.2, material: 'oldYellow', variant: 'shop', sign: 'ĐỒ GỐM', roof: 'flat' },
      { x: 19.5, width: 9, height: 10.3, material: 'sage', variant: 'cafe', sign: 'CÀ PHÊ NHÀ THỜ', roof: 'tile', castShadow: true },
      { x: 29.5, width: 9.4, height: 12.4, material: 'plaster', variant: 'home', sign: null, roof: 'flat' },
    ]
    buildings.forEach((building, index) => {
      new StreetBuilding({
        kit: this.kit,
        parent: this.outdoor,
        colliders,
        config: {
          ...building,
          name: `Nhà phố ${index + 1}`,
          z: 25.5,
          depth: 10.5,
          detailSeed: index,
          signColor: index % 2 === 0 ? '#315c55' : '#80443c',
        },
      })
    })
    this.kit.sign(this.outdoor, {
      text: 'NGÕ ẤU TRIỆU',
      width: 2.45,
      height: 0.58,
      position: [-9.9, 2.85, 19.98],
      rotation: [0, Math.PI, 0],
      background: '#315c55',
      foreground: '#f4e7c8',
    })
  }

  #applyAtmosphere(areaName) {
    const indoor = areaName === 'interior'
    this.scene.background = new THREE.Color(indoor ? INTERIOR_SKY : OUTDOOR_SKY)
    this.scene.fog = indoor
      ? new THREE.Fog(INTERIOR_SKY, 22, 42)
      : new THREE.Fog(OUTDOOR_SKY, 52, 92)
  }

  dispose() {
    this.props.dispose()
    this.kit.dispose()
    this.scene.remove(this.root)
  }
}
