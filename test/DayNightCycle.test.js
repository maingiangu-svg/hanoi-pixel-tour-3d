import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { DayNightCycle } from '../src/lighting/DayNightCycle.js'

function createLightSet({ practicalIntensity = 10, emissiveIntensity = 0.5 } = {}) {
  const ambient = new THREE.AmbientLight(0xffffff, 1)
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x222222, 1)
  const directional = new THREE.DirectionalLight(0xffffff, 1)
  const rim = new THREE.DirectionalLight(0xffffff, 1)
  const point = new THREE.PointLight(0xffaa66, practicalIntensity)
  const spot = new THREE.SpotLight(0xffaa66, practicalIntensity * 2)
  const emissive = new THREE.MeshStandardMaterial({
    emissive: 0xffaa66,
    emissiveIntensity,
  })

  return {
    ambient,
    hemisphere,
    directional,
    rim,
    point,
    spot,
    emissive,
    context: {
      ambient,
      hemisphere,
      directional,
      rim,
      pointLights: [point],
      spotLights: [spot],
      emissiveMaterials: [emissive],
    },
  }
}

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`)
}

test('day palette dims practical lights and updates all outdoor light types', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 1, 2)
  const clock = { minutes: 12 * 60 }
  const outdoor = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })

  closeTo(outdoor.ambient.intensity, 0.62)
  closeTo(outdoor.hemisphere.intensity, 1.25)
  closeTo(outdoor.directional.intensity, 2.05)
  closeTo(outdoor.rim.intensity, 0.2)
  closeTo(outdoor.point.intensity, 0)
  closeTo(outdoor.spot.intensity, 0)
  closeTo(outdoor.emissive.emissiveIntensity, 0.14)
  closeTo(scene.fog.near, 58)
  closeTo(scene.fog.far, 105)
  assert.equal(cycle.phase, 'day')
})

test('night remains readable and restores warm practical lighting', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 0 }
  const outdoor = createLightSet({ practicalIntensity: 6, emissiveIntensity: 0.6 })
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })

  assert.ok(outdoor.ambient.intensity >= 0.6)
  assert.ok(outdoor.hemisphere.intensity >= 0.75)
  assert.ok(outdoor.rim.intensity >= 0.4)
  closeTo(outdoor.point.intensity, 6)
  closeTo(outdoor.spot.intensity, 12)
  closeTo(outdoor.emissive.emissiveIntensity, 0.672)
  assert.equal(cycle.phase, 'night')
})

test('dawn transition interpolates without replacing scene atmosphere objects', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 1, 2)
  const originalBackground = scene.background
  const originalFog = scene.fog
  const clock = { minutes: 5.625 * 60 }
  const outdoor = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })

  closeTo(outdoor.directional.intensity, (0.42 + 1.1) / 2)
  closeTo(outdoor.point.intensity, 10 * ((1 + 0.15) / 2))
  assert.equal(scene.background, originalBackground)
  assert.equal(scene.fog, originalFog)

  clock.minutes = 6 * 60
  cycle.update()
  assert.equal(scene.background, originalBackground)
  assert.equal(scene.fog, originalFog)
})

test('interior uses its own warm-light balance and can switch back outdoors', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 12 * 60 }
  const outdoor = createLightSet()
  const interior = createLightSet({ practicalIntensity: 8 })
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      outdoor: outdoor.context,
      interior: interior.context,
    },
  })

  cycle.update('interior')
  assert.equal(cycle.area, 'interior')
  closeTo(interior.ambient.intensity, 1.22)
  closeTo(interior.point.intensity, 8 * 0.68)
  closeTo(interior.spot.intensity, 16 * 0.68)
  closeTo(interior.emissive.emissiveIntensity, 0.5 * 0.72)

  cycle.update('outdoor')
  assert.equal(cycle.area, 'outdoor')
  closeTo(outdoor.point.intensity, 0)
  assert.throws(() => cycle.setArea('crypt'), RangeError)
})

test('Ba Dinh and Long Bien use outdoor lighting without rejecting area changes', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 12 * 60 }
  const baDinh = createLightSet()
  const longBien = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      baDinh: baDinh.context,
      longBien: longBien.context,
    },
  })

  cycle.update('baDinh')
  assert.equal(cycle.area, 'baDinh')
  closeTo(baDinh.directional.intensity, 2.05)

  cycle.update('longBien')
  assert.equal(cycle.area, 'longBien')
  closeTo(longBien.hemisphere.intensity, 1.25)
})

test('light and material descriptors can override captured base intensity', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 0 }
  const light = new THREE.PointLight(0xffffff, 99)
  const material = new THREE.MeshStandardMaterial({ emissiveIntensity: 99 })
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      outdoor: {
        pointLights: [{ light, baseIntensity: 4 }],
        emissiveMaterials: [{ material, baseIntensity: 0.25 }],
      },
    },
  })

  closeTo(light.intensity, 4)
  closeTo(material.emissiveIntensity, 0.25 * 1.12)
  cycle.update()
})

test('directional light orbit remains continuous across dusk and midnight', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 18.49 * 60 }
  const outdoor = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })

  const beforeNight = outdoor.directional.position.clone()
  clock.minutes = 18.51 * 60
  cycle.update()
  assert.ok(beforeNight.distanceTo(outdoor.directional.position) < 0.2)

  clock.minutes = 23.99 * 60
  cycle.update()
  const beforeMidnight = outdoor.directional.position.clone()
  clock.minutes = 0.01 * 60
  cycle.update()
  assert.ok(beforeMidnight.distanceTo(outdoor.directional.position) < 0.2)
})
