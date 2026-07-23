import * as THREE from 'three'

export const DAY_NIGHT_AREAS = Object.freeze([
  'outdoor',
  'baDinh',
  'longBien',
  'interior',
])

const GAME_MINUTES_PER_DAY = 24 * 60
const KEYFRAMES = Object.freeze([
  Object.freeze({ hour: 0, phase: 'night' }),
  Object.freeze({ hour: 5.5, phase: 'night' }),
  Object.freeze({ hour: 5.75, phase: 'dawn' }),
  Object.freeze({ hour: 6, phase: 'day' }),
  Object.freeze({ hour: 16.5, phase: 'day' }),
  Object.freeze({ hour: 17.5, phase: 'dusk' }),
  Object.freeze({ hour: 18.5, phase: 'night' }),
  Object.freeze({ hour: 24, phase: 'night' }),
])

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
    fogNear,
    fogFar,
  })
}

const OUTDOOR = Object.freeze({
  night: state({
    sky: 0x192438,
    fog: 0x202c3c,
    ambient: 0x72809b,
    ambientIntensity: 0.78,
    hemisphereSky: 0x5e7497,
    hemisphereGround: 0x2f2928,
    hemisphereIntensity: 1,
    directional: 0xaac3e4,
    directionalIntensity: 0.42,
    rim: 0x6c86b0,
    rimIntensity: 0.58,
    practicalScale: 1,
    emissiveScale: 1.12,
    fogNear: 38,
    fogFar: 82,
  }),
  dawn: state({
    sky: 0x9a7e85,
    fog: 0x8d7980,
    ambient: 0xa5909f,
    ambientIntensity: 0.68,
    hemisphereSky: 0xc5a7ad,
    hemisphereGround: 0x675047,
    hemisphereIntensity: 0.98,
    directional: 0xffbd86,
    directionalIntensity: 1.1,
    rim: 0x8291b0,
    rimIntensity: 0.36,
    practicalScale: 0.15,
    emissiveScale: 0.68,
    fogNear: 48,
    fogFar: 94,
  }),
  day: state({
    sky: 0x91afc2,
    fog: 0xa0b3be,
    ambient: 0xc5ccd2,
    ambientIntensity: 0.62,
    hemisphereSky: 0xd5e7f0,
    hemisphereGround: 0x756b5d,
    hemisphereIntensity: 1.25,
    directional: 0xffedcc,
    directionalIntensity: 2.05,
    rim: 0xa8bed4,
    rimIntensity: 0.2,
    practicalScale: 0,
    emissiveScale: 0.28,
    fogNear: 58,
    fogFar: 105,
  }),
  dusk: state({
    sky: 0x596777,
    fog: 0x5f6b7a,
    ambient: 0x84909f,
    ambientIntensity: 0.56,
    hemisphereSky: 0x8d9caf,
    hemisphereGround: 0x4c4137,
    hemisphereIntensity: 1.14,
    directional: 0xffc489,
    directionalIntensity: 1.55,
    rim: 0x8498b6,
    rimIntensity: 0.48,
    practicalScale: 0.82,
    emissiveScale: 0.92,
    fogNear: 50,
    fogFar: 90,
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
    fogNear: 26,
    fogFar: 48,
  }),
  dusk: state({
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
    fogNear: 22,
    fogFar: 42,
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
      })
    }
  }

  return {
    ambient: source.ambient ?? null,
    hemisphere: source.hemisphere ?? null,
    directional: source.directional ?? null,
    rim: source.rim ?? null,
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
    this._phase = 'dusk'

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
    const amount = duration === 0 ? 0 : (gameHour - fromKeyframe.hour) / duration
    const palette = PALETTES[this._area]
    const from = palette[fromKeyframe.phase]
    const to = palette[toKeyframe.phase]
    if (gameHour >= 18.5 || gameHour < 5.5) this._phase = 'night'
    else if (gameHour < 6) this._phase = 'dawn'
    else if (gameHour < 16.5) this._phase = 'day'
    else this._phase = 'dusk'

    this.#applyAtmosphere(from, to, amount)
    this.#applyLighting(this.lighting[this._area], from, to, amount, gameHour)
  }

  #applyAtmosphere(from, to, amount) {
    this.scene.background.lerpColors(from.sky, to.sky, amount)
    this.scene.fog.color.lerpColors(from.fog, to.fog, amount)

    if (this.scene.fog.isFog) {
      this.scene.fog.near = lerp(from.fogNear, to.fogNear, amount)
      this.scene.fog.far = lerp(from.fogFar, to.fogFar, amount)
    } else {
      const fogDistance = lerp(from.fogFar, to.fogFar, amount)
      this.scene.fog.density = 1 / fogDistance
    }
  }

  #applyLighting(context, from, to, amount, gameHour) {
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
      entry.light.intensity = entry.baseIntensity * practicalScale
    }

    const emissiveScale = lerp(from.emissiveScale, to.emissiveScale, amount)
    for (let index = 0; index < context.emissiveMaterials.length; index += 1) {
      const entry = context.emissiveMaterials[index]
      entry.material.emissiveIntensity = entry.baseIntensity * emissiveScale
    }
  }
}
