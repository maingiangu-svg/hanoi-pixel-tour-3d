const CROSSFADE_SECONDS = 1.8
const MAX_ONE_SHOTS = 2
const CINEMATIC_AUDIO_CUES = Object.freeze({
  'church-reveal': Object.freeze({
    frequencies: Object.freeze([146.83, 220]),
    volume: 0.035,
    wave: 'sine',
  }),
  'church-climax': Object.freeze({
    frequencies: Object.freeze([196, 293.66]),
    volume: 0.043,
    wave: 'triangle',
  }),
})

const profile = (id, label, center, radius, {
  noise = 0.02,
  tone = 0,
  toneLevel = 0,
  filter = 1200,
  accents = [],
} = {}) => Object.freeze({
  id,
  label,
  center: Object.freeze(center),
  radius,
  noise,
  tone,
  toneLevel,
  filter,
  accents: Object.freeze(accents.map((accent) => Object.freeze(accent))),
})

export const REGIONAL_AUDIO_PROFILES = Object.freeze({
  silent: profile('silent', 'Khu vực yên tĩnh', [0, 0], 1),
  church: profile('church', 'Nhà thờ', [0, -28], 82, {
    noise: 0.018,
    tone: 196,
    toneLevel: 0.004,
    filter: 1450,
    accents: [
      { type: 'bell', interval: 18, volume: 0.08 },
      { type: 'bird', interval: 7, volume: 0.025 },
      { type: 'cafe', interval: 11, volume: 0.018 },
    ],
  }),
  oldQuarter: profile('oldQuarter', 'Phố Cổ', [50, 19], 62, {
    noise: 0.025,
    tone: 126,
    toneLevel: 0.003,
    filter: 1050,
    accents: [
      { type: 'shop', interval: 8, volume: 0.022 },
      { type: 'bicycle', interval: 13, volume: 0.028 },
    ],
  }),
  pedestrian: profile('pedestrian', 'Phố đi bộ', [146, 113], 72, {
    noise: 0.031,
    tone: 220,
    toneLevel: 0.006,
    filter: 1750,
    accents: [
      { type: 'music', interval: 7, volume: 0.026 },
      { type: 'clap', interval: 10, volume: 0.025 },
      { type: 'children', interval: 12, volume: 0.018 },
    ],
  }),
  lake: profile('lake', 'Hồ Gươm', [103, 0], 118, {
    noise: 0.023,
    tone: 92,
    toneLevel: 0.003,
    filter: 820,
    accents: [
      { type: 'bird', interval: 8, volume: 0.022 },
      { type: 'water', interval: 6, volume: 0.02 },
      { type: 'steps', interval: 9, volume: 0.016 },
    ],
  }),
  bridgeTemple: profile('bridgeTemple', 'Cầu Thê Húc và Đền Ngọc Sơn', [119, 51], 52, {
    noise: 0.014,
    tone: 110,
    toneLevel: 0.002,
    filter: 680,
    accents: [
      { type: 'water', interval: 9, volume: 0.016 },
      { type: 'steps', interval: 12, volume: 0.012 },
      { type: 'bird', interval: 14, volume: 0.014 },
    ],
  }),
  churchInterior: profile('churchInterior', 'Bên trong Nhà thờ', [0, 0], 40, {
    noise: 0.008,
    tone: 147,
    toneLevel: 0.004,
    filter: 520,
    accents: [{ type: 'bell', interval: 24, volume: 0.035 }],
  }),
})

function getAudioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null
}

export function resolveAudioRegion({
  areaName = 'outdoor',
  regionIds = [],
} = {}) {
  if (areaName === 'interior') return 'churchInterior'
  if (areaName !== 'outdoor') return 'silent'
  if (regionIds.includes('ngocSonTemple') || regionIds.includes('theHucBridge')) {
    return 'bridgeTemple'
  }
  if (regionIds.includes('pedestrianDistrict')) return 'pedestrian'
  if (
    regionIds.includes('oldQuarterConnector')
    || regionIds.includes('sceneOldQuarter')
  ) return 'oldQuarter'
  if (regionIds.includes('churchDistrict')) return 'church'
  return 'lake'
}

function attenuation(profileData, position) {
  if (!position || profileData.id === 'churchInterior') return 1
  const distance = Math.hypot(
    position.x - profileData.center[0],
    position.z - profileData.center[1],
  )
  const edge = Math.max(0, 1 - distance / profileData.radius)
  return 0.22 + edge * edge * 0.78
}

export class RegionalAudioSystem {
  constructor({
    contextFactory = () => {
      const Context = getAudioContextConstructor()
      return Context ? new Context() : null
    },
    initialVolume = 0.55,
  } = {}) {
    this.contextFactory = contextFactory
    this.context = null
    this.masterGain = null
    this.ambientGain = null
    this.cinematicGain = null
    this.volume = Math.max(0, Math.min(1, initialVolume))
    this.muted = false
    this.started = false
    this.disposed = false
    this.activeRegionId = null
    this.soundscapes = new Map()
    this.accentElapsed = new Map()
    this.activeOneShots = 0
    this.noiseBuffer = null
    this.cinematicActive = false
    this.cinematicAmbientLevel = 1
    this.cinematicCueId = null
    this.cinematicCueEntry = null
    this.cinematicCueStarts = 0
  }

  async start() {
    if (this.disposed) return false
    if (!this.context) this.#createGraph()
    if (!this.context) return false
    if (this.context.state === 'suspended') await this.context.resume()
    this.started = true
    return true
  }

  update(deltaTime, context = {}) {
    if (!this.started || !this.context || this.disposed) return
    const regionId = resolveAudioRegion(context)
    const profileData = REGIONAL_AUDIO_PROFILES[regionId]
    const soundscape = this.#ensureSoundscape(profileData)
    const level = attenuation(profileData, context.position)
    if (this.activeRegionId !== regionId) {
      this.activeRegionId = regionId
      const now = this.context.currentTime
      for (const [id, entry] of this.soundscapes) {
        entry.gain.gain.cancelScheduledValues(now)
        entry.gain.gain.setTargetAtTime(
          id === regionId ? level : 0,
          now,
          CROSSFADE_SECONDS / 3,
        )
      }
    } else {
      soundscape.gain.gain.setTargetAtTime(
        level,
        this.context.currentTime,
        CROSSFADE_SECONDS / 3,
      )
    }
    this.#updateAccents(profileData, Math.min(Math.max(deltaTime, 0), 0.1))
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0))
    this.#syncMasterVolume()
    return this.volume
  }

  setMuted(muted) {
    this.muted = Boolean(muted)
    this.#syncMasterVolume()
    return this.muted
  }

  toggleMuted() {
    return this.setMuted(!this.muted)
  }

  beginCinematic({
    cue = null,
    ambientLevel = 0.34,
    fadeIn = 0.65,
  } = {}) {
    const wasActive = this.cinematicActive
    this.cinematicActive = true
    this.cinematicAmbientLevel = Math.max(0, Math.min(1, ambientLevel))
    this.#setAmbientLevel(this.cinematicAmbientLevel, fadeIn)
    if (cue) this.setCinematicCue(cue, { fadeIn })
    return !wasActive
  }

  setCinematicCue(cue, {
    fadeIn = 0.45,
    fadeOut = 0.35,
  } = {}) {
    if (!cue || cue === this.cinematicCueId) return false
    this.#stopCinematicCue(fadeOut)
    this.cinematicCueId = cue
    this.cinematicCueStarts += 1
    if (!this.context || !this.cinematicGain) return true

    const cueProfile = CINEMATIC_AUDIO_CUES[cue] ?? CINEMATIC_AUDIO_CUES['church-reveal']
    const gain = this.context.createGain()
    const now = this.context.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.setTargetAtTime(
      cueProfile.volume,
      now,
      Math.max(0.02, fadeIn / 3),
    )
    gain.connect(this.cinematicGain)

    const sources = cueProfile.frequencies.map((frequency, index) => {
      const oscillator = this.context.createOscillator()
      oscillator.type = cueProfile.wave
      oscillator.frequency.value = frequency * (index === 0 ? 1 : 1.002)
      oscillator.connect(gain)
      oscillator.start()
      return oscillator
    })
    this.cinematicCueEntry = { id: cue, gain, sources }
    return true
  }

  endCinematic({ fadeOut = 0.65 } = {}) {
    if (!this.cinematicActive && !this.cinematicCueId) return false
    this.cinematicActive = false
    this.cinematicAmbientLevel = 1
    this.#setAmbientLevel(1, fadeOut)
    this.#stopCinematicCue(fadeOut)
    return true
  }

  getCinematicState() {
    return Object.freeze({
      active: this.cinematicActive,
      ambientLevel: this.cinematicAmbientLevel,
      cueId: this.cinematicCueId,
      cueStarts: this.cinematicCueStarts,
    })
  }

  getState() {
    return Object.freeze({
      volume: this.volume,
      muted: this.muted,
      activeRegionId: this.activeRegionId,
      started: this.started,
      soundscapeCount: this.soundscapes.size,
      activeOneShots: this.activeOneShots,
    })
  }

  restoreState(state = {}) {
    if (Number.isFinite(state.volume)) this.setVolume(state.volume)
    if ('muted' in state) this.setMuted(state.muted)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.soundscapes.values()) {
      for (const source of entry.sources) {
        try {
          source.stop()
        } catch {
          // A source may already have stopped during normal cleanup.
        }
        source.disconnect?.()
      }
      entry.gain.disconnect?.()
    }
    this.soundscapes.clear()
    this.accentElapsed.clear()
    this.masterGain?.disconnect?.()
    this.ambientGain?.disconnect?.()
    this.cinematicGain?.disconnect?.()
    this.#stopCinematicCue(0)
    void this.context?.close?.()
    this.context = null
    this.masterGain = null
    this.ambientGain = null
    this.cinematicGain = null
    this.noiseBuffer = null
  }

  #createGraph() {
    this.context = this.contextFactory()
    if (!this.context) return
    this.masterGain = this.context.createGain()
    this.masterGain.connect(this.context.destination)
    this.ambientGain = this.context.createGain()
    this.ambientGain.gain.value = 1
    this.ambientGain.connect(this.masterGain)
    this.cinematicGain = this.context.createGain()
    this.cinematicGain.gain.value = 1
    this.cinematicGain.connect(this.masterGain)
    this.#syncMasterVolume()
  }

  #syncMasterVolume() {
    if (!this.masterGain || !this.context) return
    this.masterGain.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.04,
    )
  }

  #ensureSoundscape(profileData) {
    const existing = this.soundscapes.get(profileData.id)
    if (existing) return existing

    const gain = this.context.createGain()
    gain.gain.value = 0
    gain.connect(this.ambientGain)
    const sources = []

    if (profileData.noise > 0) {
      const source = this.context.createBufferSource()
      source.buffer = this.#getNoiseBuffer()
      source.loop = true
      const filter = this.context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = profileData.filter
      const level = this.context.createGain()
      level.gain.value = profileData.noise
      source.connect(filter).connect(level).connect(gain)
      source.start()
      sources.push(source, filter, level)
    }
    if (profileData.tone > 0) {
      const oscillator = this.context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = profileData.tone
      const level = this.context.createGain()
      level.gain.value = profileData.toneLevel
      oscillator.connect(level).connect(gain)
      oscillator.start()
      sources.push(oscillator, level)
    }

    const entry = { gain, sources }
    this.soundscapes.set(profileData.id, entry)
    return entry
  }

  #getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer
    const frameCount = Math.max(1, Math.floor(this.context.sampleRate * 2))
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate)
    const channel = buffer.getChannelData(0)
    let previous = 0
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1
      previous = previous * 0.985 + white * 0.015
      channel[index] = previous
    }
    this.noiseBuffer = buffer
    return buffer
  }

  #setAmbientLevel(level, duration) {
    if (!this.ambientGain || !this.context) return
    const now = this.context.currentTime
    this.ambientGain.gain.cancelScheduledValues(now)
    this.ambientGain.gain.setTargetAtTime(
      level,
      now,
      Math.max(0.02, Number(duration) / 3 || 0.02),
    )
  }

  #stopCinematicCue(fadeOut = 0.35) {
    const entry = this.cinematicCueEntry
    this.cinematicCueEntry = null
    this.cinematicCueId = null
    if (!entry || !this.context) return
    const now = this.context.currentTime
    entry.gain.gain.cancelScheduledValues(now)
    entry.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.02, fadeOut / 3))
    let remainingSources = entry.sources.length
    const releaseSource = (source) => {
      source.disconnect?.()
      remainingSources -= 1
      if (remainingSources <= 0) entry.gain.disconnect?.()
    }
    for (const source of entry.sources) {
      source.onended = () => releaseSource(source)
      try {
        source.stop(now + Math.max(0.03, fadeOut))
      } catch {
        // A cue may already have completed during cinematic cleanup.
        releaseSource(source)
      }
    }
    if (entry.sources.length === 0) entry.gain.disconnect?.()
  }

  #updateAccents(profileData, deltaTime) {
    for (const accent of profileData.accents) {
      const key = `${profileData.id}:${accent.type}`
      const elapsed = (this.accentElapsed.get(key) ?? accent.interval * 0.65) + deltaTime
      if (elapsed < accent.interval || this.activeOneShots >= MAX_ONE_SHOTS) {
        this.accentElapsed.set(key, elapsed)
        continue
      }
      this.accentElapsed.set(key, Math.random() * accent.interval * 0.2)
      this.#playAccent(accent, this.soundscapes.get(profileData.id).gain)
    }
  }

  #playAccent(accent, destination) {
    const frequencies = {
      bell: [392, 523],
      bird: [1450, 1880],
      cafe: [310, 370],
      shop: [260, 330],
      bicycle: [880, 1175],
      music: [220, 330],
      clap: [760, 920],
      children: [680, 850],
      water: [140, 190],
      steps: [105, 125],
    }
    const [startFrequency, endFrequency] = frequencies[accent.type] ?? [220, 330]
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    const duration = accent.type === 'bell' ? 1.8 : 0.18
    oscillator.type = ['bell', 'bicycle'].includes(accent.type) ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(startFrequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.65)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(accent.volume, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(destination)
    this.activeOneShots += 1
    oscillator.onended = () => {
      this.activeOneShots = Math.max(0, this.activeOneShots - 1)
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }
}
