import * as THREE from 'three'

export const NPC_PALETTE = Object.freeze({
  skinWarm: 0xc99070,
  skinLight: 0xe0ad88,
  skinDeep: 0x9b6048,
  hairBlack: 0x34393a,
  hairBrown: 0x50382f,
  hairGray: 0xaaa69d,
  cream: 0xe2d5ba,
  white: 0xeee7d8,
  charcoal: 0x34393a,
  black: 0x252a2b,
  navy: 0x3e5064,
  denim: 0x536b77,
  blue: 0x53647b,
  teal: 0x315f57,
  sage: 0x6f8373,
  olive: 0x66705a,
  mustard: 0xcda765,
  oldYellow: 0xcda765,
  terracotta: 0x995343,
  red: 0x995343,
  maroon: 0x643b45,
  brown: 0x68483a,
  darkBrown: 0x3c302d,
  pink: 0xb87978,
  violet: 0x6d6078,
  straw: 0xc8aa6d,
  metal: 0x53585b,
})

/**
 * Shared low-poly primitives and Lambert materials for all procedural NPCs.
 * One pool is intentionally reused so each actor only owns transforms/meshes.
 */
export class NpcResources {
  constructor({ palette = NPC_PALETTE } = {}) {
    this.geometries = Object.freeze({
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, false),
      tapered: new THREE.CylinderGeometry(0.38, 0.5, 1, 6, 1, false),
      head: new THREE.DodecahedronGeometry(0.5, 0),
      sphere: new THREE.IcosahedronGeometry(0.5, 1),
      cone: new THREE.ConeGeometry(0.5, 1, 8, 1, false),
      brim: new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10, 1, false),
    })
    this.materials = Object.freeze(
      Object.fromEntries(
        Object.entries(palette).map(([name, color]) => [
          name,
          new THREE.MeshLambertMaterial({ color, flatShading: true }),
        ]),
      ),
    )
    this.disposed = false
  }

  getGeometry(name) {
    return this.geometries[name] ?? this.geometries.box
  }

  getMaterial(name) {
    return this.materials[name] ?? this.materials.charcoal
  }

  dispose() {
    if (this.disposed) return
    Object.values(this.geometries).forEach((geometry) => geometry.dispose())
    Object.values(this.materials).forEach((material) => material.dispose())
    this.disposed = true
  }
}

let sharedResources = null

export function getSharedNpcResources() {
  if (!sharedResources || sharedResources.disposed) sharedResources = new NpcResources()
  return sharedResources
}

export function disposeSharedNpcResources() {
  sharedResources?.dispose()
  sharedResources = null
}
