import * as THREE from 'three'

const FAR_AWAY = new THREE.Vector3(100000, 0, 100000)

export class NpcManager {
  constructor(playerPosition) {
    this.playerPosition = playerPosition
    this.entries = []
    this.elapsed = 0
    this.activationQueue = []
    this.context = { playerPosition: FAR_AWAY }
  }

  add(actor, { area = 'outdoor', role = 'ambient', active = false } = {}) {
    const entry = {
      actor,
      area,
      role,
      desiredActive: Boolean(active),
      activationVersion: 0,
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
    const delta = Math.min(Math.max(deltaTime, 0), 0.05)
    this.elapsed += delta
    this.#flushActivationQueue()

    for (const entry of this.entries) {
      if (!entry.actor.active) continue
      this.context.playerPosition = entry.area === activeAreaName
        ? this.playerPosition
        : FAR_AWAY
      entry.actor.update(delta, this.context)
    }
  }

  getInteractions(areaName) {
    const interactions = []
    for (const entry of this.entries) {
      if (entry.area !== areaName) continue
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
