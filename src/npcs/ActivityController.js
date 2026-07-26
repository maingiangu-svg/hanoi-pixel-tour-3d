import {
  applyHandheldPropTransform,
  createHandheldProp,
  DEFAULT_PROP_HAND,
  HANDHELD_PROP_TYPES,
} from './HandheldProps.js'

export const NPC_ACTIVITY_TYPES = Object.freeze([
  'idle',
  'walk',
  'sit',
  'wave',
  'clap',
  'pose',
  'point',
  'takePhoto',
  'viewPhoto',
  'drink',
  'read',
  'exercise',
  'dance',
  'draw',
  'giveItem',
  'receiveItem',
  'lookAtLandmark',
])

const DEFAULT_DURATIONS = Object.freeze({
  idle: 4,
  walk: 5,
  sit: 6,
  wave: 2.4,
  clap: 3,
  pose: 4,
  point: 2.5,
  takePhoto: 3.5,
  viewPhoto: 4,
  drink: 3,
  read: 6,
  exercise: 5,
  dance: 6,
  draw: 7,
  giveItem: 2.5,
  receiveItem: 2.5,
  lookAtLandmark: 5,
})

const DEFAULT_ACTIVITY_PROPS = Object.freeze({
  takePhoto: Object.freeze(['camera']),
  viewPhoto: Object.freeze(['phone']),
  drink: Object.freeze(['cup']),
  read: Object.freeze(['newspaper']),
  draw: Object.freeze(['drawingBoard', 'pencil']),
})

const POSE_KEYS = Object.freeze([
  'visualY',
  'visualX',
  'visualZ',
  'headX',
  'headY',
  'headZ',
  'leftArmX',
  'leftArmY',
  'leftArmZ',
  'rightArmX',
  'rightArmY',
  'rightArmZ',
  'leftElbowX',
  'leftElbowY',
  'leftElbowZ',
  'rightElbowX',
  'rightElbowY',
  'rightElbowZ',
  'leftLegX',
  'leftLegZ',
  'rightLegX',
  'rightLegZ',
  'leftKneeX',
  'rightKneeX',
])

const PROP_OWNERS = new Map()
const FAR_POSE_INTERVAL = 0.2
const MAX_DELTA = 0.25
let controllerSequence = 0

function clampDelta(deltaTime) {
  if (!Number.isFinite(deltaTime) || deltaTime <= 0) return 0
  return Math.min(deltaTime, MAX_DELTA)
}

function createPose() {
  return Object.fromEntries(POSE_KEYS.map((key) => [key, 0]))
}

function copyPose(source, target) {
  for (const key of POSE_KEYS) target[key] = source[key]
  return target
}

function basePose(out, behavior = 'standing') {
  for (const key of POSE_KEYS) out[key] = 0
  out.leftArmZ = -0.06
  out.rightArmZ = 0.06
  if (behavior === 'seated') {
    out.visualY = -0.29
    out.leftLegX = -1.34
    out.rightLegX = -1.34
    out.leftKneeX = 1.34
    out.rightKneeX = 1.34
    out.leftArmX = -0.42
    out.rightArmX = -0.42
  } else if (behavior === 'photographer') {
    out.leftArmX = -1.12
    out.rightArmX = -1.12
    out.leftArmZ = -0.22
    out.rightArmZ = 0.22
    out.leftElbowX = -0.72
    out.rightElbowX = -0.72
  }
  return out
}

function resolveActivity(activity, options = {}) {
  const source = typeof activity === 'string'
    ? { ...options, id: activity }
    : { ...activity, ...options }
  const id = source.id ?? source.activity
  if (!NPC_ACTIVITY_TYPES.includes(id)) {
    throw new RangeError(`Unknown NPC activity: ${id}`)
  }
  const duration = source.duration ?? DEFAULT_DURATIONS[id]
  if (
    duration !== Infinity
    && (!Number.isFinite(duration) || duration <= 0)
  ) {
    throw new RangeError('NPC activity duration must be positive or Infinity')
  }
  const speed = source.speed ?? 1
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError('NPC activity speed must be positive')
  }
  const props = source.props ?? DEFAULT_ACTIVITY_PROPS[id] ?? []
  if (!Array.isArray(props)) throw new TypeError('NPC activity props must be an array')
  return {
    id,
    duration,
    speed,
    facing: source.facing ?? (source.target ? 'target' : null),
    target: source.target ?? null,
    loop: Boolean(source.loop),
    onComplete: typeof source.onComplete === 'function' ? source.onComplete : null,
    transitionDuration: Math.max(0, source.transitionDuration ?? 0.22),
    props: props.map((prop) => (
      typeof prop === 'string' ? { type: prop } : { ...prop }
    )),
    metadata: source.metadata ?? null,
  }
}

function resolveTargetPosition(target) {
  if (!target) return null
  if (target.position?.isVector3 || target.position) return target.position
  if (target.isVector3 || (Number.isFinite(target.x) && Number.isFinite(target.z))) {
    return target
  }
  return null
}

function samplePose(activity, elapsed, out) {
  basePose(out)
  if (!activity) return out
  const phase = elapsed * activity.speed
  const cycle = Math.sin(phase)

  switch (activity.id) {
    case 'walk': {
      const stride = Math.sin(phase * 7.2) * 0.42
      out.leftLegX = stride
      out.rightLegX = -stride
      out.leftArmX = -stride * 0.62
      out.rightArmX = stride * 0.62
      break
    }
    case 'sit':
      out.visualY = -0.29
      out.leftLegX = -1.34
      out.rightLegX = -1.34
      out.leftKneeX = 1.34
      out.rightKneeX = 1.34
      out.leftArmX = -0.42
      out.rightArmX = -0.42
      break
    case 'wave':
      out.rightArmZ = 1.65
      out.rightArmX = -0.32
      out.rightElbowZ = 0.55 + cycle * 0.38
      out.rightElbowX = -0.35
      break
    case 'clap': {
      const clap = Math.sin(phase * 6) * 0.09
      out.leftArmX = -1.05
      out.rightArmX = -1.05
      out.leftArmZ = -0.34 + clap
      out.rightArmZ = 0.34 - clap
      out.leftElbowX = -0.72
      out.rightElbowX = -0.72
      break
    }
    case 'pose':
      out.leftArmZ = -1.25
      out.leftElbowZ = -0.7
      out.rightArmX = -0.38
      out.rightElbowX = -0.45
      out.headZ = 0.08
      break
    case 'point':
      out.rightArmX = -1.48
      out.rightArmZ = 0.12
      out.rightElbowX = 0.08
      out.headY = -0.08
      break
    case 'takePhoto':
      out.leftArmX = -1.14
      out.rightArmX = -1.14
      out.leftArmZ = -0.2
      out.rightArmZ = 0.2
      out.leftElbowX = -0.72
      out.rightElbowX = -0.72
      out.headX = -0.08
      break
    case 'viewPhoto':
      out.rightArmX = -0.96
      out.rightArmZ = 0.16
      out.rightElbowX = -0.74
      out.leftArmX = -0.45
      out.headX = -0.16
      out.headY = 0.08
      break
    case 'drink': {
      const sip = 0.5 + Math.sin(phase * 2.2) * 0.5
      out.rightArmX = -0.65 - sip * 0.55
      out.rightElbowX = -0.55 - sip * 0.28
      out.headX = -sip * 0.08
      break
    }
    case 'read':
      out.leftArmX = -0.78
      out.rightArmX = -0.78
      out.leftArmZ = -0.22
      out.rightArmZ = 0.22
      out.leftElbowX = -0.58
      out.rightElbowX = -0.58
      out.headX = -0.18
      break
    case 'exercise': {
      const lift = (cycle + 1) * 0.5
      out.leftArmZ = -0.2 - lift * 1.55
      out.rightArmZ = 0.2 + lift * 1.55
      out.leftLegZ = lift * 0.18
      out.rightLegZ = -lift * 0.18
      break
    }
    case 'dance':
      out.visualZ = cycle * 0.08
      out.leftArmZ = -0.85 - Math.sin(phase * 1.7) * 0.55
      out.rightArmZ = 0.85 + Math.cos(phase * 1.7) * 0.55
      out.leftLegX = Math.sin(phase * 2.4) * 0.18
      out.rightLegX = -out.leftLegX
      out.headZ = Math.sin(phase * 1.2) * 0.1
      break
    case 'draw':
      out.leftArmX = -0.8
      out.leftArmZ = -0.16
      out.leftElbowX = -0.5
      out.rightArmX = -0.9 + Math.sin(phase * 4) * 0.08
      out.rightArmZ = 0.18
      out.rightElbowX = -0.62
      out.headX = -0.13
      break
    case 'giveItem':
      out.rightArmX = -1.08
      out.rightArmZ = 0.1
      out.rightElbowX = -0.22
      out.leftArmX = -0.34
      break
    case 'receiveItem':
      out.leftArmX = -0.88
      out.rightArmX = -0.88
      out.leftArmZ = -0.18
      out.rightArmZ = 0.18
      out.leftElbowX = -0.36
      out.rightElbowX = -0.36
      break
    case 'lookAtLandmark':
      out.headX = -0.04
      break
    case 'idle':
    default:
      out.headZ = Math.sin(phase * 0.63) * 0.012
      break
  }
  return out
}

function writeRigToPose(rig, out) {
  out.visualY = rig.visual.position.y
  out.visualX = rig.visual.rotation.x
  out.visualZ = rig.visual.rotation.z
  out.headX = rig.head.rotation.x
  out.headY = rig.head.rotation.y
  out.headZ = rig.head.rotation.z
  out.leftArmX = rig.leftArm.rotation.x
  out.leftArmY = rig.leftArm.rotation.y
  out.leftArmZ = rig.leftArm.rotation.z
  out.rightArmX = rig.rightArm.rotation.x
  out.rightArmY = rig.rightArm.rotation.y
  out.rightArmZ = rig.rightArm.rotation.z
  out.leftElbowX = rig.leftElbow.rotation.x
  out.leftElbowY = rig.leftElbow.rotation.y
  out.leftElbowZ = rig.leftElbow.rotation.z
  out.rightElbowX = rig.rightElbow.rotation.x
  out.rightElbowY = rig.rightElbow.rotation.y
  out.rightElbowZ = rig.rightElbow.rotation.z
  out.leftLegX = rig.leftLeg.rotation.x
  out.leftLegZ = rig.leftLeg.rotation.z
  out.rightLegX = rig.rightLeg.rotation.x
  out.rightLegZ = rig.rightLeg.rotation.z
  out.leftKneeX = rig.leftKnee.rotation.x
  out.rightKneeX = rig.rightKnee.rotation.x
}

function applyPoseToRig(rig, pose, bodyScale, breath = 0) {
  rig.visual.position.y = pose.visualY
  rig.visual.rotation.x = pose.visualX
  rig.visual.rotation.z = pose.visualZ
  rig.visual.scale.set(
    bodyScale * (1 + breath * 0.3),
    bodyScale * (1 + breath),
    bodyScale,
  )
  rig.head.rotation.set(pose.headX, pose.headY, pose.headZ)
  rig.leftArm.rotation.set(pose.leftArmX, pose.leftArmY, pose.leftArmZ)
  rig.rightArm.rotation.set(pose.rightArmX, pose.rightArmY, pose.rightArmZ)
  rig.leftElbow.rotation.set(
    pose.leftElbowX,
    pose.leftElbowY,
    pose.leftElbowZ,
  )
  rig.rightElbow.rotation.set(
    pose.rightElbowX,
    pose.rightElbowY,
    pose.rightElbowZ,
  )
  rig.leftLeg.rotation.set(pose.leftLegX, 0, pose.leftLegZ)
  rig.rightLeg.rotation.set(pose.rightLegX, 0, pose.rightLegZ)
  rig.leftKnee.rotation.set(pose.leftKneeX, 0, 0)
  rig.rightKnee.rotation.set(pose.rightKneeX, 0, 0)
}

export class ActivityController {
  constructor({
    actor,
    rig,
    anchors,
    resources,
    bodyScale = 1,
  }) {
    this.actor = actor
    this.rig = rig
    this.anchors = anchors
    this.resources = resources
    this.bodyScale = bodyScale
    this.id = `npc-activity-${++controllerSequence}`
    this.current = null
    this.elapsed = 0
    this.queue = []
    this.heldProps = new Map()
    this.activityPropIds = new Set()
    this.transitioning = false
    this.transitionElapsed = 0
    this.transitionDuration = 0
    this.farPoseElapsed = FAR_POSE_INTERVAL
    this.disposed = false
    this.fromPose = createPose()
    this.targetPose = createPose()
    this.blendedPose = createPose()
    this.defaultPose = createPose()
    writeRigToPose(this.rig, this.defaultPose)
  }

  get currentActivity() {
    return this.current?.id ?? null
  }

  get activitySpeed() {
    return this.current?.speed ?? 1
  }

  get isControllingPose() {
    return Boolean(this.current || this.transitioning)
  }

  captureDefaultPose() {
    writeRigToPose(this.rig, this.defaultPose)
  }

  setDefaultBehaviorPose(behavior) {
    basePose(this.defaultPose, behavior)
  }

  playActivity(activity, options = {}) {
    if (this.disposed) return null
    const next = resolveActivity(activity, options)
    this.queue.length = 0
    this.#cleanupActivityProps()
    this.#begin(next)
    return this.getState()
  }

  queueActivity(activity, options = {}) {
    if (this.disposed) return null
    const next = resolveActivity(activity, options)
    if (!this.current) {
      this.#begin(next)
      return this.getState()
    }
    this.queue.push(next)
    return this.getState()
  }

  stopActivity({
    clearQueue = true,
    detachProps = true,
    transitionDuration = 0.2,
  } = {}) {
    if (this.disposed) return false
    const wasActive = Boolean(
      this.current
      || this.transitioning
      || this.queue.length
      || (detachProps && this.heldProps.size),
    )
    this.current = null
    this.elapsed = 0
    if (clearQueue) this.queue.length = 0
    if (detachProps) this.detachAllProps()
    else this.#cleanupActivityProps()
    this.#transitionToBase(transitionDuration)
    return wasActive
  }

  update(deltaTime, detailed = true) {
    if (this.disposed) return
    const delta = clampDelta(deltaTime)
    if (delta <= 0) return

    if (this.current) {
      this.elapsed += delta
      if (
        this.current.duration !== Infinity
        && this.elapsed >= this.current.duration
      ) {
        if (this.current.loop) {
          this.elapsed %= this.current.duration
        } else {
          this.#completeCurrent()
        }
      }
    }

    if (this.transitioning) {
      this.transitionElapsed += delta
      if (this.transitionElapsed >= this.transitionDuration) {
        this.transitioning = false
      }
    }

    this.farPoseElapsed += delta
    if (!detailed && this.farPoseElapsed < FAR_POSE_INTERVAL) return
    this.farPoseElapsed = 0
    this.#updateFacing(delta)
    this.#applyCurrentPose()
  }

  attachProp(type, {
    id = `${this.id}:${type}`,
    hand = DEFAULT_PROP_HAND[type],
    activityOwned = false,
  } = {}) {
    if (this.disposed) return null
    if (!HANDHELD_PROP_TYPES.includes(type)) {
      throw new RangeError(`Unknown handheld prop type: ${type}`)
    }
    if (hand !== 'left' && hand !== 'right') {
      throw new RangeError('Handheld prop hand must be left or right')
    }
    const propId = String(id)
    const existing = this.heldProps.get(propId)
    if (existing) return existing
    const owner = PROP_OWNERS.get(propId)
    if (owner && owner !== this) return null

    const group = createHandheldProp(this.resources, type, propId)
    const record = { id: propId, type, hand, group, activityOwned }
    this.#mountProp(record, hand)
    this.heldProps.set(propId, record)
    PROP_OWNERS.set(propId, this)
    if (activityOwned) this.activityPropIds.add(propId)
    return record
  }

  detachProp(idOrType) {
    const record = this.#findProp(idOrType)
    if (!record) return false
    record.group.removeFromParent()
    this.heldProps.delete(record.id)
    this.activityPropIds.delete(record.id)
    if (PROP_OWNERS.get(record.id) === this) PROP_OWNERS.delete(record.id)
    if (![...this.heldProps.values()].some((item) => item.type === record.type)) {
      this.actor?.setHandheldPropOverride?.(record.type, false)
    }
    return true
  }

  transferProp(idOrType, recipient, { hand = null } = {}) {
    const target = recipient?.activityController ?? recipient
    if (!(target instanceof ActivityController) || target === this || target.disposed) {
      return false
    }
    const record = this.#findProp(idOrType)
    if (!record || target.heldProps.has(record.id)) return false
    if (PROP_OWNERS.get(record.id) !== this) return false

    record.group.removeFromParent()
    this.heldProps.delete(record.id)
    this.activityPropIds.delete(record.id)
    if (![...this.heldProps.values()].some((item) => item.type === record.type)) {
      this.actor?.setHandheldPropOverride?.(record.type, false)
    }
    record.activityOwned = false
    record.hand = hand ?? DEFAULT_PROP_HAND[record.type]
    target.#mountProp(record, record.hand)
    target.heldProps.set(record.id, record)
    PROP_OWNERS.set(record.id, target)
    return true
  }

  detachAllProps() {
    for (const id of [...this.heldProps.keys()]) this.detachProp(id)
  }

  getHeldProps() {
    return [...this.heldProps.values()].map((record) => Object.freeze({
      id: record.id,
      type: record.type,
      hand: record.hand,
    }))
  }

  getState() {
    return Object.freeze({
      activity: this.currentActivity,
      elapsed: this.elapsed,
      queued: this.queue.length,
      transitioning: this.transitioning,
      props: Object.freeze(this.getHeldProps()),
    })
  }

  dispose() {
    if (this.disposed) return
    this.stopActivity({ transitionDuration: 0 })
    this.transitioning = false
    this.disposed = true
    this.actor = null
    this.rig = null
    this.anchors = null
  }

  #begin(activity) {
    writeRigToPose(this.rig, this.fromPose)
    this.current = activity
    this.elapsed = 0
    this.transitioning = activity.transitionDuration > 0
    this.transitionElapsed = 0
    this.transitionDuration = activity.transitionDuration
    this.#attachActivityProps(activity)
    if (!this.transitioning) this.#applyCurrentPose()
  }

  #completeCurrent() {
    const completed = this.current
    this.#cleanupActivityProps()
    completed.onComplete?.(Object.freeze({
      activity: completed.id,
      duration: completed.duration,
      metadata: completed.metadata,
    }), this.actor)
    if (this.queue.length) {
      this.#begin(this.queue.shift())
      return
    }
    this.current = null
    this.elapsed = 0
    this.#transitionToBase(completed.transitionDuration)
  }

  #transitionToBase(duration) {
    writeRigToPose(this.rig, this.fromPose)
    copyPose(this.defaultPose, this.targetPose)
    this.transitionElapsed = 0
    this.transitionDuration = Math.max(0, duration)
    this.transitioning = this.transitionDuration > 0
    if (!this.transitioning) {
      applyPoseToRig(this.rig, this.targetPose, this.bodyScale)
    }
  }

  #applyCurrentPose() {
    if (this.current) samplePose(this.current, this.elapsed, this.targetPose)
    else copyPose(this.defaultPose, this.targetPose)
    let pose = this.targetPose
    if (this.transitioning && this.transitionDuration > 0) {
      const raw = Math.min(1, this.transitionElapsed / this.transitionDuration)
      const blend = raw * raw * (3 - 2 * raw)
      for (const key of POSE_KEYS) {
        this.blendedPose[key] = (
          this.fromPose[key] + (this.targetPose[key] - this.fromPose[key]) * blend
        )
      }
      pose = this.blendedPose
    }
    const breath = Math.sin((this.actor?.elapsed ?? this.elapsed) * 1.4) * 0.004
    applyPoseToRig(this.rig, pose, this.bodyScale, breath)
  }

  #updateFacing(delta) {
    const activity = this.current
    if (!activity?.facing) return
    if (Number.isFinite(activity.facing)) {
      this.actor?.faceYaw?.(activity.facing, delta, activity.speed * 3.5)
      return
    }
    const target = resolveTargetPosition(
      activity.facing === 'target' ? activity.target : activity.facing,
    )
    if (target) this.actor?.faceToward?.(target, delta, activity.speed * 3.5)
  }

  #attachActivityProps(activity) {
    activity.props.forEach((descriptor) => {
      const type = descriptor.type
      const id = descriptor.id ?? `${this.id}:activity:${type}`
      const record = this.attachProp(type, {
        id,
        hand: descriptor.hand ?? DEFAULT_PROP_HAND[type],
        activityOwned: true,
      })
      if (record) this.activityPropIds.add(record.id)
    })
  }

  #cleanupActivityProps() {
    for (const id of [...this.activityPropIds]) this.detachProp(id)
    this.activityPropIds.clear()
  }

  #findProp(idOrType) {
    const key = String(idOrType)
    const exact = this.heldProps.get(key)
    if (exact) return exact
    return [...this.heldProps.values()].find((record) => record.type === key) ?? null
  }

  #mountProp(record, hand) {
    const anchor = hand === 'left' ? this.anchors.left : this.anchors.right
    applyHandheldPropTransform(record.group, record.type, hand)
    anchor.add(record.group)
    this.actor?.setHandheldPropOverride?.(record.type, true)
  }
}
