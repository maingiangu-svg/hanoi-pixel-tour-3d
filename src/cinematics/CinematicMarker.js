import * as THREE from 'three'

const DEFAULT_COLOR = 0xe7ac62

export class CinematicMarkerLayer {
  constructor(scene) {
    this.group = new THREE.Group()
    this.group.name = 'Điểm xem cinematic'
    scene.add(this.group)
    this.entries = new Map()
    this.elapsed = 0

    this.ringGeometry = new THREE.RingGeometry(0.2, 0.34, 20)
    this.iconGeometry = new THREE.OctahedronGeometry(0.16, 0)
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: DEFAULT_COLOR,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    this.iconMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1d39a,
      emissive: DEFAULT_COLOR,
      emissiveIntensity: 1.1,
      roughness: 0.58,
      metalness: 0,
    })
  }

  add(point) {
    const marker = new THREE.Group()
    marker.name = `Cinematic marker · ${point.id}`
    marker.position.copy(point.position)

    const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial)
    ring.name = 'Vòng sáng cinematic'
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.025
    marker.add(ring)

    const icon = new THREE.Mesh(this.iconGeometry, this.iconMaterial)
    icon.name = 'Biểu tượng cinematic'
    icon.position.y = 0.72
    icon.rotation.z = Math.PI / 4
    marker.add(icon)

    marker.userData.baseY = marker.position.y
    marker.userData.visibleDistance = point.marker?.visibleDistance ?? 28
    this.group.add(marker)
    this.entries.set(point.id, { marker, ring, icon, point })
    return marker
  }

  update(deltaTime, {
    playerPosition,
    areaName,
    hidden = false,
  } = {}) {
    this.elapsed += Math.min(Math.max(Number(deltaTime) || 0, 0), 0.1)
    const pulse = (Math.sin(this.elapsed * 2.4) + 1) * 0.5

    for (const { marker, ring, icon, point } of this.entries.values()) {
      const distanceSquared = playerPosition
        ? marker.position.distanceToSquared(playerPosition)
        : Infinity
      const visibleDistance = marker.userData.visibleDistance
      marker.visible = (
        !hidden
        && areaName === point.area
        && distanceSquared <= visibleDistance * visibleDistance
      )
      if (!marker.visible) continue

      ring.scale.setScalar(0.96 + pulse * 0.14)
      icon.position.y = 0.69 + pulse * 0.07
      icon.rotation.y = this.elapsed * 0.65
    }
  }

  dispose() {
    this.group.removeFromParent()
    this.entries.clear()
    this.ringGeometry.dispose()
    this.iconGeometry.dispose()
    this.ringMaterial.dispose()
    this.iconMaterial.dispose()
  }
}
