import * as THREE from 'three'

/**
 * FireworksSystem — Vietnamese-style fireworks for Tết and celebrations.
 *
 * Features:
 * - Tết-appropriate colors (red, gold, warm tones dominate)
 * - Multi-stage explosions (launch trail → burst → cascading sparks)
 * - Sound-like visual cues (flash on burst)
 * - Trailing sparks that fall like willow branches
 * - Can be triggered manually or auto-launched for events
 */

// Vietnamese Tết fireworks — red and gold dominant
const TET_COLORS = [
  0xE83030, // Đỏ — red (lucky)
  0xF5A623, // Vàng — gold (prosperity)
  0xFF6B35, // Cam — orange
  0xF5BE58, // Vàng ấm — warm gold
  0xE83030, // Đỏ (more weight)
  0xF5A623, // Vàng (more weight)
  0xFFFFFF, // Trắng — white flash
  0xFFD700, // Vàng kim — bright gold
]

const CELEBRATION_COLORS = [
  0xff4444, 0xff8800, 0xffcc00, 0x44ff44,
  0x4488ff, 0xff44ff, 0xffffff, 0xff6644,
]

export class FireworksSystem {
  constructor({ scene, playerPosition }) {
    this.scene = scene
    this.playerPosition = playerPosition

    this.group = new THREE.Group()
    this.group.name = 'Fireworks'
    scene.add(this.group)

    this.rockets = []
    this.sparks = []
    this.flashes = []
    this._elapsed = 0
    this.active = false
    this.autoTimer = 0
    this.isTet = false // Tết mode — red/gold only

    // Pre-allocate spark pool
    this.sparkPool = []
    this.maxSparks = 600
    this.#initSparkPool()
  }

  /**
   * Set Tết mode — red and gold fireworks only.
   */
  setTetMode(enabled) {
    this.isTet = enabled
  }

  /**
   * Launch a firework at a given position.
   */
  launch(x, y, z) {
    const colors = this.isTet ? TET_COLORS : CELEBRATION_COLORS
    const color = colors[Math.floor(Math.random() * colors.length)]

    // Rocket trail
    const rocketGeo = new THREE.SphereGeometry(0.06, 4, 4)
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    const rocket = new THREE.Mesh(rocketGeo, rocketMat)
    rocket.position.set(x, 0, z)
    this.group.add(rocket)

    // Trail particles
    const trailGeo = new THREE.SphereGeometry(0.03, 3, 3)
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6,
    })

    this.rockets.push({
      mesh: rocket,
      targetY: y,
      speed: 10 + Math.random() * 5,
      color,
      phase: 'launch',
      trailTimer: 0,
    })
  }

  /**
   * Trigger a fireworks show.
   */
  startShow(duration = 20) {
    this.active = true
    this.showTimer = 0
    this.showDuration = duration
    this.launchInterval = 0.25 + Math.random() * 0.4
    this.launchTimer = 0
  }

  stopShow() {
    this.active = false
  }

  update(delta) {
    this._elapsed += delta

    // Auto-show launcher
    if (this.active) {
      this.showTimer += delta
      this.launchTimer += delta

      if (this.launchTimer > this.launchInterval) {
        const x = this.playerPosition.x + (Math.random() - 0.5) * 70
        const z = this.playerPosition.z + (Math.random() - 0.5) * 70
        this.launch(x, 14 + Math.random() * 10, z)
        this.launchTimer = 0
        this.launchInterval = 0.15 + Math.random() * 0.5
      }

      if (this.showTimer > this.showDuration) {
        this.active = false
      }
    }

    // Update rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i]
      rocket.mesh.position.y += rocket.speed * delta

      if (rocket.mesh.position.y >= rocket.targetY) {
        this.#explode(rocket.mesh.position, rocket.color)
        // Flash effect on burst
        this.#createFlash(rocket.mesh.position)
        this.group.remove(rocket.mesh)
        rocket.mesh.geometry.dispose()
        rocket.mesh.material.dispose()
        this.rockets.splice(i, 1)
      }
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i]
      spark.life -= delta

      if (spark.life <= 0) {
        spark.mesh.visible = false
        this.sparks.splice(i, 1)
        continue
      }

      // Physics — gravity with air resistance
      spark.velocity.y -= 9.8 * delta * 0.4
      spark.velocity.multiplyScalar(1 - delta * 0.3) // Air drag
      spark.mesh.position.addScaledVector(spark.velocity, delta)

      // Fade and shrink
      const lifeRatio = spark.life / spark.maxLife
      spark.mesh.material.opacity = lifeRatio * 0.9
      spark.mesh.scale.setScalar(lifeRatio * 0.6 + 0.1)
    }

    // Update flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i]
      flash.life -= delta
      if (flash.life <= 0) {
        flash.mesh.visible = false
        this.flashes.splice(i, 1)
        continue
      }
      const ratio = flash.life / flash.maxLife
      flash.mesh.scale.setScalar(ratio * 3 + 0.5)
      flash.mesh.material.opacity = ratio * 0.6
    }
  }

  dispose() {
    for (const rocket of this.rockets) {
      rocket.mesh.geometry.dispose()
      rocket.mesh.material.dispose()
    }
    for (const spark of this.sparks) {
      spark.mesh.geometry.dispose()
      spark.mesh.material.dispose()
    }
    for (const flash of this.flashes) {
      flash.mesh.geometry.dispose()
      flash.mesh.material.dispose()
    }
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #initSparkPool() {
    const geo = new THREE.SphereGeometry(0.04, 4, 4)
    for (let i = 0; i < this.maxSparks; i++) {
      const color = TET_COLORS[Math.floor(Math.random() * TET_COLORS.length)]
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this.sparkPool.push(mesh)
    }
  }

  #explode(position, color) {
    const sparkCount = 35 + Math.floor(Math.random() * 25)

    for (let i = 0; i < sparkCount; i++) {
      const mesh = this.sparkPool.find((m) => !m.visible)
      if (!mesh) break

      mesh.visible = true
      mesh.position.copy(position)
      mesh.material.color.set(color)
      mesh.material.opacity = 1

      // Random burst velocity — spherical with slight downward bias
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 3.5 + Math.random() * 6
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.7 + 2.5,
        Math.cos(phi) * speed,
      )

      // Some sparks get willow-branch effect (slow, trailing)
      const isWillow = Math.random() < 0.25
      const maxLife = isWillow ? 2.5 + Math.random() * 1.5 : 1.2 + Math.random() * 1

      if (isWillow) {
        velocity.multiplyScalar(0.6)
        // Willows are golden
        mesh.material.color.set(0xF5A623)
      }

      this.sparks.push({
        mesh,
        velocity,
        life: maxLife,
        maxLife,
      })
    }
  }

  #createFlash(position) {
    // Bright flash on explosion — fades quickly
    const flashGeo = new THREE.SphereGeometry(0.8, 8, 8)
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xFFF8E7,
      transparent: true,
      opacity: 0.8,
    })
    const flash = new THREE.Mesh(flashGeo, flashMat)
    flash.position.copy(position)
    this.group.add(flash)

    this.flashes.push({
      mesh: flash,
      life: 0.3,
      maxLife: 0.3,
    })
  }
}
