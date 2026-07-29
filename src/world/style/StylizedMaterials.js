import * as THREE from 'three'
import { HANOI_COLORS } from './HanoiVisualTokens.js'

/**
 * StylizedMaterials — Vietnamese street-life material library.
 *
 * Each material is a MeshStandardMaterial tuned for the "Stylized Realistic"
 * look: warm colors, visible weathering, and character. Materials use
 * procedural noise in the fragment shader to add surface variation without
 * external textures.
 */

// ── Shared procedural weathering shader chunk ──
const WEATHERING_CHUNK = /* glsl */`
  // Procedural noise for surface variation
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
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`

/**
 * Create a weathered plaster material — yellow/cream walls with rain streaks.
 */
export function createWeatheredPlaster(baseColor = HANOI_COLORS.limeYellow) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.94,
    metalness: 0.01,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       ${WEATHERING_CHUNK}
      `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       // Rain streaks — vertical darkening
       vec2 streakUV = vUv * vec2(8.0, 2.0);
       float streak = fbm(streakUV + vec2(0.0, 0.3));
       streak = smoothstep(0.35, 0.65, streak);

       // Bottom dampness
       float dampness = smoothstep(0.4, 0.0, vUv.y) * 0.25;

       // Corner darkening
       float cornerDark = smoothstep(0.5, 0.0, min(vUv.x, 1.0 - vUv.x)) * 0.12;

       // Apply weathering
       gl_FragColor.rgb *= 1.0 - (streak * 0.12 + dampness + cornerDark);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.92, 0.94, 0.96), streak * 0.15);

       #include <dithering_fragment>
      `,
    )
    mat.userData.shader = shader
  }

  return mat
}

/**
 * Create a roof tile material — terracotta with weathering.
 */
export function createRoofTile(baseColor = HANOI_COLORS.terracotta) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.88,
    metalness: 0.03,
  })

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       ${WEATHERING_CHUNK}
      `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       // Tile row pattern
       vec2 tileUV = vUv * vec2(12.0, 6.0);
       float row = step(0.5, fract(tileUV.y));
       float tileShift = row * 0.5;
       float tile = step(0.55, fract(tileUV.x + tileShift));

       // Weathering — moss and darkening at edges
       float weathering = fbm(vUv * 4.0) * 0.18;
       float moss = smoothstep(0.6, 0.8, fbm(vUv * 8.0 + 3.0)) * 0.1;

       gl_FragColor.rgb *= 1.0 - tile * 0.04 - weathering - moss;
       gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.35, 0.45, 0.3), moss * 0.5);

       #include <dithering_fragment>
      `,
    )
    mat.userData.shader = shader
  }

  return mat
}

/**
 * Create an aged wood material — shutters, doors.
 */
export function createAgedWood(baseColor = 0x5A4230) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.82,
    metalness: 0.02,
  })

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       ${WEATHERING_CHUNK}
      `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       // Wood grain
       float grain = noise(vUv * vec2(2.0, 16.0)) * 0.08;

       // Paint peeling
       float peel = smoothstep(0.55, 0.7, fbm(vUv * 6.0)) * 0.15;

       gl_FragColor.rgb += grain - 0.04;
       gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.7, 0.6, 0.5), peel);

       #include <dithering_fragment>
      `,
    )
    mat.userData.shader = shader
  }

  return mat
}

/**
 * Create wet asphalt material — roads after rain.
 */
export function createWetAsphalt() {
  return new THREE.MeshStandardMaterial({
    color: HANOI_COLORS.wetAsphalt,
    roughness: 0.55,
    metalness: 0.08,
  })
}

/**
 * Create concrete sidewalk material.
 */
export function createSidewalk() {
  const mat = new THREE.MeshStandardMaterial({
    color: HANOI_COLORS.concreteGray,
    roughness: 0.9,
    metalness: 0.02,
  })

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       ${WEATHERING_CHUNK}
      `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       // Tile pattern for sidewalk
       vec2 pavingUV = vUv * 16.0;
       float pavingLine = smoothstep(0.48, 0.5, fract(pavingUV.x)) + smoothstep(0.48, 0.5, fract(pavingUV.y));
       pavingLine = min(pavingLine, 1.0);

       // Stain and dirt
       float stain = fbm(vUv * 5.0 + 7.0) * 0.1;

       gl_FragColor.rgb -= pavingLine * 0.04 + stain;

       #include <dithering_fragment>
      `,
    )
    mat.userData.shader = shader
  }

  return mat
}

/**
 * Create glass with warm reflection — shop windows.
 */
export function createShopGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x6B8A9E,
    roughness: 0.18,
    metalness: 0.12,
    transparent: true,
    opacity: 0.72,
    emissive: 0xF5BE58,
    emissiveIntensity: 0.08,
  })
}

/**
 * Create lantern material — glowing paper lantern.
 */
export function createLanternMaterial(color = HANOI_COLORS.lanternRed) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.88,
    roughness: 0.4,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })
}

/**
 * Create metal railing material — iron with rust.
 */
export function createIronRailing() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3A3A3A,
    roughness: 0.52,
    metalness: 0.55,
  })

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       ${WEATHERING_CHUNK}
      `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       // Rust patches
       float rust = smoothstep(0.6, 0.8, fbm(vUv * 10.0)) * 0.2;
       gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.45, 0.25, 0.12), rust);

       #include <dithering_fragment>
      `,
    )
    mat.userData.shader = shader
  }

  return mat
}

/**
 * Material cache — reuse materials across the scene.
 */
export class MaterialLibrary {
  constructor() {
    this._cache = new Map()
  }

  get(key, factory) {
    if (!this._cache.has(key)) {
      this._cache.set(key, factory())
    }
    return this._cache.get(key)
  }

  weatheredPlaster(color) {
    return this.get(`plaster-${color}`, () => createWeatheredPlaster(color))
  }

  roofTile(color) {
    return this.get(`roof-${color}`, () => createRoofTile(color))
  }

  agedWood(color) {
    return this.get(`wood-${color}`, () => createAgedWood(color))
  }

  wetAsphalt() {
    return this.get('asphalt-wet', createWetAsphalt)
  }

  sidewalk() {
    return this.get('sidewalk', createSidewalk)
  }

  shopGlass() {
    return this.get('shop-glass', createShopGlass)
  }

  lantern(color) {
    return this.get(`lantern-${color}`, () => createLanternMaterial(color))
  }

  ironRailing() {
    return this.get('iron-railing', createIronRailing)
  }

  dispose() {
    for (const mat of this._cache.values()) {
      mat.dispose()
    }
    this._cache.clear()
  }
}
