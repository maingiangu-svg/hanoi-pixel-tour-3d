import * as THREE from 'three'

const MAX_PIXEL_RATIO = 1.75
const OUTDOOR_VIEW_DISTANCE = 160

export class Renderer {
  constructor(container) {
    this.scene = new THREE.Scene()
    // Warm humid Hanoi atmosphere — golden haze
    this.scene.background = new THREE.Color(0x92A8B8)
    // Atmospheric fog — close objects clear, far objects fade into haze
    this.scene.fog = new THREE.Fog(0x9AABB8, 75, 160)

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.05,
      OUTDOOR_VIEW_DISTANCE,
    )
    this.activeCamera = this.camera

    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    this.instance.setSize(window.innerWidth, window.innerHeight)
    this.instance.outputColorSpace = THREE.SRGBColorSpace
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.08  // Brighter, warmer
    this.instance.shadowMap.enabled = true
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap  // Softer shadows
    this.instance.domElement.className = 'game-canvas'
    this.instance.domElement.setAttribute('aria-label', 'Khung nhìn phố 3D')
    container.append(this.instance.domElement)

    this.handleResize = this.handleResize.bind(this)
    window.addEventListener('resize', this.handleResize)
  }

  handleResize() {
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    if (this.activeCamera !== this.camera) {
      this.activeCamera.aspect = width / height
      this.activeCamera.updateProjectionMatrix()
    }
    this.instance.setPixelRatio(Math.min(window.deviceRatio, MAX_PIXEL_RATIO))
    this.instance.setSize(width, height)
  }

  setActiveCamera(camera = this.camera) {
    this.activeCamera = camera?.isCamera ? camera : this.camera
    this.activeCamera.aspect = this.camera.aspect
    this.activeCamera.updateProjectionMatrix()
    return this.activeCamera
  }

  render() {
    this.instance.render(this.scene, this.activeCamera)
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize)
    this.instance.dispose()
    this.instance.domElement.remove()
  }
}
