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
  closeTo(outdoor.hemisphere.intensity, 1.35)
  closeTo(outdoor.directional.intensity, 2.3)
  closeTo(outdoor.rim.intensity, 0.2)
  closeTo(outdoor.point.intensity, 0)
  closeTo(outdoor.spot.intensity, 0)
  closeTo(outdoor.emissive.emissiveIntensity, 0.11)
  closeTo(scene.fog.near, 75)
  closeTo(scene.fog.far, 160)
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
  closeTo(outdoor.point.intensity, 6 * 1.2)
  closeTo(outdoor.spot.intensity, 12 * 1.2)
  closeTo(outdoor.emissive.emissiveIntensity, 0.6 * 1.3)
  assert.equal(cycle.phase, 'night')
})

test('dawn transition interpolates without replacing scene atmosphere objects', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 1, 2)
  const originalBackground = scene.background
  const originalFog = scene.fog
  const clock = { minutes: 5.375 * 60 }
  const outdoor = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })

  closeTo(outdoor.directional.intensity, (0.3 + 1.3) / 2)
  closeTo(outdoor.point.intensity, 10 * ((1.2 + 0.3) / 2))
  assert.equal(scene.background, originalBackground)
  assert.equal(scene.fog, originalFog)

  clock.minutes = 6.25 * 60
  cycle.update()
  assert.equal(cycle.getLightingPhase(), 'dawn')
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
  closeTo(baDinh.directional.intensity, 2.3)

  cycle.update('longBien')
  assert.equal(cycle.area, 'longBien')
  closeTo(longBien.hemisphere.intensity, 1.35)
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

  closeTo(light.intensity, 4 * 1.2)
  closeTo(material.emissiveIntensity, 0.25 * 1.3)
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

test('required photo-lighting checkpoints resolve to all six phases', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 0 }
  const cycle = new DayNightCycle({ scene, clock })
  const checkpoints = [
    [5, 30, 'dawn'],
    [6, 15, 'dawn'],
    [12, 0, 'day'],
    [16, 45, 'goldenHour'],
    [17, 30, 'sunset'],
    [18, 15, 'blueHour'],
    [19, 0, 'night'],
    [22, 0, 'night'],
  ]

  for (const [hour, minute, expected] of checkpoints) {
    clock.minutes = hour * 60 + minute
    cycle.update()
    assert.equal(cycle.getLightingPhase(), expected, `${hour}:${minute}`)
  }
})

test('phase colors and intensities remain continuous at every lighting boundary', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color()
  const clock = { minutes: 0 }
  const outdoor = createLightSet()
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: { outdoor: outdoor.context },
  })
  const boundaries = [5.25, 5.5, 6.25, 6.75, 16.25, 16.75, 17.25, 17.5, 18, 18.25, 18.75, 19]

  for (const hour of boundaries) {
    clock.minutes = (hour - 0.0001) * 60
    cycle.update()
    const colorBefore = scene.background.clone()
    const intensityBefore = outdoor.directional.intensity
    clock.minutes = (hour + 0.0001) * 60
    cycle.update()
    const colorDistance = Math.hypot(
      colorBefore.r - scene.background.r,
      colorBefore.g - scene.background.g,
      colorBefore.b - scene.background.b,
    )
    assert.ok(colorDistance < 0.001, `color jump at ${hour}`)
    assert.ok(
      Math.abs(intensityBefore - outdoor.directional.intensity) < 0.001,
      `intensity jump at ${hour}`,
    )
  }
})

test('blue hour and night prioritize landmark lighting without adding lights', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 18.25 * 60 }
  const street = new THREE.PointLight(0xffffff, 10, 12)
  const tower = new THREE.PointLight(0xffffff, 10, 12)
  const church = new THREE.SpotLight(0xffffff, 10, 30)
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      outdoor: {
        pointLights: [
          { light: street, role: 'street' },
          { light: tower, role: 'tower' },
        ],
        spotLights: [{ light: church, role: 'church' }],
      },
    },
  })

  assert.equal(cycle.lighting.outdoor.practicalLights.length, 3)
  assert.ok(tower.intensity > street.intensity)
  assert.ok(church.intensity > street.intensity)

  clock.minutes = 22 * 60
  cycle.update()
  assert.ok(tower.intensity > street.intensity)
  assert.ok(church.intensity > tower.intensity)
})

test('lake reflection and water roughness respond to photographic phases', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 12 * 60 }
  const reflection = new THREE.MeshStandardMaterial({
    emissive: 0xffffff,
    emissiveIntensity: 0.72,
    transparent: true,
    opacity: 0.2,
  })
  const water = new THREE.MeshStandardMaterial({
    emissive: 0x111111,
    emissiveIntensity: 0.18,
    roughness: 0.38,
  })
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      outdoor: {
        emissiveMaterials: [
          { material: reflection, role: 'waterReflection' },
          { material: water, role: 'lakeWater' },
        ],
      },
    },
  })
  const dayOpacity = reflection.opacity
  const dayRoughness = water.roughness

  clock.minutes = 16.75 * 60
  cycle.update()
  assert.ok(reflection.opacity > dayOpacity)
  assert.ok(water.roughness < dayRoughness)
})

test('photo scoring APIs are normalized, spatial and peak in their intended windows', () => {
  const scene = new THREE.Scene()
  const clock = { minutes: 17 * 60 }
  const practical = new THREE.PointLight(0xffffff, 8, 10)
  practical.position.set(2, 2, 0)
  scene.add(practical)
  const cycle = new DayNightCycle({
    scene,
    clock,
    lighting: {
      outdoor: {
        pointLights: [{ light: practical, baseIntensity: 8, role: 'shop' }],
      },
    },
  })

  assert.equal(cycle.getGoldenHourScore(), 1)
  assert.equal(cycle.getBlueHourScore(), 0)
  const nearQuality = cycle.getLightQualityAt(new THREE.Vector3(2, 1, 0))
  const farQuality = cycle.getLightQualityAt(new THREE.Vector3(80, 1, 0))
  assert.ok(nearQuality >= farQuality)
  assert.ok(nearQuality >= 0 && nearQuality <= 1)

  const subjectScore = cycle.getSubjectLightingScore(new THREE.Box3(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(4, 4, 1),
  ))
  assert.ok(subjectScore >= 0 && subjectScore <= 1)

  clock.minutes = 18.45 * 60
  cycle.update()
  assert.equal(cycle.getBlueHourScore(), 1)
  assert.equal(cycle.getGoldenHourScore(), 0)
  assert.throws(() => cycle.getLightQualityAt({ x: 0, y: 0 }), TypeError)
  assert.throws(() => cycle.getSubjectLightingScore({}), TypeError)
})
