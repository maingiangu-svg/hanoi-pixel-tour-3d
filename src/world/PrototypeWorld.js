import * as THREE from 'three'

const PALETTE = {
  grass: 0x71816d,
  road: 0x3f4544,
  sidewalk: 0xb5aa96,
  curb: 0xd6c9af,
  plaster: 0xd7c19e,
  sage: 0x8f9f8a,
  fadedRed: 0x985d50,
  yellow: 0xd3ad63,
  dark: 0x303735,
  window: 0x5d7778,
  door: 0x763f32,
  lamp: 0xd7c37d,
}

export class PrototypeWorld {
  constructor(scene) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.name = 'Prototype street'
    this.colliders = []
    this.bounds = { minX: -15, maxX: 15, minZ: -50, maxZ: 50 }

    this.materials = this.#createMaterials()
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
      sphere: new THREE.SphereGeometry(1, 12, 8),
    }

    this.#addLighting()
    this.#addGroundAndStreet()
    this.#addBuildings()
    this.#addGate()
    this.#addStreetLamps()
    this.#addStreetDetails()

    scene.add(this.group)
  }

  #createMaterials() {
    const material = (color, roughness = 0.9) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })

    return {
      grass: material(PALETTE.grass),
      road: material(PALETTE.road),
      sidewalk: material(PALETTE.sidewalk),
      curb: material(PALETTE.curb),
      plaster: material(PALETTE.plaster),
      sage: material(PALETTE.sage),
      fadedRed: material(PALETTE.fadedRed),
      yellow: material(PALETTE.yellow),
      dark: material(PALETTE.dark, 0.6),
      window: material(PALETTE.window, 0.45),
      door: material(PALETTE.door, 0.75),
      lamp: new THREE.MeshStandardMaterial({
        color: PALETTE.lamp,
        emissive: PALETTE.lamp,
        emissiveIntensity: 0.35,
      }),
      line: material(0xd2cbaa),
    }
  }

  #addLighting() {
    const ambient = new THREE.AmbientLight(0xd8e0d9, 1.6)
    const sun = new THREE.DirectionalLight(0xffedcf, 2.35)
    sun.position.set(-18, 28, 16)
    sun.target.position.set(0, 0, -12)
    this.group.add(ambient, sun, sun.target)
  }

  #addGroundAndStreet() {
    this.#addBox('Ground', 32, 0.3, 104, 0, -0.18, 0, this.materials.grass)
    this.#addBox('Road', 8, 0.08, 100, 0, -0.01, 0, this.materials.road)

    for (const side of [-1, 1]) {
      this.#addBox(
        'Sidewalk',
        4.2,
        0.16,
        100,
        side * 6.1,
        0.04,
        0,
        this.materials.sidewalk,
      )
      this.#addBox(
        'Curb',
        0.18,
        0.28,
        100,
        side * 4.08,
        0.07,
        0,
        this.materials.curb,
      )
    }
  }

  #addBuildings() {
    const buildings = [
      { x: -11, z: 25, w: 6, d: 13, h: 7.5, material: 'yellow' },
      { x: -11.5, z: 8, w: 7, d: 15, h: 10, material: 'fadedRed' },
      { x: -11, z: -14, w: 6, d: 14, h: 8, material: 'plaster' },
      { x: -11.5, z: -35, w: 7, d: 18, h: 11, material: 'sage' },
      { x: 10.5, z: 24, w: 7, d: 14, h: 9, material: 'sage' },
      { x: 11, z: 5, w: 6, d: 16, h: 8.5, material: 'plaster', door: true },
      { x: 11.5, z: -17, w: 7, d: 16, h: 11, material: 'yellow' },
      { x: 11, z: -38, w: 6, d: 17, h: 7.5, material: 'fadedRed' },
    ]

    for (const building of buildings) {
      this.#addBox(
        'Building',
        building.w,
        building.h,
        building.d,
        building.x,
        building.h / 2,
        building.z,
        this.materials[building.material],
        true,
      )
      this.#addFacadeDetails(building)
      this.#addBox(
        'Roof trim',
        building.w + 0.18,
        0.22,
        building.d + 0.18,
        building.x,
        building.h + 0.08,
        building.z,
        this.materials.dark,
      )
    }
  }

  #addFacadeDetails(building) {
    const facadeX = building.x < 0
      ? building.x + building.w / 2 + 0.012
      : building.x - building.w / 2 - 0.012
    const floors = building.h > 9 ? 3 : 2

    for (let floor = 0; floor < floors; floor += 1) {
      const y = 2.1 + floor * 2.35
      for (const zOffset of [-building.d * 0.25, building.d * 0.25]) {
        this.#addBox(
          'Window',
          0.06,
          1.25,
          1.25,
          facadeX,
          y,
          building.z + zOffset,
          this.materials.window,
          false,
        )
      }
    }

    if (!building.door) return

    this.#addBox(
      'Reachable door',
      0.08,
      2.45,
      1.35,
      facadeX,
      1.24,
      building.z + 0.2,
      this.materials.door,
      false,
    )
    this.#addBox(
      'Door lintel',
      0.12,
      0.16,
      1.75,
      facadeX,
      2.56,
      building.z + 0.2,
      this.materials.dark,
      false,
    )
  }

  #addGate() {
    for (const x of [-5.25, 5.25]) {
      this.#addBox(
        'Gate pillar',
        0.82,
        4.2,
        0.82,
        x,
        2.1,
        -22,
        this.materials.fadedRed,
        true,
      )
      this.#addBox(
        'Gate cap',
        1.05,
        0.28,
        1.05,
        x,
        4.22,
        -22,
        this.materials.yellow,
      )
    }

    this.#addBox(
      'Gate lintel',
      11.3,
      0.58,
      0.65,
      0,
      3.88,
      -22,
      this.materials.fadedRed,
    )
    this.#addBox(
      'Gate sign',
      3.8,
      0.72,
      0.14,
      0,
      3.45,
      -21.62,
      this.materials.yellow,
    )
  }

  #addStreetLamps() {
    for (const z of [34, 14, -8, -34]) {
      for (const x of [-4.7, 4.7]) {
        const pole = new THREE.Mesh(this.geometries.cylinder, this.materials.dark)
        pole.name = 'Lamp post'
        pole.scale.set(0.1, 2.8, 0.1)
        pole.position.set(x, 1.4, z)
        this.group.add(pole)

        const arm = this.#addBox(
          'Lamp arm',
          0.62,
          0.08,
          0.08,
          x + (x < 0 ? 0.24 : -0.24),
          2.72,
          z,
          this.materials.dark,
        )
        arm.rotation.z = x < 0 ? -0.22 : 0.22

        const bulb = new THREE.Mesh(this.geometries.sphere, this.materials.lamp)
        bulb.name = 'Lamp globe'
        bulb.scale.setScalar(0.16)
        bulb.position.set(x + (x < 0 ? 0.5 : -0.5), 2.65, z)
        this.group.add(bulb)

        this.colliders.push({
          minX: x - 0.16,
          maxX: x + 0.16,
          minZ: z - 0.16,
          maxZ: z + 0.16,
        })
      }
    }
  }

  #addStreetDetails() {
    for (let z = -44; z <= 44; z += 8) {
      this.#addBox('Road marking', 0.1, 0.025, 2.6, 0, 0.05, z, this.materials.line)
    }

    this.#addBox(
      'Low wall',
      4.8,
      1.4,
      0.45,
      -10.5,
      0.7,
      45,
      this.materials.fadedRed,
      true,
    )
  }

  #addBox(
    name,
    width,
    height,
    depth,
    x,
    y,
    z,
    material,
    collidable = false,
    rotationY = 0,
  ) {
    const mesh = new THREE.Mesh(this.geometries.box, material)
    mesh.name = name
    mesh.scale.set(width, height, depth)
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotationY
    this.group.add(mesh)

    if (collidable) {
      this.colliders.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      })
    }

    return mesh
  }

  dispose() {
    Object.values(this.geometries).forEach((geometry) => geometry.dispose())
    Object.values(this.materials).forEach((material) => material.dispose())
    this.scene.remove(this.group)
  }
}
