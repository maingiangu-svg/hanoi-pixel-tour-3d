import * as THREE from 'three'
import { HANOI_VISUAL_TOKENS } from '../style/HanoiVisualTokens.js'

/**
 * NightMarketLanterns — atmospheric night market for the Old Quarter.
 *
 * Features:
 * - Strings of Vietnamese paper lanterns (đèn lồng) with warm glow
 * - Food stalls with steam/smoke particles
 * - Warm point lights casting golden pools
 * - Gentle sway animation
 * - Visibility toggled by game hour
 */

const LANTERN_COLORS = HANOI_VISUAL_TOKENS.streetProps.lanternStringColors

// ── Steam/smoke particle system ──
class SteamParticles {
  constructor(parent, position, count = 12) {
    this._elapsed = 0
    this.particles = []

    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position[0] + (Math.random() - 0.5) * 0.4
      positions[i * 3 + 1] = position[1] + Math.random() * 1.5
      positions[i * 3 + 2] = position[2] + (Math.random() - 0.5) * 0.4
      sizes[i] = 0.3 + Math.random() * 0.4
      alphas[i] = 0.15 + Math.random() * 0.2

      this.particles.push({
        baseY: positions[i * 3 + 1],
        speed: 0.3 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.3,
      })
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      color: 0xE8DDD0,
      size: 0.4,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    this.mesh = new THREE.Points(geo, mat)
    this.mesh.name = 'Steam particles'
    parent.add(this.mesh)
  }

  update(delta) {
    this._elapsed += delta
    const positions = this.mesh.geometry.attributes.position.array
    const count = this.particles.length

    for (let i = 0; i < count; i++) {
      const p = this.particles[i]
      // Rise
      positions[i * 3 + 1] = p.baseY + ((this._elapsed * p.speed) % 2.0)
      // Drift
      positions[i * 3] += Math.sin(this._elapsed * 0.5 + p.phase) * p.drift * delta

      // Reset when too high
      if (positions[i * 3 + 1] > p.baseY + 2.0) {
        positions[i * 3 + 1] = p.baseY
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true

    // Fade based on height
    this.mesh.material.opacity = 0.18 + Math.sin(this._elapsed * 0.3) * 0.04
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.mesh.removeFromParent()
  }
}

export class NightMarketLanterns {
  constructor({ parent, playerPosition }) {
    this.parent = parent
    this.playerPosition = playerPosition

    this.group = new THREE.Group()
    this.group.name = 'Night Market Lanterns'
    parent.add(this.group)

    this.lanterns = []
    this.steamSystems = []
    this._elapsed = 0
    this.active = false

    this.#buildLanternStrings()
    this.#buildMarketStalls()
    this.#buildFoodVendors()
  }

  update(delta, gameHour) {
    this._elapsed += delta

    // Show lanterns between 17:00 and 6:00
    const shouldBeActive = gameHour >= 17 || gameHour < 6
    if (shouldBeActive !== this.active) {
      this.active = shouldBeActive
      this.group.visible = shouldBeActive
    }

    if (!this.active) return

    // Animate lanterns — gentle sway
    for (const lantern of this.lanterns) {
      const sway = Math.sin(this._elapsed * 1.0 + lantern.phase) * 0.035
      lantern.mesh.rotation.z = sway
      lantern.mesh.rotation.x = Math.sin(this._elapsed * 0.7 + lantern.phase * 1.3) * 0.025

      // Flicker emissive — warm candlelight
      if (lantern.bodyMaterial) {
        lantern.bodyMaterial.emissiveIntensity =
          0.55 + Math.sin(this._elapsed * 4 + lantern.phase * 2) * 0.18
      }
    }

    // Update steam
    for (const steam of this.steamSystems) {
      steam.update(delta)
    }
  }

  dispose() {
    for (const lantern of this.lanterns) {
      lantern.mesh.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
          child.material?.dispose()
        }
      })
    }
    for (const steam of this.steamSystems) {
      steam.dispose()
    }
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #buildLanternStrings() {
    const strings = [
      // Main Old Quarter streets
      { from: [42, 4.8, 33], to: [72, 4.8, 33], count: 8 },
      { from: [42, 4.8, 36], to: [72, 4.8, 36], count: 8 },
      // Cross streets
      { from: [50, 4.5, 28], to: [50, 4.5, 40], count: 4 },
      { from: [60, 4.5, 28], to: [60, 4.5, 40], count: 4 },
    ]

    for (const string of strings) {
      this.#createLanternString(string.from, string.to, string.count)
    }
  }

  #createLanternString(from, to, count) {
    // Catenary curve for the string
    const mid = [
      (from[0] + to[0]) / 2,
      Math.min(from[1], to[1]) - 0.6, // Sag
      (from[2] + to[2]) / 2,
    ]
    const points = [
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    ]
    const curve = new THREE.QuadraticBezierCurve3(...points)

    // String wire
    const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.015, 4, false)
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.3,
    })
    const tube = new THREE.Mesh(tubeGeo, tubeMat)
    this.group.add(tube)

    // Lanterns along the string
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const pos = curve.getPoint(t)

      const color = LANTERN_COLORS[i % LANTERN_COLORS.length]
      const lantern = this.#createLantern(color)
      lantern.group.position.copy(pos)
      this.group.add(lantern.group)

      // Point light every 2nd lantern (performance)
      if (i % 2 === 0) {
        const light = new THREE.PointLight(color, 1.0, 7, 2)
        light.position.copy(pos)
        light.position.y -= 0.35
        this.group.add(light)
      }

      this.lanterns.push({
        mesh: lantern.group,
        bodyMaterial: lantern.bodyMat,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  #createLantern(color) {
    const group = new THREE.Group()

    // Body — slightly more detailed than before
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.45, 10)
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.88,
      roughness: 0.35,
      side: THREE.DoubleSide,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    group.add(body)

    // Top ring
    const topGeo = new THREE.TorusGeometry(0.12, 0.02, 6, 12)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.5, metalness: 0.3 })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.y = 0.24
    top.rotation.x = Math.PI / 2
    group.add(top)

    // Bottom tip
    const tipGeo = new THREE.ConeGeometry(0.08, 0.12, 8)
    const tip = new THREE.Mesh(tipGeo, topMat)
    tip.position.y = -0.28
    tip.rotation.x = Math.PI
    group.add(tip)

    // Hanging wire
    const wireGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4)
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    wire.position.y = 0.36
    group.add(wire)

    // Internal glow sphere
    const glowGeo = new THREE.SphereGeometry(0.08, 8, 8)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8E7,
      emissive: 0xFFF8E7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.4,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.y = 0.02
    group.add(glow)

    return { group, bodyMat }
  }

  #buildMarketStalls() {
    const stalls = [
      { pos: [46, 0, 34], size: [2.8, 2.2, 2.2], color: 0xCC3333, name: 'Phở stall' },
      { pos: [56, 0, 34], size: [2.8, 2.2, 2.2], color: 0xF5A623, name: 'Bánh mì stall' },
      { pos: [66, 0, 34], size: [2.5, 2.0, 2.0], color: 0xE83030, name: 'Chè stall' },
    ]

    for (const stall of stalls) {
      const group = new THREE.Group()
      group.name = `Night Market Stall — ${stall.name}`
      group.position.set(stall.pos[0], stall.pos[1], stall.pos[2])

      // Counter table
      const tableGeo = new THREE.BoxGeometry(stall.size[0], 0.12, stall.size[2])
      const tableMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.85 })
      const table = new THREE.Mesh(tableGeo, tableMat)
      table.position.y = 0.85
      table.castShadow = true
      group.add(table)

      // Table legs
      const legGeo = new THREE.BoxGeometry(0.06, 0.85, 0.06)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5 })
      for (const [lx, lz] of [[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9]]) {
        const leg = new THREE.Mesh(legGeo, legMat)
        leg.position.set(lx, 0.425, lz)
        group.add(leg)
      }

      // Awning — angled canvas
      const awningGeo = new THREE.BoxGeometry(stall.size[0] + 0.5, 0.04, stall.size[2] + 0.8)
      const awningMat = new THREE.MeshStandardMaterial({
        color: stall.color,
        emissive: stall.color,
        emissiveIntensity: 0.15,
        roughness: 0.65,
      })
      const awning = new THREE.Mesh(awningGeo, awningMat)
      awning.position.y = 2.15
      awning.rotation.x = -0.12
      group.add(awning)

      // Awning support poles
      const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.15, 6)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.set(side * (stall.size[0] / 2 + 0.1), 1.075, stall.size[2] / 2 + 0.3)
        group.add(pole)
      }

      // Warm light under awning
      const light = new THREE.PointLight(0xFFAA44, 1.5, 6, 2)
      light.position.set(0, 1.6, 0)
      group.add(light)

      // Decorative lantern on each stall
      const miniLantern = this.#createLantern(0xE83030)
      miniLantern.group.position.set(0, 1.8, stall.size[2] / 2 + 0.2)
      miniLantern.group.scale.setScalar(0.7)
      group.add(miniLantern.group)

      this.group.add(group)
    }
  }

  #buildFoodVendors() {
    // Street food vendors with steam
    const vendors = [
      { pos: [44, 0, 31], type: 'pho' },
      { pos: [54, 0, 31], type: 'banhmi' },
      { pos: [64, 0, 31], type: 'che' },
    ]

    for (const vendor of vendors) {
      const group = new THREE.Group()
      group.name = `Food Vendor — ${vendor.type}`
      group.position.set(vendor.pos[0], vendor.pos[1], vendor.pos[2])

      // Cart body
      const cartGeo = new THREE.BoxGeometry(1.5, 0.9, 1.0)
      const cartMat = new THREE.MeshStandardMaterial({
        color: HANOI_VISUAL_TOKENS.streetProps.vendorCartColors[
          Math.floor(Math.random() * HANOI_VISUAL_TOKENS.streetProps.vendorCartColors.length)
        ],
        roughness: 0.7,
      })
      const cart = new THREE.Mesh(cartGeo, cartMat)
      cart.position.y = 0.55
      cart.castShadow = true
      group.add(cart)

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
      for (const side of [-0.6, 0.6]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(side, 0.15, 0)
        group.add(wheel)
      }

      // Pot/bowl on top
      const potGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.3, 10)
      const potMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.4 })
      const pot = new THREE.Mesh(potGeo, potMat)
      pot.position.set(0, 1.2, 0)
      group.add(pot)

      // Small lantern
      const miniLantern = this.#createLantern(0xF5A623)
      miniLantern.group.position.set(0.8, 1.5, 0)
      miniLantern.group.scale.setScalar(0.5)
      group.add(miniLantern.group)

      // Light
      const light = new THREE.PointLight(0xF5BE58, 0.8, 4, 2)
      light.position.set(0, 1.3, 0)
      group.add(light)

      this.group.add(group)

      // Steam particles
      const steam = new SteamParticles(this.group, [vendor.pos[0], 1.35, vendor.pos[2]], 10)
      this.steamSystems.push(steam)
    }
  }
}
