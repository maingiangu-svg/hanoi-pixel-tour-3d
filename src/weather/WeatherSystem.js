import * as THREE from 'three'

/**
 * WeatherSystem — rain particles, fog density changes, ambient effects.
 *
 * Weather is driven by a probability system that changes each game hour.
 */

export const WEATHER_TYPES = Object.freeze({
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  LIGHT_RAIN: 'lightRain',
  HEAVY_RAIN: 'heavyRain',
  FOGGY: 'foggy',
})

const RAIN_COUNT = 2000
const HEAVY_RAIN_COUNT = 4000

export class WeatherSystem {
  constructor({ scene, playerPosition, clock }) {
    this.scene = scene
    this.playerPosition = playerPosition
    this.clock = clock

    this.currentWeather = WEATHER_TYPES.CLEAR
    this.targetWeather = WEATHER_TYPES.CLEAR
    this.transitionProgress = 1
    this.weatherTimer = 0
    this.weatherDuration = 300 // 5 min default

    // Rain
    this.rainGroup = new THREE.Group()
    this.rainGroup.name = 'Rain'
    this.rainGroup.visible = false
    scene.add(this.rainGroup)

    this.rainGeometry = new THREE.BufferGeometry()
    this.rainPositions = new Float32Array(RAIN_COUNT * 3)
    this.rainVelocities = new Float32Array(RAIN_COUNT)
    this.#initRain()
    this.rainMaterial = new THREE.PointsMaterial({
      color: 0xaabbcc,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })
    this.rainMesh = new THREE.Points(this.rainGeometry, this.rainMaterial)
    this.rainGroup.add(this.rainMesh)

    // Rain sound hint (visual splash)
    this.splashGroup = new THREE.Group()
    this.splashGroup.name = 'RainSplashes'
    scene.add(this.splashGroup)

    // Fog control
    this.baseFogNear = 70
    this.baseFogFar = 145
    this.targetFogNear = 70
    this.targetFogFar = 145

    this._elapsed = 0
  }

  /**
   * Set weather explicitly (for testing or story events).
   */
  setWeather(weather, duration = 300) {
    this.targetWeather = weather
    this.weatherDuration = duration
    this.weatherTimer = 0
    this.transitionProgress = 0
  }

  /**
   * Get current weather state for UI display.
   */
  getState() {
    return {
      weather: this.currentWeather,
      transition: this.transitionProgress,
      icon: this.#getWeatherIcon(),
      label: this.#getWeatherLabel(),
    }
  }

  /**
   * Update weather simulation.
   */
  update(delta, phase) {
    this._elapsed += delta
    this.weatherTimer += delta

    // Auto-transition weather
    if (this.weatherTimer > this.weatherDuration) {
      this.#randomizeWeather(phase)
      this.weatherTimer = 0
    }

    // Smooth transition
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + delta * 0.3)
    }

    // Update rain
    this.#updateRain(delta)

    // Update fog based on weather
    this.#updateFog(delta, phase)

    // Update rain visibility
    const isRaining = this.currentWeather === WEATHER_TYPES.LIGHT_RAIN ||
      this.currentWeather === WEATHER_TYPES.HEAVY_RAIN
    this.rainGroup.visible = isRaining
  }

  /**
   * Sync with DayNightCycle scene fog.
   * Only modifies fog when weather is NOT clear.
   * When clear, lets DayNightCycle control fog entirely.
   */
  applyToScene(scene) {
    if (!scene.fog) return
    if (this.currentWeather === WEATHER_TYPES.CLEAR) return
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, this.targetFogNear, 0.02)
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, this.targetFogFar, 0.02)
  }

  dispose() {
    this.rainGeometry.dispose()
    this.rainMaterial.dispose()
    this.rainGroup.removeFromParent()
    this.splashGroup.removeFromParent()
  }

  // ─── Private ───────────────────────────────────

  #initRain() {
    for (let i = 0; i < RAIN_COUNT; i++) {
      const i3 = i * 3
      this.rainPositions[i3] = (Math.random() - 0.5) * 40
      this.rainPositions[i3 + 1] = Math.random() * 20
      this.rainPositions[i3 + 2] = (Math.random() - 0.5) * 40
      this.rainVelocities[i] = 8 + Math.random() * 4
    }
    this.rainGeometry.setAttribute('position',
      new THREE.BufferAttribute(this.rainPositions, 3)
    )
  }

  #updateRain(delta) {
    if (!this.rainGroup.visible) return

    // Follow player
    this.rainGroup.position.set(
      this.playerPosition.x,
      0,
      this.playerPosition.z,
    )

    const positions = this.rainGeometry.attributes.position.array
    const isHeavy = this.currentWeather === WEATHER_TYPES.HEAVY_RAIN

    for (let i = 0; i < RAIN_COUNT; i++) {
      const i3 = i * 3
      positions[i3 + 1] -= this.rainVelocities[i] * delta

      if (positions[i3 + 1] < 0) {
        positions[i3 + 1] = 15 + Math.random() * 5
        positions[i3] = (Math.random() - 0.5) * 40
        positions[i3 + 2] = (Math.random() - 0.5) * 40
      }
    }

    this.rainGeometry.attributes.position.needsUpdate = true

    // Adjust rain opacity based on intensity
    const intensity = this.currentWeather === WEATHER_TYPES.HEAVY_RAIN ? 0.8 : 0.5
    this.rainMaterial.opacity = intensity * this.transitionProgress
  }

  #updateFog(delta, phase) {
    switch (this.currentWeather) {
      case WEATHER_TYPES.FOGGY:
        this.targetFogNear = 25
        this.targetFogFar = 60
        break
      case WEATHER_TYPES.HEAVY_RAIN:
        this.targetFogNear = 40
        this.targetFogFar = 80
        break
      case WEATHER_TYPES.LIGHT_RAIN:
        this.targetFogNear = 55
        this.targetFogFar = 110
        break
      case WEATHER_TYPES.CLOUDY:
        this.targetFogNear = 60
        this.targetFogFar = 125
        break
      case WEATHER_TYPES.CLEAR:
      default:
        this.targetFogNear = this.baseFogNear
        this.targetFogFar = this.baseFogFar
        break
    }

    // Night fog is denser
    if (phase === 'night' || phase === 'blueHour') {
      this.targetFogNear *= 0.85
      this.targetFogFar *= 0.9
    }
  }

  #randomizeWeather(phase) {
    const roll = Math.random()
    // Weather probabilities vary by time
    if (phase === 'night' || phase === 'blueHour') {
      this.targetWeather = roll < 0.7 ? WEATHER_TYPES.CLEAR
        : roll < 0.85 ? WEATHER_TYPES.CLOUDY
        : roll < 0.95 ? WEATHER_TYPES.FOGGY
        : WEATHER_TYPES.LIGHT_RAIN
    } else if (phase === 'dawn') {
      this.targetWeather = roll < 0.5 ? WEATHER_TYPES.CLEAR
        : roll < 0.75 ? WEATHER_TYPES.FOGGY
        : roll < 0.9 ? WEATHER_TYPES.CLOUDY
        : WEATHER_TYPES.LIGHT_RAIN
    } else {
      this.targetWeather = roll < 0.6 ? WEATHER_TYPES.CLEAR
        : roll < 0.8 ? WEATHER_TYPES.CLOUDY
        : roll < 0.92 ? WEATHER_TYPES.LIGHT_RAIN
        : roll < 0.97 ? WEATHER_TYPES.HEAVY_RAIN
        : WEATHER_TYPES.FOGGY
    }

    this.currentWeather = this.targetWeather
    this.transitionProgress = 0
    this.weatherDuration = 180 + Math.random() * 300 // 3-8 min
  }

  #getWeatherIcon() {
    switch (this.currentWeather) {
      case WEATHER_TYPES.CLEAR: return '☀️'
      case WEATHER_TYPES.CLOUDY: return '☁️'
      case WEATHER_TYPES.LIGHT_RAIN: return '🌧️'
      case WEATHER_TYPES.HEAVY_RAIN: return '⛈️'
      case WEATHER_TYPES.FOGGY: return '🌫️'
      default: return '☀️'
    }
  }

  #getWeatherLabel() {
    switch (this.currentWeather) {
      case WEATHER_TYPES.CLEAR: return 'Trời quang'
      case WEATHER_TYPES.CLOUDY: return 'Nhiều mây'
      case WEATHER_TYPES.LIGHT_RAIN: return 'Mưa nhẹ'
      case WEATHER_TYPES.HEAVY_RAIN: return 'Mưa to'
      case WEATHER_TYPES.FOGGY: return 'Sương mù'
      default: return 'Trời quang'
    }
  }
}
