import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * PostProcessing — Stylized Realistic cinematic pipeline.
 *
 * Pipeline:
 *   RenderPass → Bloom → Output → Vietnamese Color Grading → Vignette + Film Grain
 *
 * The color grading adds warm golden tones characteristic of Hanoi,
 * with enhanced contrast and subtle desaturation in shadows for depth.
 */

// ── Vietnamese Color Grading Shader ──
const VietnameseColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    // Color grading
    shadows: { value: new THREE.Vector3(0.02, 0.01, -0.02) },   // Cool blue shadows
    midtones: { value: new THREE.Vector3(0.04, 0.02, -0.01) },  // Warm golden midtones
    highlights: { value: new THREE.Vector3(0.06, 0.04, 0.0) },  // Golden highlights
    // Global
    brightness: { value: 0.02 },
    contrast: { value: 1.12 },
    saturation: { value: 1.18 },
    warmth: { value: 0.06 },
    // Vignette
    vignetteStrength: { value: 0.38 },
    vignetteRadius: { value: 0.55 },
    // Film grain
    filmGrain: { value: 0.025 },
    // Atmospheric
    atmosphericDensity: { value: 0.0 },
    atmosphericColor: { value: new THREE.Vector3(0.85, 0.78, 0.65) },
    // Time
    time: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 shadows;
    uniform vec3 midtones;
    uniform vec3 highlights;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float warmth;
    uniform float vignetteStrength;
    uniform float vignetteRadius;
    uniform float filmGrain;
    uniform float atmosphericDensity;
    uniform vec3 atmosphericColor;
    uniform float time;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 colorGrade(vec3 color) {
      // Luminance for shadow/mid/high split
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

      // Shadow lift
      float shadowMask = 1.0 - smoothstep(0.0, 0.35, luma);
      color += shadows * shadowMask;

      // Midtone tint
      float midMask = smoothstep(0.0, 0.25, luma) * (1.0 - smoothstep(0.6, 0.85, luma));
      color += midtones * midMask;

      // Highlight push
      float highMask = smoothstep(0.55, 1.0, luma);
      color += highlights * highMask;

      return color;
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 color = tex.rgb;

      // Brightness
      color += brightness;

      // Contrast (around mid-gray)
      color = (color - 0.5) * contrast + 0.5;

      // Saturation
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);

      // Warmth — push toward golden
      color.r += warmth * 0.7;
      color.g += warmth * 0.35;
      color.b -= warmth * 0.15;

      // Color grading (shadow/mid/high)
      color = colorGrade(color);

      // Atmospheric haze — distance-based
      if (atmosphericDensity > 0.01) {
        float depth = tex.a; // We'll use alpha channel for depth if available
        float haze = atmosphericDensity * 0.3;
        color = mix(color, atmosphericColor, haze);
      }

      // Vignette — smooth oval
      vec2 center = vUv - 0.5;
      float dist = length(center / vec2(vignetteRadius, vignetteRadius * 0.85));
      float vignette = 1.0 - smoothstep(0.6, 1.4, dist) * vignetteStrength;
      color *= vignette;

      // Film grain — organic noise
      float grain = hash(vUv * 800.0 + time * 7.0) * filmGrain;
      color += grain - filmGrain * 0.5;

      // Subtle chromatic aberration at edges (very subtle)
      float caStrength = 0.0015;
      vec2 caOffset = center * caStrength;
      float caR = texture2D(tDiffuse, vUv + caOffset).r;
      float caB = texture2D(tDiffuse, vUv - caOffset).b;
      color.r = mix(color.r, caR, 0.3);
      color.b = mix(color.b, caB, 0.3);

      // Clamp
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer
    this.enabled = true
    this._elapsed = 0

    const size = renderer.getSize(new THREE.Vector2())
    const pixelRatio = renderer.getPixelRatio()

    // Disable renderer tone mapping — OutputPass handles it
    renderer.toneMapping = THREE.NoToneMapping

    this.composer = new EffectComposer(renderer)
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(size.x, size.y)

    // Render pass
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // Bloom — makes emissive lights (lamps, lanterns, signs) glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.4,   // strength — slightly stronger than before
      0.6,   // radius — wider bloom
      0.75,  // threshold — catch more light sources
    )
    this.composer.addPass(this.bloomPass)

    // Output pass (handles color space + tone mapping)
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)

    // Vietnamese color grading + vignette + film grain
    this.colorGradingPass = new ShaderPass(VietnameseColorGradingShader)
    this.composer.addPass(this.colorGradingPass)
  }

  /**
   * Adjust post-processing based on lighting phase.
   * Vietnamese atmosphere: golden warmth by day, lantern glow at night.
   */
  updatePhase(phase) {
    if (!this.enabled) return

    const cg = this.colorGradingPass.uniforms

    switch (phase) {
      case 'night':
        this.bloomPass.strength = 0.65
        this.bloomPass.threshold = 0.55
        cg.vignetteStrength.value = 0.45
        cg.warmth.value = 0.02
        cg.saturation.value = 0.95
        cg.contrast.value = 1.15
        cg.shadows.value.set(-0.01, -0.01, 0.04)   // Cool blue shadows
        cg.midtones.value.set(0.03, 0.01, -0.02)    // Warm streetlight
        cg.highlights.value.set(0.05, 0.03, 0.0)     // Golden highlights
        cg.atmosphericDensity.value = 0.08
        cg.atmosphericColor.value.set(0.15, 0.12, 0.2)  // Night haze
        break

      case 'blueHour':
        this.bloomPass.strength = 0.55
        this.bloomPass.threshold = 0.6
        cg.vignetteStrength.value = 0.38
        cg.warmth.value = 0.0
        cg.saturation.value = 1.05
        cg.contrast.value = 1.12
        cg.shadows.value.set(-0.01, 0.0, 0.03)
        cg.midtones.value.set(0.02, 0.01, 0.02)
        cg.highlights.value.set(0.03, 0.02, 0.04)
        cg.atmosphericDensity.value = 0.05
        cg.atmosphericColor.value.set(0.3, 0.35, 0.5)  // Blue hour haze
        break

      case 'sunset':
        this.bloomPass.strength = 0.5
        this.bloomPass.threshold = 0.65
        cg.vignetteStrength.value = 0.35
        cg.warmth.value = 0.08
        cg.saturation.value = 1.2
        cg.contrast.value = 1.1
        cg.shadows.value.set(0.02, 0.0, -0.02)
        cg.midtones.value.set(0.06, 0.03, -0.01)
        cg.highlights.value.set(0.08, 0.04, -0.02)
        cg.atmosphericDensity.value = 0.04
        cg.atmosphericColor.value.set(0.9, 0.6, 0.3)  // Sunset glow
        break

      case 'goldenHour':
        this.bloomPass.strength = 0.48
        this.bloomPass.threshold = 0.68
        cg.vignetteStrength.value = 0.32
        cg.warmth.value = 0.1
        cg.saturation.value = 1.25
        cg.contrast.value = 1.08
        cg.shadows.value.set(0.03, 0.01, -0.03)
        cg.midtones.value.set(0.08, 0.04, -0.02)
        cg.highlights.value.set(0.1, 0.06, -0.01)
        cg.atmosphericDensity.value = 0.03
        cg.atmosphericColor.value.set(1.0, 0.8, 0.5)  // Golden haze
        break

      case 'dawn':
        this.bloomPass.strength = 0.35
        this.bloomPass.threshold = 0.72
        cg.vignetteStrength.value = 0.28
        cg.warmth.value = 0.04
        cg.saturation.value = 1.1
        cg.contrast.value = 1.06
        cg.shadows.value.set(0.0, 0.0, 0.02)
        cg.midtones.value.set(0.03, 0.02, 0.01)
        cg.highlights.value.set(0.05, 0.04, 0.02)
        cg.atmosphericDensity.value = 0.06
        cg.atmosphericColor.value.set(0.7, 0.7, 0.75)  // Morning mist
        break

      case 'day':
      default:
        this.bloomPass.strength = 0.28
        this.bloomPass.threshold = 0.78
        cg.vignetteStrength.value = 0.3
        cg.warmth.value = 0.06
        cg.saturation.value = 1.18
        cg.contrast.value = 1.12
        cg.shadows.value.set(0.02, 0.01, -0.02)
        cg.midtones.value.set(0.04, 0.02, -0.01)
        cg.highlights.value.set(0.06, 0.04, 0.0)
        cg.atmosphericDensity.value = 0.02
        cg.atmosphericColor.value.set(0.85, 0.78, 0.65)  // Hazy Hanoi day
        break
    }
  }

  render(delta) {
    if (!this.enabled) {
      this.renderer.render(this.renderPass.scene, this.renderPass.camera)
      return
    }
    this._elapsed += delta
    this.colorGradingPass.uniforms.time.value = this._elapsed
    this.composer.render()
  }

  handleResize(width, height) {
    this.composer.setSize(width, height)
  }

  dispose() {
    this.composer.dispose()
  }
}
