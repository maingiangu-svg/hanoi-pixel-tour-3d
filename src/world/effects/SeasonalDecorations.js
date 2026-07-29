import * as THREE from 'three'
import { HANOI_VISUAL_TOKENS } from '../style/HanoiVisualTokens.js'

/**
 * SeasonalDecorations — Vietnamese seasonal event visuals.
 *
 * Supports:
 * - Tết Nguyên Đán: hoa mai vàng, câu đối đỏ, pháo hoa, dây trang trí
 * - Tết Trung Thu: đèn lồng, múa lân, mặt trăng lớn
 * - General: cờ đỏ sao vàng (national day)
 */

const LANTERN_COLORS = HANOI_VISUAL_TOKENS.streetProps.lanternStringColors

export class SeasonalDecorations {
  constructor({ parent, playerPosition, fireworksSystem }) {
    this.parent = parent
    this.playerPosition = playerPosition
    this.fireworksSystem = fireworksSystem

    this.group = new THREE.Group()
    this.group.name = 'Seasonal Decorations'
    parent.add(this.group)

    this.currentSeason = null
    this.seasonGroups = new Map()
    this._elapsed = 0

    this.#buildTetDecorations()
    this.#buildTrungThuDecorations()
  }

  /**
   * Activate a seasonal event.
   * @param {'tet'|'trungThu'|'quocKhanh'|null} season
   */
  setSeason(season) {
    if (season === this.currentSeason) return

    // Hide all
    for (const group of this.seasonGroups.values()) {
      group.visible = false
    }

    this.currentSeason = season

    if (season && this.seasonGroups.has(season)) {
      this.seasonGroups.get(season).visible = true
    }

    // Start fireworks for Tết
    if (season === 'tet' && this.fireworksSystem) {
      this.fireworksSystem.setTetMode(true)
      this.fireworksSystem.startShow(25)
    }
  }

  update(delta) {
    this._elapsed += delta
    if (!this.currentSeason) return

    // Animate based on season
    if (this.currentSeason === 'tet') {
      this.#animateTet(delta)
    } else if (this.currentSeason === 'trungThu') {
      this.#animateTrungThu(delta)
    }
  }

  dispose() {
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #buildTetDecorations() {
    const group = new THREE.Group()
    group.name = 'Tết Nguyên Đán'
    group.visible = false
    this.group.add(group)
    this.seasonGroups.set('tet', group)

    // ── Cây mai vàng (Yellow apricot trees) ──
    const maiPositions = [
      [45, 0, 32], [55, 0, 32], [65, 0, 32],
      [50, 0, 38], [60, 0, 38],
    ]
    for (const pos of maiPositions) {
      const mai = this.#createMaiTree()
      mai.position.set(...pos)
      group.add(mai)
    }

    // ── Cây đào (Peach blossom trees) ──
    const daoPositions = [
      [48, 0, 35], [58, 0, 35], [68, 0, 35],
    ]
    for (const pos of daoPositions) {
      const dao = this.#createDaoTree()
      dao.position.set(...pos)
      group.add(dao)
    }

    // ── Câu đối đỏ (Red couplets) ──
    const coupletPositions = [
      { pos: [44, 3.5, 30.5], rot: 0 },
      { pos: [54, 3.5, 30.5], rot: 0 },
      { pos: [64, 3.5, 30.5], rot: 0 },
    ]
    for (const { pos, rot } of coupletPositions) {
      const couplet = this.#createCouplet()
      couplet.position.set(...pos)
      couplet.rotation.y = rot
      group.add(couplet)
    }

    // ── Dây trang trí (Decorative strings) ──
    this.#createDecorativeString(group, [42, 4.2, 33], [72, 4.2, 33], 0xE83030)
    this.#createDecorativeString(group, [42, 4.0, 36], [72, 4.0, 36], 0xF5A623)
  }

  #buildTrungThuDecorations() {
    const group = new THREE.Group()
    group.name = 'Tết Trung Thu'
    group.visible = false
    this.group.add(group)
    this.seasonGroups.set('trungThu', group)

    // ── Đèn lồng Trung Thu (Mid-Autumn lanterns) ──
    const lanternPositions = [
      [46, 2.5, 33], [52, 2.5, 33], [58, 2.5, 33], [64, 2.5, 33],
      [46, 2.5, 36], [52, 2.5, 36], [58, 2.5, 36], [64, 2.5, 36],
    ]
    for (const pos of lanternPositions) {
      const lantern = this.#createTrungThuLantern()
      lantern.position.set(...pos)
      group.add(lantern)
    }

    // ── Mặt trăng lớn (Large moon decoration) ──
    const moon = this.#createMoonDecoration()
    moon.position.set(55, 8, 34)
    group.add(moon)

    // ── Đèn kéo quân (Star lanterns) ──
    const starLanternPositions = [
      [48, 3, 34], [56, 3, 34], [64, 3, 34],
    ]
    for (const pos of starLanternPositions) {
      const star = this.#createStarLantern()
      star.position.set(...pos)
      group.add(star)
    }
  }

  // ── Creators ──

  #createMaiTree() {
    const group = new THREE.Group()

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.9 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 0.9
    group.add(trunk)

    // Branches
    const branchGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.8, 5)
    for (let i = 0; i < 3; i++) {
      const branch = new THREE.Mesh(branchGeo, trunkMat)
      branch.position.set(
        Math.sin(i * 2.1) * 0.3,
        1.4 + i * 0.2,
        Math.cos(i * 2.1) * 0.3,
      )
      branch.rotation.z = (i - 1) * 0.5
      group.add(branch)
    }

    // Blossoms — yellow flowers
    const blossomGeo = new THREE.SphereGeometry(0.15, 6, 6)
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xF5D700,
      emissive: 0xF5D700,
      emissiveIntensity: 0.15,
      roughness: 0.6,
    })
    for (let i = 0; i < 12; i++) {
      const blossom = new THREE.Mesh(blossomGeo, blossomMat)
      blossom.position.set(
        (Math.random() - 0.5) * 1.2,
        1.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 1.2,
      )
      blossom.scale.setScalar(0.6 + Math.random() * 0.5)
      group.add(blossom)
    }

    // Pot
    const potGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.35, 8)
    const potMat = new THREE.MeshStandardMaterial({ color: 0xB85A3C, roughness: 0.85 })
    const pot = new THREE.Mesh(potGeo, potMat)
    pot.position.y = 0.175
    group.add(pot)

    return group
  }

  #createDaoTree() {
    const group = new THREE.Group()

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.6, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4A2A10, roughness: 0.9 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 0.8
    group.add(trunk)

    // Pink blossoms
    const blossomGeo = new THREE.SphereGeometry(0.12, 6, 6)
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xFF8BA7,
      emissive: 0xFF8BA7,
      emissiveIntensity: 0.1,
      roughness: 0.6,
    })
    for (let i = 0; i < 15; i++) {
      const blossom = new THREE.Mesh(blossomGeo, blossomMat)
      blossom.position.set(
        (Math.random() - 0.5) * 1.0,
        1.2 + Math.random() * 1.0,
        (Math.random() - 0.5) * 1.0,
      )
      blossom.scale.setScalar(0.5 + Math.random() * 0.5)
      group.add(blossom)
    }

    // Pot
    const potGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.3, 8)
    const potMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.85 })
    const pot = new THREE.Mesh(potGeo, potMat)
    pot.position.y = 0.15
    group.add(pot)

    return group
  }

  #createCouplet() {
    const group = new THREE.Group()

    // Red paper
    const paperGeo = new THREE.BoxGeometry(0.35, 1.8, 0.02)
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xCC0000,
      emissive: 0xCC0000,
      emissiveIntensity: 0.05,
      roughness: 0.7,
    })
    const paper = new THREE.Mesh(paperGeo, paperMat)
    paper.position.y = 0.9
    group.add(paper)

    // Gold trim
    const trimGeo = new THREE.BoxGeometry(0.38, 0.04, 0.025)
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xF5A623,
      emissive: 0xF5A623,
      emissiveIntensity: 0.1,
      metalness: 0.4,
      roughness: 0.5,
    })
    for (const y of [0.02, 1.78]) {
      const trim = new THREE.Mesh(trimGeo, trimMat)
      trim.position.y = y
      group.add(trim)
    }

    return group
  }

  #createDecorativeString(group, from, to, color) {
    const mid = [
      (from[0] + to[0]) / 2,
      Math.min(from[1], to[1]) - 0.4,
      (from[2] + to[2]) / 2,
    ]
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    )

    // String
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.012, 4, false)
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const tube = new THREE.Mesh(tubeGeo, tubeMat)
    group.add(tube)

    // Small decorative items along string
    const count = 8
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const pos = curve.getPoint(t)

      // Small diamond/star shape
      const decoGeo = new THREE.OctahedronGeometry(0.08, 0)
      const decoMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? color : 0xF5A623,
        emissive: i % 2 === 0 ? color : 0xF5A623,
        emissiveIntensity: 0.2,
      })
      const deco = new THREE.Mesh(decoGeo, decoMat)
      deco.position.copy(pos)
      deco.position.y -= 0.15
      deco.rotation.y = Math.PI / 4
      group.add(deco)
    }
  }

  #createTrungThuLantern() {
    const group = new THREE.Group()

    // Star-shaped lantern body
    const shape = new THREE.Shape()
    const outerR = 0.25
    const innerR = 0.1
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2
      const innerAngle = outerAngle + Math.PI / 5
      if (i === 0) {
        shape.moveTo(Math.cos(outerAngle) * outerR, Math.sin(outerAngle) * outerR)
      } else {
        shape.lineTo(Math.cos(outerAngle) * outerR, Math.sin(outerAngle) * outerR)
      }
      shape.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR)
    }
    shape.closePath()

    const extrudeSettings = { depth: 0.08, bevelEnabled: false }
    const starGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xE83030,
      emissive: 0xE83030,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
    const star = new THREE.Mesh(starGeo, starMat)
    star.rotation.y = Math.PI / 2
    group.add(star)

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.06, 0.008, 6, 12)
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xF5A623, metalness: 0.4 })
    const handle = new THREE.Mesh(handleGeo, handleMat)
    handle.position.y = 0.28
    group.add(handle)

    // Light inside
    const light = new THREE.PointLight(0xE83030, 0.5, 4, 2)
    group.add(light)

    return group
  }

  #createMoonDecoration() {
    const group = new THREE.Group()

    // Large moon disc
    const moonGeo = new THREE.CircleGeometry(1.5, 32)
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      emissive: 0xFFF8DC,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    })
    const moon = new THREE.Mesh(moonGeo, moonMat)
    group.add(moon)

    // Glow
    const glowGeo = new THREE.CircleGeometry(2.0, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFF8DC,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.z = -0.01
    group.add(glow)

    // Rabbit silhouette (simplified)
    const rabbitGeo = new THREE.BoxGeometry(0.3, 0.5, 0.02)
    const rabbitMat = new THREE.MeshStandardMaterial({ color: 0x8B7355 })
    const rabbit = new THREE.Mesh(rabbitGeo, rabbitMat)
    rabbit.position.set(0.3, -0.2, 0.01)
    group.add(rabbit)

    return group
  }

  #createStarLantern() {
    const group = new THREE.Group()

    // 3D star
    const starGeo = new THREE.OctahedronGeometry(0.3, 0)
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xF5A623,
      emissive: 0xF5A623,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.9,
    })
    const star = new THREE.Mesh(starGeo, starMat)
    group.add(star)

    // Handle
    const stickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4)
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    const stick = new THREE.Mesh(stickGeo, stickMat)
    stick.position.y = -0.5
    group.add(stick)

    // Light
    const light = new THREE.PointLight(0xF5A623, 0.4, 3, 2)
    group.add(light)

    return group
  }

  #animateTet(delta) {
    // Animate mai blossoms — gentle sway
    const tetGroup = this.seasonGroups.get('tet')
    if (!tetGroup) return

    tetGroup.children.forEach((child, i) => {
      if (child.name?.includes?.('mai') || child.children?.length > 3) {
        child.children.forEach((blossom, j) => {
          if (blossom.geometry?.type === 'SphereGeometry') {
            blossom.rotation.y = Math.sin(this._elapsed * 0.5 + j * 0.3) * 0.1
          }
        })
      }
    })
  }

  #animateTrungThu(delta) {
    // Animate lanterns — gentle rotation
    const trungThuGroup = this.seasonGroups.get('trungThu')
    if (!trungThuGroup) return

    trungThuGroup.children.forEach((child, i) => {
      if (child.children?.length > 0) {
        child.rotation.y = Math.sin(this._elapsed * 0.8 + i * 0.5) * 0.15
      }
    })
  }
}
