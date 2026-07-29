import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * PostProcessing — Dramatic Stylized Realistic cinematic pipeline.
 *
 * Strong bloom, warm color grading, thick vignette, film grain,
 * and atmospheric haze. Creates the "golden hour in Hanoi" look.
 */

const VietnameseCinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    // Shadows/midtones/highlights
    shadows: { value: new THREE.Vector3(0.02, 0.01, -0.03) },
    midtones: { value: new THREE.Vector3(0.06, 0.03, -0.02) },
    highlights: { value: new THREE.Vector3(0.08, 0.05, -0.01) },
    // Global
    brightness: { value: 0.03 },
    contrast: { value: 1.15 },
    saturation: { value: 1.22 },
    warmth: { value: 0.08 },
    // Vignette
    vignetteStrength: { value: 0.45 },
    vignetteRadius: { value: 0.5 },
    // Film grain
    filmGrain: { value: 0.03 },
    // Atmospheric haze
    hazeDensity: { value: 0.12 },
    hazeColor: { value: new THREE.Vector3(0.82, 0.75, 0.6) },
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
    uniform float hazeDensity;
    uniform vec3 hazeColor;
    uniform float time;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 colorGrade(vec3 color) {
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      // Shadow lift — cool blue
      float shadowMask = 1.0 - smoothstep(0.0, 0.38, luma);
      color += shadows * shadowMask;
      // Midtone push — warm golden
      float midMask = smoothstep(0.0, 0.28, luma) * (1.0 - smoothstep(0.55, 0.82, luma));
      color += midtones * midMask;
      // Highlight — golden
      float highMask = smoothstep(0.5, 1.0, luma);
      color += highlights * highMask;
      return color;
    }

    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;

      // Brightness
      color += brightness;

      // Contrast
      color = (color - 0.5) * contrast + 0.5;

      // Saturation
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);

      // Warmth — push golden
      color.r += warmth * 0.8;
      color.g += warmth * 0.35;
      color.b -= warmth * 0.2;

      // Color grading
      color = colorGrade(color);

      // Atmospheric haze — uniform (no depth buffer needed)
      color = mix(color, hazeColor, hazeDensity);

      // Vignette — oval
      vec2 center = vUv - 0.5;
      float dist = length(center / vec2(vignetteRadius, vignetteRadius * 0.82));
      float vignette = 1.0 - smoothstep(0.5, 1.3, dist) * vignetteStrength;
      color *= vignette;

      // Film grain
      float grain = hash(vUv * 900.0 + time * 6.0) * filmGrain;
      color += grain - filmGrain * 0.5;

      // Subtle chromatic aberration at edges
      float caStrength = 0.002;
      vec2 caOffset = center * caStrength;
      float caR = texture2D(tDiffuse, vUv + caOffset).r;
      float caB = texture2D(tDiffuse, vUv - caOffset).b;
      color.r = mix(color.r, caR, 0.35);
      color.b = mix(color.b, caB, 0.35);

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

    renderer.toneMapping = THREE.NoToneMapping

    this.composer = new EffectComposer(renderer)
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(size.x, size.y)

    // Render pass
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // Bloom — STRONG glow on all lights
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.85,  // strength — strong
      0.9,   // radius — wide
      0.5,   // threshold — catch most lights
    )
    this.composer.addPass(this.bloomPass)

    // Output pass
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)

    // Vietnamese cinematic color grading
    this.colorGradingPass = new ShaderPass(VietnameseCinematicShader)
    this.composer.addPass(this.colorGradingPass)
  }

  updatePhase(phase) {
    if (!this.enabled) return
    const cg = this.colorGradingPass.uniforms

    switch (phase) {
      case 'night':
        this.bloomPass.strength = 0.95
        this.bloomPass.threshold = 0.4
        cg.vignetteStrength.value = 0.55
        cg.warmth.value = 0.02
        cg.saturation.value = 0.88
        cg.contrast.value = 1.2
        cg.shadows.value.set(-0.02, -0.02, 0.05)
        cg.midtones.value.set(0.04, 0.02, -0.03)
        cg.highlights.value.set(0.06, 0.04, 0.0)
        cg.hazeDensity.value = 0.06
        cg.hazeColor.value.set(0.1, 0.1, 0.15)
        break
      case 'blueHour':
        this.bloomPass.strength = 0.8
        this.bloomPass.threshold = 0.45
        cg.vignetteStrength.value = 0.45
        cg.warmth.value = 0.0
        cg.saturation.value = 1.0
        cg.contrast.value = 1.15
        cg.shadows.value.set(-0.01, 0.0, 0.04)
        cg.midtones.value.set(0.03, 0.02, 0.03)
        cg.highlights.value.set(0.04, 0.03, 0.05)
        cg.hazeDensity.value = 0.08
        cg.hazeColor.value.set(0.25, 0.3, 0.45)
        break
      case 'sunset':
        this.bloomPass.strength = 0.75
        this.bloomPass.threshold = 0.5
        cg.vignetteStrength.value = 0.4
        cg.warmth.value = 0.1
        cg.saturation.value = 1.25
        cg.contrast.value = 1.12
        cg.shadows.value.set(0.03, 0.0, -0.03)
        cg.midtones.value.set(0.08, 0.04, -0.02)
        cg.highlights.value.set(0.1, 0.06, -0.03)
        cg.hazeDensity.value = 0.1
        cg.hazeColor.value.set(0.85, 0.55, 0.25)
        break
      case 'goldenHour':
        this.bloomPass.strength = 0.7
        this.bloomPass.threshold = 0.55
        cg.vignetteStrength.value = 0.38
        cg.warmth.value = 0.12
        cg.saturation.value = 1.3
        cg.contrast.value = 1.1
        cg.shadows.value.set(0.04, 0.02, -0.04)
        cg.midtones.value.set(0.1, 0.05, -0.03)
        cg.highlights.value.set(0.12, 0.08, -0.02)
        cg.hazeDensity.value = 0.08
        cg.hazeColor.value.set(0.95, 0.75, 0.45)
        break
      case 'dawn':
        this.bloomPass.strength = 0.55
        this.bloomPass.threshold = 0.6
        cg.vignetteStrength.value = 0.35
        cg.warmth.value = 0.05
        cg.saturation.value = 1.12
        cg.contrast.value = 1.08
        cg.shadows.value.set(0.0, 0.0, 0.03)
        cg.midtones.value.set(0.04, 0.03, 0.01)
        cg.highlights.value.set(0.06, 0.05, 0.02)
        cg.hazeDensity.value = 0.15
        cg.hazeColor.value.set(0.65, 0.65, 0.7)
        break
      case 'day':
      default:
        this.bloomPass.strength = 0.5
        this.bloomPass.threshold = 0.65
        cg.vignetteStrength.value = 0.35
        cg.warmth.value = 0.08
        cg.saturation.value = 1.22
        cg.contrast.value = 1.15
        cg.shadows.value.set(0.02, 0.01, -0.03)
        cg.midtones.value.set(0.06, 0.03, -0.02)
        cg.highlights.value.set(0.08, 0.05, -0.01)
        cg.hazeDensity.value = 0.12
        cg.hazeColor.value.set(0.82, 0.75, 0.6)
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
