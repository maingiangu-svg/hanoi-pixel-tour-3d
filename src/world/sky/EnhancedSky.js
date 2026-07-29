import * as THREE from 'three'

/**
 * EnhancedSky — gradient sky dome with animated sun disc, moon, stars,
 * and procedural clouds.  Replaces GradientSky while keeping the same
 * DayNightCycle integration via setTransition().
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
  uniform float time;

  varying vec3 vWorldPosition;
  varying float vSkyHeight;

  // Simple hash for procedural effects
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
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  // Stars
  float stars(vec3 dir) {
    vec3 p = dir * 300.0;
    vec2 uv = floor(vec2(atan(p.x, p.z) * 3.0, asin(dir.y) * 6.0));
    float h = hash(uv);
    float star = step(0.997, h);
    float twinkle = sin(time * 2.0 + h * 100.0) * 0.5 + 0.5;
    return star * twinkle * smoothstep(0.0, 0.3, dir.y);
  }

  // Clouds
  float cloudLayer(vec2 uv, float speed, float scale) {
    uv += vec2(speed * time, speed * 0.5 * time);
    return fbm(uv * scale);
  }

  void main() {
    vec3 dir = normalize(vWorldPosition - cameraPosition);

    // Base gradient
    float gradient = smoothstep(-0.18, 0.72, vSkyHeight);
    float horizonHaze = 1.0 - smoothstep(-0.08, 0.2, abs(vSkyHeight));
    vec3 color = mix(horizonColor, topColor, gradient);
    color = mix(color, horizonColor * 1.04, horizonHaze * 0.24);

    // Sun disc + glow
    float sunDot = dot(dir, sunDirection);
    float sunDisc = smoothstep(0.9985, 0.9995, sunDot);
    float sunGlow = pow(max(0.0, sunDot), 32.0) * 0.6;
    float sunHalo = pow(max(0.0, sunDot), 8.0) * 0.2;
    color += sunColor * (sunDisc * sunIntensity * 3.0 + sunGlow * sunIntensity + sunHalo * sunIntensity * 0.5);

    // Moon
    float moonDot = dot(dir, moonDirection);
    float moonDisc = smoothstep(0.9990, 0.9997, moonDot);
    float moonGlow = pow(max(0.0, moonDot), 64.0) * 0.15;
    color += moonColor * (moonDisc * moonIntensity * 2.0 + moonGlow * moonIntensity);

    // Stars
    float s = stars(dir);
    color += vec3(0.9, 0.92, 1.0) * s * starVisibility;

    // Clouds
    if (dir.y > 0.0) {
      vec2 cloudUV = dir.xz / (dir.y + 0.1);
      float cloud1 = cloudLayer(cloudUV, 0.008, 1.8);
      float cloud2 = cloudLayer(cloudUV + 5.0, 0.012, 3.2);
      float clouds = smoothstep(0.45 - cloudDensity * 0.2, 0.65 - cloudDensity * 0.15, cloud1);
      clouds += smoothstep(0.5 - cloudDensity * 0.15, 0.7 - cloudDensity * 0.1, cloud2) * 0.5;
      clouds = clamp(clouds, 0.0, 1.0);

      // Cloud color based on sun position
      float sunHeight = sunDirection.y;
      vec3 cloudColor = mix(
        vec3(0.85, 0.6, 0.4),   // sunset clouds
        vec3(1.0, 1.0, 1.0),     // day clouds
        smoothstep(-0.1, 0.3, sunHeight)
      );
      cloudColor = mix(
        vec3(0.2, 0.25, 0.35),   // night clouds
        cloudColor,
        smoothstep(-0.15, 0.1, sunHeight)
      );

      float cloudFade = smoothstep(0.0, 0.15, dir.y);
      color = mix(color, cloudColor, clouds * cloudFade * 0.65);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export class EnhancedSky {
  constructor({ parent, radius = 142 }) {
    this.geometry = new THREE.SphereGeometry(radius, 32, 16)
    this.material = new THREE.ShaderMaterial({
      name: 'EnhancedSky',
      uniforms: {
        topColor: { value: new THREE.Color(0x40516b) },
        horizonColor: { value: new THREE.Color(0x718295) },
        sunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
        sunIntensity: { value: 1.0 },
        moonDirection: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
        moonColor: { value: new THREE.Color(0xaabbdd) },
        moonIntensity: { value: 0.0 },
        starVisibility: { value: 0.0 },
        cloudDensity: { value: 0.5 },
        cloudSpeed: { value: 1.0 },
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
   * We also drive sun/moon/stars/clouds from the phase info.
   */
  setTransition(fromTop, toTop, fromHorizon, toHorizon, amount) {
    const u = this.material.uniforms
    u.topColor.value.lerpColors(fromTop, toTop, amount)
    u.horizonColor.value.lerpColors(fromHorizon, toHorizon, amount)
  }

  /**
   * Update sun/moon/stars based on game hour (0-24).
   */
  updateCelestials(gameHour, delta) {
    this._elapsed += delta
    const u = this.material.uniforms

    // Sun orbit: rises at 6, peaks at 12, sets at 18
    const sunAngle = ((gameHour - 6) / 12) * Math.PI
    const sunY = Math.sin(sunAngle)
    const sunZ = Math.cos(sunAngle)
    u.sunDirection.value.set(0.2, Math.max(-0.1, sunY), sunZ).normalize()

    // Sun intensity: bright during day, dim at dawn/dusk, off at night
    const sunHeight = sunY
    u.sunIntensity.value = smoothstep(-0.1, 0.2, sunHeight)
    u.sunColor.value.setHSL(
      0.08 + (1 - sunHeight) * 0.05,  // hue shifts red at sunset
      0.6 + (1 - sunHeight) * 0.3,     // more saturated at sunset
      0.85 - (1 - sunHeight) * 0.25,   // dimmer at sunset
    )

    // Moon: opposite of sun
    const moonAngle = ((gameHour - 18) / 12) * Math.PI
    const moonY = Math.sin(moonAngle)
    const moonZ = Math.cos(moonAngle)
    u.moonDirection.value.set(-0.15, Math.max(-0.1, moonY), -moonZ).normalize()
    u.moonIntensity.value = smoothstep(-0.05, 0.15, moonY) * (gameHour > 18 || gameHour < 6 ? 1 : 0)

    // Stars: visible at night, fade at dawn/dusk
    u.starVisibility.value = smoothstep(0.1, -0.15, sunHeight) * smoothstep(20, 19, gameHour) +
      smoothstep(0.1, -0.15, sunHeight) * smoothstep(5, 6, gameHour)

    // Cloud density varies by time
    u.cloudDensity.value = 0.45 + Math.sin(gameHour * 0.5) * 0.15
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

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
