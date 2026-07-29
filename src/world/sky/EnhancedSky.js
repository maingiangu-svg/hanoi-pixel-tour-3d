import * as THREE from 'three'

/**
 * EnhancedSky — Stylized Realistic sky for Hanoi.
 *
 * Features:
 * - Warm gradient sky with Vietnamese atmosphere
 * - Animated sun disc with golden hour glow
 * - Moon and stars for night scenes
 * - Procedural cumulus clouds with wind animation
 * - Atmospheric haze layer near horizon
 * - Monsoon-style cloud density variation
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
  uniform float cloudSpeed;
  uniform float hazeIntensity;
  uniform vec3 hazeColor;
  uniform float time;

  varying vec3 vWorldPosition;
  varying float vSkyHeight;

  // ── Noise functions ──
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
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.1 + shift;
      a *= 0.5;
    }
    return v;
  }

  // ── Stars ──
  float stars(vec3 dir) {
    vec3 p = dir * 350.0;
    vec2 uv = floor(vec2(atan(p.x, p.z) * 3.0, asin(dir.y) * 6.0));
    float h = hash(uv);
    float star = step(0.997, h);
    float twinkle = sin(time * 1.8 + h * 80.0) * 0.5 + 0.5;
    return star * twinkle * smoothstep(0.0, 0.35, dir.y);
  }

  // ── Cloud layers ──
  float cloudLayer(vec2 uv, float speed, float scale) {
    uv += vec2(speed * time, speed * 0.3 * time);
    return fbm(uv * scale);
  }

  // High-altitude cirrus
  float cirrus(vec2 uv) {
    uv += vec2(time * 0.015, time * 0.005);
    float c = fbm(uv * 3.0);
    return smoothstep(0.45, 0.7, c) * 0.3;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition - cameraPosition);

    // ── Base gradient ──
    float gradient = smoothstep(-0.18, 0.75, vSkyHeight);
    float horizonHaze = 1.0 - smoothstep(-0.05, 0.25, abs(vSkyHeight));
    vec3 color = mix(horizonColor, topColor, gradient);

    // Horizon glow — warm at golden hour, cool at blue hour
    color = mix(color, horizonColor * 1.08, horizonHaze * 0.3);

    // ── Sun disc + atmospheric glow ──
    float sunDot = dot(dir, sunDirection);
    float sunDisc = smoothstep(0.9988, 0.9996, sunDot);
    float sunGlow = pow(max(0.0, sunDot), 24.0) * 0.7;
    float sunHalo = pow(max(0.0, sunDot), 6.0) * 0.25;
    float sunBleed = pow(max(0.0, sunDot), 2.0) * 0.08; // Wide atmospheric scatter
    color += sunColor * (
      sunDisc * sunIntensity * 3.5 +
      sunGlow * sunIntensity +
      sunHalo * sunIntensity * 0.5 +
      sunBleed * sunIntensity
    );

    // ── Moon ──
    float moonDot = dot(dir, moonDirection);
    float moonDisc = smoothstep(0.9992, 0.9998, moonDot);
    float moonGlow = pow(max(0.0, moonDot), 80.0) * 0.18;
    color += moonColor * (moonDisc * moonIntensity * 2.5 + moonGlow * moonIntensity);

    // ── Stars ──
    float s = stars(dir);
    color += vec3(0.92, 0.94, 1.0) * s * starVisibility;

    // ── Clouds ──
    if (dir.y > 0.0) {
      vec2 cloudUV = dir.xz / (dir.y + 0.08);

      // Low cumulus — thicker, more defined
      float cloud1 = cloudLayer(cloudUV, 0.01, 1.6);
      float cloud2 = cloudLayer(cloudUV + 4.0, 0.015, 2.8);

      // High cirrus — thin wisps
      float cirrusLayer = cirrus(cloudUV * 0.5);

      float clouds = smoothstep(0.42 - cloudDensity * 0.22, 0.62 - cloudDensity * 0.15, cloud1);
      clouds += smoothstep(0.48 - cloudDensity * 0.18, 0.68 - cloudDensity * 0.12, cloud2) * 0.5;
      clouds = clamp(clouds, 0.0, 1.0);
      clouds = max(clouds, cirrusLayer * cloudDensity);

      // Cloud coloring — varies with sun position
      float sunHeight = sunDirection.y;
      vec3 cloudBright = vec3(1.0, 0.98, 0.95);    // Daytime white
      vec3 cloudSunset = vec3(0.95, 0.6, 0.35);     // Sunset orange
      vec3 cloudNight = vec3(0.15, 0.18, 0.25);     // Night dark blue

      vec3 cloudColor = mix(cloudNight, cloudBright, smoothstep(-0.15, 0.2, sunHeight));
      cloudColor = mix(cloudColor, cloudSunset, smoothstep(0.0, -0.15, sunHeight) * 0.6);

      // Lit undersides during golden hour
      float goldenLit = smoothstep(0.0, -0.2, sunHeight) * smoothstep(-0.35, -0.15, sunHeight);
      cloudColor = mix(cloudColor, vec3(1.0, 0.7, 0.4), goldenLit * 0.3);

      float cloudFade = smoothstep(0.0, 0.12, dir.y);
      color = mix(color, cloudColor, clouds * cloudFade * 0.7);
    }

    // ── Atmospheric haze ──
    float hazeFactor = smoothstep(0.4, -0.1, vSkyHeight) * hazeIntensity;
    color = mix(color, hazeColor, hazeFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export class EnhancedSky {
  constructor({ parent, radius = 148 }) {
    this.geometry = new THREE.SphereGeometry(radius, 32, 16)
    this.material = new THREE.ShaderMaterial({
      name: 'EnhancedSky',
      uniforms: {
        topColor: { value: new THREE.Color(0x4A6580) },
        horizonColor: { value: new THREE.Color(0x8A9BB0) },
        sunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
        sunIntensity: { value: 1.0 },
        moonDirection: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
        moonColor: { value: new THREE.Color(0xaabbdd) },
        moonIntensity: { value: 0.0 },
        starVisibility: { value: 0.0 },
        cloudDensity: { value: 0.5 },
        cloudSpeed: { value: 1.0 },
        hazeIntensity: { value: 0.25 },
        hazeColor: { value: new THREE.Color(0xC8B89A) }, // Warm Hanoi haze
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

  /**
   * Called by DayNightCycle to blend sky colors per phase.
   */
  setTransition(fromTop, toTop, fromHorizon, toHorizon, amount) {
    const u = this.material.uniforms
    u.topColor.value.lerpColors(fromTop, toTop, amount)
    u.horizonColor.value.lerpColors(fromHorizon, toHorizon, amount)
  }

  /**
   * Update sun/moon/stars/clouds based on game hour (0-24).
   */
  updateCelestials(gameHour, delta) {
    this._elapsed += delta
    const u = this.material.uniforms

    // Sun orbit: rises at 6, peaks at 12, sets at 18
    const sunAngle = ((gameHour - 6) / 12) * Math.PI
    const sunY = Math.sin(sunAngle)
    const sunZ = Math.cos(sunAngle)
    u.sunDirection.value.set(0.2, Math.max(-0.1, sunY), sunZ).normalize()

    // Sun intensity and color — warm golden in Hanoi
    const sunHeight = sunY
    u.sunIntensity.value = smoothstep(-0.1, 0.2, sunHeight)
    u.sunColor.value.setHSL(
      0.07 + (1 - sunHeight) * 0.06,  // Hue: golden → orange at sunset
      0.65 + (1 - sunHeight) * 0.25,   // More saturated at sunset
      0.88 - (1 - sunHeight) * 0.3,    // Dimmer at sunset
    )

    // Moon
    const moonAngle = ((gameHour - 18) / 12) * Math.PI
    const moonY = Math.sin(moonAngle)
    const moonZ = Math.cos(moonAngle)
    u.moonDirection.value.set(-0.15, Math.max(-0.1, moonY), -moonZ).normalize()
    u.moonIntensity.value = smoothstep(-0.05, 0.15, moonY) *
      (gameHour > 18 || gameHour < 6 ? 1 : 0)

    // Stars
    u.starVisibility.value =
      smoothstep(0.1, -0.15, sunHeight) * smoothstep(20, 19, gameHour) +
      smoothstep(0.1, -0.15, sunHeight) * smoothstep(5, 6, gameHour)

    // Cloud density — Hanoi can be quite cloudy
    u.cloudDensity.value = 0.48 + Math.sin(gameHour * 0.4) * 0.18

    // Haze — thicker during day (humidity), thinner at night
    const dayFactor = smoothstep(6, 10, gameHour) * (1 - smoothstep(16, 19, gameHour))
    u.hazeIntensity.value = 0.15 + dayFactor * 0.2

    // Haze color — warm during day, cool at night
    const isNight = gameHour > 19 || gameHour < 5.5
    if (isNight) {
      u.hazeColor.value.set(0.12, 0.14, 0.2)
    } else {
      const golden = smoothstep(16, 17, gameHour) * (1 - smoothstep(17.5, 18.5, gameHour))
      u.hazeColor.value.set(
        0.78 + golden * 0.2,
        0.72 + golden * 0.1,
        0.58 - golden * 0.1,
      )
    }

    u.time.value = this._elapsed
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
