import * as THREE from 'three'

/**
 * EnhancedLakeWater — Stylized Realistic water for Hoan Kiem lake.
 *
 * Features:
 * - Multi-layered wave animation (wind waves + gentle swell)
 * - Fresnel-based reflection with sky color blending
 * - Sun specular highlight with elongated caustics
 * - Depth-based color gradient (shallow edges → deep center)
 * - Subtle foam near shoreline
 * - Night: moonpath reflection
 * - Day/night color transitions synced with DayNightCycle
 */

const VERTEX_SHADER = /* glsl */`
  uniform float time;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vDepth;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Multi-layered waves
    float wave1 = sin(pos.x * 1.8 + time * 1.0) * 0.025;
    float wave2 = sin(pos.z * 1.5 + time * 0.8) * 0.02;
    float wave3 = sin((pos.x + pos.z) * 1.2 + time * 1.3) * 0.012;
    float wave4 = sin(pos.x * 3.5 - time * 2.0) * 0.008; // Small ripples
    pos.y += wave1 + wave2 + wave3 + wave4;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    // Animated normal from wave derivatives
    float nx = cos(pos.x * 1.8 + time * 1.0) * 0.05
             + cos(pos.z * 1.5 + time * 0.8) * 0.04
             + cos(pos.x * 3.5 - time * 2.0) * 0.015;
    float nz = sin(pos.z * 1.5 + time * 0.8) * 0.05
             + sin(pos.x * 1.2 + time * 1.3) * 0.03
             + sin(pos.z * 3.0 + time * 1.8) * 0.012;
    vNormal = normalize(vec3(nx, 1.0, nz));

    // Depth estimate from UV (edges are shallower)
    vDepth = smoothstep(0.0, 0.3, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */`
  uniform vec3 waterColor;
  uniform vec3 deepWaterColor;
  uniform vec3 reflectionColor;
  uniform float time;
  uniform float opacity;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float moonIntensity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vDepth;

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 normal = normalize(vNormal);

    // Depth-based color
    vec3 baseColor = mix(waterColor, deepWaterColor, vDepth);

    // Fresnel — more reflective at grazing angles
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 4.0);

    // Sky reflection
    vec3 refl = mix(baseColor * 0.7, reflectionColor, fresnel * 0.75);

    // Sun specular — elongated highlight
    vec3 halfDir = normalize(sunDirection + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 96.0);
    float specWide = pow(max(0.0, dot(normal, halfDir)), 24.0);
    refl += sunColor * (spec * 1.0 + specWide * 0.2);

    // Moon path — subtle silver reflection
    vec3 moonDir = normalize(vec3(-0.15, 0.3, -1.0));
    float moonSpec = pow(max(0.0, dot(normal, normalize(moonDir + viewDir))), 120.0);
    refl += vec3(0.7, 0.75, 0.85) * moonSpec * moonIntensity * 0.5;

    // Caustics — animated light patterns
    vec2 causticsUV = vWorldPosition.xz * 0.4;
    float caustics1 = noise(causticsUV + time * 0.25);
    float caustics2 = noise(causticsUV * 1.8 - time * 0.18);
    float caustics = smoothstep(0.5, 1.1, caustics1 + caustics2) * 0.1;

    // Shore foam — noise-based edge
    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float foam = smoothstep(0.08, 0.02, edgeDist);
    float foamNoise = fbm(vWorldPosition.xz * 3.0 + time * 0.4);
    foam *= smoothstep(0.3, 0.6, foamNoise) * 0.25;

    // Combine
    vec3 color = refl + vec3(caustics) * baseColor * 1.5;
    color += vec3(0.95, 0.95, 0.9) * foam;

    // Subtle green algae tint in shallows
    float shallow = smoothstep(0.5, 0.2, vDepth);
    color = mix(color, color * vec3(0.85, 1.0, 0.82), shallow * 0.15);

    gl_FragColor = vec4(color, opacity);
  }
`

export class EnhancedLakeWater {
  constructor({ parent, width = 60, depth = 66, position = [102, -0.02, 0] }) {
    this.geometry = new THREE.PlaneGeometry(width, depth, 64, 64)
    this.geometry.rotateX(-Math.PI / 2)

    this.material = new THREE.ShaderMaterial({
      name: 'EnhancedLakeWater',
      uniforms: {
        waterColor: { value: new THREE.Color(0x1E5A66) },
        deepWaterColor: { value: new THREE.Color(0x0D3842) },
        reflectionColor: { value: new THREE.Color(0x718295) },
        time: { value: 0 },
        opacity: { value: 0.82 },
        sunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
        moonIntensity: { value: 0.0 },
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
      this.material.uniforms.reflectionColor.value.copy(skyColor).multiplyScalar(0.82)
    }

    // Phase-based water appearance
    const u = this.material.uniforms
    switch (phase) {
      case 'night':
        u.waterColor.value.set(0x0A252E)
        u.deepWaterColor.value.set(0x061518)
        u.opacity.value = 0.9
        u.moonIntensity.value = 1.0
        break
      case 'blueHour':
        u.waterColor.value.set(0x122E3E)
        u.deepWaterColor.value.set(0x0A1E28)
        u.opacity.value = 0.87
        u.moonIntensity.value = 0.3
        break
      case 'dawn':
        u.waterColor.value.set(0x2A5A5A)
        u.deepWaterColor.value.set(0x183838)
        u.opacity.value = 0.82
        u.moonIntensity.value = 0.0
        break
      case 'sunset':
        u.waterColor.value.set(0x2D5858)
        u.deepWaterColor.value.set(0x1A3535)
        u.opacity.value = 0.83
        u.moonIntensity.value = 0.0
        break
      case 'goldenHour':
        u.waterColor.value.set(0x2D6358)
        u.deepWaterColor.value.set(0x1A4030)
        u.opacity.value = 0.8
        u.moonIntensity.value = 0.0
        break
      case 'day':
      default:
        u.waterColor.value.set(0x1E5A66)
        u.deepWaterColor.value.set(0x0D3842)
        u.opacity.value = 0.82
        u.moonIntensity.value = 0.0
        break
    }
  }

  dispose() {
    this.mesh.removeFromParent()
    this.geometry.dispose()
    this.material.dispose()
  }
}
