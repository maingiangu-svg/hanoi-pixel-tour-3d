import { PhotoMetadataBuilder } from './PhotoMetadataBuilder.js'
import { scorePhoto } from './PhotoScoring.js'

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
    momentSystem = null,
    sceneMomentSystem = null,
    now = () => new Date(),
    metadataBuilder = null,
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
    this.metadataBuilder = metadataBuilder ?? new PhotoMetadataBuilder({
      camera,
      clock,
      world,
      dayNight,
      momentSystem,
      sceneMomentSystem,
      now,
    })
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
    const capturedAt = this.now()
    const capturedMetadata = this.metadataBuilder.buildPhotoMetadata({
      focalLength,
      width: canvas.width,
      height: canvas.height,
      capturedAt,
    })
    const scoring = scorePhoto(capturedMetadata)
    const metadata = Object.freeze({
      ...capturedMetadata,
      scoring,
    })
    const image = await encodeCanvas(canvas)
    const result = {
      id: metadata.capture.id,
      image,
      mimeType: image.type || 'image/png',
      width: canvas.width,
      height: canvas.height,
      metadata,
      capture: metadata.capture,
      location: metadata.location,
      lighting: metadata.lighting,
      subjects: metadata.subjects,
      landmarks: metadata.landmarks,
      eventContext: metadata.eventContext,
      sceneMomentContext: metadata.sceneMomentContext,
      classification: metadata.classification,
      scoring,
      // Compatibility aliases for existing Photo Mode and album consumers.
      timestamp: metadata.capture.timestamp,
      gameTime: metadata.capture.gameTime,
      playerPosition: metadata.capture.playerPosition,
      cameraDirection: metadata.capture.cameraDirection,
      focalLength: metadata.capture.focalLength,
      fov: metadata.capture.fov,
      area: metadata.location.areaId,
      mapId: metadata.location.mapId,
      lightingPhase: metadata.lighting.phase,
    }
    this.lastCapture = result
    return result
  }
}
