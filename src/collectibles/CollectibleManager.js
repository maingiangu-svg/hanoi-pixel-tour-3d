import * as THREE from 'three'
import { COLLECTIBLES, COLLECTIBLE_TYPES } from './CollectibleDefinitions.js'

/**
 * CollectibleManager — spawns collectible objects in the world,
 * handles player proximity detection and collection.
 */

const COLLECT_COLORS = Object.freeze({
  [COLLECTIBLE_TYPES.GOLDEN_TURTLE]: 0xffd700,
  [COLLECTIBLE_TYPES.KHUAE_VAN_CAC]: 0xcc3333,
  [COLLECTIBLE_TYPES.LOTUS]: 0xff69b4,
})

const COLLECT_EMISSIVE = Object.freeze({
  [COLLECTIBLE_TYPES.GOLDEN_TURTLE]: 0xffaa00,
  [COLLECTIBLE_TYPES.KHUAE_VAN_CAC]: 0xff4444,
  [COLLECTIBLE_TYPES.LOTUS]: 0xff88cc,
})

export class CollectibleManager {
  constructor({ scene, playerPosition, onCollect, ui }) {
    this.scene = scene
    this.playerPosition = playerPosition
    this.onCollect = onCollect ?? (() => {})
    this.ui = ui

    this.group = new THREE.Group()
    this.group.name = 'Collectibles'
    scene.add(this.group)

    this.collected = new Set()
    this.items = []
    this._elapsed = 0

    this.#spawnAll()
  }

  /**
   * Serialize for save system.
   */
  serialize() {
    return { collected: [...this.collected] }
  }

  /**
   * Restore from save data.
   */
  restore(data) {
    if (!data?.collected) return
    for (const id of data.collected) {
      this.collected.add(id)
      const item = this.items.find((i) => i.id === id)
      if (item) item.mesh.visible = false
    }
  }

  /**
   * Get collection stats.
   */
  getStats() {
    const total = COLLECTIBLES.length
    const collected = this.collected.size
    const byType = {}
    for (const type of Object.values(COLLECTIBLE_TYPES)) {
      const typeItems = COLLECTIBLES.filter((c) => c.type === type)
      const typeCollected = typeItems.filter((c) => this.collected.has(c.id))
      byType[type] = { total: typeItems.length, collected: typeCollected.length }
    }
    return { total, collected, byType }
  }

  /**
   * Update — animate collectibles and check proximity.
   */
  update(delta) {
    this._elapsed += delta

    for (const item of this.items) {
      if (this.collected.has(item.id)) continue

      // Floating animation
      item.mesh.position.y = item.baseY + Math.sin(this._elapsed * 2 + item.phase) * 0.15
      item.mesh.rotation.y += delta * 1.5

      // Proximity check
      const dx = this.playerPosition.x - item.position.x
      const dz = this.playerPosition.z - item.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance < item.radius) {
        this.#collect(item)
      }
    }
  }

  /**
   * Get nearby uncollected item for interaction hint.
   */
  getNearest(maxDistance = 5) {
    let nearest = null
    let nearestDist = maxDistance

    for (const item of this.items) {
      if (this.collected.has(item.id)) continue
      const dx = this.playerPosition.x - item.position.x
      const dz = this.playerPosition.z - item.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < nearestDist) {
        nearest = item
        nearestDist = dist
      }
    }
    return nearest ? { ...nearest, distance: nearestDist } : null
  }

  dispose() {
    for (const item of this.items) {
      item.mesh.geometry.dispose()
      item.mesh.material.dispose()
    }
    this.group.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #spawnAll() {
    for (const def of COLLECTIBLES) {
      const geometry = this.#getGeometry(def.type)
      const material = new THREE.MeshStandardMaterial({
        color: COLLECT_COLORS[def.type],
        emissive: COLLECT_EMISSIVE[def.type],
        emissiveIntensity: 0.6,
        metalness: 0.7,
        roughness: 0.3,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = def.name
      mesh.position.set(def.position[0], def.position[1], def.position[2])
      mesh.castShadow = true
      this.group.add(mesh)

      // Glow ring
      const ringGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 24)
      const ringMat = new THREE.MeshStandardMaterial({
        color: COLLECT_COLORS[def.type],
        emissive: COLLECT_EMISSIVE[def.type],
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.6,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      ring.position.y = -0.3
      mesh.add(ring)

      this.items.push({
        ...def,
        mesh,
        baseY: def.position[1],
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  #getGeometry(type) {
    switch (type) {
      case COLLECTIBLE_TYPES.GOLDEN_TURTLE:
        // Turtle shape — sphere + cone head
        return new THREE.SphereGeometry(0.3, 12, 8)
      case COLLECTIBLE_TYPES.KHUAE_VAN_CAC:
        // Star shape — octahedron
        return new THREE.OctahedronGeometry(0.3)
      case COLLECTIBLE_TYPES.LOTUS:
        // Flower — dodecahedron
        return new THREE.DodecahedronGeometry(0.25)
      default:
        return new THREE.SphereGeometry(0.3, 12, 8)
    }
  }

  #collect(item) {
    this.collected.add(item.id)
    item.mesh.visible = false

    const stats = this.getStats()
    const typeNames = {
      [COLLECTIBLE_TYPES.GOLDEN_TURTLE]: 'Rùa Vàng',
      [COLLECTIBLE_TYPES.KHUAE_VAN_CAC]: 'Khuê Văn Các',
      [COLLECTIBLE_TYPES.LOTUS]: 'Bông Sen',
    }

    const typeName = typeNames[item.type] ?? 'Vật phẩm'
    this.ui?.showNotice?.(
      `✨ ${item.name} — ${stats.collected}/${stats.total}`,
      2500,
    )

    this.onCollect(item, stats)
  }
}
