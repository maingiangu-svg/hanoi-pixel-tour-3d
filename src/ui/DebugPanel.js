import * as THREE from 'three'

export class DebugPanel {
  constructor(
    element,
    player,
    renderer,
    world,
    clock = null,
    dayNight = null,
    profiler = null,
  ) {
    this.element = element
    this.player = player
    this.renderer = renderer
    this.world = world
    this.clock = clock
    this.dayNight = dayNight
    this.profiler = profiler
    this.frustum = new THREE.Frustum()
    this.projectionView = new THREE.Matrix4()
    this.frames = 0
    this.elapsed = 0
    this.element.classList.add('is-visible')
  }

  update(deltaTime) {
    this.frames += 1
    this.elapsed += deltaTime
    if (this.elapsed < 0.5) return

    const fps = Math.round(this.frames / this.elapsed)
    const { x, z } = this.player.camera.position
    const renderInfo = this.renderer.instance.info.render
    const memoryInfo = this.renderer.instance.info.memory
    const sceneStats = this.#collectVisibleSceneStats()
    const worldStats = this.world.getPerformanceStats?.() ?? {}
    const profile = this.profiler?.snapshot
    const timeLine = this.clock
      ? `${this.clock.formatted} x${this.clock.speed} · ${this.dayNight?.phase ?? '—'}`
      : null
    const npcLine = this.world.getActiveNpcCount
      ? `${this.world.getActiveNpcCount()} NPC đang hoạt động`
      : null
    const scheduleLine = this.world.mo
      ? `Mơ ${this.world.mo.scheduleState}${
          this.world.mo.pendingScheduleState
            ? ` → ${this.world.mo.pendingScheduleState}`
            : ''
        } · ${this.world.mo.areaName} · đồ ${
          this.world.mo.currentOutfit ?? this.world.mo.desiredOutfit
        }`
      : null
    const crowdLine = this.world.crowd?.lastChurchState
      ? `Nhà thờ · ${this.world.crowd.lastChurchState}`
      : null
    const districtLine = this.world.getActiveDistrictNames
      ? this.world.getActiveDistrictNames(this.player.camera.position).join(' · ')
      : null
    this.element.textContent = [
      `${fps} FPS · ${this.world.activeAreaName}`,
      `${renderInfo.calls} calls · ${renderInfo.triangles} tris`,
      `${sceneStats.meshes} mesh · ${sceneStats.lights} light (${sceneStats.shadowLights} shadow)`,
      `${memoryInfo.geometries} geo · ${memoryInfo.textures} tex · ${worldStats.colliderPool ?? 0} collider`,
      profile
        ? `CPU ${profile.cpuMs.render.toFixed(2)} render · ${profile.cpuMs.npc.toFixed(2)} NPC · ${profile.cpuMs.collision.toFixed(2)} collision`
        : null,
      profile
        ? `CPU ${profile.cpuMs.interaction.toFixed(2)} interact · ${profile.cpuMs.shop.toFixed(2)} shop · ${profile.cpuMs.schedule.toFixed(2)} schedule · ${profile.cpuMs.dayNight.toFixed(2)} light`
        : null,
      profile
        ? `${profile.counts.colliderChecks.toFixed(0)} collider checks · ${profile.counts.npcUpdates.toFixed(1)} NPC update · ${profile.counts.shopUpdates.toFixed(1)} shop update`
        : null,
      timeLine,
      npcLine,
      scheduleLine,
      crowdLine,
      districtLine,
      `X ${x.toFixed(1)} · Z ${z.toFixed(1)}`,
    ].filter(Boolean).join('\n')
    this.element.dataset.profile = JSON.stringify({
      fps,
      area: this.world.activeAreaName,
      position: { x, z },
      render: {
        calls: renderInfo.calls,
        triangles: renderInfo.triangles,
        geometries: memoryInfo.geometries,
        textures: memoryInfo.textures,
        visibleMeshes: sceneStats.meshes,
        lights: sceneStats.lights,
        shadowLights: sceneStats.shadowLights,
      },
      activity: worldStats,
      clock: this.clock ? {
        formatted: this.clock.formatted,
        minutes: this.clock.minutes,
        speed: this.clock.speed,
      } : null,
      schedules: {
        mo: this.world.mo?.scheduleState ?? null,
        moArea: this.world.mo?.areaName ?? null,
        moOutfit: this.world.mo?.currentOutfit ?? this.world.mo?.desiredOutfit ?? null,
        church: this.world.crowd?.lastChurchState ?? null,
      },
      cpuMs: profile?.cpuMs ?? null,
      counts: profile?.counts ?? null,
    })
    this.frames = 0
    this.elapsed = 0
  }

  #collectVisibleSceneStats() {
    let meshes = 0
    let lights = 0
    let shadowLights = 0
    this.projectionView.multiplyMatrices(
      this.renderer.activeCamera.projectionMatrix,
      this.renderer.activeCamera.matrixWorldInverse,
    )
    this.frustum.setFromProjectionMatrix(this.projectionView)
    this.renderer.scene.traverseVisible((object) => {
      if (
        (object.isMesh || object.isInstancedMesh)
        && (!object.frustumCulled || this.frustum.intersectsObject(object))
      ) meshes += 1
      if (
        object.isSprite
        && (!object.frustumCulled || this.frustum.intersectsSprite(object))
      ) meshes += 1
      if (object.isLight) {
        lights += 1
        if (object.castShadow) shadowLights += 1
      }
    })
    return { meshes, lights, shadowLights }
  }
}
