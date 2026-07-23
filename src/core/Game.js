import * as THREE from 'three'
import { Renderer } from './Renderer.js'
import { Input } from './Input.js'
import { FirstPersonPlayer } from '../player/FirstPersonPlayer.js'
import { PlayerCollision } from '../player/PlayerCollision.js'
import { ChurchDistrict } from '../world/ChurchDistrict.js'
import { InteractionSystem } from '../systems/InteractionSystem.js'
import { DialogueSystem } from '../systems/DialogueSystem.js'
import { MoAssetLoader } from '../assets/MoAssetLoader.js'
import { StartOverlay } from '../ui/StartOverlay.js'
import { DialogueUI } from '../ui/DialogueUI.js'
import { DebugPanel } from '../ui/DebugPanel.js'
import { GameClockUI } from '../ui/GameClockUI.js'
import { MapOverlay, getMapHotkeyAction } from '../ui/MapOverlay.js'
import { GameClock } from '../time/GameClock.js'
import { DayNightCycle } from '../lighting/DayNightCycle.js'
import {
  MAP_INSPECTION_TARGETS,
  createMapInspectionTarget,
} from '../world/map/MapInspection.js'

export class Game {
  constructor(container, uiRoot) {
    this.disposed = false
    this.renderer = new Renderer(container)
    this.input = new Input()
    this.clock = new GameClock({ initialHour: 17, initialMinute: 30 })
    this.assets = new MoAssetLoader()
    this.world = new ChurchDistrict(this.renderer.scene, {
      camera: this.renderer.camera,
      assetLoader: this.assets,
    })
    this.world.update(0, this.clock)
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
    this.clockUi = new GameClockUI(this.ui.shell)
    this.clockUi.update(this.clock)
    this.mapUi = new MapOverlay(this.ui.shell, {
      onRequestClose: () => this.#closeMap(true),
    })
    this.mapDirection = new THREE.Vector3()
    this.resumePointerLockAfterMap = false
    this.dialogueUi = new DialogueUI(
      this.ui.shell,
      this.assets,
      () => this.dialogue?.advance(),
    )
    this.dialogue = new DialogueSystem({
      player: this.player,
      input: this.input,
      gameUi: this.ui,
      dialogueUi: this.dialogueUi,
    })
    this.interactions = new InteractionSystem({
      player: this.player,
      input: this.input,
      collision: this.collision,
      world: this.world,
      ui: this.ui,
      dialogue: this.dialogue,
    })
    this.dayNight = new DayNightCycle({
      scene: this.renderer.scene,
      clock: this.clock,
      lighting: this.world.getLightingContext(),
      area: this.world.activeAreaName,
    })
    this.debug = import.meta.env.DEV
      ? new DebugPanel(
          this.ui.debugPanel,
          this.player,
          this.renderer,
          this.world,
          this.clock,
          this.dayNight,
        )
      : null
    if (import.meta.env.DEV) this.#applyInspectionView()
    this.timer = new THREE.Timer()
    this.timer.connect(document)

    this.handleLock = () => {
      if (this.dialogue.isActive()) {
        this.player.controls.unlock()
        return
      }
      this.input.setEnabled(true)
      this.ui.setLocked(true)
    }
    this.handleUnlock = () => {
      this.input.setEnabled(false)
      this.ui.setLocked(false)
    }
    this.handleMapKeyDown = this.handleMapKeyDown.bind(this)
    this.tick = this.tick.bind(this)

    this.player.controls.addEventListener('lock', this.handleLock)
    this.player.controls.addEventListener('unlock', this.handleUnlock)
    window.addEventListener('keydown', this.handleMapKeyDown)
    this.renderer.instance.setAnimationLoop(this.tick)
  }

  tick() {
    this.timer.update()
    const deltaTime = this.timer.getDelta()
    this.clock.update(deltaTime)
    this.dayNight.update(this.world.activeAreaName)
    if (this.mapUi.isOpen) {
      this.player.camera.getWorldDirection(this.mapDirection)
      this.mapUi.updatePosition(
        this.world.activeMapId,
        this.player.camera.position,
        this.mapDirection,
      )
    } else {
      this.player.update(deltaTime)
      this.dialogue.update(deltaTime)
      this.world.update(deltaTime, this.clock)
      this.interactions.update()
    }
    this.clockUi.update(this.clock)
    this.debug?.update(deltaTime)
    this.renderer.render()
  }

  handleMapKeyDown(event) {
    const action = getMapHotkeyAction(event, this.mapUi.isOpen)
    if (!action) return
    if (action === 'open') {
      if (this.dialogue.isActive() || this.interactions.transitioning) return
      event.preventDefault()
      this.#openMap()
      return
    }

    event.preventDefault()
    this.#closeMap(action === 'close-resume')
  }

  #openMap() {
    if (this.mapUi.isOpen) return
    this.resumePointerLockAfterMap = this.player.controls.isLocked
    this.ui.setMapActive(true)
    this.input.setEnabled(false)
    this.ui.setInteraction(null)
    this.clock.pause('map-overlay')
    this.player.camera.getWorldDirection(this.mapDirection)
    this.mapUi.open(
      this.world.activeMapId,
      this.player.camera.position,
      this.mapDirection,
    )
    if (this.player.controls.isLocked) this.player.controls.unlock()
  }

  #closeMap(resumePointerLock) {
    if (!this.mapUi.isOpen) return
    const shouldRelock = resumePointerLock && this.resumePointerLockAfterMap
    this.mapUi.close()
    this.ui.setMapActive(false)
    this.clock.resume('map-overlay')
    this.resumePointerLockAfterMap = false

    if (!shouldRelock) {
      this.input.setEnabled(false)
      this.ui.setResumeMode(true)
      return
    }
    if (this.player.controls.isLocked) {
      this.input.setEnabled(true)
      this.ui.setLocked(true)
    } else {
      this.player.lock()
    }
  }

  #applyInspectionView() {
    const search = new URLSearchParams(window.location.search)
    const inspection = search.get('inspect')
    const debugTime = search.get('time')
    if (debugTime && /^\d{1,2}:\d{2}$/.test(debugTime)) {
      const [hour, minute] = debugTime.split(':').map(Number)
      this.clock.setTime(hour, minute)
      this.world.update(0, this.clock)
    }
    if (!inspection) return

    if (MAP_INSPECTION_TARGETS[inspection]) {
      this.#teleportToMapInspection(MAP_INSPECTION_TARGETS[inspection])
    } else if (inspection === 'street') {
      this.player.teleport({ x: 0, z: 9.5 }, Math.PI)
    } else if (inspection === 'crowd') {
      this.player.teleport({ x: 0, z: 9.5 }, 0)
    } else if (inspection === 'cafe') {
      this.player.teleport({ x: 19, z: 12.5 }, Math.PI)
    } else if (inspection === 'route') {
      this.player.teleport({ x: 43, z: 13 }, Math.PI / 2)
    } else if (inspection === 'lake') {
      this.player.teleport({ x: 68, z: -3 }, -Math.PI / 2)
    } else if (inspection === 'old-quarter') {
      this.player.teleport({ x: 55, z: 36.5 }, Math.PI / 2)
    } else if (inspection === 'bridge') {
      this.player.teleport({ x: 119, z: 35.5 }, Math.PI)
    } else if (inspection === 'temple') {
      this.player.teleport({ x: 119, z: 44.8 }, Math.PI)
    } else if (inspection === 'mo' || inspection === 'dialogue') {
      this.player.teleport({ x: 6.2, z: -1.7 }, 0)
      if (inspection === 'dialogue') {
        Promise.all([this.assets.ready, this.world.mo.readyPromise])
          .then(() => {
            if (!this.disposed) this.dialogue.start(this.world.mo)
          })
      }
    } else if (['tea', 'tea-dialogue', 'driver', 'driver-dialogue'].includes(inspection)) {
      const isTeaVendor = inspection.startsWith('tea')
      const startDialogue = inspection.endsWith('dialogue')
      const actor = this.world.crowd?.getActorByName(
        isTeaVendor ? 'Cô trà đá' : 'Chú xe ôm',
      )
      this.player.teleport(
        isTeaVendor ? { x: -16.9, z: 5.95 } : { x: 9.25, z: 16.25 },
        isTeaVendor ? Math.PI / 2 : Math.PI,
      )
      if (actor) {
        actor.setActive(true)
        if (startDialogue) this.dialogue.start(actor)
      }
    }
    this.ui.setLocked(!this.dialogue.isActive())
  }

  #teleportToMapInspection(inspection) {
    const area = Object.values(this.world.areas).find(
      (candidate) => candidate.mapId === inspection.mapId,
    )
    const target = createMapInspectionTarget(inspection, area)
    const destination = this.world.transition(target)
    this.collision.setWorld(destination)
    this.player.teleport(destination.spawn, destination.spawn.yaw)
    this.dayNight.update(this.world.activeAreaName)
  }

  dispose() {
    this.disposed = true
    this.renderer.instance.setAnimationLoop(null)
    this.player.controls.removeEventListener('lock', this.handleLock)
    this.player.controls.removeEventListener('unlock', this.handleUnlock)
    window.removeEventListener('keydown', this.handleMapKeyDown)
    this.dialogue.dispose()
    this.interactions.dispose()
    this.player.dispose()
    this.dialogueUi.dispose()
    this.mapUi.dispose()
    this.clockUi.dispose()
    this.clock.dispose()
    this.timer.dispose()
    this.input.dispose()
    this.world.dispose()
    this.assets.dispose()
    this.ui.dispose()
    this.renderer.dispose()
  }
}
