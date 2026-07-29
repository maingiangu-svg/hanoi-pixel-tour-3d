import * as THREE from 'three'

/**
 * VietnameseGeometryBuilder — Stylized Realistic geometry factory.
 *
 * Creates detailed Vietnamese street-life geometry:
 * - Trees: multi-canopy with trunk, branches, leaf clusters
 * - Buildings: multi-floor with balconies, shutters, AC units, wiring
 * - Streets: textured with curbs, markings, puddles
 * - Street furniture: detailed lamps, benches, vendor carts
 * - Vehicles: detailed motorbikes, cyclos
 * - Water features: enhanced lake edges, reflections
 */

export class VietnameseGeometryBuilder {
  constructor(kit) {
    this.kit = kit
  }

  // ═══════════════════════════════════════════════════
  // TREES — Multi-canopy Vietnamese trees
  // ═══════════════════════════════════════════════════

  /**
   * Create a detailed Vietnamese tree with multi-layer canopy.
   * @param {THREE.Group} parent
   * @param {number} x
   * @param {number} z
   * @param {'large'|'medium'|'small'} size
   * @param {Array} colliders
   */
  addTree(parent, x, z, size = 'medium', colliders = null) {
    const group = new THREE.Group()
    group.name = `Cây ${size}`
    group.position.set(x, 0, z)
    parent.add(group)

    const s = size === 'large' ? 1.4 : size === 'small' ? 0.7 : 1.0

    // Thân cây — nghiêng tự nhiên
    const trunkGeo = new THREE.CylinderGeometry(0.06 * s, 0.12 * s, 2.2 * s, 8)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.92 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 1.1 * s
    trunk.rotation.z = 0.05
    trunk.castShadow = true
    group.add(trunk)

    // Cành cây
    const branchGeo = new THREE.CylinderGeometry(0.02 * s, 0.04 * s, 0.8 * s, 6)
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x4A2A10, roughness: 0.88 })
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI * 2) / 4 + Math.random() * 0.5
      const branch = new THREE.Mesh(branchGeo, branchMat)
      branch.position.set(
        Math.cos(angle) * 0.25 * s,
        1.6 * s + i * 0.15 * s,
        Math.sin(angle) * 0.25 * s,
      )
      branch.rotation.z = Math.cos(angle) * 0.6
      branch.rotation.x = Math.sin(angle) * 0.4
      group.add(branch)
    }

    // Tán lá — nhiều tầng, nhiều sphere
    const foliageColors = [0x3D6B3A, 0x4A7A42, 0x2D5A2D, 0x3A6A35]
    const layers = [
      { y: 2.0, scale: [1.3, 0.8, 1.3], color: 0 },
      { y: 2.4, scale: [1.0, 0.7, 1.0], color: 1 },
      { y: 2.7, scale: [0.7, 0.6, 0.7], color: 2 },
      { y: 2.9, scale: [0.4, 0.45, 0.4], color: 3 },
    ]

    for (const layer of layers) {
      const geo = new THREE.SphereGeometry(1, 8, 6)
      const mat = new THREE.MeshStandardMaterial({
        color: foliageColors[layer.color],
        roughness: 0.85,
      })
      const foliage = new THREE.Mesh(geo, mat)
      foliage.position.set(
        (Math.random() - 0.5) * 0.3 * s,
        layer.y * s,
        (Math.random() - 0.5) * 0.3 * s,
      )
      foliage.scale.set(layer.scale[0] * s, layer.scale[1] * s, layer.scale[2] * s)
      foliage.castShadow = true
      group.add(foliage)
    }

    // Rễ cây (cho cây lớn)
    if (size === 'large') {
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3
        const rootGeo = new THREE.BoxGeometry(0.08 * s, 0.3, 0.15 * s)
        const root = new THREE.Mesh(rootGeo, trunkMat)
        root.position.set(Math.cos(angle) * 0.2, 0.15, Math.sin(angle) * 0.2)
        root.rotation.y = angle
        group.add(root)
      }
    }

    if (colliders) {
      this.kit.addCollider(colliders, x, z, 0.5 * s, 0.5 * s, 'Cây')
    }

    return group
  }

  // ═══════════════════════════════════════════════════
  // STREETS — Textured ground with details
  // ═══════════════════════════════════════════════════

  /**
   * Create a detailed street section with asphalt, curbs, markings.
   */
  addStreetSection(parent, x, z, width, depth, direction = 'ew') {
    const group = new THREE.Group()
    group.name = 'Đường phố chi tiết'
    group.position.set(x, 0, z)
    parent.add(group)

    // Mặt đường — asphalt
    const roadGeo = new THREE.BoxGeometry(width, 0.12, depth)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x4A4E52, roughness: 0.92 })
    const road = new THREE.Mesh(roadGeo, roadMat)
    road.position.y = 0.06
    road.receiveShadow = true
    group.add(road)

    // Vỉa hè — hai bên
    for (const side of [-1, 1]) {
      const sidewalkGeo = new THREE.BoxGeometry(width, 0.18, 1.8)
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9A9590, roughness: 0.88 })
      const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat)
      sidewalk.position.set(0, 0.09, side * (depth / 2 + 0.9))
      sidewalk.receiveShadow = true
      group.add(sidewalk)

      // Bó vỉa
      const curbGeo = new THREE.BoxGeometry(width, 0.24, 0.18)
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 })
      const curb = new THREE.Mesh(curbGeo, curbMat)
      curb.position.set(0, 0.12, side * (depth / 2 + 0.02))
      group.add(curb)
    }

    // Vạch kẻ đường — nét đứt
    const dashGeo = new THREE.BoxGeometry(2.5, 0.025, 0.12)
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.7 })
    for (let dx = -width / 2 + 3; dx < width / 2; dx += 5.5) {
      const dash = new THREE.Mesh(dashGeo, dashMat)
      dash.position.set(dx, 0.13, 0)
      group.add(dash)
    }

    return group
  }

  // ═══════════════════════════════════════════════════
  // BUILDINGS — Detailed Vietnamese tube houses
  // ═══════════════════════════════════════════════════

  /**
   * Create a detailed Vietnamese tube house.
   */
  addTubeHouse(parent, x, z, width, depth, height, color = 0xE8C86A, colliders = null) {
    const group = new THREE.Group()
    group.name = 'Nhà ống Việt Nam'
    group.position.set(x, 0, z)
    parent.add(group)

    // Thân nhà
    const bodyGeo = new THREE.BoxGeometry(width, height, depth)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.92 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = height / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    // Chân tường — đá tối
    const baseGeo = new THREE.BoxGeometry(width + 0.08, 0.5, depth + 0.08)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x6A6560, roughness: 0.9 })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.25
    group.add(base)

    // Gờ phân tầng
    const ledgeGeo = new THREE.BoxGeometry(width + 0.15, 0.2, 0.3)
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x7A7570, roughness: 0.88 })
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat)
    ledge.position.set(0, 4.2, -depth / 2 - 0.08)
    ledge.castShadow = true
    group.add(ledge)

    // Cửa sổ — nhiều tầng
    const floors = Math.max(1, Math.floor((height - 4) / 2.5))
    const windowGeo = new THREE.BoxGeometry(1.0, 1.4, 0.12)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x5577AA,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
    })
    const frameGeo = new THREE.BoxGeometry(1.15, 1.55, 0.08)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5A5550, roughness: 0.85 })

    for (let floor = 0; floor < floors; floor++) {
      const windowY = 5.2 + floor * 2.45
      const columns = width < 4 ? 2 : 3
      for (let col = 0; col < columns; col++) {
        const wx = (col - (columns - 1) / 2) * (width * 0.6 / Math.max(1, columns - 1))
        // Khung cửa sổ
        const frame = new THREE.Mesh(frameGeo, frameMat)
        frame.position.set(wx, windowY, -depth / 2 - 0.04)
        group.add(frame)
        // Kính cửa sổ
        const win = new THREE.Mesh(windowGeo, windowMat)
        win.position.set(wx, windowY, -depth / 2 - 0.06)
        group.add(win)
        // Bậu cửa sổ
        const sillGeo = new THREE.BoxGeometry(1.2, 0.1, 0.25)
        const sill = new THREE.Mesh(sillGeo, ledgeMat)
        sill.position.set(wx, windowY - 0.8, -depth / 2 - 0.06)
        group.add(sill)
      }

      // Ban công (tầng 1 và 3)
      if (floor % 2 === 0) {
        this.#addBalcony(group, width, depth, windowY - 0.95)
      }
    }

    // Mái ngói
    if (height > 6) {
      const roofGeo = new THREE.BoxGeometry(width + 0.4, 0.3, depth * 0.65)
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xB85A3C, roughness: 0.88 })
      const roof = new THREE.Mesh(roofGeo, roofMat)
      roof.position.set(0, height + 0.35, -depth * 0.1)
      roof.rotation.x = -0.12
      roof.castShadow = true
      group.add(roof)
    }

    // Điều hòa
    if (height > 7) {
      const acGeo = new THREE.BoxGeometry(0.9, 0.5, 0.35)
      const acMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 })
      const ac = new THREE.Mesh(acGeo, acMat)
      ac.position.set(width * 0.3, 5.8, -depth / 2 - 0.2)
      group.add(ac)
    }

    if (colliders) {
      this.kit.addCollider(colliders, x, z, width + 0.2, depth + 0.2, 'Nhà ống')
    }

    return group
  }

  #addBalcony(parent, buildingWidth, buildingDepth, y) {
    const balconyWidth = Math.min(buildingWidth - 0.6, 4.5)
    const balconyGroup = new THREE.Group()
    balconyGroup.position.set(0, y, -buildingDepth / 2 - 0.4)
    parent.add(balconyGroup)

    // Sàn ban công
    const floorGeo = new THREE.BoxGeometry(balconyWidth, 0.14, 0.85)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8A8580, roughness: 0.85 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.y = 0
    floor.castShadow = true
    balconyGroup.add(floor)

    // Lan can sắt
    const railGeo = new THREE.BoxGeometry(balconyWidth, 0.06, 0.06)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.5, metalness: 0.5 })
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(0, 0.78, -0.38)
    balconyGroup.add(rail)

    // Nan lan can
    const barGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04)
    for (let bx = -balconyWidth / 2; bx <= balconyWidth / 2; bx += 0.45) {
      const bar = new THREE.Mesh(barGeo, railMat)
      bar.position.set(bx, 0.38, -0.38)
      balconyGroup.add(bar)
    }

    // Chậu cây trên ban công
    if (Math.random() > 0.4) {
      const potGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.15, 6)
      const potMat = new THREE.MeshStandardMaterial({ color: 0xB85A3C, roughness: 0.85 })
      const pot = new THREE.Mesh(potGeo, potMat)
      pot.position.set(balconyWidth * 0.3, 0.08, -0.15)
      balconyGroup.add(pot)

      const plantGeo = new THREE.SphereGeometry(0.18, 6, 5)
      const plantMat = new THREE.MeshStandardMaterial({ color: 0x3D6B3A, roughness: 0.85 })
      const plant = new THREE.Mesh(plantGeo, plantMat)
      plant.position.set(balconyWidth * 0.3, 0.25, -0.15)
      balconyGroup.add(plant)
    }
  }

  // ═══════════════════════════════════════════════════
  // STREET LAMPS — Detailed Vietnamese street lights
  // ═══════════════════════════════════════════════════

  addStreetLamp(parent, x, z, colliders = null) {
    const group = new THREE.Group()
    group.name = 'Đèn đường Việt Nam'
    group.position.set(x, 0, z)
    parent.add(group)

    // Cột đèn
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.y = 2.25
    pole.castShadow = true
    group.add(pole)

    // Đế cột
    const baseGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.3, 8)
    const base = new THREE.Mesh(baseGeo, poleMat)
    base.position.y = 0.15
    group.add(base)

    // Tay đèn — cong
    const armGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06)
    const arm = new THREE.Mesh(armGeo, poleMat)
    arm.position.set(0.35, 4.35, 0)
    group.add(arm)

    // Chùm đèn — hình nón
    const shadeGeo = new THREE.ConeGeometry(0.25, 0.2, 8, 1, true)
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide,
    })
    const shade = new THREE.Mesh(shadeGeo, shadeMat)
    shade.position.set(0.72, 4.25, 0)
    shade.rotation.x = Math.PI
    group.add(shade)

    // Bóng đèn — phát sáng
    const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8E7,
      emissive: 0xF5BE58,
      emissiveIntensity: 0.8,
    })
    const bulb = new THREE.Mesh(bulbGeo, bulbMat)
    bulb.position.set(0.72, 4.15, 0)
    group.add(bulb)

    // Vệt sáng dưới đất
    const poolGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.015, 16)
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0xF5BE58,
      transparent: true,
      opacity: 0.12,
      emissive: 0xF5BE58,
      emissiveIntensity: 0.3,
    })
    const pool = new THREE.Mesh(poolGeo, poolMat)
    pool.position.set(0.72, 0.008, 0)
    group.add(pool)

    // Point light
    const light = new THREE.PointLight(0xF5BE58, 5, 10, 2)
    light.position.set(0.72, 4.1, 0)
    group.add(light)

    if (colliders) {
      this.kit.addCollider(colliders, x, z, 0.3, 0.3, 'Đèn đường')
    }

    return { group, light }
  }

  // ═══════════════════════════════════════════════════
  // BENCHES — Vietnamese street benches
  // ═══════════════════════════════════════════════════

  addBench(parent, x, z, rotationY = 0, colliders = null) {
    const group = new THREE.Group()
    group.name = 'Ghế đá Việt Nam'
    group.position.set(x, 0, z)
    group.rotation.y = rotationY
    parent.add(group)

    // Mặt ghế — đá
    const seatGeo = new THREE.BoxGeometry(2.0, 0.14, 0.48)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xB0A898, roughness: 0.9 })
    const seat = new THREE.Mesh(seatGeo, seatMat)
    seat.position.y = 0.58
    seat.castShadow = true
    group.add(seat)

    // Lưng ghế
    const backGeo = new THREE.BoxGeometry(2.0, 0.6, 0.1)
    const back = new THREE.Mesh(backGeo, seatMat)
    back.position.set(0, 0.92, 0.2)
    group.add(back)

    // Chân ghế — đá
    for (const side of [-0.75, 0.75]) {
      const legGeo = new THREE.BoxGeometry(0.15, 0.58, 0.42)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x8A8580, roughness: 0.88 })
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(side, 0.29, 0)
      group.add(leg)
    }

    if (colliders) {
      this.kit.addCollider(colliders, x, z, 2.2, 0.8, 'Ghế đá')
    }

    return group
  }

  // ═══════════════════════════════════════════════════
  // VENDOR CART — Vietnamese street food cart
  // ═══════════════════════════════════════════════════

  addVendorCart(parent, x, z, color = 0xB85A3C) {
    const group = new THREE.Group()
    group.name = 'Xe đẩy hàng rong'
    group.position.set(x, 0, z)
    parent.add(group)

    // Thân xe
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.85, 0.9)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.52
    body.castShadow = true
    group.add(body)

    // Mặt bàn
    const topGeo = new THREE.BoxGeometry(1.5, 0.06, 1.0)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.85 })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.y = 0.98
    group.add(top)

    // Bánh xe
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    for (const side of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(side, 0.14, 0)
      group.add(wheel)
    }

    // Mái che
    const canopyGeo = new THREE.BoxGeometry(1.6, 0.04, 1.2)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xE83030,
      emissive: 0xE83030,
      emissiveIntensity: 0.08,
      roughness: 0.65,
    })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.y = 1.85
    canopy.rotation.x = -0.1
    group.add(canopy)

    // Đèn
    const light = new THREE.PointLight(0xF5BE58, 0.6, 4, 2)
    light.position.set(0, 1.4, 0)
    group.add(light)

    return group
  }

  // ═══════════════════════════════════════════════════
  // LAKE EDGE — Detailed lake shoreline
  // ═══════════════════════════════════════════════════

  addLakeEdge(parent, x, z, width, depth) {
    const group = new THREE.Group()
    group.name = 'Bờ hồ chi tiết'
    group.position.set(x, 0, z)
    parent.add(group)

    // Đá bờ hồ
    const rockGeo = new THREE.DodecahedronGeometry(0.3, 0)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7A7570, roughness: 0.92 })
    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat)
      const angle = (i / 12) * Math.PI * 2
      const radius = width / 2 + (Math.random() - 0.5) * 2
      rock.position.set(
        Math.cos(angle) * radius,
        0.1 + Math.random() * 0.15,
        Math.sin(angle) * radius * 0.6,
      )
      rock.scale.setScalar(0.5 + Math.random() * 0.8)
      rock.rotation.set(Math.random(), Math.random(), Math.random())
      group.add(rock)
    }

    // Cây cỏ bờ hồ
    const grassGeo = new THREE.ConeGeometry(0.15, 0.4, 4)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4A7A42, roughness: 0.85 })
    for (let i = 0; i < 20; i++) {
      const grass = new THREE.Mesh(grassGeo, grassMat)
      const angle = (i / 20) * Math.PI * 2
      const radius = width / 2 + 0.5 + Math.random()
      grass.position.set(
        Math.cos(angle) * radius,
        0.2,
        Math.sin(angle) * radius * 0.6,
      )
      grass.rotation.z = (Math.random() - 0.5) * 0.3
      grass.scale.setScalar(0.6 + Math.random() * 0.5)
      group.add(grass)
    }

    return group
  }
}
