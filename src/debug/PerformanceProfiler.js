const SAMPLE_SECONDS = 0.75

const TIMING_NAMES = Object.freeze([
  'render',
  'npc',
  'interaction',
  'collision',
  'shop',
  'schedule',
  'dayNight',
])

const COUNT_NAMES = Object.freeze([
  'npcUpdates',
  'shopUpdates',
  'customerUpdates',
  'colliderChecks',
  'nearbyColliders',
])

function now() {
  return globalThis.performance?.now?.() ?? Date.now()
}

function createNumberRecord(names) {
  return Object.fromEntries(names.map((name) => [name, 0]))
}

export class PerformanceProfiler {
  constructor({ enabled = Boolean(import.meta.env?.DEV) } = {}) {
    this.enabled = enabled
    this.frameTimings = createNumberRecord(TIMING_NAMES)
    this.totalTimings = createNumberRecord(TIMING_NAMES)
    this.frameCounts = createNumberRecord(COUNT_NAMES)
    this.totalCounts = createNumberRecord(COUNT_NAMES)
    this.snapshot = {
      fps: 0,
      sampleSeconds: 0,
      cpuMs: createNumberRecord(TIMING_NAMES),
      counts: createNumberRecord(COUNT_NAMES),
    }
    this.elapsed = 0
    this.frames = 0
  }

  beginFrame() {
    if (!this.enabled) return
    for (const name of TIMING_NAMES) this.frameTimings[name] = 0
    for (const name of COUNT_NAMES) this.frameCounts[name] = 0
  }

  begin() {
    return this.enabled ? now() : 0
  }

  end(name, startedAt) {
    if (!this.enabled || !(name in this.frameTimings)) return
    this.frameTimings[name] += now() - startedAt
  }

  addCount(name, amount = 1) {
    if (!this.enabled || !(name in this.frameCounts)) return
    this.frameCounts[name] += amount
  }

  endFrame(deltaTime) {
    if (!this.enabled) return
    const safeDelta = Math.min(Math.max(deltaTime, 0), 0.25)
    this.elapsed += safeDelta
    this.frames += 1
    for (const name of TIMING_NAMES) this.totalTimings[name] += this.frameTimings[name]
    for (const name of COUNT_NAMES) this.totalCounts[name] += this.frameCounts[name]
    if (this.elapsed < SAMPLE_SECONDS) return

    this.snapshot.fps = this.frames / this.elapsed
    this.snapshot.sampleSeconds = this.elapsed
    for (const name of TIMING_NAMES) {
      this.snapshot.cpuMs[name] = this.totalTimings[name] / this.frames
      this.totalTimings[name] = 0
    }
    for (const name of COUNT_NAMES) {
      this.snapshot.counts[name] = this.totalCounts[name] / this.frames
      this.totalCounts[name] = 0
    }
    this.elapsed = 0
    this.frames = 0
  }
}
