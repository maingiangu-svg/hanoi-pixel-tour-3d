import * as THREE from 'three'

export const SPECIAL_NPC_PALETTE = Object.freeze({
  skinWarm: 0xc98762,
  skinLight: 0xd79b76,
  skinShade: 0xa9674a,
  hairBlack: 0x211b1a,
  hairBrown: 0x5a3826,
  cream: 0xdedbd1,
  wine: 0x743947,
  charcoal: 0x303238,
  coal: 0x20242a,
  navy: 0x30465c,
  olive: 0x4f5d48,
  terracotta: 0xc9692c,
  brick: 0x8e443c,
  shoeSole: 0xd7d2c7,
})

function createFrameGeometry() {
  const outer = new THREE.Shape()
  outer.moveTo(-0.5, -0.34)
  outer.lineTo(0.5, -0.34)
  outer.lineTo(0.5, 0.34)
  outer.lineTo(-0.5, 0.34)
  outer.closePath()

  const hole = new THREE.Path()
  hole.moveTo(-0.37, -0.22)
  hole.lineTo(-0.37, 0.22)
  hole.lineTo(0.37, 0.22)
  hole.lineTo(0.37, -0.22)
  hole.closePath()
  outer.holes.push(hole)
  return new THREE.ShapeGeometry(outer)
}

function rotateHeadUvToFront(geometry) {
  const uv = geometry.attributes.uv
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, (uv.getX(index) + 0.25) % 1)
  }
  uv.needsUpdate = true
  return geometry
}

function materialKey(color, options) {
  return [
    color,
    options.roughness ?? 0.86,
    options.metalness ?? 0,
    options.transparent ? 1 : 0,
    options.opacity ?? 1,
    options.depthWrite === false ? 0 : 1,
    options.side ?? THREE.FrontSide,
  ].join(':')
}

/**
 * Resource pool used only by custom NPCs. Ordinary NPC resources intentionally
 * remain untouched because shop and crowd actors share their original pool.
 */
export class SpecialNpcResources {
  constructor() {
    this.geometries = Object.freeze({
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, false),
      tapered: new THREE.CylinderGeometry(0.39, 0.5, 1, 6, 1, false),
      sphere: new THREE.IcosahedronGeometry(0.5, 1),
      sphereLow: new THREE.IcosahedronGeometry(0.5, 0),
      head: rotateHeadUvToFront(new THREE.SphereGeometry(0.5, 10, 7)),
      cone: new THREE.ConeGeometry(0.5, 1, 6, 1, false),
      torus: new THREE.TorusGeometry(0.5, 0.028, 4, 12),
      frame: createFrameGeometry(),
      disc: new THREE.CircleGeometry(0.5, 8),
      contactShadow: new THREE.CircleGeometry(0.5, 16),
    })
    this.materials = new Map()
    this.disposed = false
  }

  getGeometry(name) {
    return this.geometries[name] ?? this.geometries.box
  }

  getMaterial(color, options = {}) {
    const key = materialKey(color, options)
    if (this.materials.has(key)) return this.materials.get(key)
    const material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: options.roughness ?? 0.86,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      depthWrite: options.depthWrite ?? true,
      side: options.side ?? THREE.FrontSide,
      toneMapped: true,
    })
    material.name = options.name ?? `Special material ${key}`
    this.materials.set(key, material)
    return material
  }

  dispose() {
    if (this.disposed) return
    Object.values(this.geometries).forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.materials.clear()
    this.disposed = true
  }
}

let sharedResources = null

export function getSharedSpecialNpcResources() {
  if (!sharedResources || sharedResources.disposed) {
    sharedResources = new SpecialNpcResources()
  }
  return sharedResources
}

export function disposeSharedSpecialNpcResources() {
  sharedResources?.dispose()
  sharedResources = null
}
