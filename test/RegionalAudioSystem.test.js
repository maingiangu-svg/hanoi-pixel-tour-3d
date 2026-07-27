import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RegionalAudioSystem,
  resolveAudioRegion,
} from '../src/audio/RegionalAudioSystem.js'

function audioParam(value = 0) {
  return {
    value,
    cancelScheduledValues() {},
    setTargetAtTime(next) { this.value = next },
    setValueAtTime(next) { this.value = next },
    exponentialRampToValueAtTime(next) { this.value = next },
  }
}

function audioNode() {
  return {
    connections: [],
    connect(target) {
      this.connections.push(target)
      return target
    },
    disconnect() {
      this.connections.length = 0
    },
  }
}

function createAudioContext() {
  const context = {
    state: 'suspended',
    currentTime: 0,
    sampleRate: 100,
    destination: audioNode(),
    closeCalls: 0,
    async resume() { this.state = 'running' },
    async close() {
      this.closeCalls += 1
      this.state = 'closed'
    },
    createGain() {
      return { ...audioNode(), gain: audioParam(1) }
    },
    createBiquadFilter() {
      return {
        ...audioNode(),
        type: 'lowpass',
        frequency: audioParam(),
      }
    },
    createBufferSource() {
      return {
        ...audioNode(),
        buffer: null,
        loop: false,
        start() {},
        stop() {},
      }
    },
    createOscillator() {
      const node = {
        ...audioNode(),
        type: 'sine',
        frequency: audioParam(),
        onended: null,
        start() {},
        stop() {
          const handler = this.onended
          this.onended = null
          handler?.()
        },
      }
      return node
    },
    createBuffer(_channels, frameCount) {
      const channel = new Float32Array(frameCount)
      return { getChannelData: () => channel }
    },
  }
  return context
}

test('regional audio resolves the intended ambience without overlapping areas', () => {
  assert.equal(resolveAudioRegion({
    areaName: 'outdoor',
    regionIds: ['churchDistrict'],
  }), 'church')
  assert.equal(resolveAudioRegion({
    areaName: 'outdoor',
    regionIds: ['oldQuarterConnector'],
  }), 'oldQuarter')
  assert.equal(resolveAudioRegion({
    areaName: 'outdoor',
    regionIds: ['pedestrianDistrict'],
  }), 'pedestrian')
  assert.equal(resolveAudioRegion({
    areaName: 'outdoor',
    regionIds: ['theHucBridge', 'pedestrianDistrict'],
  }), 'bridgeTemple')
  assert.equal(resolveAudioRegion({
    areaName: 'interior',
    regionIds: ['churchDistrict'],
  }), 'churchInterior')
  assert.equal(resolveAudioRegion({
    areaName: 'baDinh',
    regionIds: [],
  }), 'silent')
})

test('regional audio crossfades one persistent soundscape per visited region', async () => {
  const context = createAudioContext()
  const system = new RegionalAudioSystem({
    contextFactory: () => context,
    initialVolume: 0.4,
  })

  assert.equal(await system.start(), true)
  system.update(0.016, {
    areaName: 'outdoor',
    regionIds: ['churchDistrict'],
    position: { x: 0, z: -28 },
  })
  system.update(0.016, {
    areaName: 'outdoor',
    regionIds: ['oldQuarterConnector'],
    position: { x: 50, z: 19 },
  })
  system.update(0.016, {
    areaName: 'outdoor',
    regionIds: ['churchDistrict'],
    position: { x: 0, z: -28 },
  })

  assert.deepEqual(system.getState(), {
    volume: 0.4,
    muted: false,
    activeRegionId: 'church',
    started: true,
    soundscapeCount: 2,
    activeOneShots: 0,
  })
  assert.equal(system.setVolume(2), 1)
  assert.equal(system.setMuted(true), true)
  assert.equal(system.getState().muted, true)
  system.restoreState({ volume: 0.25, muted: false })
  assert.equal(system.getState().volume, 0.25)
  assert.equal(system.getState().muted, false)

  assert.equal(system.beginCinematic({
    cue: 'church-reveal',
    ambientLevel: 0.3,
  }), true)
  assert.equal(system.beginCinematic({
    cue: 'church-reveal',
    ambientLevel: 0.3,
  }), false)
  assert.equal(system.setCinematicCue('church-reveal'), false)
  assert.equal(system.setCinematicCue('church-climax'), true)
  assert.deepEqual(system.getCinematicState(), {
    active: true,
    ambientLevel: 0.3,
    cueId: 'church-climax',
    cueStarts: 2,
  })
  assert.equal(system.endCinematic(), true)
  assert.deepEqual(system.getCinematicState(), {
    active: false,
    ambientLevel: 1,
    cueId: null,
    cueStarts: 2,
  })
  assert.equal(system.endCinematic(), false)

  system.dispose()
  assert.equal(context.closeCalls, 1)
  assert.equal(system.getState().soundscapeCount, 0)
})
