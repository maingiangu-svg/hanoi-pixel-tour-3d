import * as THREE from 'three'

/**
 * EnhancedLakeWater — animated water surface for Hoan Kiem lake.
 *
 * Uses a custom shader with:
 * - Animated wave normals
 * - Environment-like reflection (fake cubemap from sky colors)
 * - Subtle caustics pattern
 * - Foam near edges
 */

const VERTEX_SHADER = /* glsl */`
  uniform float time;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Gentle wave displacement
    float wave1 = sin(pos.x * 2.0 + time * 1.2) * 0.02;
    float wave2 = sin(pos.z * 1.8 + time * 0.9) * 0.015;
    float wave3 = sin((pos.x + pos.z) * 1.5 + time * 1.5) * 0.01;
    pos.y += wave1 + wave2 + wave3;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    // Animated normal
    float nx = cos(pos.x * 2.0 + time * 1.2) * 0.04 + cos(pos.z * 1.8 + time * 0.9) * 0.03;
    float nz = sin(pos.z * 1.8 + time * 0.9) * 0.04 + sin(pos.x * 1.5 + time * 1.5) * 0.02;
    vNormal = normalize(vec3(nx, 1.0, nz));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */`
  uniform vec3 waterColor;
  uniform vec3 reflectionColor;
  uniform float time;
  uniform float opacity;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 normal = normalize(vNormal);

    // Fresnel effect — more reflective at grazing angles
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);

    // Fake reflection — blend between water color and sky reflection
    vec3 refl = mix(waterColor * 0.8, reflectionColor, fresnel * 0.7);

    // Sun specular highlight
    vec3 halfDir = normalize(sunDirection + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 128.0);
    refl += sunColor * spec * 0.8;

    // Caustics pattern
    vec2 causticsUV = vWorldPosition.xz * 0.5;
    float caustics = noise(causticsUV + time * 0.3);
    caustics += noise(causticsUV * 2.0 - time * 0.2) * 0.5;
    caustics = smoothstep(0.6, 1.2, caustics) * 0.12;

    // Combine
    vec3 color = refl + vec3(caustics) * waterColor * 2.0;

    // Edge foam hint
    float edgeNoise = noise(vWorldPosition.xz * 3.0 + time * 0.5);
    float edge = smoothstep(0.7, 0.9, edgeNoise) * 0.08;
    color += vec3(edge);

    gl_FragColor = vec4(color, opacity);
  }
`

export class EnhancedLakeWater {
  constructor({ parent, width = 60, depth = 66, position = [102, -0.02, 0] }) {
    this.geometry = new THREE.PlaneGeometry(width, depth, 48, 48)
    this.geometry.rotateX(-Math.PI / 2)

    this.material = new THREE.ShaderMaterial({
      name: 'EnhancedLakeWater',
      uniforms: {
        waterColor: { value: new THREE.Color(0x1a5c6b) },
        reflectionColor: { value: new THREE.Color(0x718295) },
        time: { value: 0 },
        opacity: { value: 0.82 },
        sunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.name = 'Mặt nước Hồ Gươm (enhanced)'
    this.mesh.position.set(position[0], position[1], position[2])
    this.mesh.receiveShadow = true
    parent.add(this.mesh)

    this._elapsed = 0
  }

  /**
   * Update water animation and sync with day/night colors.
   */
  update(delta, sunDirection, sunColor, skyColor, phase) {
    this._elapsed += delta
    this.material.uniforms.time.value = this._elapsed

    if (sunDirection) {
      this.material.uniforms.sunDirection.value.copy(sunDirection)
    }
    if (sunColor) {
      this.material.uniforms.sunColor.value.copy(sunColor)
    }
    if (skyColor) {
      // Reflection blends between water color and sky
      this.material.uniforms.reflectionColor.value.copy(skyColor).multiplyScalar(0.8)
    }

    // Water color varies by time of day
    switch (phase) {
      case 'night':
        this.material.uniforms.waterColor.value.set(0x0d2e38)
        this.material.uniforms.opacity.value = 0.88
        break
      case 'blueHour':
        this.material.uniforms.waterColor.value.set(0x14384a)
        this.material.uniforms.opacity.value = 0.85
        break
      case 'dawn':
      case 'sunset':
        this.material.uniforms.waterColor.value.set(0x2a5a5a)
        this.material.uniforms.opacity.value = 0.82
        break
      case 'goldenHour':
        this.material.uniforms.waterColor.value.set(0x2d6358)
        this.material.uniforms.opacity.value = 0.8
        break
      case 'day':
      default:
        this.material.uniforms.waterColor.value.set(0x1a5c6b)
        this.material.uniforms.opacity.value = 0.82
        break
    }
  }

  dispose() {
    this.mesh.removeFromParent()
    this.geometry.dispose()
    this.material.dispose()
  }
}
