import * as THREE from 'three'

/**
 * NightMarketLanterns — lantern strings and night market atmosphere
 * for the Old Quarter area.
 *
 * Lanterns are strung between buildings and gently sway.
 * Night market stalls appear during evening hours.
 */

const LANTERN_COLORS = [
  0xff4444, // Red
  0xff8800, // Orange
  0xffcc00, // Gold
  0xff6644, // Coral
  0xee3333, // Deep red
]

export class NightMarketLanterns {
  constructor({ parent, playerPosition }) {
    this.parent = parent
    this.playerPosition = playerPosition

    this.group = new THREE.Group()
    this.group.name = 'Night Market Lanterns'
    parent.add(this.group)

    this.lanterns = []
    this._elapsed = 0
    this.active = false

    this.#buildLanternStrings()
    this.#buildMarketStalls()
  }

  /**
   * Update — animate lanterns, toggle visibility by time.
   */
  update(delta, gameHour) {
    this._elapsed += delta

    // Show lanterns between 17:00 and 23:00
    const shouldBeActive = gameHour >= 17 || gameHour < 6
    if (shouldBeActive !== this.active) {
      this.active = shouldBeActive
      this.group.visible = shouldBeActive
    }

    if (!this.active) return

    // Animate lanterns — gentle sway
    for (const lantern of this.lanterns) {
      const sway = Math.sin(this._elapsed * 1.2 + lantern.phase) * 0.03
      lantern.mesh.rotation.z = sway
      lantern.mesh.rotation.x = Math.sin(this._elapsed * 0.8 + lantern.phase * 1.3) * 0.02

      // Flicker emissive intensity
      lantern.mesh.material.emissiveIntensity =
        0.6 + Math.sin(this._elapsed * 3 + lantern.phase * 2) * 0.15
    }
  }

  dispose() {
    for (const lantern of this.lanterns) {
      lantern.mesh.geometry.dispose()
      lantern.mesh.material.dispose()
    }
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #buildLanternStrings() {
    // Lantern strings along Old Quarter streets
    const strings = [
      // Main Old Quarter street
      { from: [45, 4.5, 33], to: [70, 4.5, 33], count: 12 },
      { from: [45, 4.5, 36], to: [70, 4.5, 36], count: 12 },
      // Connector street
      { from: [30, 4, 15], to: [55, 4, 25], count: 10 },
      // Near church
      { from: [-10, 4, 8], to: [10, 4, 8], count: 8 },
    ]

    for (const string of strings) {
      this.#createLanternString(string.from, string.to, string.count)
    }
  }

  #createLanternString(from, to, count) {
    // String line
    const points = [
      new THREE.Vector3(...from),
      new THREE.Vector3(
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2 - 0.5,
        (from[2] + to[2]) / 2,
      ),
      new THREE.Vector3(...to),
    ]
    const curve = new THREE.QuadraticBezierCurve3(...points)
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.02, 4, false)
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
    })
    const tube = new THREE.Mesh(tubeGeo, tubeMat)
    this.group.add(tube)

    // Lanterns along the string
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const pos = curve.getPoint(t)

      const color = LANTERN_COLORS[i % LANTERN_COLORS.length]
      const lantern = this.#createLantern(color)
      lantern.position.copy(pos)
      this.group.add(lantern)

      // Point light for each lantern (dim, for performance)
      const light = new THREE.PointLight(color, 0.8, 6, 2)
      light.position.copy(pos)
      light.position.y -= 0.3
      this.group.add(light)

      this.lanterns.push({
        mesh: lantern,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  #createLantern(color) {
    // Lantern body — cylinder + top/bottom caps
    const group = new THREE.Group()

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 8)
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    group.add(body)

    // Top cap
    const topGeo = new THREE.CylinderGeometry(0.05, 0.15, 0.08, 8)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6 })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.y = 0.24
    group.add(top)

    // Bottom cap
    const bottomGeo = new THREE.CylinderGeometry(0.15, 0.05, 0.06, 8)
    const bottom = new THREE.Mesh(bottomGeo, topMat)
    bottom.position.y = -0.23
    group.add(bottom)

    // String
    const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 4)
    const stringMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    const string = new THREE.Mesh(stringGeo, stringMat)
    string.position.y = 0.35
    group.add(string)

    return group
  }

  #buildMarketStalls() {
    // Night market stalls (simplified boxes with awnings)
    const stalls = [
      { pos: [48, 0, 34], size: [2.5, 2, 2], color: 0xcc3333 },
      { pos: [53, 0, 34], size: [2.5, 2, 2], color: 0xff8800 },
      { pos: [58, 0, 34], size: [2.5, 2, 2], color: 0xffcc00 },
      { pos: [63, 0, 34], size: [2.5, 2, 2], color: 0xff4444 },
    ]

    for (const stall of stalls) {
      const group = new THREE.Group()
      group.name = 'Night Market Stall'
      group.position.set(stall.pos[0], stall.pos[1], stall.pos[2])

      // Table
      const tableGeo = new THREE.BoxGeometry(stall.size[0], 0.1, stall.size[2])
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9,
      })
      const table = new THREE.Mesh(tableGeo, tableMat)
      table.position.y = 0.8
      table.castShadow = true
      group.add(table)

      // Awning
      const awningGeo = new THREE.BoxGeometry(stall.size[0] + 0.4, 0.05, stall.size[2] + 0.6)
      const awningMat = new THREE.MeshStandardMaterial({
        color: stall.color,
        emissive: stall.color,
        emissiveIntensity: 0.2,
        roughness: 0.7,
      })
      const awning = new THREE.Mesh(awningGeo, awningMat)
      awning.position.y = 2
      awning.rotation.x = -0.1
      group.add(awning)

      // Legs
      const legGeo = new THREE.BoxGeometry(0.08, 0.8, 0.08)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.3 })
      for (const [lx, lz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) {
        const leg = new THREE.Mesh(legGeo, legMat)
        leg.position.set(lx, 0.4, lz)
        group.add(leg)
      }

      // Light under awning
      const light = new THREE.PointLight(0xffaa44, 1.2, 5, 2)
      light.position.set(0, 1.5, 0)
      group.add(light)

      this.group.add(group)
    }
  }
}
