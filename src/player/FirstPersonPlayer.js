import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

const EYE_HEIGHT = 1.68
const WALK_SPEED = 3.6
const RUN_SPEED = 5.8
const MAX_DELTA = 0.05
const GRAVITY = 18
const JUMP_IMPULSE = 4.55
const VERTICAL_STEP = 1 / 120
const HEAD_CLEARANCE = 0.14
const MIN_GROUNDED_TIME = 0.09

export const PLAYER_JUMP_CONFIG = Object.freeze({
  gravity: GRAVITY,
  impulse: JUMP_IMPULSE,
  expectedHeight: (JUMP_IMPULSE * JUMP_IMPULSE) / (2 * GRAVITY),
})

export class FirstPersonPlayer {
  constructor({ camera, domElement, input, collision, spawn }) {
    this.camera = camera
    this.input = input
    this.collision = collision
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
    this.verticalVelocity = 0
    this.grounded = true
    this.groundedDuration = Infinity
  }

  update(deltaTime) {
    if (!this.controls.isLocked) return

    const delta = Math.min(Math.max(deltaTime, 0), MAX_DELTA)
    if (
      this.input.consumeJump?.()
      && this.grounded
      && this.groundedDuration >= MIN_GROUNDED_TIME
    ) {
      this.verticalVelocity = JUMP_IMPULSE
      this.grounded = false
      this.groundedDuration = 0
    }

    const movement = this.input.getMovement()
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

      const speed = movement.running ? RUN_SPEED : WALK_SPEED
      this.displacement.multiplyScalar(speed * delta)
      this.collision.move(this.camera.position, this.displacement)
    }
    this._updateVertical(delta)
  }

  lock() {
    this.controls.lock()
  }

  teleport(spawn, yaw = 0) {
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

  dispose() {
    this.controls.dispose()
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
