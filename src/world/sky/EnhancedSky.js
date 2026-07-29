import * as THREE from 'three'

/**
 * EnhancedSky — Dramatic Stylized Realistic sky for Hanoi.
 *
 * Features:
 * - Multi-layer cloud system: thick cumulus, thin cirrus, scattered wisps
 * - Animated sun with wide atmospheric glow
 * - Moon with halo
 * - Stars with twinkle
 * - Thick atmospheric haze near horizon
 * - Color changes by time of day
 */

const VERTEX_SHADER = /* glsl */`
  varying vec3 vWorldPosition;
  varying float vSkyHeight;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vSkyHeight = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */`
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float sunIntensity;
  uniform vec3 moonDirection;
  uniform vec3 moonColor;
  uniform float moonIntensity;
  uniform float starVisibility;
  uniform float cloudDensity;
  uniform float hazeIntensity;
  uniform vec3 hazeColor;
  uniform float time;

  varying vec3 vWorldPosition;
  varying float vSkyHeight;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.05; a *= 0.48; }
    return v;
  }

  float stars(vec3 dir) {
    vec3 p = dir * 400.0;
    vec2 uv = floor(vec2(atan(p.x, p.z) * 3.0, asin(dir.y) * 7.0));
    float h = hash(uv);
    float star = step(0.996, h);
    float twinkle = sin(time * 1.5 + h * 90.0) * 0.5 + 0.5;
    return star * twinkle * smoothstep(0.0, 0.4, dir.y);
  }

  void main() {
    vec3 dir = normalize(vWorldPosition - cameraPosition);

    // Base gradient — warm Hanoi sky
    float gradient = smoothstep(-0.2, 0.8, vSkyHeight);
    float horizonGlow = 1.0 - smoothstep(-0.05, 0.3, abs(vSkyHeight));
    vec3 color = mix(horizonColor, topColor, gradient);
    color = mix(color, horizonColor * 1.1, horizonGlow * 0.35);

    // Sun — wide atmospheric glow
    float sunDot = dot(dir, sunDirection);
    float sunDisc = smoothstep(0.9985, 0.9997, sunDot);
    float sunGlow = pow(max(0.0, sunDot), 16.0) * 0.9;
    float sunHalo = pow(max(0.0, sunDot), 4.0) * 0.35;
    float sunScatter = pow(max(0.0, sunDot), 1.5) * 0.1;
    color += sunColor * (sunDisc * sunIntensity * 4.0 + sunGlow * sunIntensity + sunHalo * sunIntensity + sunScatter * sunIntensity);

    // Moon
    float moonDot = dot(dir, moonDirection);
    float moonDisc = smoothstep(0.9990, 0.9998, moonDot);
    float moonGlow = pow(max(0.0, moonDot), 100.0) * 0.2;
    float moonHalo = pow(max(0.0, moonDot), 8.0) * 0.06;
    color += moonColor * (moonDisc * moonIntensity * 3.0 + moonGlow * moonIntensity + moonHalo * moonIntensity);

    // Stars
    color += vec3(0.92, 0.94, 1.0) * stars(dir) * starVisibility;

    // Clouds — thick, dramatic
    if (dir.y > 0.0) {
      vec2 cloudUV = dir.xz / (dir.y + 0.06);

      // Low cumulus — thick, puffy
      float c1 = fbm(cloudUV * 1.5 + vec2(time * 0.008, time * 0.003));
      float c2 = fbm(cloudUV * 2.5 + vec2(time * 0.012, time * 0.005) + 5.0);
      float clouds = smoothstep(0.38 - cloudDensity * 0.25, 0.6 - cloudDensity * 0.18, c1);
      clouds += smoothstep(0.42 - cloudDensity * 0.2, 0.65 - cloudDensity * 0.15, c2) * 0.5;

      // High cirrus — thin wisps
      float cirrus = fbm(cloudUV * 3.0 + vec2(time * 0.02, time * 0.008));
      float cirrusLayer = smoothstep(0.45, 0.7, cirrus) * 0.25 * cloudDensity;

      clouds = clamp(clouds + cirrusLayer, 0.0, 1.0);

      // Cloud color — dramatic
      float sunH = sunDirection.y;
      vec3 cloudBright = vec3(1.0, 0.97, 0.92);
      vec3 cloudSunset = vec3(1.0, 0.55, 0.3);
      vec3 cloudNight = vec3(0.12, 0.14, 0.22);
      vec3 cloudGolden = vec3(1.0, 0.8, 0.5);

      vec3 cloudColor = mix(cloudNight, cloudBright, smoothstep(-0.15, 0.25, sunH));
      cloudColor = mix(cloudColor, cloudSunset, smoothstep(0.0, -0.2, sunH) * 0.7);
      cloudColor = mix(cloudColor, cloudGolden, smoothstep(-0.1, -0.3, sunH) * 0.4);

      float cloudFade = smoothstep(0.0, 0.1, dir.y);
      color = mix(color, cloudColor, clouds * cloudFade * 0.75);
    }

    // Atmospheric haze — thick near horizon
    float hazeFactor = smoothstep(0.5, -0.15, vSkyHeight) * hazeIntensity;
    color = mix(color, hazeColor, hazeFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export class EnhancedSky {
  constructor({ parent, radius = 155 }) {
    this.geometry = new THREE.SphereGeometry(radius, 32, 16)
    this.material = new THREE.ShaderMaterial({
      name: 'EnhancedSky',
      uniforms: {
        topColor: { value: new THREE.Color(0x3A5570) },
        horizonColor: { value: new THREE.Color(0x8A9AB0) },
        sunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
        sunIntensity: { value: 1.2 },
        moonDirection: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
        moonColor: { value: new THREE.Color(0xaabbdd) },
        moonIntensity: { value: 0.0 },
        starVisibility: { value: 0.0 },
        cloudDensity: { value: 0.55 },
        hazeIntensity: { value: 0.3 },
        hazeColor: { value: new THREE.Color(0xC8B89A) },
        time: { value: 0 },
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
    this.mesh.name = 'EnhancedSky'
    this.mesh.renderOrder = -1000
    this.mesh.frustumCulled = false
    parent.add(this.mesh)
    this._elapsed = 0
  }

  setTransition(fromTop, toTop, fromHorizon, toHorizon, amount) {
    const u = this.material.uniforms
    u.topColor.value.lerpColors(fromTop, toTop, amount)
    u.horizonColor.value.lerpColors(fromHorizon, toHorizon, amount)
  }

  updateCelestials(gameHour, delta) {
    this._elapsed += delta
    const u = this.material.uniforms

    // Sun orbit
    const sunAngle = ((gameHour - 6) / 12) * Math.PI
    const sunY = Math.sin(sunAngle)
    const sunZ = Math.cos(sunAngle)
    u.sunDirection.value.set(0.2, Math.max(-0.1, sunY), sunZ).normalize()

    // Sun color — warm golden in Hanoi
    const sunH = sunY
    u.sunIntensity.value = smoothstep(-0.1, 0.2, sunH) * 1.3
    u.sunColor.value.setHSL(
      0.07 + (1 - sunH) * 0.07,
      0.7 + (1 - sunH) * 0.2,
      0.9 - (1 - sunH) * 0.3,
    )

    // Moon
    const moonAngle = ((gameHour - 18) / 12) * Math.PI
    const moonY = Math.sin(moonAngle)
    const moonZ = Math.cos(moonAngle)
    u.moonDirection.value.set(-0.15, Math.max(-0.1, moonY), -moonZ).normalize()
    u.moonIntensity.value = smoothstep(-0.05, 0.15, moonY) * (gameHour > 18 || gameHour < 6 ? 1 : 0)

    // Stars
    u.starVisibility.value =
      smoothstep(0.1, -0.15, sunH) * smoothstep(20, 19, gameHour) +
      smoothstep(0.1, -0.15, sunH) * smoothstep(5, 6, gameHour)

    // Clouds — Hanoi is cloudy
    u.cloudDensity.value = 0.5 + Math.sin(gameHour * 0.35) * 0.2

    // Haze — thick during humid day
    const dayFactor = smoothstep(6, 10, gameHour) * (1 - smoothstep(16, 19, gameHour))
    u.hazeIntensity.value = 0.2 + dayFactor * 0.25

    // Haze color
    const isNight = gameHour > 19 || gameHour < 5.5
    if (isNight) {
      u.hazeColor.value.set(0.08, 0.1, 0.16)
    } else {
      const golden = smoothstep(16, 17, gameHour) * (1 - smoothstep(17.5, 18.5, gameHour))
      u.hazeColor.value.set(0.75 + golden * 0.25, 0.68 + golden * 0.12, 0.52 - golden * 0.12)
    }

    u.time.value = this._elapsed
  }

  updatePosition(position) {
    if (!position) return
    this.mesh.position.set(position.x, position.y ?? 0, position.z)
  }

  setVisible(visible) { this.mesh.visible = Boolean(visible) }

  dispose() {
    this.mesh.removeFromParent()
    this.geometry.dispose()
    this.material.dispose()
  }
}
