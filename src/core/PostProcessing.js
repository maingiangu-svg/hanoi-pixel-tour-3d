import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * PostProcessing — adds bloom, vignette, and color grading to the renderer.
 *
 * The bloom makes emissive lights (lamps, signs, shop fronts) glow naturally.
 * The color grading adds subtle filmic warmth and contrast.
 * The vignette darkens edges for a cinematic feel.
 */

// Custom color grading shader
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.02 },
    contrast: { value: 1.08 },
    saturation: { value: 1.12 },
    vignetteStrength: { value: 0.35 },
    warmth: { value: 0.04 },
    filmGrain: { value: 0.03 },
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
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float vignetteStrength;
    uniform float warmth;
    uniform float filmGrain;
    uniform float time;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      color.rgb += brightness;

      // Contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;

      // Saturation
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, saturation);

      // Warmth (subtle orange shift)
      color.r += warmth * 0.6;
      color.g += warmth * 0.25;
      color.b -= warmth * 0.15;

      // Vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(0.4, 0.9, dist) * vignetteStrength;
      color.rgb *= vignette;

      // Subtle film grain
      float grain = hash(vUv * 1000.0 + time * 10.0) * filmGrain;
      color.rgb += grain - filmGrain * 0.5;

      // Clamp
      color.rgb = clamp(color.rgb, 0.0, 1.0);

      gl_FragColor = color;
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

    this.composer = new EffectComposer(renderer)
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(size.x, size.y)

    // Render pass
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // Bloom — makes emissive lights glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.4,   // strength — subtle, not overwhelming
      0.6,   // radius
      0.7,   // threshold — only bright things bloom
    )
    this.composer.addPass(this.bloomPass)

    // Color grading + vignette
    this.colorGradingPass = new ShaderPass(ColorGradingShader)
    this.composer.addPass(this.colorGradingPass)

    // Output pass (handles color space)
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)
  }

  /**
   * Adjust bloom/color grading based on lighting phase.
   */
  updatePhase(phase, gameHour) {
    if (!this.enabled) return

    // Bloom varies by time of day
    switch (phase) {
      case 'night':
        this.bloomPass.strength = 0.7
        this.bloomPass.threshold = 0.5
        this.colorGradingPass.uniforms.brightness.value = -0.02
        this.colorGradingPass.uniforms.contrast.value = 1.12
        this.colorGradingPass.uniforms.saturation.value = 0.95
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.45
        this.colorGradingPass.uniforms.warmth.value = -0.02
        break
      case 'blueHour':
        this.bloomPass.strength = 0.55
        this.bloomPass.threshold = 0.55
        this.colorGradingPass.uniforms.brightness.value = -0.01
        this.colorGradingPass.uniforms.contrast.value = 1.1
        this.colorGradingPass.uniforms.saturation.value = 1.05
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.4
        this.colorGradingPass.uniforms.warmth.value = -0.01
        break
      case 'sunset':
        this.bloomPass.strength = 0.5
        this.bloomPass.threshold = 0.6
        this.colorGradingPass.uniforms.brightness.value = 0.01
        this.colorGradingPass.uniforms.contrast.value = 1.08
        this.colorGradingPass.uniforms.saturation.value = 1.15
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.35
        this.colorGradingPass.uniforms.warmth.value = 0.06
        break
      case 'goldenHour':
        this.bloomPass.strength = 0.45
        this.bloomPass.threshold = 0.6
        this.colorGradingPass.uniforms.brightness.value = 0.02
        this.colorGradingPass.uniforms.contrast.value = 1.06
        this.colorGradingPass.uniforms.saturation.value = 1.18
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.3
        this.colorGradingPass.uniforms.warmth.value = 0.08
        break
      case 'dawn':
        this.bloomPass.strength = 0.35
        this.bloomPass.threshold = 0.65
        this.colorGradingPass.uniforms.brightness.value = 0.01
        this.colorGradingPass.uniforms.contrast.value = 1.05
        this.colorGradingPass.uniforms.saturation.value = 1.08
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.3
        this.colorGradingPass.uniforms.warmth.value = 0.04
        break
      case 'day':
      default:
        this.bloomPass.strength = 0.3
        this.bloomPass.threshold = 0.75
        this.colorGradingPass.uniforms.brightness.value = 0.02
        this.colorGradingPass.uniforms.contrast.value = 1.08
        this.colorGradingPass.uniforms.saturation.value = 1.12
        this.colorGradingPass.uniforms.vignetteStrength.value = 0.35
        this.colorGradingPass.uniforms.warmth.value = 0.04
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
