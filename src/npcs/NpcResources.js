import * as THREE from 'three'

export const NPC_PALETTE = Object.freeze({
  skinWarm: 0xc99070,
  skinLight: 0xe0ad88,
  skinDeep: 0x9b6048,
  hairBlack: 0x211f20,
  hairBrown: 0x50382f,
  hairGray: 0xaaa69d,
  cream: 0xe7dbc3,
  white: 0xeee9dc,
  charcoal: 0x292d31,
  black: 0x17191b,
  navy: 0x27374b,
  denim: 0x466278,
  blue: 0x446a78,
  teal: 0x397064,
  sage: 0x74876b,
  olive: 0x72734f,
  mustard: 0xc3974d,
  oldYellow: 0xc6a66b,
  terracotta: 0x9e5544,
  red: 0x9c413e,
  maroon: 0x643b45,
  brown: 0x68483a,
  darkBrown: 0x3c302d,
  pink: 0xb36d78,
  violet: 0x62536f,
  straw: 0xc7aa6c,
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
