import * as THREE from 'three'

function copyVector(vector) {
  return Object.freeze({
    x: vector.x,
    y: vector.y,
    z: vector.z,
  })
}

function encodeCanvas(canvas, type = 'image/png', quality) {
  if (!canvas?.toBlob) {
    return Promise.reject(new Error('Photo capture requires an HTML canvas with toBlob support'))
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The rendered scene could not be encoded as an image'))
    }, type, quality)
  })
}

export class PhotoCapture {
  constructor({
    renderer,
    camera,
    clock,
    world,
    dayNight,
    now = () => new Date(),
  }) {
    if (!renderer?.instance?.domElement || typeof renderer.render !== 'function') {
      throw new TypeError('PhotoCapture requires the active game renderer')
    }
    if (!camera?.isCamera) throw new TypeError('PhotoCapture requires a THREE camera')

    this.renderer = renderer
    this.camera = camera
    this.clock = clock
    this.world = world
    this.dayNight = dayNight
    this.now = now
    this.direction = new THREE.Vector3()
    this.lastCapture = null
  }

  async capture({ focalLength }) {
    if (!Number.isFinite(focalLength)) {
      throw new TypeError('PhotoCapture.capture requires a finite focal length')
    }

    // Rendering immediately before encoding guarantees the canvas represents
    // the current world, clock, lighting and NPC state. DOM-based HUD layers
    // are never part of this WebGL canvas.
    this.renderer.render()
    const canvas = this.renderer.instance.domElement
    const image = await encodeCanvas(canvas)
    this.camera.getWorldDirection(this.direction)

    const capturedAt = this.now()
    const result = {
      image,
      mimeType: image.type || 'image/png',
      width: canvas.width,
      height: canvas.height,
      timestamp: capturedAt.toISOString(),
      gameTime: Object.freeze({
        minutes: this.clock.minutes,
        hour: this.clock.hour,
        minute: this.clock.minute,
        formatted: this.clock.formatted,
      }),
      playerPosition: copyVector(this.camera.position),
      cameraDirection: copyVector(this.direction),
      focalLength,
      area: this.world.activeAreaName,
      mapId: this.world.activeMapId,
      lightingPhase: this.dayNight.getLightingPhase(),
    }
    this.lastCapture = result
    return result
  }
}
