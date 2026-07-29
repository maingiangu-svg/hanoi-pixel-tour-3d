import * as THREE from 'three'

/**
 * FireworksSystem — particle-based fireworks for special occasions.
 *
 * Can be triggered manually or on specific game events (Tết, national day, etc.)
 */

const FIREWORK_COLORS = [
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
    this._elapsed = 0
    this.active = false
    this.autoTimer = 0

    // Pre-allocate spark pool
    this.sparkPool = []
    this.maxSparks = 500
    this.#initSparkPool()
  }

  /**
   * Launch a firework at a given position.
   */
  launch(x, y, z) {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]

    // Create rocket
    const rocketGeo = new THREE.SphereGeometry(0.05, 4, 4)
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    const rocket = new THREE.Mesh(rocketGeo, rocketMat)
    rocket.position.set(x, 0, z)
    this.group.add(rocket)

    this.rockets.push({
      mesh: rocket,
      targetY: y,
      speed: 8 + Math.random() * 4,
      color,
      phase: 'launch',
    })
  }

  /**
   * Trigger a fireworks show.
   */
  startShow(duration = 15) {
    this.active = true
    this.showTimer = 0
    this.showDuration = duration
    this.launchInterval = 0.3 + Math.random() * 0.5
    this.launchTimer = 0
  }

  /**
   * Stop the show.
   */
  stopShow() {
    this.active = false
  }

  /**
   * Update fireworks simulation.
   */
  update(delta) {
    this._elapsed += delta

    // Auto-show launcher
    if (this.active) {
      this.showTimer += delta
      this.launchTimer += delta

      if (this.launchTimer > this.launchInterval) {
        const x = this.playerPosition.x + (Math.random() - 0.5) * 60
        const z = this.playerPosition.z + (Math.random() - 0.5) * 60
        this.launch(x, 12 + Math.random() * 8, z)
        this.launchTimer = 0
        this.launchInterval = 0.2 + Math.random() * 0.6
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
        // Explode!
        this.#explode(rocket.mesh.position, rocket.color)
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

      // Physics
      spark.velocity.y -= 9.8 * delta * 0.5 // gravity
      spark.mesh.position.addScaledVector(spark.velocity, delta)

      // Fade out
      const lifeRatio = spark.life / spark.maxLife
      spark.mesh.material.opacity = lifeRatio
      spark.mesh.scale.setScalar(lifeRatio * 0.5)
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
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #initSparkPool() {
    const geo = new THREE.SphereGeometry(0.03, 4, 4)
    for (let i = 0; i < this.maxSparks; i++) {
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
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
    const sparkCount = 30 + Math.floor(Math.random() * 20)

    for (let i = 0; i < sparkCount; i++) {
      // Find available spark from pool
      const mesh = this.sparkPool.find((m) => !m.visible)
      if (!mesh) break

      mesh.visible = true
      mesh.position.copy(position)
      mesh.material.color.set(color)
      mesh.material.opacity = 1

      // Random velocity in sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 3 + Math.random() * 5
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.8 + 2,
        Math.cos(phi) * speed,
      )

      const maxLife = 1.5 + Math.random() * 1
      this.sparks.push({
        mesh,
        velocity,
        life: maxLife,
        maxLife,
      })
    }
  }
}
