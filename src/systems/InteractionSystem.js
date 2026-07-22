export class InteractionSystem {
  constructor({
    player,
    input,
    collision,
    world,
    ui,
    eventTarget = window,
    setTimer = window.setTimeout.bind(window),
    clearTimer = window.clearTimeout.bind(window),
  }) {
    this.player = player
    this.input = input
    this.collision = collision
    this.world = world
    this.ui = ui
    this.eventTarget = eventTarget
    this.setTimer = setTimer
    this.clearTimer = clearTimer
    this.availablePortal = null
    this.transitioning = false
    this.timer = null
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown)
  }

  update() {
    if (this.transitioning || !this.player.controls.isLocked) {
      this.availablePortal = null
      this.ui.setInteraction(null)
      return
    }

    const portal = this.world.getActivePortal()
    const position = this.player.camera.position
    const offsetX = position.x - portal.position.x
    const offsetZ = position.z - portal.position.z
    const isNear = offsetX * offsetX + offsetZ * offsetZ <= portal.radius * portal.radius
    this.availablePortal = isNear ? portal : null
    this.ui.setInteraction(this.availablePortal?.label ?? null)
  }

  handleKeyDown(event) {
    if (
      event.code !== 'KeyE' ||
      event.repeat ||
      this.transitioning ||
      !this.availablePortal ||
      !this.player.controls.isLocked
    ) return

    event.preventDefault()
    const portal = this.availablePortal
    this.availablePortal = null
    this.transitioning = true
    this.input.setEnabled(false)
    this.ui.setInteraction(null)
    this.ui.setFading(true)

    this.timer = this.setTimer(() => {
      const destination = this.world.transition(portal.target)
      this.collision.setWorld(destination)
      this.player.teleport(destination.spawn, destination.spawn.yaw)
      this.timer = this.setTimer(() => {
        this.ui.setFading(false)
        this.input.setEnabled(this.player.controls.isLocked)
        this.transitioning = false
        this.timer = null
      }, 190)
    }, 190)
  }

  dispose() {
    this.eventTarget.removeEventListener('keydown', this.handleKeyDown)
    if (this.timer !== null) this.clearTimer(this.timer)
  }
}
