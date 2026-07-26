import * as THREE from 'three'

const VERTEX_SHADER = `
  varying float vSkyHeight;

  void main() {
    vSkyHeight = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying float vSkyHeight;

  void main() {
    float gradient = smoothstep(-0.18, 0.72, vSkyHeight);
    float horizonHaze = 1.0 - smoothstep(-0.08, 0.2, abs(vSkyHeight));
    vec3 color = mix(horizonColor, topColor, gradient);
    color = mix(color, horizonColor * 1.04, horizonHaze * 0.24);
    gl_FragColor = vec4(color, 1.0);
  }
`

/**
 * One lightweight dome replaces the flat clear color while the existing
 * DayNightCycle remains the authority for all phase colors.
 */
export class GradientSky {
  constructor({ parent, radius = 142 }) {
    this.geometry = new THREE.SphereGeometry(radius, 20, 10)
    this.material = new THREE.ShaderMaterial({
      name: 'Gradient bầu trời Hà Nội',
      uniforms: {
        topColor: { value: new THREE.Color(0x40516b) },
        horizonColor: { value: new THREE.Color(0x718295) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.name = 'Bầu trời gradient theo thời gian'
    this.mesh.renderOrder = -1000
    this.mesh.frustumCulled = false
    parent.add(this.mesh)

    this.topTransition = new THREE.Color()
    this.horizonTransition = new THREE.Color()
  }

  setTransition(fromTop, toTop, fromHorizon, toHorizon, amount) {
    this.topTransition.lerpColors(fromTop, toTop, amount).multiplyScalar(0.78)
    this.horizonTransition.lerpColors(fromHorizon, toHorizon, amount)
    this.material.uniforms.topColor.value.copy(this.topTransition)
    this.material.uniforms.horizonColor.value.copy(this.horizonTransition)
  }

  updatePosition(position) {
    if (!position) return
    this.mesh.position.set(position.x, position.y ?? 0, position.z)
  }

  setVisible(visible) {
    this.mesh.visible = Boolean(visible)
  }

  dispose() {
    this.mesh.removeFromParent()
    this.geometry.dispose()
    this.material.dispose()
  }
}
