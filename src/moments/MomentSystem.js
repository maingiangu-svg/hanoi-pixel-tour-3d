export const MOMENT_STATES = Object.freeze([
  'inactive',
  'preparing',
  'starting',
  'active',
  'climax',
  'ending',
  'cooldown',
])

const RUNNING_STATES = new Set([
  'preparing',
  'starting',
  'active',
  'climax',
  'ending',
])

const STATE_SEQUENCE = Object.freeze([
  'preparing',
  'starting',
  'active',
  'climax',
  'ending',
])

const DEFAULT_DURATIONS = Object.freeze({
  preparing: 0.5,
  starting: 1,
  active: 8,
  climax: 2,
  ending: 1,
})

const EMPTY_IDS = Object.freeze([])
const RESOURCE_TYPES = Object.freeze([
  'npc',
  'prop',
  'staging',
  'performance-area',
  'audio',
  'interaction',
])
const RESOURCE_FAILURE_POLICIES = new Set(['wait', 'skip', 'cancel'])
const MIN_SCAN_INTERVAL = 0.05
const MAX_STATE_TRANSITIONS_PER_UPDATE = 8
const MINUTE_COUNT = 24 * 60

function clampDelta(deltaTime) {
  if (!Number.isFinite(deltaTime) || deltaTime <= 0) return 0
  return Math.min(deltaTime, 0.25)
}

function normalizeMinutes(value) {
  return ((value % MINUTE_COUNT) + MINUTE_COUNT) % MINUTE_COUNT
}

function normalizePosition(position) {
  const x = Array.isArray(position) ? position[0] : position?.x
  const y = Array.isArray(position) ? position[1] : position?.y
  const z = Array.isArray(position) ? position[2] : position?.z
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new TypeError('Moment position requires finite x and z coordinates')
  }
  return Object.freeze({
    x,
    y: Number.isFinite(y) ? y : 0,
    z,
  })
}

function normalizeTimeWindow(value) {
  const start = Array.isArray(value) ? value[0] : value?.start
  const end = Array.isArray(value) ? value[1] : value?.end
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new TypeError('Moment timeWindow requires finite start and end minutes')
  }
  return Object.freeze({
    start: normalizeMinutes(start),
    end: normalizeMinutes(end),
  })
}

function normalizeDurations(durations = {}) {
  const result = {}
  for (const state of STATE_SEQUENCE) {
    const value = durations[state] ?? DEFAULT_DURATIONS[state]
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Moment duration "${state}" must be a non-negative number`)
    }
    result[state] = value
  }
  return Object.freeze(result)
}

function normalizeIds(value) {
  if (value == null) return EMPTY_IDS
  if (!Array.isArray(value)) throw new TypeError('Moment resource IDs must be arrays')
  return Object.freeze([...new Set(value.map(String))])
}

function createResourceRequirements(definition) {
  const byType = Object.freeze({
    npc: normalizeIds(definition.npcIds ?? definition.npcs),
    prop: normalizeIds(definition.propIds ?? definition.props),
    staging: normalizeIds(definition.stagingIds ?? definition.stagingZones),
    'performance-area': normalizeIds(
      definition.performanceAreaIds ?? definition.performanceAreas,
    ),
    audio: normalizeIds(definition.audioChannelIds ?? definition.audioChannels),
    interaction: normalizeIds(
      definition.interactionPointIds ?? definition.interactionPoints,
    ),
  })
  const all = []
  for (const type of RESOURCE_TYPES) {
    for (const id of byType[type]) all.push(Object.freeze({ type, id }))
  }
  return Object.freeze({ byType, all: Object.freeze(all) })
}

function normalizeDefinition(definition) {
  if (!definition?.id || typeof definition.id !== 'string') {
    throw new TypeError('Moment requires a stable string id')
  }
  const region = definition.region ?? definition.regionId
  if (!region || typeof region !== 'string') {
    throw new TypeError('Moment requires a region or regionId')
  }
  const triggerRadius = definition.triggerRadius ?? definition.radius
  if (!Number.isFinite(triggerRadius) || triggerRadius <= 0) {
    throw new RangeError('Moment triggerRadius must be a positive number')
  }
  const cooldown = definition.cooldown ?? 0
  if (!Number.isFinite(cooldown) || cooldown < 0) {
    throw new RangeError('Moment cooldown must be a non-negative number')
  }
  const maxRepeats = definition.maxRepeats ?? Infinity
  if (
    maxRepeats !== Infinity
    && (!Number.isInteger(maxRepeats) || maxRepeats < 1)
  ) {
    throw new RangeError('Moment maxRepeats must be a positive integer or Infinity')
  }
  const pauseDistance = definition.pauseDistance ?? triggerRadius * 1.5
  const cleanupDistance = definition.cleanupDistance ?? triggerRadius * 2.5
  if (
    !Number.isFinite(pauseDistance)
    || !Number.isFinite(cleanupDistance)
    || pauseDistance < triggerRadius
    || cleanupDistance < pauseDistance
  ) {
    throw new RangeError(
      'Moment distances must satisfy triggerRadius <= pauseDistance <= cleanupDistance',
    )
  }
  const resourceFailurePolicy = definition.resourceFailurePolicy ?? 'wait'
  if (!RESOURCE_FAILURE_POLICIES.has(resourceFailurePolicy)) {
    throw new RangeError('Moment resourceFailurePolicy must be wait, skip, or cancel')
  }
  const typeCooldown = definition.typeCooldown ?? 0
  if (!Number.isFinite(typeCooldown) || typeCooldown < 0) {
    throw new RangeError('Moment typeCooldown must be a non-negative number')
  }
  const exclusionRadius = definition.exclusionRadius ?? Math.min(triggerRadius, 4)
  if (!Number.isFinite(exclusionRadius) || exclusionRadius < 0) {
    throw new RangeError('Moment exclusionRadius must be a non-negative number')
  }
  const resources = createResourceRequirements(definition)

  return Object.freeze({
    id: definition.id,
    region,
    area: definition.area ?? definition.areaId ?? null,
    position: normalizePosition(definition.position ?? definition.triggerPosition),
    triggerRadius,
    pauseDistance,
    cleanupDistance,
    timeWindow: normalizeTimeWindow(definition.timeWindow),
    durations: normalizeDurations(definition.durations),
    cooldown,
    npcIds: resources.byType.npc,
    propIds: resources.byType.prop,
    stagingIds: resources.byType.staging,
    performanceAreaIds: resources.byType['performance-area'],
    audioChannelIds: resources.byType.audio,
    interactionPointIds: resources.byType.interaction,
    resources: resources.all,
    resourceFailurePolicy,
    priority: Number.isFinite(definition.priority) ? definition.priority : 0,
    maxRepeats,
    type: definition.type ?? definition.typeId ?? null,
    typeCooldown,
    exclusionRadius,
    hooks: Object.freeze({ ...(definition.hooks ?? {}) }),
    metadata: Object.freeze({ ...(definition.metadata ?? {}) }),
  })
}

function isWithinTimeWindow(minutes, window) {
  if (!Number.isFinite(minutes)) return false
  const current = normalizeMinutes(minutes)
  if (window.start === window.end) return true
  if (window.start < window.end) {
    return current >= window.start && current <= window.end
  }
  return current >= window.start || current <= window.end
}

function distanceSquared(position, target) {
  if (!position) return Infinity
  const dx = position.x - target.x
  const dz = position.z - target.z
  return dx * dx + dz * dz
}

function contextRegionIds(context) {
  if (Array.isArray(context.regionIds)) return context.regionIds
  if (context.regionId) return [context.regionId]
  return EMPTY_IDS
}

function createRuntime(definition) {
  return {
    definition,
    state: 'inactive',
    stateElapsed: 0,
    paused: false,
    pauseReason: null,
    runCount: 0,
    completedCount: 0,
    runId: 0,
    lastContext: null,
    waiting: false,
    blockedReason: null,
    blockedDetails: EMPTY_IDS,
  }
}

function snapshot(runtime) {
  const stateDuration = runtime.state === 'cooldown'
    ? runtime.definition.cooldown
    : runtime.definition.durations[runtime.state] ?? 0
  return Object.freeze({
    id: runtime.definition.id,
    region: runtime.definition.region,
    area: runtime.definition.area,
    state: runtime.state,
    stateElapsed: runtime.stateElapsed,
    paused: runtime.paused,
    pauseReason: runtime.pauseReason,
    runCount: runtime.runCount,
    completedCount: runtime.completedCount,
    runId: runtime.runId,
    priority: runtime.definition.priority,
    type: runtime.definition.type,
    waiting: runtime.waiting,
    blockedReason: runtime.blockedReason,
    lockedResources: runtime.definition.resources.length,
    stateDuration,
    durations: runtime.definition.durations,
    metadata: runtime.definition.metadata,
  })
}

export class MomentSystem {
  constructor({
    maxConcurrent = 2,
    scanInterval = 0.25,
    resourceResolver = () => true,
    resourceResetter = () => {},
  } = {}) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new RangeError('MomentSystem maxConcurrent must be a positive integer')
    }
    if (!Number.isFinite(scanInterval) || scanInterval < MIN_SCAN_INTERVAL) {
      throw new RangeError(`MomentSystem scanInterval must be at least ${MIN_SCAN_INTERVAL}`)
    }
    if (typeof resourceResolver !== 'function') {
      throw new TypeError('MomentSystem resourceResolver must be a function')
    }
    if (typeof resourceResetter !== 'function') {
      throw new TypeError('MomentSystem resourceResetter must be a function')
    }

    this.maxConcurrent = maxConcurrent
    this.scanInterval = scanInterval
    this.resourceResolver = resourceResolver
    this.resourceResetter = resourceResetter
    this.moments = new Map()
    this.momentsByRegion = new Map()
    this.running = new Set()
    this.cooldowns = new Set()
    this.waiting = new Set()
    this.blocked = new Set()
    this.resourceLocks = new Map()
    this.locksByMoment = new Map()
    this.typeCooldowns = new Map()
    this.scanElapsed = scanInterval
    this.disposed = false
  }

  get size() {
    return this.moments.size
  }

  registerMoment(definition) {
    if (this.disposed) throw new Error('MomentSystem has been disposed')
    const normalized = normalizeDefinition(definition)
    if (this.moments.has(normalized.id)) {
      throw new Error(`Moment id is already registered: ${normalized.id}`)
    }
    const runtime = createRuntime(normalized)
    this.moments.set(normalized.id, runtime)
    let regionMoments = this.momentsByRegion.get(normalized.region)
    if (!regionMoments) {
      regionMoments = new Set()
      this.momentsByRegion.set(normalized.region, regionMoments)
    }
    regionMoments.add(runtime)
    return snapshot(runtime)
  }

  isResourceAvailable(type, id, momentId = null, context = {}) {
    if (!RESOURCE_TYPES.includes(type)) {
      throw new RangeError(`Unknown moment resource type: ${type}`)
    }
    const resourceId = String(id)
    const owner = this.resourceLocks.get(`${type}:${resourceId}`)
    if (owner && owner.momentId !== momentId) return false
    const runtime = momentId ? this.moments.get(momentId) : null
    return this.#physicalResourceAvailable(
      type,
      resourceId,
      runtime?.definition ?? null,
      context,
    )
  }

  getResourceOwner(type, id) {
    return this.resourceLocks.get(`${type}:${String(id)}`)?.momentId ?? null
  }

  requestResources(id, context = {}) {
    const runtime = this.#requireMoment(id)
    const conflicts = []
    for (const resource of runtime.definition.resources) {
      const key = `${resource.type}:${resource.id}`
      const owner = this.resourceLocks.get(key)
      if (owner && owner.momentId !== id) {
        conflicts.push(Object.freeze({
          ...resource,
          reason: 'locked',
          owner: owner.momentId,
        }))
        continue
      }
      if (!this.#physicalResourceAvailable(
        resource.type,
        resource.id,
        runtime.definition,
        context,
      )) {
        conflicts.push(Object.freeze({
          ...resource,
          reason: 'unavailable',
          owner: null,
        }))
      }
    }
    if (conflicts.length) {
      return Object.freeze({
        acquired: false,
        reason: conflicts.some((conflict) => conflict.reason === 'locked')
          ? 'resource-locked'
          : 'resource-unavailable',
        conflicts: Object.freeze(conflicts),
      })
    }

    let owned = this.locksByMoment.get(id)
    if (!owned) {
      owned = new Set()
      this.locksByMoment.set(id, owned)
    }
    const newlyAcquired = []
    for (const resource of runtime.definition.resources) {
      const key = `${resource.type}:${resource.id}`
      if (!this.resourceLocks.has(key)) {
        this.resourceLocks.set(key, Object.freeze({
          momentId: id,
          type: resource.type,
          id: resource.id,
        }))
        newlyAcquired.push(key)
      }
      owned.add(key)
    }
    if (newlyAcquired.length) {
      runtime.definition.hooks.onResourcesAcquired?.(
        snapshot(runtime),
        Object.freeze(newlyAcquired),
        context,
      )
    }
    return Object.freeze({
      acquired: true,
      reason: null,
      conflicts: EMPTY_IDS,
    })
  }

  releaseResources(id, context = {}, reason = 'released') {
    const runtime = this.#requireMoment(id)
    const owned = this.locksByMoment.get(id)
    if (!owned?.size) return 0
    let released = 0
    for (const key of owned) {
      const owner = this.resourceLocks.get(key)
      if (owner?.momentId !== id) continue
      this.resourceLocks.delete(key)
      this.resourceResetter(
        owner.type,
        owner.id,
        runtime.definition,
        context,
        reason,
      )
      released += 1
    }
    owned.clear()
    this.locksByMoment.delete(id)
    runtime.definition.hooks.onResourcesReleased?.(
      snapshot(runtime),
      reason,
      context,
    )
    return released
  }

  canActivateMoment(id, context = {}) {
    const runtime = this.#requireMoment(id)
    const definition = runtime.definition
    if (runtime.state !== 'inactive') {
      return this.#activationResult(false, 'state-not-inactive')
    }
    if (runtime.runCount >= definition.maxRepeats) {
      return this.#activationResult(false, 'repeat-limit')
    }
    if (this.#runningCount() >= this.maxConcurrent) {
      return this.#activationResult(false, 'concurrency-limit')
    }
    if (!contextRegionIds(context).includes(definition.region)) {
      return this.#activationResult(false, 'wrong-region')
    }
    if (definition.area && definition.area !== context.areaId) {
      return this.#activationResult(false, 'wrong-area')
    }
    if (!isWithinTimeWindow(context.gameMinutes, definition.timeWindow)) {
      return this.#activationResult(false, 'outside-time-window')
    }
    if (
      distanceSquared(context.playerPosition, definition.position)
      > definition.triggerRadius ** 2
    ) {
      return this.#activationResult(false, 'outside-trigger-radius')
    }
    if (
      definition.type
      && (this.typeCooldowns.get(definition.type) ?? 0) > 0
    ) {
      return this.#activationResult(false, 'type-cooldown')
    }
    if (
      definition.type
      && [...this.running].some((owner) => (
        owner.definition.id !== definition.id
        && owner.definition.type === definition.type
      ))
    ) {
      return this.#activationResult(false, 'type-active')
    }

    const spatialOwner = this.#findSpatialConflict(runtime)
    if (spatialOwner) {
      return this.#activationResult(
        false,
        'performance-area-conflict',
        [spatialOwner.definition.id],
      )
    }
    const resourceCheck = this.#inspectResourceConflicts(runtime, context)
    if (resourceCheck.conflicts.length) {
      return this.#activationResult(
        false,
        resourceCheck.reason,
        resourceCheck.conflicts,
      )
    }
    return this.#activationResult(true, null)
  }

  selectNextMoment(context = {}) {
    const candidates = this.#getRegionCandidates(context)
      .filter((runtime) => this.canActivateMoment(runtime.definition.id, context).canActivate)
      .sort((left, right) => this.#compareCandidates(left, right, context))
    return candidates.length ? snapshot(candidates[0]) : null
  }

  startMoment(id, context = {}) {
    const runtime = this.#requireMoment(id)
    const activation = this.canActivateMoment(id, context)
    if (!activation.canActivate) {
      this.#setBlocked(
        runtime,
        activation.reason,
        activation.conflicts,
        runtime.definition.resourceFailurePolicy === 'wait',
      )
      return false
    }
    const resources = this.requestResources(id, context)
    if (!resources.acquired) {
      this.#setBlocked(
        runtime,
        resources.reason,
        resources.conflicts,
        runtime.definition.resourceFailurePolicy === 'wait',
      )
      return false
    }

    runtime.runCount += 1
    runtime.runId += 1
    runtime.paused = false
    runtime.pauseReason = null
    runtime.lastContext = context
    this.#clearBlocked(runtime)
    this.running.add(runtime)
    this.#enterState(runtime, 'preparing', context)
    return true
  }

  updateMoment(id, deltaTime, context = {}) {
    const runtime = this.#requireMoment(id)
    const delta = clampDelta(deltaTime)
    if (RUNNING_STATES.has(runtime.state)) {
      this.#updateRunningMoment(runtime, delta, context)
    } else if (runtime.state === 'cooldown') {
      this.#updateCooldown(runtime, delta, context)
    }
    return snapshot(runtime)
  }

  pauseMoment(id, reason = 'manual') {
    const runtime = this.#requireMoment(id)
    if (!RUNNING_STATES.has(runtime.state) || runtime.paused) return false
    runtime.paused = true
    runtime.pauseReason = reason
    runtime.definition.hooks.onPause?.(snapshot(runtime), reason)
    return true
  }

  resumeMoment(id, context = {}) {
    const runtime = this.#requireMoment(id)
    if (!RUNNING_STATES.has(runtime.state) || !runtime.paused) return false
    if (!this.#matchesContext(runtime, context, false)) return false
    if (this.#inspectResourceConflicts(runtime, context).conflicts.length) return false
    runtime.paused = false
    runtime.pauseReason = null
    runtime.lastContext = context
    runtime.definition.hooks.onResume?.(snapshot(runtime), context)
    return true
  }

  completeMoment(id, context = {}) {
    const runtime = this.#requireMoment(id)
    if (!RUNNING_STATES.has(runtime.state)) return false
    runtime.completedCount += 1
    runtime.definition.hooks.onComplete?.(snapshot(runtime), context)
    this.#cleanupRuntime(runtime, context, 'completed')
    this.#enterCooldown(runtime, context)
    return true
  }

  cancelMoment(id, reason = 'cancelled', context = {}) {
    const runtime = this.#requireMoment(id)
    if (runtime.state === 'inactive') {
      const hadLocks = (this.locksByMoment.get(id)?.size ?? 0) > 0
      if (!hadLocks && !runtime.waiting) return false
      runtime.definition.hooks.onCancel?.(snapshot(runtime), reason, context)
      this.releaseResources(id, context, reason)
      this.#clearBlocked(runtime)
      return true
    }
    if (runtime.state === 'cooldown') {
      this.#enterState(runtime, 'inactive', context)
      return true
    }
    runtime.definition.hooks.onCancel?.(snapshot(runtime), reason, context)
    this.#cleanupRuntime(runtime, context, reason)
    this.#enterCooldown(runtime, context)
    return true
  }

  getActiveMoments() {
    return [...this.running]
      .sort((left, right) => right.definition.priority - left.definition.priority)
      .map(snapshot)
  }

  getMomentState(id) {
    return snapshot(this.#requireMoment(id))
  }

  getDebugSnapshot() {
    return Object.freeze({
      running: Object.freeze(this.getActiveMoments()),
      waiting: Object.freeze([...this.waiting].map(snapshot)),
      locks: Object.freeze([...this.resourceLocks.entries()].map(([key, owner]) => (
        Object.freeze({ key, owner: owner.momentId })
      ))),
      blocked: Object.freeze([...this.blocked].map((runtime) => Object.freeze({
        id: runtime.definition.id,
        reason: runtime.blockedReason,
        details: runtime.blockedDetails,
      }))),
      typeCooldowns: Object.freeze([...this.typeCooldowns.entries()].map(([type, remaining]) => (
        Object.freeze({ type, remaining })
      ))),
    })
  }

  update(deltaTime, context = {}) {
    if (this.disposed || this.moments.size === 0) return EMPTY_IDS
    if (context.paused) return this.getActiveMoments()
    const delta = clampDelta(deltaTime)

    for (const [type, remaining] of this.typeCooldowns) {
      const next = remaining - delta
      if (next <= 0) this.typeCooldowns.delete(type)
      else this.typeCooldowns.set(type, next)
    }
    for (const runtime of [...this.cooldowns]) {
      this.#updateCooldown(runtime, delta, context)
    }
    for (const runtime of [...this.running]) {
      this.#updateRunningMoment(runtime, delta, context)
    }

    this.scanElapsed += delta
    if (this.scanElapsed < this.scanInterval) return this.getActiveMoments()
    this.scanElapsed %= this.scanInterval
    this.#scanNearbyMoments(context)
    return this.getActiveMoments()
  }

  #scanNearbyMoments(context) {
    for (const runtime of [...this.waiting]) {
      if (!this.#matchesContext(runtime, context, true)) this.#clearBlocked(runtime)
    }
    const candidates = this.#getRegionCandidates(context)
      .sort((left, right) => this.#compareCandidates(left, right, context))
    for (const runtime of candidates) {
      const activation = this.canActivateMoment(runtime.definition.id, context)
      if (activation.canActivate) {
        this.startMoment(runtime.definition.id, context)
        continue
      }
      if (
        activation.reason === 'wrong-region'
        || activation.reason === 'wrong-area'
        || activation.reason === 'outside-time-window'
        || activation.reason === 'outside-trigger-radius'
        || activation.reason === 'repeat-limit'
      ) {
        this.#clearBlocked(runtime)
        continue
      }
      const policy = runtime.definition.resourceFailurePolicy
      this.#setBlocked(
        runtime,
        activation.reason,
        activation.conflicts,
        policy === 'wait',
      )
      if (policy === 'cancel') {
        runtime.definition.hooks.onCancel?.(
          snapshot(runtime),
          activation.reason,
          context,
        )
        this.#clearBlocked(runtime)
        this.#enterCooldown(runtime, context)
      }
    }
  }

  #updateRunningMoment(runtime, delta, context) {
    const definition = runtime.definition
    const regions = contextRegionIds(context)
    if (
      !regions.includes(definition.region)
      || (definition.area && definition.area !== context.areaId)
    ) {
      this.cancelMoment(definition.id, 'region-changed', context)
      return
    }

    const cancellationReason = definition.hooks.shouldCancel?.(
      snapshot(runtime),
      context,
    )
    if (cancellationReason) {
      this.cancelMoment(
        definition.id,
        typeof cancellationReason === 'string'
          ? cancellationReason
          : 'condition-failed',
        context,
      )
      return
    }

    const squaredDistance = distanceSquared(context.playerPosition, definition.position)
    if (squaredDistance > definition.cleanupDistance ** 2) {
      this.cancelMoment(definition.id, 'player-too-far', context)
      return
    }
    const resourceConflicts = this.#inspectResourceConflicts(runtime, context)
    if (resourceConflicts.conflicts.length) {
      if (definition.resourceFailurePolicy === 'wait') {
        if (!runtime.paused) this.pauseMoment(definition.id, resourceConflicts.reason)
      } else {
        this.cancelMoment(definition.id, resourceConflicts.reason, context)
      }
      return
    }
    if (squaredDistance > definition.pauseDistance ** 2) {
      if (!runtime.paused) this.pauseMoment(definition.id, 'out-of-range')
      return
    }
    if (
      runtime.paused
      && (runtime.pauseReason === 'out-of-range'
        || runtime.pauseReason === 'resource-unavailable'
        || runtime.pauseReason === 'resource-locked')
    ) {
      this.resumeMoment(definition.id, context)
    }
    if (runtime.paused || delta <= 0) return

    runtime.lastContext = context
    runtime.definition.hooks.onUpdate?.(snapshot(runtime), delta, context)
    runtime.stateElapsed += delta
    let transitions = 0
    while (
      RUNNING_STATES.has(runtime.state)
      && runtime.stateElapsed >= runtime.definition.durations[runtime.state]
      && transitions < MAX_STATE_TRANSITIONS_PER_UPDATE
    ) {
      const completedDuration = runtime.definition.durations[runtime.state]
      runtime.stateElapsed = Math.max(0, runtime.stateElapsed - completedDuration)
      const currentIndex = STATE_SEQUENCE.indexOf(runtime.state)
      if (currentIndex >= STATE_SEQUENCE.length - 1) {
        this.completeMoment(runtime.definition.id, context)
        break
      }
      this.#enterState(runtime, STATE_SEQUENCE[currentIndex + 1], context, {
        preserveElapsed: true,
      })
      transitions += 1
    }
  }

  #updateCooldown(runtime, delta, context) {
    if (runtime.state !== 'cooldown') return
    runtime.stateElapsed += delta
    if (runtime.stateElapsed >= runtime.definition.cooldown) {
      this.#enterState(runtime, 'inactive', context)
    }
  }

  #matchesContext(runtime, context, includeTime) {
    const definition = runtime.definition
    if (!contextRegionIds(context).includes(definition.region)) return false
    if (definition.area && definition.area !== context.areaId) return false
    if (
      distanceSquared(context.playerPosition, definition.position)
      > definition.triggerRadius ** 2
    ) return false
    return !includeTime || isWithinTimeWindow(context.gameMinutes, definition.timeWindow)
  }

  #activationResult(canActivate, reason, conflicts = EMPTY_IDS) {
    return Object.freeze({
      canActivate,
      reason,
      conflicts: conflicts === EMPTY_IDS
        ? EMPTY_IDS
        : Object.freeze([...conflicts]),
    })
  }

  #physicalResourceAvailable(type, id, definition, context) {
    const typedResources = context.availableResources?.[type]
    if (typedResources?.has) return typedResources.has(id)
    if (type === 'npc' && context.availableNpcs?.has) {
      return context.availableNpcs.has(id)
    }
    if (type === 'prop' && context.availableProps?.has) {
      return context.availableProps.has(id)
    }
    return Boolean(this.resourceResolver(type, id, definition, context))
  }

  #inspectResourceConflicts(runtime, context) {
    const conflicts = []
    for (const resource of runtime.definition.resources) {
      const owner = this.resourceLocks.get(`${resource.type}:${resource.id}`)
      if (owner && owner.momentId !== runtime.definition.id) {
        conflicts.push(Object.freeze({
          ...resource,
          reason: 'locked',
          owner: owner.momentId,
        }))
        continue
      }
      if (!this.#physicalResourceAvailable(
        resource.type,
        resource.id,
        runtime.definition,
        context,
      )) {
        conflicts.push(Object.freeze({
          ...resource,
          reason: 'unavailable',
          owner: null,
        }))
      }
    }
    return Object.freeze({
      reason: conflicts.some((conflict) => conflict.reason === 'locked')
        ? 'resource-locked'
        : conflicts.length
          ? 'resource-unavailable'
          : null,
      conflicts: conflicts.length ? Object.freeze(conflicts) : EMPTY_IDS,
    })
  }

  #findSpatialConflict(runtime) {
    const definition = runtime.definition
    if (definition.exclusionRadius <= 0) return null
    for (const owner of this.running) {
      if (owner === runtime || owner.definition.region !== definition.region) continue
      if (
        definition.area
        && owner.definition.area
        && owner.definition.area !== definition.area
      ) continue
      const minimumDistance = (
        definition.exclusionRadius + owner.definition.exclusionRadius
      )
      if (
        distanceSquared(definition.position, owner.definition.position)
        < minimumDistance * minimumDistance
      ) return owner
    }
    return null
  }

  #getRegionCandidates(context) {
    const candidates = new Set()
    for (const regionId of contextRegionIds(context)) {
      const regionMoments = this.momentsByRegion.get(regionId)
      if (!regionMoments) continue
      for (const runtime of regionMoments) {
        if (runtime.state === 'inactive') candidates.add(runtime)
      }
    }
    return [...candidates]
  }

  #compareCandidates(left, right, context) {
    const priorityDifference = right.definition.priority - left.definition.priority
    if (priorityDifference !== 0) return priorityDifference
    return (
      distanceSquared(context.playerPosition, left.definition.position)
      - distanceSquared(context.playerPosition, right.definition.position)
    )
  }

  #setBlocked(runtime, reason, details = EMPTY_IDS, waiting = false) {
    runtime.blockedReason = reason
    runtime.blockedDetails = details === EMPTY_IDS
      ? EMPTY_IDS
      : Object.freeze([...details])
    runtime.waiting = waiting
    this.blocked.add(runtime)
    if (waiting) this.waiting.add(runtime)
    else this.waiting.delete(runtime)
  }

  #clearBlocked(runtime) {
    runtime.blockedReason = null
    runtime.blockedDetails = EMPTY_IDS
    runtime.waiting = false
    this.blocked.delete(runtime)
    this.waiting.delete(runtime)
  }

  #enterState(runtime, state, context, { preserveElapsed = false } = {}) {
    if (!MOMENT_STATES.includes(state)) throw new RangeError(`Unknown moment state: ${state}`)
    if (runtime.state === 'cooldown' && state !== 'cooldown') {
      this.cooldowns.delete(runtime)
    }
    runtime.state = state
    if (state === 'cooldown') this.cooldowns.add(runtime)
    if (!preserveElapsed) runtime.stateElapsed = 0
    runtime.lastContext = context
    runtime.definition.hooks.onStateChange?.(snapshot(runtime), context)
    const hookName = {
      preparing: 'onPrepare',
      starting: 'onStart',
      active: 'onActive',
      climax: 'onClimax',
      ending: 'onEnding',
    }[state]
    if (hookName) runtime.definition.hooks[hookName]?.(snapshot(runtime), context)
  }

  #enterCooldown(runtime, context) {
    this.running.delete(runtime)
    this.#clearBlocked(runtime)
    runtime.paused = false
    runtime.pauseReason = null
    this.#enterState(runtime, 'cooldown', context)
    if (runtime.definition.cooldown === 0) this.#enterState(runtime, 'inactive', context)
  }

  #cleanupRuntime(runtime, context, reason) {
    runtime.definition.hooks.onCleanup?.(snapshot(runtime), context)
    this.releaseResources(runtime.definition.id, context, reason)
    if (runtime.definition.type && runtime.definition.typeCooldown > 0) {
      this.typeCooldowns.set(
        runtime.definition.type,
        Math.max(
          this.typeCooldowns.get(runtime.definition.type) ?? 0,
          runtime.definition.typeCooldown,
        ),
      )
    }
  }

  #runningCount() {
    return this.running.size
  }

  #requireMoment(id) {
    const runtime = this.moments.get(id)
    if (!runtime) throw new Error(`Unknown moment id: ${id}`)
    return runtime
  }

  dispose() {
    if (this.disposed) return
    for (const runtime of [...this.running]) {
      this.cancelMoment(runtime.definition.id, 'system-disposed', runtime.lastContext ?? {})
    }
    for (const momentId of [...this.locksByMoment.keys()]) {
      this.releaseResources(momentId, {}, 'system-disposed')
    }
    this.disposed = true
    this.running.clear()
    this.cooldowns.clear()
    this.waiting.clear()
    this.blocked.clear()
    this.resourceLocks.clear()
    this.locksByMoment.clear()
    this.typeCooldowns.clear()
    this.moments.clear()
    this.momentsByRegion.clear()
  }
}
