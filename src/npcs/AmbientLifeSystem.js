import * as THREE from 'three'
import { NpcActor } from './NpcActor.js'
import { NpcManager } from './NpcManager.js'
import { getSharedNpcResources, NPC_PALETTE } from './NpcResources.js'
import { NpcSpatialGrid } from './NpcSpatialGrid.js'
import {
  AMBIENT_QUALITY_PRESETS,
  getAmbientProfile,
  getAmbientTimeDensity,
} from './ambientLifeProfiles.js'

const MAX_NEAR_ACTORS = AMBIENT_QUALITY_PRESETS.high.near
const MAX_MID_ACTORS = AMBIENT_QUALITY_PRESETS.high.mid
const MAX_FAR_ACTORS = AMBIENT_QUALITY_PRESETS.high.far
const AUTO_QUALITY_SAMPLE_SECONDS = 6
const AUTO_QUALITY_MIN_FPS = 55
const MID_UPDATE_INTERVAL = 0.25
const PRESET_ROTATION = Object.freeze([
  'student', 'tourist', 'officeWorker', 'middleAged',
  'elderly', 'child', 'churchVisitor', 'motorbikeDriver',
])
const MID_COLORS = Object.freeze([
  NPC_PALETTE.mustard,
  NPC_PALETTE.teal,
  NPC_PALETTE.terracotta,
  NPC_PALETTE.blue,
  NPC_PALETTE.cream,
  NPC_PALETTE.sage,
  NPC_PALETTE.maroon,
])

function clampTarget(value, max, minimum) {
  return Math.min(max, Math.max(minimum, Math.round(value)))
}

function behaviorForActivity(activity) {
  if (activity === 'walk' || activity === 'cycle') return 'walker'
  if (activity === 'sit' || activity === 'read' || activity === 'drink') return 'seated'
  if (activity === 'takePhoto' || activity === 'recordVideo') return 'photographer'
  return 'standing'
}

function isBlocked(area, x, z, margin = 0.2) {
  const bounds = area?.bounds
  if (
    bounds
    && (
      x < bounds.minX + margin
      || x > bounds.maxX - margin
      || z < bounds.minZ + margin
      || z > bounds.maxZ - margin
    )
  ) return true
  return (area?.colliders ?? []).some((collider) => (
    !collider.disabled
    && !collider.dynamic
    && x > collider.minX - margin
    && x < collider.maxX + margin
    && z > collider.minZ - margin
    && z < collider.maxZ + margin
  ))
}

function corridorSpan(area, position) {
  if (!['walk', 'cycle'].includes(position.activity)) return 0
  for (let span = position.activity === 'cycle' ? 7 : 5; span >= 0.8; span -= 0.7) {
    let clear = true
    for (let sample = -1; sample <= 1; sample += 0.25) {
      const x = position.x + Math.sin(position.facing) * span * sample
      const z = position.z + Math.cos(position.facing) * span * sample
      if (isBlocked(area, x, z, 0.24)) {
        clear = false
        break
      }
    }
    if (clear) return span
  }
  return 0
}

export function resolveAmbientStagingPoints(points, area, {
  minimumSpacing = 0.72,
  searchRadius = 12,
} = {}) {
  if (!area) return points.map((position) => ({ ...position, y: 0 }))
  const resolved = []
  const spacingSquared = minimumSpacing * minimumSpacing
  const isOccupied = (x, z) => resolved.some((position) => (
    (position.x - x) ** 2 + (position.z - z) ** 2 < spacingSquared
  ))
  for (const source of points) {
    let candidate = null
    for (let radius = 0; radius <= searchRadius && !candidate; radius += 0.75) {
      const steps = radius === 0 ? 1 : 16
      for (let index = 0; index < steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2
        const x = source.x + Math.cos(angle) * radius
        const z = source.z + Math.sin(angle) * radius
        if (isBlocked(area, x, z) || isOccupied(x, z)) continue
        candidate = {
          ...source,
          x,
          z,
          y: area.groundSampler?.({ x, z }) ?? area.groundHeight ?? 0,
        }
        candidate.movementSpan = corridorSpan(area, candidate)
        if (
          ['walk', 'cycle'].includes(candidate.activity)
          && candidate.movementSpan < 0.8
        ) candidate.activity = 'idle'
        break
      }
    }
    if (candidate) resolved.push(candidate)
  }
  return resolved
}

class AmbientInstanceTier {
  constructor({
    parent,
    maxCount,
    name,
    far = false,
    resources = getSharedNpcResources(),
  }) {
    this.maxCount = maxCount
    this.far = far
    this.count = 0
    this.elapsed = 0
    this.worldTime = 0
    this.points = []
    this.dummy = new THREE.Object3D()
    this.colors = MID_COLORS.map((color) => new THREE.Color(color))
    this.skinColors = [
      new THREE.Color(NPC_PALETTE.skinLight),
      new THREE.Color(NPC_PALETTE.skinWarm),
    ]
    this.legColors = [
      new THREE.Color(NPC_PALETTE.charcoal),
      new THREE.Color(NPC_PALETTE.denim),
    ]
    this.agents = Array.from({ length: maxCount }, () => ({
      progress: 0,
      direction: 1,
      speed: 0.16,
      span: 0,
    }))
    this.group = new THREE.Group()
    this.group.name = name
    parent.add(this.group)

    this.material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
      transparent: far,
      opacity: far ? 0.72 : 1,
      depthWrite: !far,
    })
    const bodyGeometry = resources.getGeometry(far ? 'tapered' : 'tapered')
    const headGeometry = resources.getGeometry('head')
    const legGeometry = resources.getGeometry('cylinder')
    this.body = new THREE.InstancedMesh(bodyGeometry, this.material, maxCount)
    this.head = new THREE.InstancedMesh(headGeometry, this.material, maxCount)
    this.legs = far
      ? null
      : new THREE.InstancedMesh(legGeometry, this.material, maxCount * 2)
    this.body.name = `${name} · thân`
    this.head.name = `${name} · đầu`
    this.body.castShadow = false
    this.head.castShadow = false
    this.body.receiveShadow = false
    this.head.receiveShadow = false
    this.body.raycast = () => {}
    this.head.raycast = () => {}
    this.body.frustumCulled = false
    this.head.frustumCulled = false
    this.group.add(this.body, this.head)
    if (this.legs) {
      this.legs.name = `${name} · chân`
      this.legs.castShadow = false
      this.legs.receiveShadow = false
      this.legs.raycast = () => {}
      this.legs.frustumCulled = false
      this.group.add(this.legs)
    }
  }

  configure(points, count) {
    this.points = points
    this.count = Math.min(count, points.length, this.maxCount)
    this.body.count = this.count
    this.head.count = this.count
    if (this.legs) this.legs.count = this.count * 2
    for (let index = 0; index < this.count; index += 1) {
      const agent = this.agents[index]
      agent.progress = ((index * 0.173) % 1) * 2 - 1
      agent.direction = index % 2 ? 1 : -1
      agent.speed = 0.12 + (index % 5) * 0.018
      agent.span = this.far ? 0 : Math.min(
        points[index].movementSpan ?? 3.2 + (index % 3),
        3.2 + (index % 3),
      )
    }
    this.#writeMatrices(0)
    this.group.visible = this.count > 0
  }

  update(deltaTime) {
    if (this.far || this.count === 0) return 0
    const delta = Math.min(Math.max(deltaTime, 0), 0.1)
    this.elapsed += delta
    this.worldTime += delta
    if (this.elapsed < MID_UPDATE_INTERVAL) return 0
    const step = this.elapsed
    this.elapsed = 0
    for (let index = 0; index < this.count; index += 1) {
      const agent = this.agents[index]
      if (agent.span <= 0) continue
      agent.progress += agent.direction * agent.speed * step
      if (Math.abs(agent.progress) >= 1) {
        agent.progress = Math.sign(agent.progress)
        agent.direction *= -1
      }
    }
    this.#writeMatrices(this.worldTime)
    return this.count
  }

  #writeMatrices(time) {
    let legIndex = 0
    for (let index = 0; index < this.count; index += 1) {
      const source = this.points[index]
      const agent = this.agents[index]
      const travel = agent.progress * agent.span
      const x = source.x + Math.sin(source.facing) * travel
      const z = source.z + Math.cos(source.facing) * travel
      const bob = this.far ? 0 : Math.sin(time * 2.1 + index) * 0.012
      const color = this.colors[index % this.colors.length]

      const groundY = source.y ?? 0
      this.dummy.position.set(x, groundY + 1.03 + bob, z)
      this.dummy.rotation.set(0, source.facing, 0)
      this.dummy.scale.set(this.far ? 0.62 : 0.64, this.far ? 1.15 : 1.05, this.far ? 0.46 : 0.52)
      this.dummy.updateMatrix()
      this.body.setMatrixAt(index, this.dummy.matrix)
      this.body.setColorAt(index, color)

      this.dummy.position.set(x, groundY + (this.far ? 1.68 : 1.61 + bob), z)
      this.dummy.scale.setScalar(this.far ? 0.31 : 0.29)
      this.dummy.updateMatrix()
      this.head.setMatrixAt(index, this.dummy.matrix)
      this.head.setColorAt(index, this.skinColors[index % 4 === 0 ? 0 : 1])

      if (!this.legs) continue
      for (const side of [-1, 1]) {
        this.dummy.position.set(
          x + Math.cos(source.facing) * side * 0.16,
          groundY + 0.43,
          z - Math.sin(source.facing) * side * 0.16,
        )
        this.dummy.scale.set(0.2, 0.82, 0.2)
        this.dummy.updateMatrix()
        this.legs.setMatrixAt(legIndex, this.dummy.matrix)
        this.legs.setColorAt(legIndex, this.legColors[index % 2])
        legIndex += 1
      }
    }
    for (const mesh of [this.body, this.head, this.legs]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible) && this.count > 0
  }

  dispose() {
    this.group.removeFromParent()
    this.material.dispose()
  }
}

/**
 * Continuous background life, deliberately separate from Moment resources.
 * The fixed pools are restaged per district; no actor is registered as a
 * named/moment NPC and none owns a gameplay collider.
 */
export class AmbientLifeSystem {
  constructor({
    areaRoots,
    areaDefinitions = null,
    playerPosition,
    profiler = null,
    quality = 'high',
  }) {
    this.areaRoots = areaRoots
    this.areaDefinitions = areaDefinitions
    this.playerPosition = playerPosition
    this.profiler = profiler
    this.quality = AMBIENT_QUALITY_PRESETS[quality] ? quality : 'high'
    this.autoQuality = true
    this.autoQualityFrames = 0
    this.autoQualityElapsed = 0
    this.lastAverageFps = 60
    this.profile = null
    this.areaName = null
    this.hourBucket = null
    this.lastNearUpdated = 0
    this.lastMidUpdated = 0
    this.spatialGrid = new NpcSpatialGrid(14)
    this.resolvedProfiles = new Map()
    this.root = new THREE.Group()
    this.root.name = 'Ambient life · pool ba tầng'

    this.manager = new NpcManager(playerPosition, {
      farUpdateDistance: 24,
      farUpdateInterval: 0.25,
      shadowDetailDistance: 20,
      shadowLimit: AMBIENT_QUALITY_PRESETS[this.quality].shadowCasters,
    })
    this.nearActors = Array.from({ length: MAX_NEAR_ACTORS }, (_, index) => {
      const actor = new NpcActor({
        parent: this.root,
        preset: PRESET_ROTATION[index % PRESET_ROTATION.length],
        name: `Ambient ${index + 1}`,
        position: [100000 + index, 0, 100000],
        behavior: 'standing',
        colliders: null,
        active: false,
        castShadow: true,
        animationOffset: index * 0.61,
      })
      this.manager.add(actor, {
        area: 'ambient',
        role: 'ambientLife',
        active: false,
      })
      return actor
    })
    this.midTier = new AmbientInstanceTier({
      parent: this.root,
      maxCount: MAX_MID_ACTORS,
      name: 'Ambient LOD trung bình · instanced',
    })
    this.farTier = new AmbientInstanceTier({
      parent: this.root,
      maxCount: MAX_FAR_ACTORS,
      name: 'Ambient LOD xa · silhouette instanced',
      far: true,
    })
    this.#deactivate()
  }

  setProfiler(profiler) {
    this.profiler = profiler
    this.manager.setProfiler(profiler)
  }

  setQualityPreset(quality, { automatic = false } = {}) {
    if (!AMBIENT_QUALITY_PRESETS[quality] || quality === this.quality) return false
    this.quality = quality
    if (!automatic) this.autoQuality = false
    this.manager.setShadowLimit(AMBIENT_QUALITY_PRESETS[quality].shadowCasters)
    if (this.profile) this.#configure(this.profile, this.lastHour ?? 12)
    return true
  }

  update(deltaTime, clock, activeAreaName) {
    const startedAt = this.profiler?.begin() ?? 0
    this.#samplePerformance(deltaTime)
    const nextProfile = getAmbientProfile(activeAreaName, this.playerPosition)
    const hour = (clock?.minutes ?? 720) / 60
    this.lastHour = hour
    const nextHourBucket = getAmbientTimeDensity(hour)
    if (nextProfile !== this.profile || nextHourBucket !== this.hourBucket) {
      this.profile = nextProfile
      this.hourBucket = nextHourBucket
      if (nextProfile) this.#configure(nextProfile, hour)
      else this.#deactivate()
    }
    if (!this.profile) {
      this.profiler?.end('npc', startedAt)
      return
    }

    this.manager.update(deltaTime, 'ambient')
    this.lastNearUpdated = this.manager.lastUpdatedCount
    this.lastMidUpdated = this.midTier.update(deltaTime)
    this.spatialGrid.rebuild(
      this.manager.entries.filter((entry) => entry.actor.active),
      (entry) => entry.actor.position,
    )
    this.profiler?.end('npc', startedAt)
  }

  getNearbyPhotoSubjects(position, radius = 42) {
    return this.spatialGrid.query(
      position,
      radius,
      (entry) => entry.actor.active && entry.actor.ready && !entry.actor.disabled,
    ).map((entry, index) => ({
      id: `ambient-${this.profile?.id ?? 'none'}-${index + 1}`,
      name: entry.actor.preset?.label ?? 'Người qua đường',
      kind: 'person',
      role: 'ambientLife',
      presetId: entry.actor.preset?.id ?? null,
      object: entry.actor.group,
    }))
  }

  getStats() {
    return {
      quality: this.quality,
      autoQuality: this.autoQuality,
      averageFps: Math.round(this.lastAverageFps),
      region: this.profile?.id ?? null,
      regionLabel: this.profile?.label ?? null,
      near: this.manager.getActiveCount('ambient'),
      mid: this.midTier.count,
      far: this.farTier.count,
      nearUpdated: this.lastNearUpdated,
      midUpdated: this.lastMidUpdated,
      spatialCells: this.spatialGrid.cells.size,
      shadowCasters: AMBIENT_QUALITY_PRESETS[this.quality].shadowCasters,
    }
  }

  #configure(profile, hour) {
    const areaRoot = this.areaRoots[profile.area]
    if (areaRoot && this.root.parent !== areaRoot) areaRoot.add(this.root)
    this.root.visible = true
    this.areaName = profile.area
    const preset = AMBIENT_QUALITY_PRESETS[this.quality]
    let staging = this.resolvedProfiles.get(profile.id)
    if (!staging) {
      const area = this.areaDefinitions?.[profile.area] ?? null
      staging = {
        near: resolveAmbientStagingPoints(profile.near, area),
        mid: resolveAmbientStagingPoints(profile.mid, area, {
          minimumSpacing: 1.15,
          searchRadius: 15,
        }),
        far: resolveAmbientStagingPoints(profile.far, area, {
          minimumSpacing: 1.5,
          searchRadius: 18,
        }),
      }
      this.resolvedProfiles.set(profile.id, staging)
    }
    const density = getAmbientTimeDensity(hour) * profile.density
    const nearMinimum = this.quality === 'high' ? 12 : this.quality === 'medium' ? 9 : 6
    const midMinimum = this.quality === 'high' ? 15 : this.quality === 'medium' ? 12 : 8
    const nearCount = clampTarget(preset.near * density, preset.near, nearMinimum)
    const midCount = clampTarget(preset.mid * density, preset.mid, midMinimum)
    const farCount = clampTarget(preset.far * density, preset.far, 12)

    this.manager.entries.forEach((entry, index) => {
      const actor = entry.actor
      const slot = staging.near[index]
      actor.stopActivity({ transitionDuration: 0 })
      if (index >= nearCount || !slot) {
        this.manager.setEntryActive(entry, false)
        return
      }
      const behavior = behaviorForActivity(slot.activity)
      actor.setPosition(slot.x, slot.y ?? 0, slot.z)
      actor.group.rotation.y = slot.facing
      actor.setBehavior(behavior)
      if (behavior === 'walker') {
        const span = slot.movementSpan ?? (slot.activity === 'cycle' ? 7 : 5)
        const dx = Math.sin(slot.facing) * span
        const dz = Math.cos(slot.facing) * span
        actor.setWaypoints([
          [slot.x - dx, slot.z - dz],
          [slot.x + dx, slot.z + dz],
        ])
      } else {
        actor.setWaypoints([])
      }
      if (!['walk', 'idle'].includes(slot.activity)) {
        actor.playActivity(slot.activity, {
          duration: Infinity,
          loop: true,
          speed: slot.activity === 'cycle' ? 0.72 : 0.85 + (index % 3) * 0.08,
          transitionDuration: 0,
          props: slot.activity === 'cycle'
            ? [{
                type: slot.vehicle === 'motorbike' ? 'motorbike' : 'bicycle',
                mount: 'root',
              }]
            : undefined,
        })
      }
      this.manager.setEntryActive(entry, true)
    })

    this.manager.setShadowLimit(preset.shadowCasters)
    this.midTier.configure(staging.mid, midCount)
    this.farTier.configure(staging.far, farCount)
  }

  #samplePerformance(deltaTime) {
    if (!this.autoQuality || !Number.isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 0.12) return
    this.autoQualityElapsed += deltaTime
    this.autoQualityFrames += 1
    if (this.autoQualityElapsed < AUTO_QUALITY_SAMPLE_SECONDS) return
    this.lastAverageFps = this.autoQualityFrames / this.autoQualityElapsed
    this.autoQualityElapsed = 0
    this.autoQualityFrames = 0
    if (this.lastAverageFps >= AUTO_QUALITY_MIN_FPS) return
    if (this.quality === 'high') this.setQualityPreset('medium', { automatic: true })
    else if (this.quality === 'medium' && this.lastAverageFps < 48) {
      this.setQualityPreset('low', { automatic: true })
    }
  }

  #deactivate() {
    this.root.visible = false
    this.profile = null
    this.areaName = null
    this.manager.entries.forEach((entry) => this.manager.setEntryActive(entry, false))
    this.midTier.configure([], 0)
    this.farTier.configure([], 0)
    this.spatialGrid.clear()
    this.lastNearUpdated = 0
    this.lastMidUpdated = 0
  }

  dispose() {
    this.manager.dispose()
    this.midTier.dispose()
    this.farTier.dispose()
    this.spatialGrid.clear()
    this.root.removeFromParent()
  }
}
