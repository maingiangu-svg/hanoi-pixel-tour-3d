import * as THREE from 'three'
import { Renderer } from './Renderer.js'
import { Input } from './Input.js'
import { FirstPersonPlayer } from '../player/FirstPersonPlayer.js'
import { PlayerCollision } from '../player/PlayerCollision.js'
import { ChurchDistrict } from '../world/ChurchDistrict.js'
import { InteractionSystem } from '../systems/InteractionSystem.js'
import { StartOverlay } from '../ui/StartOverlay.js'
import { DebugPanel } from '../ui/DebugPanel.js'

export class Game {
  constructor(container, uiRoot) {
    this.renderer = new Renderer(container)
    this.input = new Input()
    this.world = new ChurchDistrict(this.renderer.scene)
    this.collision = new PlayerCollision({
      colliders: this.world.colliders,
      bounds: this.world.bounds,
    })
    this.player = new FirstPersonPlayer({
      camera: this.renderer.camera,
      domElement: this.renderer.instance.domElement,
      input: this.input,
      collision: this.collision,
      spawn: new THREE.Vector3(this.world.spawn.x, 0, this.world.spawn.z),
    })
    this.ui = new StartOverlay(uiRoot, () => this.player.lock())
    this.interactions = new InteractionSystem({
      player: this.player,
      input: this.input,
      collision: this.collision,
      world: this.world,
      ui: this.ui,
    })
    this.debug = import.meta.env.DEV
      ? new DebugPanel(this.ui.debugPanel, this.player, this.renderer, this.world)
      : null
    if (import.meta.env.DEV) this.#applyInspectionView()
    this.timer = new THREE.Timer()
    this.timer.connect(document)

    this.handleLock = () => {
      this.input.setEnabled(true)
      this.ui.setLocked(true)
    }
    this.handleUnlock = () => {
      this.input.setEnabled(false)
      this.ui.setLocked(false)
    }
    this.tick = this.tick.bind(this)

    this.player.controls.addEventListener('lock', this.handleLock)
    this.player.controls.addEventListener('unlock', this.handleUnlock)
    this.renderer.instance.setAnimationLoop(this.tick)
  }

  tick() {
    this.timer.update()
    const deltaTime = this.timer.getDelta()
    this.player.update(deltaTime)
    this.interactions.update()
    this.debug?.update(deltaTime)
    this.renderer.render()
  }

  #applyInspectionView() {
    const inspection = new URLSearchParams(window.location.search).get('inspect')
    if (!inspection) return

    if (inspection === 'interior') {
      const destination = this.world.transition('interior')
      this.collision.setWorld(destination)
      this.player.teleport(destination.spawn, destination.spawn.yaw)
    } else if (inspection === 'street') {
      this.player.teleport({ x: 0, z: 9.5 }, Math.PI)
    } else if (inspection === 'cafe') {
      this.player.teleport({ x: 19, z: 12.5 }, Math.PI)
    }
    this.ui.setLocked(true)
  }

  dispose() {
    this.renderer.instance.setAnimationLoop(null)
    this.player.controls.removeEventListener('lock', this.handleLock)
    this.player.controls.removeEventListener('unlock', this.handleUnlock)
    this.player.dispose()
    this.interactions.dispose()
    this.timer.dispose()
    this.input.dispose()
    this.world.dispose()
    this.ui.dispose()
    this.renderer.dispose()
  }
}
