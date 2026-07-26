import * as THREE from 'three'

const BIRD_COUNT = 6
const LEAF_COUNT = 8

export class SceneMomentEffects {
  constructor({ kit, parent, photoCompositions = null }) {
    this.kit = kit
    this.photoCompositions = photoCompositions
    this.group = new THREE.Group()
    this.group.name = 'Hiệu ứng nhẹ cho scene moment'
    parent.add(this.group)

    this.effectGroups = new Map()
    this.activeIds = new Set()
    this.elapsed = 0
    this.customMaterials = []
    this.birds = []
    this.leaves = []

    this.#buildChurchPuddle()
    this.#buildChurchSun()
    this.#buildAlleyLight()
    this.#buildLakeLightReflection()
    this.#buildBirds()
    this.#buildLeaves()
  }

  setActive(id, active) {
    const next = Boolean(active)
    if (next === this.activeIds.has(id)) return false
    if (next) {
      this.activeIds.add(id)
      this.elapsed = 0
      this.#resetAnimatedEffect(id)
    } else {
      this.activeIds.delete(id)
    }

    const group = this.effectGroups.get(id)
    if (group) group.visible = next
    this.photoCompositions?.setTransientEffectActive?.(id, next)
    return true
  }

  update(deltaTime, activeArea = true) {
    this.group.visible = Boolean(activeArea)
    if (!activeArea || this.activeIds.size === 0) return
    this.elapsed += Math.min(Math.max(deltaTime, 0), 0.25)

    if (this.activeIds.has('landmarkBirds')) {
      this.birds.forEach((bird, index) => {
        bird.position.x = -8 + ((this.elapsed * 2.8 + index * 2.7) % 18)
        bird.position.y = 13.2 + Math.sin(this.elapsed * 1.6 + index) * 0.35
        bird.position.z = -39 - index * 0.45
        bird.rotation.z = Math.sin(this.elapsed * 3.2 + index) * 0.12
      })
    }

    if (this.activeIds.has('foregroundLeaves')) {
      this.leaves.forEach((leaf, index) => {
        const fall = (this.elapsed * (0.42 + index * 0.025) + index * 0.8) % 6
        leaf.position.y = 6.8 - fall
        leaf.position.x = 153.5 + index * 0.72 + Math.sin(this.elapsed + index) * 0.35
        leaf.position.z = 56.5 + (index % 3) * 1.2
        leaf.rotation.y += deltaTime * (0.5 + index * 0.04)
        leaf.rotation.z = Math.sin(this.elapsed * 1.4 + index) * 0.45
      })
    }
  }

  getDebugSnapshot() {
    return Object.freeze({
      activeIds: Object.freeze([...this.activeIds]),
      createdGroups: this.effectGroups.size,
      birdCount: this.birds.length,
      leafCount: this.leaves.length,
    })
  }

  reset() {
    for (const id of [...this.activeIds]) this.setActive(id, false)
  }

  dispose() {
    this.reset()
    this.customMaterials.forEach((material) => material.dispose())
    this.group.removeFromParent()
  }

  #effect(id) {
    const group = new THREE.Group()
    group.name = `Scene effect · ${id}`
    group.visible = false
    this.group.add(group)
    this.effectGroups.set(id, group)
    return group
  }

  #buildChurchPuddle() {
    const group = this.#effect('churchPuddle')
    this.kit.box(group, {
      name: 'Vũng nước phản chiếu Nhà thờ',
      size: [7.2, 0.018, 2.2],
      position: [6, 0.055, 2.8],
      rotationY: -0.12,
      material: 'lakeWater',
      receiveShadow: false,
    })
    this.kit.box(group, {
      name: 'Vệt phản chiếu Nhà thờ trong vũng nước',
      size: [1.05, 0.012, 1.85],
      position: [5.4, 0.068, 2.8],
      rotationY: -0.12,
      material: 'waterReflection',
      receiveShadow: false,
    })
  }

  #buildChurchSun() {
    const group = this.#effect('churchSunDisc')
    const sun = new THREE.Mesh(
      this.kit.geometries.get('sphere'),
      this.kit.material('lampGlow'),
    )
    sun.name = 'Mặt trời giữa hai tháp Nhà thờ'
    sun.position.set(0, 15.4, -57)
    sun.scale.setScalar(1.7)
    sun.castShadow = false
    sun.receiveShadow = false
    group.add(sun)
  }

  #buildAlleyLight() {
    const group = this.#effect('alleyLightBeam')
    const material = new THREE.MeshBasicMaterial({
      color: 0xf0b56b,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    this.customMaterials.push(material)
    const beam = new THREE.Mesh(this.kit.geometries.get('plane'), material)
    beam.name = 'Vệt nắng qua khe nhà Phố Cổ'
    beam.position.set(212, 4.3, 35)
    beam.rotation.set(0, Math.PI / 2, -0.16)
    beam.scale.set(3.8, 9.5, 1)
    beam.castShadow = false
    beam.receiveShadow = false
    group.add(beam)
  }

  #buildLakeLightReflection() {
    const group = this.#effect('lakeLightReflection')
    ;[
      [92, -8, 0.24, 7],
      [103, -11, 0.32, 9],
      [115, -6, 0.2, 6],
      [126, -12, 0.28, 8],
    ].forEach(([x, z, width, depth], index) => {
      this.kit.box(group, {
        name: `Vệt đèn phản chiếu blue hour ${index + 1}`,
        size: [width, 0.012, depth],
        position: [x, 0.042 + index * 0.001, z],
        rotationY: index % 2 ? 0.06 : -0.05,
        material: 'waterReflection',
        receiveShadow: false,
      })
    })
  }

  #buildBirds() {
    const group = this.#effect('landmarkBirds')
    for (let index = 0; index < BIRD_COUNT; index += 1) {
      const bird = new THREE.Group()
      bird.name = `Chim scene moment ${index + 1}`
      group.add(bird)
      for (const side of [-1, 1]) {
        this.kit.box(bird, {
          name: 'Cánh chim low-poly',
          size: [0.36, 0.035, 0.12],
          position: [side * 0.16, 0, 0],
          rotationY: side * 0.3,
          material: 'soot',
          receiveShadow: false,
        })
      }
      this.birds.push(bird)
    }
    this.#resetAnimatedEffect('landmarkBirds')
  }

  #buildLeaves() {
    const group = this.#effect('foregroundLeaves')
    for (let index = 0; index < LEAF_COUNT; index += 1) {
      const leaf = this.kit.box(group, {
        name: `Lá foreground ${index + 1}`,
        size: [0.16 + (index % 2) * 0.05, 0.035, 0.3],
        position: [0, 0, 0],
        rotationY: index * 0.7,
        material: index % 2 ? 'foliageLight' : 'foliage',
        receiveShadow: false,
      })
      this.leaves.push(leaf)
    }
    this.#resetAnimatedEffect('foregroundLeaves')
  }

  #resetAnimatedEffect(id) {
    if (id === 'landmarkBirds') {
      this.birds.forEach((bird, index) => {
        bird.position.set(-8 + index * 2.7, 13.2 + index * 0.08, -39 - index * 0.45)
      })
    }
    if (id === 'foregroundLeaves') {
      this.leaves.forEach((leaf, index) => {
        leaf.position.set(153.5 + index * 0.72, 6.8 - index * 0.55, 56.5 + (index % 3) * 1.2)
      })
    }
  }
}

