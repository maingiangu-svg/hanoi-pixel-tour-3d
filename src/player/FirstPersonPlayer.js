import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { PlayerMotorbike } from './PlayerMotorbike.js'

const EYE_HEIGHT = 1.68
const WALK_SPEED = 3.6
const RUN_SPEED = 5.8
const MOTORBIKE_SPEED = WALK_SPEED * 5
const MAX_DELTA = 0.05
const GRAVITY = 18
const JUMP_IMPULSE = 4.55
const VERTICAL_STEP = 1 / 120
const HEAD_CLEARANCE = 0.14
const MIN_GROUNDED_TIME = 0.09
const THIRD_PERSON_DISTANCE = 4.8
const THIRD_PERSON_HEIGHT = 2.65
const THIRD_PERSON_TARGET_HEIGHT = 1.08
const THIRD_PERSON_CAMERA_CLEARANCE = 0.22
const THIRD_PERSON_WALL_BUFFER = 0.12
const THIRD_PERSON_RAY_NEAR = 0.42
const CAMERA_COLLISION_EPSILON = 0.0001

function getSegmentAabbEntry(
  startX,
  startZ,
  endX,
  endZ,
  minX,
  maxX,
  minZ,
  maxZ,
) {
  const deltaX = endX - startX
  const deltaZ = endZ - startZ
  let minTime = 0
  let maxTime = 1

  for (const [start, delta, min, max] of [
    [startX, deltaX, minX, maxX],
    [startZ, deltaZ, minZ, maxZ],
  ]) {
    if (Math.abs(delta) < CAMERA_COLLISION_EPSILON) {
      if (start < min || start > max) return null
      continue
    }
    const first = (min - start) / delta
    const second = (max - start) / delta
    minTime = Math.max(minTime, Math.min(first, second))
    maxTime = Math.min(maxTime, Math.max(first, second))
    if (minTime > maxTime) return null
  }

  return minTime >= 0 && minTime <= 1 ? minTime : null
}

export const PLAYER_MOVEMENT_CONFIG = Object.freeze({
  walkSpeed: WALK_SPEED,
  runSpeed: RUN_SPEED,
  motorbikeSpeed: MOTORBIKE_SPEED,
  motorbikeMultiplier: MOTORBIKE_SPEED / WALK_SPEED,
})

export const PLAYER_JUMP_CONFIG = Object.freeze({
  gravity: GRAVITY,
  impulse: JUMP_IMPULSE,
  expectedHeight: (JUMP_IMPULSE * JUMP_IMPULSE) / (2 * GRAVITY),
})

export class FirstPersonPlayer {
  constructor({
    camera,
    domElement,
    input,
    collision,
    spawn,
    scene = null,
    onViewCameraChange = null,
  }) {
    this.camera = camera
    this.input = input
    this.collision = collision
    this.scene = scene
    this.onViewCameraChange = onViewCameraChange
    this.controls = new PointerLockControls(camera, domElement)
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(15)
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(165)
    this.controls.pointerSpeed = 0.82

    this.camera.position.set(spawn.x, EYE_HEIGHT, spawn.z)
    this.camera.position.y = this.collision.getGroundHeight(this.camera.position) + EYE_HEIGHT
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.x = THREE.MathUtils.degToRad(5)

    this.forward = new THREE.Vector3()
    this.right = new THREE.Vector3()
    this.displacement = new THREE.Vector3()
    this.viewForward = new THREE.Vector3()
    this.thirdPersonTarget = new THREE.Vector3()
    this.thirdPersonLookAt = new THREE.Vector3()
    this.thirdPersonDesired = new THREE.Vector3()
    this.thirdPersonRayOrigin = new THREE.Vector3()
    this.thirdPersonRayDirection = new THREE.Vector3()
    this.cameraRaycaster = new THREE.Raycaster()
    this.cameraIntersections = []
    this.cameraOccluders = []
    this.motorbikeHeading = 0
    this.isMotorbikeMounted = false
    this.verticalVelocity = 0
    this.grounded = true
    this.groundedDuration = Infinity

    this.thirdPersonCamera = new THREE.PerspectiveCamera(
      camera.fov,
      camera.aspect,
      camera.near,
      camera.far,
    )
    this.thirdPersonCamera.name = 'Camera góc nhìn thứ ba sau xe máy'
    this.motorbike = new PlayerMotorbike({ parent: scene })
  }

  update(deltaTime) {
    if (!this.controls.isLocked) return

    const delta = Math.min(Math.max(deltaTime, 0), MAX_DELTA)
    const jumpRequested = this.input.consumeJump?.()
    if (
      !this.isMotorbikeMounted
      && jumpRequested
      && this.grounded
      && this.groundedDuration >= MIN_GROUNDED_TIME
    ) {
      this.verticalVelocity = JUMP_IMPULSE
      this.grounded = false
      this.groundedDuration = 0
    }

    const movement = this.input.getMovement()
    let movedDistance = 0
    if (movement.forward !== 0 || movement.right !== 0) {
      this.camera.getWorldDirection(this.forward)
      this.forward.y = 0
      this.forward.normalize()
      this.right.crossVectors(this.forward, this.camera.up).normalize()

      this.displacement
        .set(0, 0, 0)
        .addScaledVector(this.forward, movement.forward)
        .addScaledVector(this.right, movement.right)

      if (this.displacement.lengthSq() > 1) this.displacement.normalize()

      if (this.isMotorbikeMounted) {
        const targetHeading = Math.atan2(this.displacement.x, this.displacement.z)
        const headingDelta = Math.atan2(
          Math.sin(targetHeading - this.motorbikeHeading),
          Math.cos(targetHeading - this.motorbikeHeading),
        )
        this.motorbikeHeading += headingDelta * (1 - Math.exp(-8.5 * delta))
      }

      const speed = this.isMotorbikeMounted
        ? MOTORBIKE_SPEED
        : movement.running ? RUN_SPEED : WALK_SPEED
      this.displacement.multiplyScalar(speed * delta)
      const previousX = this.camera.position.x
      const previousZ = this.camera.position.z
      this.collision.move(this.camera.position, this.displacement)
      movedDistance = Math.hypot(
        this.camera.position.x - previousX,
        this.camera.position.z - previousZ,
      )
    }
    this._updateVertical(delta)
    if (this.isMotorbikeMounted) this._syncMotorbikeView(delta, movedDistance)
  }

  lock() {
    this.controls.lock()
  }

  teleport(spawn, yaw = 0) {
    this.setMotorbikeMounted(false)
    this.camera.position.set(spawn.x, EYE_HEIGHT, spawn.z)
    this.camera.position.y = this.collision.getGroundHeight(this.camera.position) + EYE_HEIGHT
    this.camera.rotation.set(0, yaw, 0)
    this.verticalVelocity = 0
    this.grounded = true
    this.groundedDuration = Infinity
    this.input.reset()
  }

  lookAt(target) {
    this.camera.lookAt(target.x, target.y ?? EYE_HEIGHT, target.z)
    this.camera.rotation.order = 'YXZ'
    this.input.reset()
  }

  setMotorbikeMounted(mounted) {
    const nextMounted = Boolean(mounted)
    if (nextMounted === this.isMotorbikeMounted) return this.isMotorbikeMounted

    this.isMotorbikeMounted = nextMounted
    this.input.consumeJump?.()
    this.verticalVelocity = 0
    this.grounded = true
    this.groundedDuration = Infinity

    if (nextMounted) {
      this.camera.position.y = this.collision.getGroundHeight(this.camera.position) + EYE_HEIGHT
      this.camera.getWorldDirection(this.viewForward)
      this.viewForward.y = 0
      if (this.viewForward.lengthSq() < 0.0001) this.viewForward.set(0, 0, -1)
      else this.viewForward.normalize()
      this.motorbikeHeading = Math.atan2(this.viewForward.x, this.viewForward.z)
      this.motorbike.setMounted(true)
      this._syncMotorbikeView(0, 0, true)
      this.onViewCameraChange?.(this.thirdPersonCamera)
    } else {
      this.motorbike.setMounted(false)
      this.onViewCameraChange?.(this.camera)
    }
    return this.isMotorbikeMounted
  }

  toggleMotorbike() {
    return this.setMotorbikeMounted(!this.isMotorbikeMounted)
  }

  getRenderCamera() {
    return this.isMotorbikeMounted ? this.thirdPersonCamera : this.camera
  }

  dispose() {
    this.setMotorbikeMounted(false)
    this.motorbike.dispose()
    this.controls.dispose()
  }

  _syncMotorbikeView(deltaTime, movedDistance = 0, immediate = false) {
    const groundHeight = this.collision.getGroundHeight(this.camera.position)
    this.motorbike.update(deltaTime, {
      position: this.camera.position,
      groundHeight,
      heading: this.motorbikeHeading,
      distance: movedDistance,
    })

    this.camera.getWorldDirection(this.viewForward)
    const pitch = THREE.MathUtils.clamp(this.viewForward.y, -0.45, 0.45)
    this.viewForward.y = 0
    if (this.viewForward.lengthSq() < 0.0001) {
      this.viewForward.set(
        Math.sin(this.motorbikeHeading),
        0,
        Math.cos(this.motorbikeHeading),
      )
    } else {
      this.viewForward.normalize()
    }

    this.thirdPersonTarget.set(
      this.camera.position.x,
      groundHeight + THIRD_PERSON_TARGET_HEIGHT,
      this.camera.position.z,
    )
    this.thirdPersonDesired
      .copy(this.thirdPersonTarget)
      .addScaledVector(this.viewForward, -THIRD_PERSON_DISTANCE)
    this.thirdPersonDesired.y = groundHeight + THIRD_PERSON_HEIGHT
    const colliderObstructed = this._resolveThirdPersonCameraObstruction()
    const visualObstructed = this._resolveThirdPersonVisualObstruction()

    if (immediate || colliderObstructed || visualObstructed) {
      this.thirdPersonCamera.position.copy(this.thirdPersonDesired)
    } else {
      const follow = 1 - Math.exp(-10 * Math.max(0, deltaTime))
      this.thirdPersonCamera.position.lerp(this.thirdPersonDesired, follow)
    }

    this.thirdPersonLookAt
      .copy(this.thirdPersonTarget)
      .addScaledVector(this.viewForward, 0.8)
    this.thirdPersonLookAt.y += pitch * 1.4
    this.thirdPersonCamera.lookAt(this.thirdPersonLookAt)
  }

  _resolveThirdPersonCameraObstruction() {
    const startX = this.thirdPersonTarget.x
    const startZ = this.thirdPersonTarget.z
    const deltaX = this.thirdPersonDesired.x - startX
    const deltaZ = this.thirdPersonDesired.z - startZ
    const horizontalDistance = Math.hypot(deltaX, deltaZ)
    if (horizontalDistance < CAMERA_COLLISION_EPSILON) return false

    let allowedTime = 1
    const bounds = this.collision.bounds
    if (bounds) {
      const minX = bounds.minX + THIRD_PERSON_CAMERA_CLEARANCE
      const maxX = bounds.maxX - THIRD_PERSON_CAMERA_CLEARANCE
      const minZ = bounds.minZ + THIRD_PERSON_CAMERA_CLEARANCE
      const maxZ = bounds.maxZ - THIRD_PERSON_CAMERA_CLEARANCE
      if (deltaX > CAMERA_COLLISION_EPSILON) {
        allowedTime = Math.min(allowedTime, (maxX - startX) / deltaX)
      } else if (deltaX < -CAMERA_COLLISION_EPSILON) {
        allowedTime = Math.min(allowedTime, (minX - startX) / deltaX)
      }
      if (deltaZ > CAMERA_COLLISION_EPSILON) {
        allowedTime = Math.min(allowedTime, (maxZ - startZ) / deltaZ)
      } else if (deltaZ < -CAMERA_COLLISION_EPSILON) {
        allowedTime = Math.min(allowedTime, (minZ - startZ) / deltaZ)
      }
    }

    for (const box of this.collision.colliders ?? []) {
      if (box.disabled || box.dynamic) continue
      const hitTime = getSegmentAabbEntry(
        startX,
        startZ,
        this.thirdPersonDesired.x,
        this.thirdPersonDesired.z,
        box.minX - THIRD_PERSON_CAMERA_CLEARANCE,
        box.maxX + THIRD_PERSON_CAMERA_CLEARANCE,
        box.minZ - THIRD_PERSON_CAMERA_CLEARANCE,
        box.maxZ + THIRD_PERSON_CAMERA_CLEARANCE,
      )
      if (hitTime !== null && hitTime > CAMERA_COLLISION_EPSILON) {
        allowedTime = Math.min(allowedTime, hitTime)
      }
    }

    if (allowedTime >= 0.999) return false
    const bufferTime = THIRD_PERSON_WALL_BUFFER / horizontalDistance
    const safeTime = THREE.MathUtils.clamp(allowedTime - bufferTime, 0, 1)
    this.thirdPersonDesired.x = startX + deltaX * safeTime
    this.thirdPersonDesired.z = startZ + deltaZ * safeTime
    return true
  }

  _resolveThirdPersonVisualObstruction() {
    if (!this.scene) return false
    this.thirdPersonRayOrigin.copy(this.thirdPersonTarget)
    this.thirdPersonRayDirection
      .subVectors(this.thirdPersonDesired, this.thirdPersonRayOrigin)
    const desiredDistance = this.thirdPersonRayDirection.length()
    if (desiredDistance <= THIRD_PERSON_RAY_NEAR) return false
    this.thirdPersonRayDirection.divideScalar(desiredDistance)

    this.cameraRaycaster.set(
      this.thirdPersonRayOrigin,
      this.thirdPersonRayDirection,
    )
    this.cameraRaycaster.near = THIRD_PERSON_RAY_NEAR
    this.cameraRaycaster.far = desiredDistance
    this.cameraRaycaster.camera = this.thirdPersonCamera
    this.cameraOccluders.length = 0
    this.scene.traverseVisible((object) => {
      if (this._isCameraOccluder(object)) this.cameraOccluders.push(object)
    })
    this.cameraIntersections.length = 0
    this.cameraRaycaster.intersectObjects(
      this.cameraOccluders,
      false,
      this.cameraIntersections,
    )

    const hit = this.cameraIntersections[0]
    if (!hit) return false
    const safeDistance = Math.max(
      THIRD_PERSON_RAY_NEAR,
      hit.distance - THIRD_PERSON_WALL_BUFFER,
    )
    this.thirdPersonDesired
      .copy(this.thirdPersonRayOrigin)
      .addScaledVector(this.thirdPersonRayDirection, safeDistance)
    return true
  }

  _isCameraOccluder(object) {
    if (!object?.isMesh && !object?.isInstancedMesh) return false
    let current = object
    while (current) {
      if (!current.visible) return false
      if (current === this.motorbike.group) return false
      if (current.name?.startsWith('NPC ')) return false
      if (current.userData?.cameraOccluder === false) return false
      current = current.parent
    }
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    return materials.some((material) =>
      material && material.visible !== false && material.opacity > 0.05,
    )
  }

  _updateVertical(deltaTime) {
    let remaining = deltaTime
    while (remaining > 0) {
      const step = Math.min(VERTICAL_STEP, remaining)
      this.verticalVelocity -= GRAVITY * step
      const state = this.collision.moveVertical(
        this.camera.position,
        this.verticalVelocity * step,
        {
          eyeHeight: EYE_HEIGHT,
          headClearance: HEAD_CLEARANCE,
        },
      )

      if (state.hitCeiling && this.verticalVelocity > 0) {
        this.verticalVelocity = 0
      }
      if (state.grounded && this.verticalVelocity <= 0) {
        const justLanded = !this.grounded
        this.verticalVelocity = 0
        this.grounded = true
        this.groundedDuration = justLanded ? 0 : this.groundedDuration + step
      } else if (!state.grounded) {
        this.grounded = false
        this.groundedDuration = 0
      }
      remaining -= step
    }
  }
}
