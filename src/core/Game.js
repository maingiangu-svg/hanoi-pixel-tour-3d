import * as THREE from 'three'
import { Renderer } from './Renderer.js'
import { Input } from './Input.js'
import { FirstPersonPlayer } from '../player/FirstPersonPlayer.js'
import { MotorcycleMode } from '../player/MotorcycleMode.js'
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
import { PhotoCapture } from '../photo/PhotoCapture.js'
import { PhotoMode } from '../photo/PhotoMode.js'
import { PhotoStore } from '../photo/PhotoStore.js'
import { PhotoAlbum } from '../photo/PhotoAlbum.js'
import { PhotoAlbumCatalog } from '../photo/PhotoAlbumCatalog.js'
import { PhotoModeUI } from '../ui/PhotoModeUI.js'
import { PhotoAlbumUI } from '../ui/PhotoAlbumUI.js'
import { PhotoQuestSystem } from '../quests/PhotoQuestSystem.js'
import { PhotoQuestJournal } from '../quests/PhotoQuestJournal.js'
import { PhotoQuestJournalUI } from '../ui/PhotoQuestJournalUI.js'
import { RegionalAudioSystem } from '../audio/RegionalAudioSystem.js'
import { AudioSettingsUI } from '../ui/AudioSettingsUI.js'
import { CinematicOverlay } from '../ui/CinematicOverlay.js'
import { CinematicManager } from '../cinematics/CinematicManager.js'
import { createChurchCinematicPoint } from '../cinematics/churchCinematic.js'
import { IndexedDbSaveStorage } from '../save/IndexedDbSaveStorage.js'
import { GameSaveSystem } from '../save/GameSaveSystem.js'
import {
  MAP_INSPECTION_TARGETS,
  createMapInspectionTarget,
} from '../world/map/MapInspection.js'
import {
  CHURCH_FACADE_LOOK_AT,
  CHURCH_PLAZA_SPAWN,
  ENABLE_DEBUG_CHURCH_TELEPORT,
  isDebugChurchTeleportHotkey,
  performChurchDebugTeleport,
} from '../debug/DebugTeleport.js'
import { PerformanceProfiler } from '../debug/PerformanceProfiler.js'
import { MomentSystem } from '../moments/MomentSystem.js'
import { SceneMomentSystem } from '../moments/SceneMomentSystem.js'
import { registerChurchOldQuarterMoments } from '../moments/ChurchOldQuarterMoments.js'
import { registerPedestrianMoments } from '../moments/PedestrianMoments.js'
import { registerLakeBridgeTempleMoments } from '../moments/LakeBridgeTempleMoments.js'
import { registerDevelopmentTestMoments } from '../moments/developmentMomentFixtures.js'

const ENABLE_DEBUG_MOMENT_FIXTURES = import.meta.env.DEV
  && new URLSearchParams(window.location.search).has('debug-moments')
const ENABLE_CINEMATIC_PREVIEW = import.meta.env.DEV
  && new URLSearchParams(window.location.search).has('cinematic-preview')

export class Game {
  constructor(container, uiRoot) {
    this.disposed = false
    this.renderer = new Renderer(container)
    this.profiler = import.meta.env.DEV ? new PerformanceProfiler() : null
    this.profileCollisionProbe = import.meta.env.DEV
      && new URLSearchParams(window.location.search).has('profile-collision')
    this.profileStressTimer = null
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
      groundHeight: this.world.areas.outdoor.groundHeight,
      ceilingHeight: this.world.areas.outdoor.ceilingHeight,
      groundSampler: this.world.areas.outdoor.groundSampler,
    })
    this.collision.setProfiler(this.profiler)
    this.world.setProfiler(this.profiler)
    this.player = new FirstPersonPlayer({
      camera: this.renderer.camera,
      domElement: this.renderer.instance.domElement,
      input: this.input,
      collision: this.collision,
      scene: this.renderer.scene,
      onViewCameraChange: (camera) => this.renderer.setActiveCamera(camera),
      spawn: new THREE.Vector3(CHURCH_PLAZA_SPAWN.x, 0, CHURCH_PLAZA_SPAWN.z),
    })
    this.player.lookAt(CHURCH_FACADE_LOOK_AT)
    this.momentSystem = new MomentSystem({
      resourceResolver: (type, id, definition) => {
        if (type === 'npc') return Boolean(this.world.getNamedNpc(id))
        if (type === 'prop') {
          return Boolean(this.world.getNamedProp?.(id)) || (
            definition?.metadata?.template
            && definition.propIds.includes(id)
          )
        }
        // Staging zones, performance areas, audio channels and interaction
        // points are logical resources declared by a moment, not spawned assets.
        return true
      },
      resourceResetter: (type, id, definition, context, reason) => {
        const resource = type === 'npc'
          ? this.world.getNamedNpc(id)
          : type === 'prop'
            ? this.world.getNamedProp?.(id)
            : null
        if (resource?.releaseMomentLock) {
          resource.releaseMomentLock(definition.id, reason, context)
        } else {
          resource?.resetMomentState?.(definition.id, reason, context)
        }
      },
    })
    registerChurchOldQuarterMoments(this.momentSystem, {
      resolveNpc: (id) => this.world.getNamedNpc(id),
    })
    registerPedestrianMoments(this.momentSystem, {
      resolveNpc: (id) => this.world.getNamedNpc(id),
    })
    registerLakeBridgeTempleMoments(this.momentSystem, {
      resolveNpc: (id) => this.world.getNamedNpc(id),
    })
    if (ENABLE_DEBUG_MOMENT_FIXTURES) {
      registerDevelopmentTestMoments(this.momentSystem, {
        resolveNpc: (id) => this.world.getNamedNpc(id),
      })
    }
    this.momentContext = {
      playerPosition: this.player.camera.position,
      regionIds: [],
      areaId: this.world.activeAreaName,
      gameMinutes: this.clock.minutes,
      paused: false,
    }
    this.sceneMomentSystem = new SceneMomentSystem({
      effects: this.world.sceneMomentEffects,
    })
    this.sceneMomentContext = {
      playerPosition: this.player.camera.position,
      regionIds: [],
      areaId: this.world.activeAreaName,
      gameMinutes: this.clock.minutes,
      lightingPhase: null,
      paused: false,
    }
    this.audio = new RegionalAudioSystem()
    this.ui = new StartOverlay(uiRoot, () => {
      void this.audio.start()
      this.player.lock()
    })
    this.audioUi = new AudioSettingsUI(this.ui.shell, {
      initialVolume: this.audio.volume,
      initialMuted: this.audio.muted,
      onVolumeChange: (volume) => {
        void this.audio.start()
        this.audio.setVolume(volume)
        this.audioUi.render(this.audio.getState())
        this.saveSystem?.saveSoon()
      },
      onMutedChange: (muted) => {
        void this.audio.start()
        this.audio.setMuted(muted)
        this.audioUi.render(this.audio.getState())
        this.saveSystem?.saveSoon()
      },
    })
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
    this.cinematicUi = new CinematicOverlay(this.ui.shell)
    this.cinematics = new CinematicManager({
      renderer: this.renderer,
      player: this.player,
      input: this.input,
      gameUi: this.ui,
      overlay: this.cinematicUi,
      world: this.world,
      audio: this.audio,
      allowUnlockedPreview: ENABLE_CINEMATIC_PREVIEW,
      canStart: () => (
        (this.player.controls.isLocked || ENABLE_CINEMATIC_PREVIEW)
        && !this.player.isMotorbikeMounted
        && this.world.activeAreaName === 'outdoor'
        && !this.mapUi.isOpen
        && !this.dialogue.isActive()
        && !this.interactions?.transitioning
        && !this.photoMode?.isActive()
        && !this.photoAlbum?.isOpen
        && !this.photoQuestJournal?.isOpen
      ),
    })
    this.cinematics.registerPoint(createChurchCinematicPoint())
    this.interactions = new InteractionSystem({
      player: this.player,
      input: this.input,
      collision: this.collision,
      world: this.world,
      ui: this.ui,
      dialogue: this.dialogue,
      getExternalInteractions: (position) => (
        this.cinematics.getNearbyInteractions(position)
      ),
      canScanInteractions: () => (
        this.player.controls.isLocked || ENABLE_CINEMATIC_PREVIEW
      ),
    })
    this.motorcycleMode = new MotorcycleMode({
      player: this.player,
      ui: this.ui,
      canToggle: () => (
        !this.mapUi.isOpen
        && !this.dialogue.isActive()
        && !this.interactions.transitioning
        && !this.photoMode?.isActive()
        && !this.photoAlbum?.isOpen
        && !this.photoQuestJournal?.isOpen
        && !this.cinematics.isActive()
        && (
          this.player.isMotorbikeMounted
          || this.world.activeAreaName !== 'interior'
        )
      ),
    })
    this.interactions.setProfiler(this.profiler)
    this.dayNight = new DayNightCycle({
      scene: this.renderer.scene,
      clock: this.clock,
      lighting: this.world.getLightingContext(),
      area: this.world.activeAreaName,
    })
    this.world.setDayNightRef(this.dayNight)
    this.photoUi = new PhotoModeUI(this.ui.shell)
    this.photoStore = new PhotoStore()
    this.photoQuestSystem = new PhotoQuestSystem()
    this.photoAlbumCatalog = new PhotoAlbumCatalog({
      questSystem: this.photoQuestSystem,
    })
    this.photoCapture = new PhotoCapture({
      renderer: this.renderer,
      camera: this.player.camera,
      clock: this.clock,
      world: this.world,
      dayNight: this.dayNight,
      momentSystem: this.momentSystem,
      sceneMomentSystem: this.sceneMomentSystem,
    })
    this.photoMode = new PhotoMode({
      camera: this.player.camera,
      input: this.input,
      capture: this.photoCapture,
      photoUi: this.photoUi,
      gameUi: this.ui,
      eventTarget: window,
      wheelTarget: this.renderer.instance.domElement,
      isPointerLocked: () => this.player.controls.isLocked,
      canOpen: () => (
        this.player.controls.isLocked
        && !this.player.isMotorbikeMounted
        && !this.mapUi.isOpen
        && !this.photoAlbum?.isOpen
        && !this.photoQuestJournal?.isOpen
        && !this.dialogue.isActive()
        && !this.interactions.transitioning
        && !this.cinematics.isActive()
      ),
      onPhotoCaptured: async (photo) => {
        const stored = await this.photoStore.add(photo)
        const questResult = this.photoQuestSystem.evaluatePhoto(
          stored.record.photo,
          { photoId: stored.record.id },
        )
        const albumResult = this.photoAlbumCatalog.processPhoto(stored.record, {
          questResult,
        })
        this.saveSystem?.saveSoon({ photos: true })
        if (albumResult.unlockedSecret) {
          const questNotice = questResult.completed
            ? ` · Nhiệm vụ: ${questResult.questName}`
            : ''
          return {
            notice: `Mở khóa bí mật · ${albumResult.unlockedSecret.name}${questNotice}`,
          }
        }
        return questResult.completed
          ? { notice: `Hoàn thành nhiệm vụ · ${questResult.questName}` }
          : null
      },
    })
    this.photoAlbumUi = new PhotoAlbumUI(this.ui.shell)
    this.photoAlbum = new PhotoAlbum({
      store: this.photoStore,
      ui: this.photoAlbumUi,
      input: this.input,
      player: this.player,
      gameUi: this.ui,
      catalog: this.photoAlbumCatalog,
      eventTarget: window,
      canOpen: () => (
        this.player.controls.isLocked
        && !this.player.isMotorbikeMounted
        && !this.photoMode.isActive()
        && !this.photoQuestJournal?.isOpen
        && !this.mapUi.isOpen
        && !this.dialogue.isActive()
        && !this.interactions.transitioning
        && !this.cinematics.isActive()
      ),
    })
    this.photoQuestJournalUi = new PhotoQuestJournalUI(this.ui.shell)
    this.photoQuestJournal = new PhotoQuestJournal({
      questSystem: this.photoQuestSystem,
      photoStore: this.photoStore,
      ui: this.photoQuestJournalUi,
      input: this.input,
      player: this.player,
      gameUi: this.ui,
      eventTarget: window,
      canOpen: () => (
        this.player.controls.isLocked
        && !this.player.isMotorbikeMounted
        && !this.photoMode.isActive()
        && !this.photoAlbum.isOpen
        && !this.mapUi.isOpen
        && !this.dialogue.isActive()
        && !this.interactions.transitioning
        && !this.cinematics.isActive()
      ),
    })
    const isDevelopmentInspection = import.meta.env.DEV
      && new URLSearchParams(window.location.search).has('inspect')
    this.saveSystem = new GameSaveSystem({
      storage: new IndexedDbSaveStorage(),
      clock: this.clock,
      player: this.player,
      collision: this.collision,
      world: this.world,
      dayNight: this.dayNight,
      photoStore: this.photoStore,
      questSystem: this.photoQuestSystem,
      albumCatalog: this.photoAlbumCatalog,
      audioSystem: this.audio,
      enabled: !isDevelopmentInspection,
      onStatus: (message) => {
        this.audioUi.render(this.audio.getState())
        if (message === 'Đã khôi phục tiến trình') this.ui.showNotice(message, 1800)
      },
    })
    this.saveReady = this.saveSystem.restore().catch(() => {
      this.ui.showNotice('Save cũ không thể đọc; game dùng trạng thái an toàn.', 2400)
      return false
    })
    this.debug = import.meta.env.DEV
      ? new DebugPanel(
          this.ui.debugPanel,
          this.player,
          this.renderer,
          this.world,
          this.clock,
          this.dayNight,
          this.profiler,
          this.momentSystem,
        )
      : null
    if (import.meta.env.DEV) this.#applyInspectionView()
    this.timer = new THREE.Timer()
    this.timer.connect(document)

    this.handleLock = () => {
      if (
        this.dialogue.isActive()
        || this.photoAlbum.isOpen
        || this.photoQuestJournal.isOpen
        || this.cinematics.isActive()
      ) {
        this.player.controls.unlock()
        return
      }
      this.input.setEnabled(true)
      this.ui.setLocked(true)
    }
    this.handleUnlock = () => {
      this.photoMode.close({ resumeInput: false })
      this.input.setEnabled(false)
      this.ui.setLocked(false)
    }
    this.handleMapKeyDown = this.handleMapKeyDown.bind(this)
    this.handleDebugKeyDown = this.handleDebugKeyDown.bind(this)
    this.tick = this.tick.bind(this)

    this.player.controls.addEventListener('lock', this.handleLock)
    this.player.controls.addEventListener('unlock', this.handleUnlock)
    window.addEventListener('keydown', this.handleMapKeyDown)
    if (ENABLE_DEBUG_CHURCH_TELEPORT) {
      window.addEventListener('keydown', this.handleDebugKeyDown)
    }
    this.renderer.instance.setAnimationLoop(this.tick)
    if (import.meta.env.DEV) this.#startAreaStressInspection()
  }

  tick() {
    this.timer.update()
    const deltaTime = this.timer.getDelta()
    this.profiler?.beginFrame()
    this.clock.update(this.cinematics.isActive() ? 0 : deltaTime)
    const dayNightStartedAt = this.profiler?.begin() ?? 0
    this.dayNight.update(this.world.activeAreaName)
    this.profiler?.end('dayNight', dayNightStartedAt)
    this.photoMode.update(deltaTime)
    this.cinematics.update(deltaTime)
    const simulationDelta = deltaTime * this.cinematics.getSimulationTimeScale()
    const updatesSpatialSystems = this.momentSystem.size > 0
      || this.sceneMomentSystem.size > 0
      || this.audio.started
    const regionIds = updatesSpatialSystems
      ? this.world.getActiveDistrictNames(this.player.camera.position)
      : null
    if (this.momentSystem.size > 0) {
      this.momentContext.regionIds = regionIds
      this.momentContext.areaId = this.world.activeAreaName
      this.momentContext.gameMinutes = this.clock.minutes
      this.momentContext.paused = this.clock.paused
      this.momentSystem.update(simulationDelta, this.momentContext)
    }
    if (this.sceneMomentSystem.size > 0) {
      this.sceneMomentContext.regionIds = regionIds
      this.sceneMomentContext.areaId = this.world.activeAreaName
      this.sceneMomentContext.gameMinutes = this.clock.minutes
      this.sceneMomentContext.lightingPhase = this.dayNight.getLightingPhase()
      this.sceneMomentContext.paused = this.clock.paused
      this.sceneMomentSystem.update(simulationDelta, this.sceneMomentContext)
    }
    this.audio.update(deltaTime, {
      areaName: this.world.activeAreaName,
      regionIds: regionIds ?? [],
      position: this.player.camera.position,
    })
    if (this.mapUi.isOpen) {
      this.player.camera.getWorldDirection(this.mapDirection)
      this.mapUi.updatePosition(
        this.world.activeMapId,
        this.player.camera.position,
        this.mapDirection,
      )
    } else {
      const cinematicActive = this.cinematics.isActive()
      if (!cinematicActive) {
        this.player.update(deltaTime)
        if (this.profileCollisionProbe && !this.player.controls.isLocked) {
          this.collision.move(this.player.camera.position, { x: 0, z: 0 })
        }
        this.dialogue.update(deltaTime)
      }
      this.world.update(simulationDelta, this.clock)
      this.interactions.update()
    }
    this.clockUi.update(this.clock)
    const renderStartedAt = this.profiler?.begin() ?? 0
    this.renderer.render(deltaTime, this.dayNight.getLightingPhase())
    this.profiler?.end('render', renderStartedAt)
    this.profiler?.endFrame(deltaTime)
    this.debug?.update(deltaTime)
  }

  handleMapKeyDown(event) {
    if (
      this.photoMode.isActive()
      || this.photoAlbum.isOpen
      || this.photoQuestJournal.isOpen
      || this.cinematics.isActive()
    ) return
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

  handleDebugKeyDown(event) {
    if (this.cinematics.isActive()) return
    if (!isDebugChurchTeleportHotkey(event, {
      choosingDialogueAnswer: this.dialogue.isChoosingAnswer(),
    })) return

    event.preventDefault()
    performChurchDebugTeleport({
      player: this.player,
      input: this.input,
      collision: this.collision,
      world: this.world,
      ui: this.ui,
      dialogue: this.dialogue,
      interactions: this.interactions,
      mapUi: this.mapUi,
      closeMap: () => this.#closeMap(false),
      dayNight: this.dayNight,
      clock: this.clock,
    })
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
    if (this.#applySpecialNpcInspection(inspection)) {
      this.ui.setLocked(true)
      return
    }

    if (MAP_INSPECTION_TARGETS[inspection]) {
      this.#teleportToMapInspection(MAP_INSPECTION_TARGETS[inspection])
    } else if (inspection.startsWith('shop-')) {
      const target = this.world.shops.getInspectionTarget(inspection.slice(5))
      if (target) {
        const spawn = target.position.clone()
        const outward = spawn.clone().sub(target.lookAt).setY(0).normalize()
        spawn.addScaledVector(outward, 3.4)
        this.player.teleport({ x: spawn.x, z: spawn.z }, 0)
        this.player.lookAt(target.lookAt)
      }
    } else if (inspection === 'street') {
      this.player.teleport({ x: 0, z: 9.5 }, Math.PI)
    } else if (inspection === 'church-plaza') {
      this.player.teleport({ x: 0, z: 2.5 }, Math.PI)
    } else if (inspection === 'church-door') {
      this.player.teleport({ x: 0, z: -11.2 }, Math.PI)
    } else if (inspection === 'crowd') {
      this.player.teleport({ x: 0, z: 9.5 }, 0)
    } else if (inspection === 'cafe') {
      this.player.teleport({ x: 19, z: 12.5 }, Math.PI)
    } else if (inspection === 'route') {
      this.player.teleport({ x: 43, z: 13 }, Math.PI / 2)
    } else if (inspection === 'lake') {
      this.player.teleport({ x: 68, z: -3 }, -Math.PI / 2)
    } else if (inspection === 'pedestrian') {
      this.player.teleport({ x: 146, z: 113 }, 0)
      this.player.lookAt({ x: 108, y: 1.4, z: 0 })
    } else if (inspection === 'turtle-viewpoint') {
      this.player.teleport({ x: 108, z: -91 }, 0)
      this.player.lookAt({ x: 103, y: 2.4, z: 0 })
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
    if (
      search.get('ride') === 'motorbike'
      && this.world.activeAreaName !== 'interior'
    ) {
      this.player.setMotorbikeMounted(true)
    }
    this.ui.setLocked(!this.dialogue.isActive())
  }

  #applySpecialNpcInspection(inspection) {
    const match = /^npc-(gymmer|basketball|mo)-(front|three-quarter|side|back)$/.exec(
      inspection,
    )
    if (!match) return false
    const [, profileId, view] = match
    const target = profileId === 'mo'
      ? this.world.mo
      : this.world.crowd?.manager.entries.find(
          (entry) => entry.actor.profile?.id === profileId,
        )?.actor
    if (!target) return false

    const visualActor = target.actor ?? target
    for (const crowd of [this.world.crowd, this.world.hoanKiemCrowd]) {
      crowd?.manager.entries.forEach((entry) => {
        crowd.manager.setEntryActive(entry, entry.actor === target)
      })
    }
    this.world.mo?.setDebugHidden(profileId !== 'mo')
    target.setActive?.(true)
    visualActor.setActive?.(true)
    target.setDebugLookFrozen?.(true)
    visualActor.setDebugLookFrozen?.(true)
    target.group.rotation.y = 0
    if (profileId === 'mo') {
      target.lastActiveAreaName = target.areaName
      target.group.visible = true
    }

    const focus = target.getFocusPoint(new THREE.Vector3())
    const distance = Math.max(2.2, visualActor.profile.height * 1.45)
    const offsets = {
      front: [0, distance],
      'three-quarter': [distance * 0.72, distance * 0.72],
      side: [distance, 0],
      back: [0, -distance],
    }
    const [offsetX, offsetZ] = offsets[view]
    this.player.teleport(
      { x: target.position.x + offsetX, z: target.position.z + offsetZ },
      0,
    )
    this.player.lookAt(focus)
    return true
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

  #startAreaStressInspection() {
    const requestedCycles = Number.parseInt(
      new URLSearchParams(window.location.search).get('stress-area-cycles') ?? '',
      10,
    )
    if (!Number.isFinite(requestedCycles) || requestedCycles <= 0) return
    const totalTransitions = Math.min(requestedCycles, 20) * 2
    let completedTransitions = 0
    const transition = () => {
      if (this.disposed) return
      const inspection = completedTransitions % 2 === 0
        ? MAP_INSPECTION_TARGETS.interior
        : MAP_INSPECTION_TARGETS.church
      this.#teleportToMapInspection(inspection)
      completedTransitions += 1
      if (completedTransitions < totalTransitions) {
        this.profileStressTimer = window.setTimeout(transition, 260)
      } else {
        this.profileStressTimer = null
      }
    }
    this.profileStressTimer = window.setTimeout(transition, 260)
  }

  dispose() {
    this.disposed = true
    if (this.profileStressTimer !== null) {
      window.clearTimeout(this.profileStressTimer)
      this.profileStressTimer = null
    }
    this.renderer.instance.setAnimationLoop(null)
    this.player.controls.removeEventListener('lock', this.handleLock)
    this.player.controls.removeEventListener('unlock', this.handleUnlock)
    window.removeEventListener('keydown', this.handleMapKeyDown)
    if (ENABLE_DEBUG_CHURCH_TELEPORT) {
      window.removeEventListener('keydown', this.handleDebugKeyDown)
    }
    this.dialogue.dispose()
    this.interactions.dispose()
    this.cinematics.dispose()
    this.motorcycleMode.dispose()
    this.photoQuestJournal.dispose()
    this.photoAlbum.dispose()
    this.photoMode.dispose()
    this.photoQuestJournalUi.dispose()
    this.photoAlbumUi.dispose()
    this.photoUi.dispose()
    this.audioUi.dispose()
    this.saveSystem.dispose()
    this.photoQuestSystem.dispose()
    this.photoAlbumCatalog.dispose()
    this.photoStore.dispose()
    this.audio.dispose()
    this.sceneMomentSystem.dispose()
    this.momentSystem.dispose()
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
