export class InteractionSystem {
  constructor({
    player,
    input,
    collision,
    world,
    ui,
    dialogue = null,
    eventTarget = window,
    setTimer = window.setTimeout.bind(window),
    clearTimer = window.clearTimeout.bind(window),
  }) {
    this.player = player
    this.input = input
    this.collision = collision
    this.world = world
    this.ui = ui
    this.dialogue = dialogue
    this.eventTarget = eventTarget
    this.setTimer = setTimer
    this.clearTimer = clearTimer
    this.availablePortal = null
    this.availableInteraction = null
    this.transitioning = false
    this.timer = null
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.eventTarget.addEventListener('keydown', this.handleKeyDown)
  }

  update() {
    if (this.transitioning || this.dialogue?.isActive() || !this.player.controls.isLocked) {
      this.availablePortal = null
      this.availableInteraction = null
      this.ui.setInteraction(null)
      return
    }

    const position = this.player.camera.position
    const interactions = this.world.getActiveInteractions?.() ?? [this.world.getActivePortal()]
    let nearest = null
    let nearestDistanceSquared = Infinity

    for (const interaction of interactions) {
      const offsetX = position.x - interaction.position.x
      const offsetZ = position.z - interaction.position.z
      const distanceSquared = offsetX * offsetX + offsetZ * offsetZ
      if (
        distanceSquared <= interaction.radius * interaction.radius &&
        distanceSquared < nearestDistanceSquared
      ) {
        nearest = interaction
        nearestDistanceSquared = distanceSquared
      }
    }

    this.availableInteraction = nearest
    this.availablePortal = nearest?.type === 'portal' || !nearest?.type ? nearest : null
    this.ui.setInteraction(nearest?.label ?? null)
  }

  handleKeyDown(event) {
    if (
      event.code !== 'KeyE' ||
      event.repeat ||
      this.transitioning ||
      (!this.availableInteraction && !this.availablePortal) ||
      !this.player.controls.isLocked
    ) return

    event.preventDefault()
    const interaction = this.availableInteraction ?? this.availablePortal
    if (interaction.type === 'dialogue') {
      this.availableInteraction = null
      this.availablePortal = null
      this.ui.setInteraction(null)
      this.dialogue?.start(interaction.target)
      return
    }

    if (interaction.type === 'action') {
      this.availableInteraction = null
      this.availablePortal = null
      this.ui.setInteraction(null)
      interaction.activate?.({
        player: this.player,
        input: this.input,
        collision: this.collision,
        world: this.world,
        ui: this.ui,
      })
      return
    }

    const portal = interaction
    this.availablePortal = null
    this.availableInteraction = null
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
