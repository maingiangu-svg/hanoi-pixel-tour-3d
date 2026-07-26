const FAR_UPDATE_DISTANCE_SQUARED = 30 * 30
const FAR_UPDATE_INTERVAL = 0.24
const SHADOW_DETAIL_DISTANCE_SQUARED = 18 * 18

export class NpcManager {
  constructor(playerPosition, {
    farUpdateDistance = Math.sqrt(FAR_UPDATE_DISTANCE_SQUARED),
    farUpdateInterval = FAR_UPDATE_INTERVAL,
    shadowDetailDistance = Math.sqrt(SHADOW_DETAIL_DISTANCE_SQUARED),
    shadowLimit = Infinity,
  } = {}) {
    this.playerPosition = playerPosition
    this.entries = []
    this.elapsed = 0
    this.activationQueue = []
    this.context = { playerPosition }
    this.profiler = null
    this.lastUpdatedCount = 0
    this.lastSkippedAreaCount = 0
    this.farUpdateDistanceSquared = farUpdateDistance * farUpdateDistance
    this.farUpdateInterval = farUpdateInterval
    this.shadowDetailDistanceSquared = shadowDetailDistance * shadowDetailDistance
    this.shadowLimit = shadowLimit
    this.shadowCandidates = []
  }

  setProfiler(profiler) {
    this.profiler = profiler
  }

  setShadowLimit(limit) {
    this.shadowLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : Infinity
  }

  add(actor, { area = 'outdoor', role = 'ambient', active = false } = {}) {
    const entry = {
      actor,
      area,
      role,
      desiredActive: Boolean(active),
      activationVersion: 0,
      farUpdateElapsed: 0,
      shadowDetailed: null,
      distanceSquared: Infinity,
      wantsDetailedShadow: false,
    }
    actor.setActive(false)
    this.entries.push(entry)
    if (active) this.setEntryActive(entry, true)
    return actor
  }

  entriesForRole(role) {
    return this.entries.filter((entry) => entry.role === role)
  }

  setRoleActive(role, active, { stagger = 0.12 } = {}) {
    const matching = this.entries.filter((entry) => entry.role === role)
    matching.forEach((entry, index) => {
      this.setEntryActive(entry, active, active ? stagger * index : 0)
    })
  }

  setEntryActive(entry, active, delay = 0) {
    const nextActive = Boolean(active)
    if (entry.desiredActive === nextActive && entry.actor.active === nextActive) return
    entry.desiredActive = nextActive
    entry.activationVersion += 1
    const version = entry.activationVersion
    if (delay <= 0) {
      entry.actor.setActive(nextActive)
      return
    }
    this.activationQueue.push({
      entry,
      active: nextActive,
      at: this.elapsed + delay,
      version,
    })
  }

  update(deltaTime, activeAreaName) {
    const startedAt = this.profiler?.begin() ?? 0
    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    this.elapsed += delta
    this.#flushActivationQueue()
    this.lastUpdatedCount = 0
    this.lastSkippedAreaCount = 0
    this.shadowCandidates.length = 0

    for (const entry of this.entries) {
      if (!entry.actor.active) continue
      if (entry.area !== activeAreaName) {
        this.lastSkippedAreaCount += 1
        continue
      }
      this.context.playerPosition = this.playerPosition
      const position = entry.actor.position
      const hasPosition = Number.isFinite(position?.x) && Number.isFinite(position?.z)
      const distanceSquared = hasPosition
        ? (position.x - this.playerPosition.x) ** 2
          + (position.z - this.playerPosition.z) ** 2
        : 0
      entry.distanceSquared = distanceSquared
      entry.wantsDetailedShadow = false
      if (distanceSquared <= this.shadowDetailDistanceSquared) {
        this.shadowCandidates.push(entry)
      }
      let updateDelta = delta
      if (distanceSquared > this.farUpdateDistanceSquared) {
        entry.farUpdateElapsed += delta
        if (entry.farUpdateElapsed < this.farUpdateInterval) continue
        updateDelta = entry.farUpdateElapsed
        entry.farUpdateElapsed = 0
      } else {
        entry.farUpdateElapsed = 0
      }
      entry.actor.update(updateDelta, this.context)
      this.lastUpdatedCount += 1
    }
    this.shadowCandidates.sort((a, b) => a.distanceSquared - b.distanceSquared)
    const detailedShadowCount = Math.min(
      this.shadowCandidates.length,
      this.shadowLimit,
    )
    for (let index = 0; index < detailedShadowCount; index += 1) {
      this.shadowCandidates[index].wantsDetailedShadow = true
    }
    for (const entry of this.entries) {
      const shadowDetailed = entry.wantsDetailedShadow
      if (entry.shadowDetailed === shadowDetailed) continue
      entry.shadowDetailed = shadowDetailed
      entry.actor.setShadowDetail?.(shadowDetailed)
    }
    this.profiler?.addCount('npcUpdates', this.lastUpdatedCount)
    this.profiler?.end('npc', startedAt)
  }

  getInteractions(areaName, position = null, maxDistance = Infinity) {
    const interactions = []
    const maxDistanceSquared = maxDistance * maxDistance
    for (const entry of this.entries) {
      if (entry.area !== areaName) continue
      if (position) {
        const dx = position.x - entry.actor.position.x
        const dz = position.z - entry.actor.position.z
        if (dx * dx + dz * dz > maxDistanceSquared) continue
      }
      const interaction = entry.actor.getInteraction()
      if (interaction) interactions.push(interaction)
    }
    return interactions
  }

  getActiveCount(areaName = null) {
    return this.entries.reduce((total, entry) => (
      entry.actor.active && (!areaName || entry.area === areaName) ? total + 1 : total
    ), 0)
  }

  findActor(name) {
    return this.entries.find((entry) => entry.actor.name === name)?.actor ?? null
  }

  dispose() {
    this.activationQueue.length = 0
    this.entries.forEach(({ actor }) => actor.dispose())
    this.entries.length = 0
  }

  #flushActivationQueue() {
    let writeIndex = 0
    for (const item of this.activationQueue) {
      if (item.at <= this.elapsed) {
        if (
          item.version === item.entry.activationVersion &&
          item.active === item.entry.desiredActive
        ) item.entry.actor.setActive(item.active)
      } else {
        this.activationQueue[writeIndex] = item
        writeIndex += 1
      }
    }
    this.activationQueue.length = writeIndex
  }
}
