import * as THREE from 'three'

const COLORS = {
  stone: 0x9b9b91,
  stoneLight: 0xc0bdb0,
  stoneDark: 0x686b68,
  soot: 0x363b3b,
  roof: 0x4a4b49,
  brick: 0x925548,
  oldYellow: 0xc59c57,
  plaster: 0xc8bda8,
  sage: 0x71877a,
  greenDoor: 0x315c55,
  wood: 0x613f2f,
  darkWood: 0x3b2923,
  glass: 0x66828a,
  warmGlass: 0xe3a95f,
  asphalt: 0x373d40,
  sidewalk: 0x8d8980,
  plaza: 0x9e9a90,
  curb: 0xc2baaa,
  metal: 0x343a3a,
  foliage: 0x4e6957,
  terracotta: 0x9f5c43,
  altar: 0xb39262,
  pew: 0x51372b,
}

export class SceneKit {
  constructor() {
    this.geometries = new Map()
    this.materials = new Map()
    this.textures = []

    this.geometries.set('box', new THREE.BoxGeometry(1, 1, 1))
    this.geometries.set('plane', new THREE.PlaneGeometry(1, 1))
    this.geometries.set('cylinder', new THREE.CylinderGeometry(1, 1, 1, 10))
    this.geometries.set('sphere', new THREE.SphereGeometry(1, 12, 8))
    this.geometries.set('cone4', new THREE.ConeGeometry(1, 1, 4))
    this.geometries.set('cone8', new THREE.ConeGeometry(1, 1, 8))
    this.geometries.set('torus', new THREE.TorusGeometry(1, 0.07, 5, 16))
    this.geometries.set('arch', this.#createArchGeometry())
    this.geometries.set('gable', this.#createGableGeometry())

    const plazaTexture = this.#createPavingTexture('#9e9a90', '#817e77', 128, 32, 16)
    plazaTexture.repeat.set(12, 10)
    const sidewalkTexture = this.#createPavingTexture('#8d8980', '#716e68', 128, 24, 16)
    sidewalkTexture.repeat.set(24, 5)
    const roadTexture = this.#createRoadTexture()
    roadTexture.repeat.set(20, 5)
    const weatheredStoneTexture = this.#createStoneTexture({
      seed: 1886,
      base: [143, 142, 134],
      variation: 18,
      streakStrength: 0.12,
      mossStrength: 0.025,
      repeat: [3, 4],
    })
    const agedStoneTexture = this.#createStoneTexture({
      seed: 2022,
      base: [108, 109, 103],
      variation: 25,
      streakStrength: 0.27,
      mossStrength: 0.07,
      repeat: [3, 4],
    })
    const trimStoneTexture = this.#createStoneTexture({
      seed: 315,
      base: [177, 174, 163],
      variation: 12,
      streakStrength: 0.06,
      mossStrength: 0.01,
      repeat: [4, 3],
    })
    const churchRoofTexture = this.#createRoofTileTexture(645, 128)
    churchRoofTexture.repeat.set(5, 10)

    this.#standard('stone', COLORS.stone)
    this.#standard('stoneLight', COLORS.stoneLight)
    this.#standard('stoneDark', COLORS.stoneDark)
    this.#standard('stoneWarm', 0xada693)
    this.#standard('stoneWeathered', 0xffffff, {
      map: weatheredStoneTexture,
      roughness: 0.98,
    })
    this.#standard('stoneAged', 0xffffff, {
      map: agedStoneTexture,
      roughness: 1,
    })
    this.#standard('stoneTrim', 0xffffff, {
      map: trimStoneTexture,
      roughness: 0.94,
    })
    this.#standard('soot', COLORS.soot)
    this.#standard('roof', COLORS.roof, { roughness: 0.82 })
    this.#standard('churchRoofTile', 0xffffff, {
      map: churchRoofTexture,
      roughness: 0.96,
    })
    this.#standard('brick', COLORS.brick)
    this.#standard('oldYellow', COLORS.oldYellow)
    this.#standard('plaster', COLORS.plaster)
    this.#standard('sage', COLORS.sage)
    this.#standard('greenDoor', COLORS.greenDoor)
    this.#standard('wood', COLORS.wood)
    this.#standard('darkWood', COLORS.darkWood)
    this.#standard('glass', COLORS.glass, { roughness: 0.3, metalness: 0.08 })
    this.#standard('warmGlass', COLORS.warmGlass, {
      emissive: COLORS.warmGlass,
      emissiveIntensity: 0.55,
      roughness: 0.45,
    })
    this.#standard('asphalt', 0xffffff, { map: roadTexture, roughness: 1 })
    this.#standard('sidewalk', 0xffffff, { map: sidewalkTexture, roughness: 1 })
    this.#standard('plaza', 0xffffff, { map: plazaTexture, roughness: 1 })
    this.#standard('curb', COLORS.curb)
    this.#standard('metal', COLORS.metal, { roughness: 0.55, metalness: 0.45 })
    this.#standard('foliage', COLORS.foliage)
    this.#standard('foliageLight', 0x668267)
    this.#standard('foliageDark', 0x344f45)
    this.#standard('terracotta', COLORS.terracotta)
    this.#standard('altar', COLORS.altar)
    this.#standard('pew', COLORS.pew)
    this.#standard('whiteMarking', 0xd7d2c3)
    this.#standard('roadPatch', 0x454a4b)
    this.#standard('lakeWater', 0x315f69, {
      emissive: 0x17343b,
      emissiveIntensity: 0.18,
      roughness: 0.36,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94,
    })
    this.#standard('waterReflection', 0xd7ad68, {
      emissive: 0xc58f49,
      emissiveIntensity: 0.72,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    this.#standard('bridgeRed', 0xa53f35, { roughness: 0.78 })
    this.#standard('templeWall', 0xd2b879)
    this.#standard('tileRed', 0x75443e, { roughness: 0.86 })
    this.#standard('lampGlow', 0xf1bf73, {
      emissive: 0xe9a856,
      emissiveIntensity: 0.9,
      roughness: 0.42,
    })
    this.#standard('lampPool', 0xe2a85f, {
      emissive: 0xe2a85f,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    })
    this.#standard('redGlass', 0x87494c, {
      emissive: 0x4f1f22,
      emissiveIntensity: 0.45,
    })
    this.#standard('blueGlass', 0x416879, {
      emissive: 0x17394a,
      emissiveIntensity: 0.5,
    })
    this.#standard('amberGlass', 0xb87943, {
      emissive: 0x7a3e20,
      emissiveIntensity: 0.62,
      roughness: 0.38,
    })
    this.#standard('tealGlass', 0x3e7775, {
      emissive: 0x183f42,
      emissiveIntensity: 0.58,
      roughness: 0.36,
    })
  }

  material(name) {
    const material = this.materials.get(name)
    if (!material) throw new Error(`Unknown world material: ${name}`)
    return material
  }

  box(parent, options) {
    const {
      name = 'Box',
      size,
      position,
      material,
      colliders,
      collision = false,
      rotationY = 0,
      castShadow = false,
      receiveShadow = true,
    } = options
    const mesh = new THREE.Mesh(this.geometries.get('box'), this.material(material))
    mesh.name = name
    mesh.scale.set(size[0], size[1], size[2])
    mesh.position.set(position[0], position[1], position[2])
    mesh.rotation.y = rotationY
    mesh.castShadow = castShadow
    mesh.receiveShadow = receiveShadow
    parent.add(mesh)

    if (collision && colliders) {
      const quarterTurn = Math.abs(Math.sin(rotationY)) > 0.5
      const width = quarterTurn ? size[2] : size[0]
      const depth = quarterTurn ? size[0] : size[2]
      this.addCollider(colliders, position[0], position[2], width, depth, name)
    }

    return mesh
  }

  instancedBoxes(parent, options) {
    const mesh = new THREE.InstancedMesh(
      this.geometries.get('box'),
      this.material(options.material),
      options.instances.length,
    )
    mesh.name = options.name ?? 'Instanced boxes'
    mesh.castShadow = options.castShadow ?? false
    mesh.receiveShadow = options.receiveShadow ?? true

    const transform = new THREE.Object3D()
    options.instances.forEach((instance, index) => {
      transform.position.set(instance.position[0], instance.position[1], instance.position[2])
      transform.scale.set(instance.size[0], instance.size[1], instance.size[2])
      transform.rotation.set(
        instance.rotation?.[0] ?? 0,
        instance.rotation?.[1] ?? 0,
        instance.rotation?.[2] ?? 0,
      )
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    parent.add(mesh)
    return mesh
  }

  cylinder(parent, options) {
    const {
      name = 'Cylinder',
      radius = 1,
      height = 1,
      position,
      material,
      rotation = [0, 0, 0],
      castShadow = false,
      receiveShadow = true,
    } = options
    const mesh = new THREE.Mesh(this.geometries.get('cylinder'), this.material(material))
    mesh.name = name
    mesh.scale.set(radius, height, radius)
    mesh.position.set(position[0], position[1], position[2])
    mesh.rotation.set(rotation[0], rotation[1], rotation[2])
    mesh.castShadow = castShadow
    mesh.receiveShadow = receiveShadow
    parent.add(mesh)
    return mesh
  }

  sphere(parent, options) {
    const mesh = new THREE.Mesh(this.geometries.get('sphere'), this.material(options.material))
    mesh.name = options.name ?? 'Sphere'
    const scale = options.scale ?? [1, 1, 1]
    mesh.scale.set(scale[0], scale[1], scale[2])
    mesh.position.set(options.position[0], options.position[1], options.position[2])
    mesh.castShadow = options.castShadow ?? false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  cone(parent, options) {
    const geometry = this.geometries.get(options.sides === 4 ? 'cone4' : 'cone8')
    const mesh = new THREE.Mesh(geometry, this.material(options.material))
    mesh.name = options.name ?? 'Cone'
    mesh.scale.set(options.radius, options.height, options.radius)
    mesh.position.set(options.position[0], options.position[1], options.position[2])
    mesh.rotation.y = options.rotationY ?? 0
    mesh.castShadow = options.castShadow ?? false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  arch(parent, options) {
    const mesh = new THREE.Mesh(this.geometries.get('arch'), this.material(options.material))
    mesh.name = options.name ?? 'Arch'
    mesh.scale.set(options.width, options.height / 1.5, 1)
    mesh.position.set(options.position[0], options.position[1], options.position[2])
    mesh.rotation.y = options.rotationY ?? 0
    mesh.castShadow = options.castShadow ?? false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  gable(parent, options) {
    const mesh = new THREE.Mesh(this.geometries.get('gable'), this.material(options.material))
    mesh.name = options.name ?? 'Gable'
    mesh.scale.set(options.width, options.height, options.depth)
    mesh.position.set(options.position[0], options.position[1], options.position[2])
    mesh.castShadow = options.castShadow ?? false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  sign(parent, options) {
    const texture = this.#createSignTexture(
      options.text,
      options.background ?? '#315c55',
      options.foreground ?? '#f2dfb0',
    )
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.materials.set(`sign-${this.materials.size}`, material)
    const mesh = new THREE.Mesh(this.geometries.get('plane'), material)
    mesh.name = `Biển hiệu ${options.text}`
    mesh.scale.set(options.width, options.height, 1)
    mesh.position.set(options.position[0], options.position[1], options.position[2])
    mesh.rotation.set(...(options.rotation ?? [0, 0, 0]))
    parent.add(mesh)
    return mesh
  }

  addCollider(colliders, x, z, width, depth, name = 'Collider') {
    colliders.push({
      name,
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    })
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.textures.forEach((texture) => texture.dispose())
  }

  #standard(name, color, options = {}) {
    this.materials.set(
      name,
      new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.92,
        metalness: options.metalness ?? 0,
        map: options.map ?? null,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        depthWrite: options.depthWrite ?? true,
      }),
    )
  }

  #createArchGeometry() {
    const shape = new THREE.Shape()
    shape.moveTo(-0.5, 0)
    shape.lineTo(-0.5, 1)
    shape.absarc(0, 1, 0.5, Math.PI, 0, true)
    shape.lineTo(0.5, 0)
    shape.closePath()
    return new THREE.ShapeGeometry(shape, 12)
  }

  #createGableGeometry() {
    const shape = new THREE.Shape()
    shape.moveTo(-0.5, 0)
    shape.lineTo(0.5, 0)
    shape.lineTo(0.5, 0.52)
    shape.lineTo(0, 1)
    shape.lineTo(-0.5, 0.52)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, -0.5)
    return geometry
  }

  #createStoneTexture({
    seed,
    base,
    variation,
    streakStrength,
    mossStrength,
    repeat,
    size = 128,
  }) {
    const data = new Uint8Array(size * size * 4)
    const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)))

    for (let y = 0; y < size; y += 1) {
      const vertical = y / (size - 1)
      for (let x = 0; x < size; x += 1) {
        const fine = this.#surfaceNoise(x, y, seed) - 0.5
        const coarse = this.#surfaceNoise(Math.floor(x / 9), Math.floor(y / 9), seed + 17) - 0.5
        const column = this.#surfaceNoise(Math.floor(x / 3), 0, seed + 41)
        const streak = Math.max(0, (column - 0.79) / 0.21)
          * streakStrength
          * (0.25 + vertical * 0.75)
        const dampNoise = this.#surfaceNoise(Math.floor(x / 7), Math.floor(y / 5), seed + 83)
        const damp = Math.max(0, (vertical - 0.72) / 0.28)
          * Math.max(0, (dampNoise - 0.58) / 0.42)
          * mossStrength
        const shade = fine * variation * 0.65
          + coarse * variation * 1.35
          - streak * 52
          - damp * 26
        const offset = (y * size + x) * 4

        data[offset] = clampByte(base[0] + shade - damp * 9)
        data[offset + 1] = clampByte(base[1] + shade + damp * 7)
        data[offset + 2] = clampByte(base[2] + shade - damp * 4)
        data[offset + 3] = 255
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.name = `Procedural stone ${seed}`
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeat[0], repeat[1])
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
    this.textures.push(texture)
    return texture
  }

  #createRoofTileTexture(seed, size) {
    const data = new Uint8Array(size * size * 4)
    const tileWidth = 24
    const tileHeight = 12
    const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)))

    for (let y = 0; y < size; y += 1) {
      const row = Math.floor(y / tileHeight)
      const rowY = y % tileHeight
      const rowOffset = row % 2 === 0 ? 0 : tileWidth / 2
      for (let x = 0; x < size; x += 1) {
        const tileX = (x + rowOffset) % tileWidth
        const mortar = rowY < 1 || tileX < 1
        const grain = this.#surfaceNoise(x, y, seed) - 0.5
        const patch = this.#surfaceNoise(Math.floor(x / 8), Math.floor(y / 6), seed + 29) - 0.5
        const shade = mortar ? -30 : grain * 13 + patch * 18
        const offset = (y * size + x) * 4

        data[offset] = clampByte(103 + shade)
        data[offset + 1] = clampByte(60 + shade * 0.65)
        data[offset + 2] = clampByte(52 + shade * 0.58)
        data[offset + 3] = 255
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.name = `Procedural roof tile ${seed}`
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
    this.textures.push(texture)
    return texture
  }

  #surfaceNoise(x, y, seed) {
    let value = Math.imul(x + seed, 0x1f123bb5) ^ Math.imul(y - seed, 0x5f356495)
    value ^= value >>> 15
    value = Math.imul(value, 0x2c1b3c6d)
    value ^= value >>> 12
    value = Math.imul(value, 0x297a2d39)
    value ^= value >>> 15
    return (value >>> 0) / 0xffffffff
  }

  #createPavingTexture(fill, line, size, brickWidth, brickHeight) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    context.fillStyle = fill
    context.fillRect(0, 0, size, size)
    context.strokeStyle = line
    context.lineWidth = 1.5
    for (let y = 0; y <= size; y += brickHeight) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(size, y)
      context.stroke()
      const row = Math.round(y / brickHeight)
      const offset = row % 2 === 0 ? 0 : brickWidth / 2
      for (let x = -offset; x <= size; x += brickWidth) {
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(x, Math.min(size, y + brickHeight))
        context.stroke()
      }
    }
    context.fillStyle = 'rgba(255, 255, 255, 0.035)'
    for (let i = 0; i < 32; i += 1) {
      context.fillRect((i * 37) % size, (i * 53) % size, 5, 2)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    this.textures.push(texture)
    return texture
  }

  #createRoadTexture() {
    const size = 96
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    context.fillStyle = '#373d40'
    context.fillRect(0, 0, size, size)
    for (let i = 0; i < 220; i += 1) {
      const shade = 48 + ((i * 17) % 18)
      context.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 4})`
      context.fillRect((i * 29) % size, (i * 47) % size, 1, 1)
    }
    context.strokeStyle = 'rgba(22, 25, 26, 0.45)'
    context.lineWidth = 1
    for (let i = 0; i < 6; i += 1) {
      const x = 8 + ((i * 31) % 80)
      const y = 10 + ((i * 23) % 74)
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + 5, y + 2)
      context.lineTo(x + 8, y - 1)
      context.stroke()
    }
    context.fillStyle = 'rgba(78, 82, 83, 0.34)'
    context.fillRect(9, 57, 22, 9)
    context.fillRect(63, 18, 17, 7)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    this.textures.push(texture)
    return texture
  }

  #createSignTexture(text, background, foreground) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = foreground
    context.lineWidth = 6
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)
    context.fillStyle = foreground
    context.font = '700 48px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1, canvas.width - 50)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 2
    this.textures.push(texture)
    return texture
  }
}
