const TEMPLATE_STATES = Object.freeze([
  'preparing',
  'starting',
  'active',
  'climax',
  'ending',
])

const EMPTY_LIST = Object.freeze([])

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1)
}

function normalizeIds(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`)
  return Object.freeze([...new Set(value.map(String))])
}

function normalizeStagingPoints(points = []) {
  const result = new Map()
  for (const point of points) {
    if (!point?.id) throw new TypeError('Moment staging point requires an id')
    const x = Array.isArray(point.position) ? point.position[0] : point.position?.x
    const y = Array.isArray(point.position) ? point.position[1] : point.position?.y
    const z = Array.isArray(point.position) ? point.position[2] : point.position?.z
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      throw new TypeError(`Staging point "${point.id}" requires finite x and z`)
    }
    result.set(String(point.id), Object.freeze({
      id: String(point.id),
      position: Object.freeze({
        x,
        y: Number.isFinite(y) ? y : 0,
        z,
      }),
      yaw: Number.isFinite(point.yaw) ? point.yaw : null,
    }))
  }
  return result
}

function normalizeActivities(activities = []) {
  const list = Array.isArray(activities) ? activities : [activities]
  return Object.freeze(list.filter(Boolean).map((activity) => (
    typeof activity === 'string'
      ? Object.freeze({ id: activity })
      : Object.freeze({ ...activity, id: activity.id ?? activity.activity })
  )))
}

function normalizeActions(cue) {
  if (Array.isArray(cue.actions)) {
    return Object.freeze(cue.actions.map((action) => Object.freeze({ ...action })))
  }
  const actions = []
  if (cue.stagingId) {
    actions.push(Object.freeze({
      type: 'stage',
      actorId: cue.actorId,
      stagingId: cue.stagingId,
    }))
  }
  const activities = normalizeActivities(cue.activities ?? cue.activity ?? [])
  if (activities.length) {
    actions.push(Object.freeze({
      type: 'activities',
      actorId: cue.actorId,
      activities,
    }))
  }
  return Object.freeze(actions)
}

function normalizeTimeline(timeline = []) {
  if (!Array.isArray(timeline)) throw new TypeError('Moment timeline must be an array')
  return Object.freeze(timeline.map((cue, index) => {
    if (!TEMPLATE_STATES.includes(cue?.state)) {
      throw new RangeError(`Timeline cue ${index} requires a valid moment state`)
    }
    const at = cue.at ?? 0
    if (!Number.isFinite(at) || at < 0) {
      throw new RangeError(`Timeline cue ${index} requires a non-negative time`)
    }
    return Object.freeze({
      id: cue.id ?? `cue-${index + 1}`,
      state: cue.state,
      at,
      actions: normalizeActions(cue),
    })
  }).sort((left, right) => (
    TEMPLATE_STATES.indexOf(left.state) - TEMPLATE_STATES.indexOf(right.state)
    || left.at - right.at
  )))
}

function copyPosition(position) {
  return {
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    z: position?.z ?? 0,
  }
}

function setActorPosition(actor, position) {
  if (typeof actor?.setPosition === 'function') {
    actor.setPosition(position.x, position.y, position.z)
  } else if (actor?.position?.set) {
    actor.position.set(position.x, position.y, position.z)
  } else if (actor?.position) {
    Object.assign(actor.position, position)
  }
}

function resolveActor(runtime, actorId, context) {
  if (!actorId) return null
  let actor = runtime.actors.get(actorId)
  if (actor) return actor
  actor = runtime.resolveNpc?.(actorId, context)
    ?? context.getNpc?.(actorId)
    ?? null
  if (actor) runtime.actors.set(actorId, actor)
  return actor
}

function rememberActor(runtime, actorId, actor) {
  if (!actor || runtime.originalActorState.has(actorId)) return
  runtime.originalActorState.set(actorId, {
    position: copyPosition(actor.position ?? actor.group?.position),
    yaw: actor.group?.rotation?.y ?? actor.rotation?.y ?? 0,
    active: actor.active,
    requestedActive: actor.requestedActive,
    behavior: actor.behavior ?? null,
    waypoints: actor.waypoints?.map((point) => copyPosition(point)) ?? null,
    loopWaypoints: actor.loopWaypoints,
    currentWaypointIndex: actor.currentWaypointIndex,
    pathComplete: actor.pathComplete,
  })
}

function stageActor(runtime, actorId, stagingId, context) {
  const actor = resolveActor(runtime, actorId, context)
  const stagingPoint = runtime.stagingPoints.get(String(stagingId))
  if (!actor || !stagingPoint) return false
  rememberActor(runtime, actorId, actor)
  if (actor.acquireMomentLock) actor.acquireMomentLock(runtime.momentId)
  else actor.setActive?.(true)
  setActorPosition(actor, stagingPoint.position)
  if (stagingPoint.yaw !== null) {
    if (actor.group?.rotation) actor.group.rotation.y = stagingPoint.yaw
    else if (actor.rotation) actor.rotation.y = stagingPoint.yaw
  }
  return true
}

function playActivities(runtime, actorId, activities, context) {
  const actor = resolveActor(runtime, actorId, context)
  if (!actor || activities.length === 0) return false
  rememberActor(runtime, actorId, actor)
  const [first, ...queued] = activities
  actor.playActivity?.(first.id, first)
  for (const activity of queued) {
    actor.queueActivity?.(activity.id, activity)
  }
  return true
}

function executeAction(runtime, action, context) {
  switch (action.type) {
    case 'stage':
      return stageActor(runtime, action.actorId, action.stagingId, context)
    case 'activities':
      return playActivities(
        runtime,
        action.actorId,
        normalizeActivities(action.activities),
        context,
      )
    case 'activity':
      return playActivities(
        runtime,
        action.actorId,
        normalizeActivities(action.activity ?? action),
        context,
      )
    case 'attachProp': {
      const actor = resolveActor(runtime, action.actorId, context)
      if (!actor) return false
      rememberActor(runtime, action.actorId, actor)
      return Boolean(actor.attachProp?.(action.propType, action.options))
    }
    case 'transferProp': {
      const actor = resolveActor(runtime, action.actorId, context)
      const recipient = resolveActor(runtime, action.recipientId, context)
      if (!actor || !recipient) return false
      rememberActor(runtime, action.actorId, actor)
      rememberActor(runtime, action.recipientId, recipient)
      return Boolean(actor.transferProp?.(action.propId, recipient, action.options))
    }
    case 'route': {
      const actor = resolveActor(runtime, action.actorId, context)
      if (!actor || !Array.isArray(action.waypoints)) return false
      rememberActor(runtime, action.actorId, actor)
      actor.setWaypoints?.(action.waypoints)
      if ('loopWaypoints' in actor) actor.loopWaypoints = Boolean(action.loop)
      return true
    }
    case 'callback':
      action.run?.(context, runtime)
      return true
    default:
      return false
  }
}

function resetRuntimeForRun(runtime, moment, context) {
  if (runtime.runId === moment.runId) return
  runtime.runId = moment.runId
  runtime.executedCues.clear()
  runtime.actors.clear()
  runtime.originalActorState.clear()
  for (const assignment of runtime.initialStaging) {
    stageActor(runtime, assignment.actorId, assignment.stagingId, context)
  }
}

function cleanupRuntime(runtime) {
  for (const [actorId, actor] of runtime.actors) {
    actor.stopActivity?.({
      clearQueue: true,
      detachProps: true,
      transitionDuration: 0,
    })
    const original = runtime.originalActorState.get(actorId)
    if (!original) continue
    setActorPosition(actor, original.position)
    if (actor.group?.rotation) actor.group.rotation.y = original.yaw
    else if (actor.rotation) actor.rotation.y = original.yaw
    if (original.behavior && actor.setBehavior) actor.setBehavior(original.behavior)
    if (original.waypoints && actor.setWaypoints) {
      actor.setWaypoints(original.waypoints)
      actor.loopWaypoints = original.loopWaypoints
      actor.currentWaypointIndex = original.currentWaypointIndex
      actor.pathComplete = original.pathComplete
    }
    if (actor.releaseMomentLock) {
      actor.releaseMomentLock(runtime.momentId)
    } else if (original.requestedActive !== undefined) {
      actor.setActive?.(original.requestedActive)
    } else if (original.active !== undefined) {
      actor.setActive?.(original.active)
    }
  }
  runtime.executedCues.clear()
  runtime.actors.clear()
  runtime.originalActorState.clear()
  runtime.runId = 0
}

function pauseRuntime(runtime) {
  for (const actor of runtime.actors.values()) {
    actor.stopActivity?.({
      clearQueue: true,
      // Keep explicitly transferred/staged props with their current owner.
      // Activity-owned props are still released by ActivityController and
      // recreated once when the current cue resumes.
      detachProps: false,
      transitionDuration: 0,
    })
  }
}

function resumeRuntime(runtime, moment, context) {
  for (const cue of runtime.timeline) {
    if (cue.state !== moment.state) continue
    runtime.executedCues.delete(`${moment.runId}:${cue.id}`)
  }
  runMomentTimeline(runtime, moment, 0, context)
}

function evaluateCancellation(runtime, moment, context) {
  if (runtime.releaseDistance !== null && context.playerPosition) {
    const dx = context.playerPosition.x - runtime.triggerPosition.x
    const dz = context.playerPosition.z - runtime.triggerPosition.z
    if (dx * dx + dz * dz > runtime.releaseDistance ** 2) {
      return 'template-player-too-far'
    }
  }
  for (const condition of runtime.cancelConditions) {
    const result = condition(context, moment)
    if (result) return typeof result === 'string' ? result : 'template-condition'
  }
  return null
}

function createTemplateRuntime(config, templateType, npcIds) {
  const stagingPoints = normalizeStagingPoints(config.stagingPoints)
  const initialStaging = Object.freeze((config.initialStaging ?? []).map((entry) => {
    if (!npcIds.includes(String(entry.actorId))) {
      throw new RangeError(`Unknown staged NPC: ${entry.actorId}`)
    }
    if (!stagingPoints.has(String(entry.stagingId))) {
      throw new RangeError(`Unknown staging point: ${entry.stagingId}`)
    }
    return Object.freeze({
      actorId: String(entry.actorId),
      stagingId: String(entry.stagingId),
    })
  }))
  const cancelConditions = config.cancelWhen == null
    ? EMPTY_LIST
    : Object.freeze(
        (Array.isArray(config.cancelWhen) ? config.cancelWhen : [config.cancelWhen])
          .map((condition) => {
            if (typeof condition !== 'function') {
              throw new TypeError('Moment cancel conditions must be functions')
            }
            return condition
          }),
      )
  return {
    momentId: config.id,
    templateType,
    timeline: normalizeTimeline(config.timeline),
    stagingPoints,
    initialStaging,
    cancelConditions,
    resolveNpc: config.resolveNpc ?? null,
    triggerPosition: Object.freeze(copyPosition(config.position ?? config.triggerPosition)),
    releaseDistance: config.releaseResourcesWhenFar === false
      ? null
      : config.pauseDistance ?? (config.triggerRadius ?? config.radius) * 1.5,
    actors: new Map(),
    originalActorState: new Map(),
    executedCues: new Set(),
    runId: 0,
  }
}

function createTemplate(config, templateType, actorRange) {
  if (!config?.id) throw new TypeError('Moment template requires an id')
  const npcIds = normalizeIds(config.npcIds ?? config.npcs ?? [], 'npcIds')
  if (npcIds.length < actorRange.min || npcIds.length > actorRange.max) {
    throw new RangeError(
      `${templateType} moment requires ${actorRange.label}`,
    )
  }
  const runtime = createTemplateRuntime(config, templateType, npcIds)
  const userHooks = config.hooks ?? {}
  const primarySubjectIds = normalizeIds(
    config.primarySubjectIds ?? npcIds,
    'primarySubjectIds',
  )
  const timingBonus = Number.isFinite(config.timingBonus)
    ? Math.max(0, config.timingBonus)
    : 1
  const metadata = Object.freeze({
    ...(config.metadata ?? {}),
    template: templateType,
    name: config.name ?? config.label ?? config.id,
    momentType: config.momentType ?? config.type ?? templateType,
    primarySubjectIds,
    timingBonus,
    photoType: config.photoType ?? config.metadata?.photoType ?? null,
  })

  const definition = {
    ...config,
    npcIds,
    stagingIds: Object.freeze([
      ...new Set([
        ...(config.stagingIds ?? config.stagingZones ?? []),
        ...runtime.stagingPoints.keys(),
      ].map(String)),
    ]),
    metadata,
    hooks: {
      ...userHooks,
      shouldCancel: (moment, context) => (
        evaluateCancellation(runtime, moment, context)
        ?? userHooks.shouldCancel?.(moment, context)
        ?? null
      ),
      onStateChange: (moment, context) => {
        if (TEMPLATE_STATES.includes(moment.state)) {
          resetRuntimeForRun(runtime, moment, context)
          runMomentTimeline(runtime, moment, 0, context)
        }
        userHooks.onStateChange?.(moment, context)
      },
      onUpdate: (moment, deltaTime, context) => {
        runMomentTimeline(runtime, moment, deltaTime, context)
        userHooks.onUpdate?.(moment, deltaTime, context)
      },
      onPause: (moment, reason) => {
        pauseRuntime(runtime)
        userHooks.onPause?.(moment, reason)
      },
      onResume: (moment, context) => {
        resumeRuntime(runtime, moment, context)
        userHooks.onResume?.(moment, context)
      },
      onCleanup: (moment, context) => {
        cleanupRuntime(runtime)
        userHooks.onCleanup?.(moment, context)
      },
    },
    templateRuntime: runtime,
  }
  return Object.freeze(definition)
}

export function createSimpleMoment(config) {
  return createTemplate(config, 'simple', {
    min: 1,
    max: 2,
    label: 'one or two NPCs',
  })
}

export function createMultiActorMoment(config) {
  return createTemplate(config, 'multi-actor', {
    min: 2,
    max: Infinity,
    label: 'at least two NPCs',
  })
}

export function runMomentTimeline(runtime, moment, deltaTime = 0, context = {}) {
  if (
    !runtime
    || !moment
    || moment.paused
    || !TEMPLATE_STATES.includes(moment.state)
  ) return 0
  resetRuntimeForRun(runtime, moment, context)
  const elapsedThroughFrame = moment.stateElapsed + Math.max(0, deltaTime)
  let executed = 0
  for (const cue of runtime.timeline) {
    if (cue.state !== moment.state || cue.at > elapsedThroughFrame) continue
    const key = `${moment.runId}:${cue.id}`
    if (runtime.executedCues.has(key)) continue
    runtime.executedCues.add(key)
    for (const action of cue.actions) executeAction(runtime, action, context)
    executed += 1
  }
  return executed
}

export function getClimaxProgress(moment, durations = moment?.durations) {
  if (!moment || moment.state !== 'climax') return 0
  const duration = durations?.climax ?? moment.stateDuration
  if (!Number.isFinite(duration) || duration <= 0) return 1
  return clamp01(moment.stateElapsed / duration)
}

export function getPhotoMomentContext(momentSystem) {
  const moments = momentSystem?.getActiveMoments?.() ?? EMPTY_LIST
  const events = moments.map((moment) => {
    const metadata = moment.metadata ?? {}
    const inClimax = moment.state === 'climax'
    const climaxProgress = getClimaxProgress(moment)
    const baseTimingBonus = Number.isFinite(metadata.timingBonus)
      ? metadata.timingBonus
      : 1
    return Object.freeze({
      id: moment.id,
      name: metadata.name ?? moment.id,
      state: moment.state,
      inClimax,
      climaxProgress,
      primarySubjectIds: Object.freeze([...(metadata.primarySubjectIds ?? [])]),
      momentType: metadata.momentType ?? moment.type ?? 'ambient',
      photoType: metadata.photoType ?? null,
      region: moment.region ?? null,
      timingBonus: inClimax
        ? baseTimingBonus * (0.75 + Math.sin(Math.PI * climaxProgress) * 0.25)
        : 0,
      climaxWindow: Object.freeze({
        state: 'climax',
        duration: moment.durations?.climax ?? 0,
      }),
      location: metadata.location ?? null,
      paused: moment.paused,
    })
  })
  const lead = events[0] ?? null
  return Object.freeze({
    active: events.length > 0,
    momentId: lead?.id ?? null,
    state: lead?.state ?? null,
    inClimax: lead?.inClimax ?? false,
    primarySubjectIds: lead?.primarySubjectIds ?? EMPTY_LIST,
    momentType: lead?.momentType ?? null,
    photoType: lead?.photoType ?? null,
    region: lead?.region ?? null,
    timingBonus: lead?.timingBonus ?? 0,
    climaxWindow: lead?.climaxWindow ?? null,
    location: lead?.location ?? null,
    events: Object.freeze(events),
  })
}
