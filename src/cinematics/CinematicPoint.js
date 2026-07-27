import * as THREE from 'three'

function toVector3(value, label) {
  if (value?.isVector3) return value.clone()
  if (
    !Number.isFinite(value?.x)
    || !Number.isFinite(value?.z)
  ) {
    throw new TypeError(`${label} requires finite x/z coordinates`)
  }
  return new THREE.Vector3(value.x, value.y ?? 0, value.z)
}

export class CinematicPoint {
  constructor({
    id,
    region,
    area = 'outdoor',
    position,
    radius = 3,
    promptText = 'Xem đoạn giới thiệu',
    title = '',
    subtitle = '',
    timeline,
    replayable = true,
  }) {
    if (!id) throw new TypeError('Cinematic point requires an id')
    if (!region) throw new TypeError(`Cinematic point "${id}" requires a region`)
    if (typeof timeline !== 'function') {
      throw new TypeError(`Cinematic point "${id}" requires a timeline factory`)
    }

    this.id = id
    this.region = region
    this.area = area
    this.position = toVector3(position, `Cinematic point "${id}"`)
    this.radius = Math.max(0.5, Number(radius) || 3)
    this.promptText = promptText
    this.title = title
    this.subtitle = subtitle
    this.timelineFactory = timeline
    this.replayable = Boolean(replayable)
    this.playCount = 0
  }

  isNear(position) {
    if (!position) return false
    const dx = position.x - this.position.x
    const dz = position.z - this.position.z
    return dx * dx + dz * dz <= this.radius * this.radius
  }

  isAvailable({ areaName, regionIds = [] } = {}) {
    if (areaName !== this.area) return false
    if (!this.replayable && this.playCount > 0) return false
    return regionIds.includes(this.region)
  }

  createTimeline(context) {
    return this.timelineFactory(context)
  }
}
