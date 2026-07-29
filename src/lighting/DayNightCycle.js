import * as THREE from 'three'
import { HANOI_COLORS } from '../world/style/HanoiVisualTokens.js'

export const DAY_NIGHT_AREAS = Object.freeze([
  'outdoor',
  'baDinh',
  'longBien',
  'interior',
])

const GAME_MINUTES_PER_DAY = 24 * 60
export const LIGHTING_PHASES = Object.freeze([
  'dawn',
  'day',
  'goldenHour',
  'sunset',
  'blueHour',
  'night',
])

const KEYFRAMES = Object.freeze([
  Object.freeze({ hour: 0, phase: 'night' }),
  Object.freeze({ hour: 5.25, phase: 'night' }),
  Object.freeze({ hour: 5.5, phase: 'dawn' }),
  Object.freeze({ hour: 6.25, phase: 'dawn' }),
  Object.freeze({ hour: 6.75, phase: 'day' }),
  Object.freeze({ hour: 16.25, phase: 'day' }),
  Object.freeze({ hour: 16.75, phase: 'goldenHour' }),
  Object.freeze({ hour: 17.25, phase: 'goldenHour' }),
  Object.freeze({ hour: 17.5, phase: 'sunset' }),
  Object.freeze({ hour: 18, phase: 'sunset' }),
  Object.freeze({ hour: 18.25, phase: 'blueHour' }),
  Object.freeze({ hour: 18.75, phase: 'blueHour' }),
  Object.freeze({ hour: 19, phase: 'night' }),
  Object.freeze({ hour: 24, phase: 'night' }),
])

const PHASE_WINDOWS = Object.freeze([
  Object.freeze({ start: 5.25, end: 6.5, phase: 'dawn' }),
  Object.freeze({ start: 6.5, end: 16.25, phase: 'day' }),
  Object.freeze({ start: 16.25, end: 17.25, phase: 'goldenHour' }),
  Object.freeze({ start: 17.25, end: 18, phase: 'sunset' }),
  Object.freeze({ start: 18, end: 19, phase: 'blueHour' }),
])

const PHASE_QUALITY = Object.freeze({
  dawn: 0.82,
  day: 0.76,
  goldenHour: 0.98,
  sunset: 0.91,
  blueHour: 0.88,
  night: 0.7,
})

const PRACTICAL_ROLE_MULTIPLIERS = Object.freeze({
  dawn: Object.freeze({
    street: 0.55, shop: 0.7, tower: 0.72, temple: 0.7, church: 0.68, interior: 1,
  }),
  day: Object.freeze({
    street: 0, shop: 0.12, tower: 0, temple: 0, church: 0, interior: 1,
  }),
  goldenHour: Object.freeze({
    street: 0.28, shop: 0.82, tower: 0.35, temple: 0.42, church: 0.42, interior: 1,
  }),
  sunset: Object.freeze({
    street: 0.68, shop: 0.96, tower: 0.78, temple: 0.84, church: 0.9, interior: 1,
  }),
  blueHour: Object.freeze({
    street: 0.92, shop: 1, tower: 1.08, temple: 1.04, church: 1.12, interior: 1,
  }),
  night: Object.freeze({
    street: 0.82, shop: 0.9, tower: 1.15, temple: 1.06, church: 1.18, interior: 1,
  }),
})

function state({
  sky,
  fog,
  ambient,
  ambientIntensity,
  hemisphereSky,
  hemisphereGround,
  hemisphereIntensity,
  directional,
  directionalIntensity,
  rim,
  rimIntensity,
  practicalScale,
  emissiveScale,
  reflectionScale,
  waterRoughness,
  fogNear,
  fogFar,
}) {
  return Object.freeze({
    sky: new THREE.Color(sky),
    fog: new THREE.Color(fog),
    ambient: new THREE.Color(ambient),
    ambientIntensity,
    hemisphereSky: new THREE.Color(hemisphereSky),
    hemisphereGround: new THREE.Color(hemisphereGround),
    hemisphereIntensity,
    directional: new THREE.Color(directional),
    directionalIntensity,
    rim: new THREE.Color(rim),
    rimIntensity,
    practicalScale,
    emissiveScale,
    reflectionScale,
    waterRoughness,
    fogNear,
    fogFar,
  })
}

const OUTDOOR = Object.freeze({
  night: state({
    sky: 0x0E1825,          // Deep navy — dark Vietnamese night
    fog: 0x1A2535,
    ambient: 0x5A6880,
    ambientIntensity: 0.75,
    hemisphereSky: 0x3A5070,
    hemisphereGround: 0x1E1815,  // Dark warm ground
    hemisphereIntensity: 1.1,
    directional: 0x88A0C0,
    directionalIntensity: 0.3,
    rim: 0x4A6080,
    rimIntensity: 0.7,
    practicalScale: 1.2,          // Strong lantern/lamp glow
    emissiveScale: 1.3,           // Signs and lanterns pop
    reflectionScale: 1.15,
    waterRoughness: 0.32,
    fogNear: 30,
    fogFar: 80,
  }),
  dawn: state({
    sky: 0x6A809A,
    fog: 0x888888,           // Thick morning mist
    ambient: 0x95A0B0,
    ambientIntensity: 0.7,
    hemisphereSky: 0xA0B5C5,
    hemisphereGround: 0x605045,  // Warm earth
    hemisphereIntensity: 1.08,
    directional: 0xFFBB75,       // Golden dawn
    directionalIntensity: 1.3,
    rim: 0x8095B0,
    rimIntensity: 0.52,
    practicalScale: 0.3,
    emissiveScale: 0.7,
    reflectionScale: 0.85,
    waterRoughness: 0.28,
    fogNear: 35,
    fogFar: 85,
  }),
  day: state({
    sky: 0x6A90B0,           // Hanoi humid blue
    fog: 0x90A5B5,           // Warm haze
    ambient: 0xC0C8D0,
    ambientIntensity: 0.62,
    hemisphereSky: 0xC8D8E5,
    hemisphereGround: 0x756858,  // Warm earth
    hemisphereIntensity: 1.35,
    directional: 0xFFF0D0,       // Warm sunlight
    directionalIntensity: 2.3,
    rim: 0x98B0C5,
    rimIntensity: 0.2,
    practicalScale: 0,
    emissiveScale: 0.22,
    reflectionScale: 0.58,
    waterRoughness: 0.4,
    fogNear: 40,
    fogFar: 95,
  }),
  goldenHour: state({
    sky: 0xAA9878,           // Rich golden sky
    fog: 0xAA9880,
    ambient: 0xBBA895,
    ambientIntensity: 0.68,
    hemisphereSky: 0xC5B5A5,
    hemisphereGround: 0x605040,  // Deep warm earth
    hemisphereIntensity: 1.2,
    directional: 0xFFA840,       // Deep golden sun
    directionalIntensity: 1.85,
    rim: 0xFFC060,
    rimIntensity: 0.7,
    practicalScale: 0.28,
    emissiveScale: 0.7,
    reflectionScale: 1.35,
    waterRoughness: 0.2,
    fogNear: 35,
    fogFar: 85,
  }),
  sunset: state({
    sky: 0x6A5868,           // Deep purple-orange
    fog: 0x706058,           // Warm fog
    ambient: 0x857878,
    ambientIntensity: 0.58,
    hemisphereSky: 0x807085,
    hemisphereGround: 0x403530,  // Warm dark earth
    hemisphereIntensity: 1.08,
    directional: 0xFF7840,       // Deep orange sunset
    directionalIntensity: 1.15,
    rim: 0x6070A0,
    rimIntensity: 0.8,
    practicalScale: 0.7,
    emissiveScale: 0.95,
    reflectionScale: 1.25,
    waterRoughness: 0.22,
    fogNear: 32,
    fogFar: 82,
  }),
  blueHour: state({
    sky: HANOI_COLORS.blueHour,
    fog: 0x404E65,
    ambient: 0x6A7A95,
    ambientIntensity: 0.7,
    hemisphereSky: 0x4A6595,
    hemisphereGround: 0x302820,  // Dark warm ground
    hemisphereIntensity: 1.15,
    directional: 0x85A0C5,
    directionalIntensity: 0.32,
    rim: 0x6888B5,
    rimIntensity: 0.78,
    practicalScale: 1.0,
    emissiveScale: 1.15,
    reflectionScale: 1.35,
    waterRoughness: 0.28,
    fogNear: 30,
    fogFar: 80,
  }),
})

const INTERIOR = Object.freeze({
  night: state({
    sky: 0x11151d,
    fog: 0x17191b,
    ambient: 0xa0a8b4,
    ambientIntensity: 1.08,
    hemisphereSky: 0x6f7990,
    hemisphereGround: 0x3c3029,
    hemisphereIntensity: 0.48,
    directional: 0x9bb2d1,
    directionalIntensity: 0.08,
    rim: 0x6d7d9a,
    rimIntensity: 0.12,
    practicalScale: 1.05,
    emissiveScale: 1.12,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 20,
    fogFar: 40,
  }),
  dawn: state({
    sky: 0x28262a,
    fog: 0x2d292b,
    ambient: 0xb6a8a5,
    ambientIntensity: 1.12,
    hemisphereSky: 0xb59da1,
    hemisphereGround: 0x58453b,
    hemisphereIntensity: 0.58,
    directional: 0xeeb07d,
    directionalIntensity: 0.22,
    rim: 0x7d8297,
    rimIntensity: 0.16,
    practicalScale: 0.92,
    emissiveScale: 1,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 23,
    fogFar: 44,
  }),
  day: state({
    sky: 0x303338,
    fog: 0x343638,
    ambient: 0xc2c2bc,
    ambientIntensity: 1.22,
    hemisphereSky: 0xc2ced3,
    hemisphereGround: 0x665a4d,
    hemisphereIntensity: 0.72,
    directional: 0xffe6bf,
    directionalIntensity: 0.4,
    rim: 0xa5b3c2,
    rimIntensity: 0.14,
    practicalScale: 0.68,
    emissiveScale: 0.72,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 26,
    fogFar: 48,
  }),
  goldenHour: state({
    sky: 0x2d2928,
    fog: 0x332c2a,
    ambient: 0xc0aca0,
    ambientIntensity: 1.18,
    hemisphereSky: 0xc0aa9d,
    hemisphereGround: 0x604a3b,
    hemisphereIntensity: 0.66,
    directional: 0xf5bd86,
    directionalIntensity: 0.32,
    rim: 0xa08d85,
    rimIntensity: 0.18,
    practicalScale: 0.82,
    emissiveScale: 0.9,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 24,
    fogFar: 46,
  }),
  sunset: state({
    sky: 0x221f23,
    fog: 0x292427,
    ambient: 0xb0a4a3,
    ambientIntensity: 1.14,
    hemisphereSky: 0x9b909c,
    hemisphereGround: 0x514139,
    hemisphereIntensity: 0.58,
    directional: 0xf1b27e,
    directionalIntensity: 0.18,
    rim: 0x7e839b,
    rimIntensity: 0.16,
    practicalScale: 1,
    emissiveScale: 1.05,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 22,
    fogFar: 42,
  }),
  blueHour: state({
    sky: 0x181c27,
    fog: 0x20222a,
    ambient: 0xa8abb8,
    ambientIntensity: 1.1,
    hemisphereSky: 0x7f8ca7,
    hemisphereGround: 0x463832,
    hemisphereIntensity: 0.52,
    directional: 0x9eb5d4,
    directionalIntensity: 0.12,
    rim: 0x7589aa,
    rimIntensity: 0.18,
    practicalScale: 1.04,
    emissiveScale: 1.12,
    reflectionScale: 1,
    waterRoughness: 0.36,
    fogNear: 21,
    fogFar: 41,
  }),
})

const PALETTES = Object.freeze({
  outdoor: OUTDOOR,
  baDinh: OUTDOOR,
  longBien: OUTDOOR,
  interior: INTERIOR,
})

function lerp(from, to, amount) {
  return from + (to - from) * amount
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value) {
  const amount = clamp01(value)
  return amount * amount * (3 - 2 * amount)
}

function scoreWindow(minutes, start, peak, end) {
  if (minutes <= start || minutes >= end) return 0
  if (minutes === peak) return 1
  return minutes < peak
    ? smoothstep((minutes - start) / (peak - start))
    : smoothstep((end - minutes) / (end - peak))
}

function getPhaseForHour(hour) {
  for (let index = 0; index < PHASE_WINDOWS.length; index += 1) {
    const window = PHASE_WINDOWS[index]
    if (hour >= window.start && hour < window.end) return window.phase
  }
  return 'night'
}

function inferLightRole(light) {
  const name = light?.name?.toLocaleLowerCase('vi') ?? ''
  if (name.includes('tháp rùa')) return 'tower'
  if (name.includes('ngọc sơn')) return 'temple'
  if (name.includes('nhà thờ') || name.includes('mặt tiền') || name.includes('tháp chuông')) {
    return 'church'
  }
  if (
    name.includes('quán')
    || name.includes('cửa hàng')
    || name.includes('tầng một')
    || name.includes('cà phê')
  ) return 'shop'
  if (name.includes('pendant') || name.includes('altar') || name.includes('bàn thờ')) {
    return 'interior'
  }
  return name ? 'street' : 'default'
}

function getRoleMultiplier(phase, role) {
  return PRACTICAL_ROLE_MULTIPLIERS[phase]?.[role] ?? 1
}

function addLightEntries(target, entries) {
  if (!Array.isArray(entries)) return

  for (let index = 0; index < entries.length; index += 1) {
    const source = entries[index]
    const light = source?.light ?? source
    if (!light?.isLight || !Number.isFinite(light.intensity)) continue

    target.push({
      light,
      baseIntensity: Number.isFinite(source?.baseIntensity)
        ? source.baseIntensity
        : light.intensity,
      role: source?.role ?? inferLightRole(light),
    })
  }
}

function normalizeLighting(source = {}) {
  const practicalLights = []
  addLightEntries(practicalLights, source.pointLights)
  addLightEntries(practicalLights, source.spotLights)

  const emissiveMaterials = []
  if (Array.isArray(source.emissiveMaterials)) {
    for (let index = 0; index < source.emissiveMaterials.length; index += 1) {
      const entry = source.emissiveMaterials[index]
      const material = entry?.material ?? entry
      if (!material?.isMaterial || !Number.isFinite(material.emissiveIntensity)) continue

      emissiveMaterials.push({
        material,
        baseIntensity: Number.isFinite(entry?.baseIntensity)
          ? entry.baseIntensity
          : material.emissiveIntensity,
        baseOpacity: Number.isFinite(entry?.baseOpacity)
          ? entry.baseOpacity
          : material.opacity,
        baseRoughness: Number.isFinite(entry?.baseRoughness)
          ? entry.baseRoughness
          : material.roughness,
        role: entry?.role ?? material.name ?? 'default',
      })
    }
  }

  return {
    ambient: source.ambient ?? null,
    hemisphere: source.hemisphere ?? null,
    directional: source.directional ?? null,
    rim: source.rim ?? null,
    skyGradient: source.skyGradient ?? null,
    practicalLights,
    emissiveMaterials,
  }
}

function applyLight(light, fromColor, toColor, fromIntensity, toIntensity, amount) {
  if (!light) return
  light.color?.lerpColors(fromColor, toColor, amount)
  light.intensity = lerp(fromIntensity, toIntensity, amount)
}

export class DayNightCycle {
  constructor({ scene, clock, lighting = {}, area = 'outdoor' }) {
    if (!scene?.isScene) throw new TypeError('DayNightCycle requires a THREE.Scene')
    if (!clock || !('minutes' in clock)) {
      throw new TypeError('DayNightCycle requires a clock with a minutes getter')
    }

    this.scene = scene
    this.clock = clock
    this.lighting = Object.fromEntries(DAY_NIGHT_AREAS.map((areaName) => [
      areaName,
      normalizeLighting(lighting[areaName] ?? (
        areaName === 'interior' ? lighting.interior : lighting.outdoor
      )),
    ]))
    this._area = 'outdoor'
    this._phase = 'sunset'
    this._wrappedMinutes = 0
    this._scratchLightPosition = new THREE.Vector3()
    this._scratchSubjectCenter = new THREE.Vector3()

    if (!this.scene.background?.isColor) this.scene.background = new THREE.Color()
    if (!this.scene.fog?.isFog && !this.scene.fog?.isFogExp2) {
      this.scene.fog = new THREE.Fog(0x000000, 50, 90)
    }

    this.setArea(area)
    this.update()
  }

  get area() {
    return this._area
  }

  get phase() {
    return this._phase
  }

  getLightingPhase() {
    return this._phase
  }

  getGoldenHourScore() {
    return scoreWindow(this._wrappedMinutes, 16.15 * 60, 17 * 60, 17.75 * 60)
  }

  getBlueHourScore() {
    return scoreWindow(this._wrappedMinutes, 17.9 * 60, 18.45 * 60, 19.15 * 60)
  }

  getLightQualityAt(position) {
    if (
      !position
      || !Number.isFinite(position.x)
      || !Number.isFinite(position.y)
      || !Number.isFinite(position.z)
    ) {
      throw new TypeError('getLightQualityAt requires a position with finite x, y and z')
    }

    const context = this.lighting[this._area]
    let practicalContribution = 0
    for (let index = 0; index < context.practicalLights.length; index += 1) {
      const entry = context.practicalLights[index]
      if (entry.light.intensity <= 0.01 || entry.light.visible === false) continue

      entry.light.getWorldPosition(this._scratchLightPosition)
      const range = entry.light.distance > 0
        ? entry.light.distance
        : entry.light.isSpotLight ? 26 : 14
      const distance = position.distanceTo
        ? position.distanceTo(this._scratchLightPosition)
        : Math.hypot(
            position.x - this._scratchLightPosition.x,
            position.y - this._scratchLightPosition.y,
            position.z - this._scratchLightPosition.z,
          )
      const proximity = clamp01(1 - distance / Math.max(1, range))
      const output = clamp01(entry.light.intensity / Math.max(0.001, entry.baseIntensity))
      practicalContribution = Math.max(practicalContribution, proximity * output)
    }

    const phaseQuality = PHASE_QUALITY[this._phase]
    const artificialWeight = this._phase === 'day' || this._phase === 'goldenHour' ? 0.08 : 0.24
    return clamp01(phaseQuality + practicalContribution * artificialWeight)
  }

  getSubjectLightingScore(subjectBounds) {
    const min = subjectBounds?.min
    const max = subjectBounds?.max
    if (
      !min || !max
      || !Number.isFinite(min.x) || !Number.isFinite(min.y) || !Number.isFinite(min.z)
      || !Number.isFinite(max.x) || !Number.isFinite(max.y) || !Number.isFinite(max.z)
    ) {
      throw new TypeError('getSubjectLightingScore requires finite min/max bounds')
    }

    this._scratchSubjectCenter.set(
      (min.x + max.x) * 0.5,
      (min.y + max.y) * 0.5,
      (min.z + max.z) * 0.5,
    )
    const quality = this.getLightQualityAt(this._scratchSubjectCenter)
    const largestDimension = Math.max(max.x - min.x, max.y - min.y, max.z - min.z)
    const scalePenalty = clamp01((largestDimension - 18) / 90) * 0.08
    return clamp01(
      quality
      + this.getGoldenHourScore() * 0.08
      + this.getBlueHourScore() * 0.05
      - scalePenalty,
    )
  }

  setArea(area) {
    if (!DAY_NIGHT_AREAS.includes(area)) {
      throw new RangeError(`Unknown day/night area: ${area}`)
    }

    this._area = area
    return this
  }

  update(area = this._area) {
    if (area !== this._area) this.setArea(area)

    const wrappedMinutes = ((this.clock.minutes % GAME_MINUTES_PER_DAY) + GAME_MINUTES_PER_DAY)
      % GAME_MINUTES_PER_DAY
    this._wrappedMinutes = wrappedMinutes
    const gameHour = wrappedMinutes / 60
    let fromKeyframe = KEYFRAMES[0]
    let toKeyframe = KEYFRAMES[1]

    for (let index = 0; index < KEYFRAMES.length - 1; index += 1) {
      const candidate = KEYFRAMES[index]
      const next = KEYFRAMES[index + 1]
      if (gameHour >= candidate.hour && gameHour < next.hour) {
        fromKeyframe = candidate
        toKeyframe = next
        break
      }
    }

    const duration = toKeyframe.hour - fromKeyframe.hour
    const amount = duration === 0
      ? 0
      : smoothstep((gameHour - fromKeyframe.hour) / duration)
    const palette = PALETTES[this._area]
    const from = palette[fromKeyframe.phase]
    const to = palette[toKeyframe.phase]
    this._phase = getPhaseForHour(gameHour)

    this.#applyAtmosphere(from, to, amount, this.lighting[this._area])
    this.#applyLighting(
      this.lighting[this._area],
      from,
      to,
      amount,
      gameHour,
      fromKeyframe.phase,
      toKeyframe.phase,
    )
  }

  #applyAtmosphere(from, to, amount, context) {
    this.scene.background.lerpColors(from.sky, to.sky, amount)
    this.scene.fog.color.lerpColors(from.fog, to.fog, amount)
    context.skyGradient?.setTransition(
      from.sky,
      to.sky,
      from.fog,
      to.fog,
      amount,
    )

    if (this.scene.fog.isFog) {
      this.scene.fog.near = lerp(from.fogNear, to.fogNear, amount)
      this.scene.fog.far = lerp(from.fogFar, to.fogFar, amount)
    } else {
      const fogDistance = lerp(from.fogFar, to.fogFar, amount)
      this.scene.fog.density = 1 / fogDistance
    }
  }

  #applyLighting(context, from, to, amount, gameHour, fromPhase, toPhase) {
    applyLight(
      context.ambient,
      from.ambient,
      to.ambient,
      from.ambientIntensity,
      to.ambientIntensity,
      amount,
    )
    if (context.directional) {
      const orbitAngle = ((gameHour - 6) / 24) * Math.PI * 2
      context.directional.position.set(
        Math.cos(orbitAngle) * 28,
        6 + Math.abs(Math.sin(orbitAngle)) * 26,
        Math.sin(orbitAngle) * 14,
      )
    }
    applyLight(
      context.hemisphere,
      from.hemisphereSky,
      to.hemisphereSky,
      from.hemisphereIntensity,
      to.hemisphereIntensity,
      amount,
    )
    context.hemisphere?.groundColor?.lerpColors(
      from.hemisphereGround,
      to.hemisphereGround,
      amount,
    )
    applyLight(
      context.directional,
      from.directional,
      to.directional,
      from.directionalIntensity,
      to.directionalIntensity,
      amount,
    )
    applyLight(
      context.rim,
      from.rim,
      to.rim,
      from.rimIntensity,
      to.rimIntensity,
      amount,
    )

    const practicalScale = lerp(from.practicalScale, to.practicalScale, amount)
    for (let index = 0; index < context.practicalLights.length; index += 1) {
      const entry = context.practicalLights[index]
      const roleScale = lerp(
        getRoleMultiplier(fromPhase, entry.role),
        getRoleMultiplier(toPhase, entry.role),
        amount,
      )
      entry.light.intensity = entry.baseIntensity * practicalScale * roleScale
    }

    const emissiveScale = lerp(from.emissiveScale, to.emissiveScale, amount)
    const reflectionScale = lerp(from.reflectionScale, to.reflectionScale, amount)
    const waterRoughness = lerp(from.waterRoughness, to.waterRoughness, amount)
    for (let index = 0; index < context.emissiveMaterials.length; index += 1) {
      const entry = context.emissiveMaterials[index]
      entry.material.emissiveIntensity = entry.baseIntensity * emissiveScale
      if (entry.role === 'waterReflection') {
        entry.material.opacity = clamp01(entry.baseOpacity * reflectionScale)
      } else if (entry.role === 'lakeWater') {
        entry.material.roughness = waterRoughness
      }
    }
  }
}
