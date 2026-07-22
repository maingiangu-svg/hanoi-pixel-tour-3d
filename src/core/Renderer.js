import * as THREE from 'three'

const MAX_PIXEL_RATIO = 1.75

export class Renderer {
  constructor(container) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x687586)
    this.scene.fog = new THREE.Fog(0x687586, 52, 92)

    this.camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / window.innerHeight,
      0.05,
      120,
    )

    this.instance = new THREE.WebGLRenderer({ antialias: true })
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    this.instance.setSize(window.innerWidth, window.innerHeight)
    this.instance.outputColorSpace = THREE.SRGBColorSpace
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 0.94
    this.instance.shadowMap.enabled = true
    this.instance.shadowMap.type = THREE.PCFShadowMap
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
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    this.instance.setSize(width, height)
  }

  render() {
    this.instance.render(this.scene, this.camera)
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize)
    this.instance.dispose()
    this.instance.domElement.remove()
  }
}
