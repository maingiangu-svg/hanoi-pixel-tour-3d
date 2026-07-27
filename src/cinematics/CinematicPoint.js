import * as THREE from 'three'
import {
  CINEMATIC_TRIGGER_TYPES,
  CinematicDefinition,
} from './CinematicDefinition.js'

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

export class CinematicPoint extends CinematicDefinition {
  constructor({
    id,
    region,
    area = 'outdoor',
    position,
    radius = 3,
    promptText = 'Xem giới thiệu',
    title = '',
    subtitle = '',
    audioCue = null,
    ambientLevel = 0.34,
    conditions = () => true,
    marker = {},
    timeline,
    replayable = true,
  }) {
    if (!region) throw new TypeError(`Cinematic point "${id}" requires a region`)
    super({
      id,
      triggerType: CINEMATIC_TRIGGER_TYPES.INTERACTION,
      title,
      subtitle,
      audioCue,
      ambientLevel,
      conditions,
      timeline,
    })

    this.region = region
    this.area = area
    this.position = toVector3(position, `Cinematic point "${id}"`)
    this.radius = Math.max(0.5, Number(radius) || 3)
    this.promptText = promptText
    this.marker = Object.freeze({
      visibleDistance: Math.max(6, Number(marker.visibleDistance) || 28),
    })
    this.replayable = Boolean(replayable)
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
    return regionIds.includes(this.region) && this.canPlay({
      areaName,
      regionIds,
      point: this,
    })
  }
}
