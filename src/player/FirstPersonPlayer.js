import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

const EYE_HEIGHT = 1.68
const WALK_SPEED = 3.6
const RUN_SPEED = 5.8
const MAX_DELTA = 0.05

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
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.x = THREE.MathUtils.degToRad(5)

    this.forward = new THREE.Vector3()
    this.right = new THREE.Vector3()
    this.displacement = new THREE.Vector3()
  }

  update(deltaTime) {
    this.camera.position.y = EYE_HEIGHT
    if (!this.controls.isLocked) return

    const movement = this.input.getMovement()
    if (movement.forward === 0 && movement.right === 0) return

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
    this.displacement.multiplyScalar(speed * Math.min(deltaTime, MAX_DELTA))
    this.collision.move(this.camera.position, this.displacement)
    this.camera.position.y = EYE_HEIGHT
  }

  lock() {
    this.controls.lock()
  }

  teleport(spawn, yaw = 0) {
    this.camera.position.set(spawn.x, EYE_HEIGHT, spawn.z)
    this.camera.rotation.set(0, yaw, 0)
    this.input.reset()
  }

  dispose() {
    this.controls.dispose()
  }
}
