import * as THREE from 'three'
import { SceneKit } from './shared/SceneKit.js'
import { ChurchBuilding } from './buildings/ChurchBuilding.js'
import { StreetBuilding } from './buildings/StreetBuilding.js'
import { ChurchInterior } from './interiors/ChurchInterior.js'
import { StreetProps } from './props/StreetProps.js'
import { MoNpc } from './npcs/MoNpc.js'
import { ChurchCrowd } from './ChurchCrowd.js'
import { OldQuarterConnector } from './OldQuarterConnector.js'
import { HoanKiemDistrict } from './HoanKiemDistrict.js'
import { NgocSonBranch } from './NgocSonBranch.js'
import { HoanKiemCrowd } from './HoanKiemCrowd.js'
import { HoanKiemCoverageDistrict } from './districts/HoanKiemCoverageDistrict.js'
import { BaDinhDistrict } from './districts/BaDinhDistrict.js'
import { LongBienDistrict } from './districts/LongBienDistrict.js'
import { MAP_REGISTRY, resolveMapDestination } from './map/MapRegistry.js'
import { disposeSharedNpcResources } from '../npcs/NpcResources.js'
import { ShopManager } from './shops/ShopManager.js'
import { batchStaticMeshes } from './shared/StaticMeshBatcher.js'

const OUTDOOR_SKY = 0x596777
const INTERIOR_SKY = 0x17191b

export function getOutdoorGroundHeight(position) {
  const { x, z } = position
  const onTheHucBridge = x >= 117.2 && x <= 120.8 && z >= 33.1 && z <= 45.25
  if (onTheHucBridge) {
    const progress = THREE.MathUtils.clamp((z - 33.7) / 11.3, 0, 1)
    return 0.23 + Math.sin(progress * Math.PI) * 0.24
  }

  const onNgocSonIsland = x >= 109.8 && x <= 128.2 && z >= 44 && z <= 59.2
  return onNgocSonIsland ? 0.16 : 0
}

export class ChurchDistrict {
  constructor(scene, { camera = null, assetLoader = null } = {}) {
    this.scene = scene
    this.playerPosition = camera?.position ?? null
    this.kit = new SceneKit()
    this.root = new THREE.Group()
    this.root.name = 'Vertical slice Nhà thờ Lớn'
    this.outdoor = new THREE.Group()
    this.outdoor.name = 'Khu Nhà thờ Lớn'
    this.root.add(this.outdoor)
    scene.add(this.root)

    const outdoorColliders = []
    this.shops = new ShopManager({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
      playerPosition: this.playerPosition,
    })
    this.streetBuildingLights = []
    this.#buildOutdoorLighting()
    this.#buildGround(outdoorColliders)
    this.church = new ChurchBuilding({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.#buildStreet(outdoorColliders)
    this.props = new StreetProps({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.oldQuarterConnector = new OldQuarterConnector({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
      shopManager: this.shops,
    })
    this.hoanKiemDistrict = new HoanKiemDistrict({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.shops.addShop({
      id: 'cafe-bo-ho',
      parent: this.hoanKiemDistrict.group,
      sign: 'CÀ PHÊ BỜ HỒ',
      width: 5.9,
      position: [64.36, 0, -27],
      rotationY: -Math.PI / 2,
    })
    this.ngocSonBranch = new NgocSonBranch({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
    })
    this.hoanKiemCoverageDistrict = new HoanKiemCoverageDistrict({
      kit: this.kit,
      parent: this.outdoor,
      colliders: outdoorColliders,
      existingLandmarks: { nhaThoLon: this.church.group },
    })
    this.baDinhDistrict = new BaDinhDistrict({
      kit: this.kit,
      parent: this.root,
    })
    this.baDinhDistrict.group.visible = false
    this.longBienDistrict = new LongBienDistrict({
      kit: this.kit,
      parent: this.root,
    })
    this.longBienDistrict.group.visible = false
    this.mo = camera && assetLoader
      ? new MoNpc({
          parent: this.outdoor,
          camera,
          assetLoader,
          colliders: outdoorColliders,
        })
      : null
    this.interior = new ChurchInterior({ kit: this.kit, parent: this.root })
    this.mo?.setScheduleEnvironment({
      outdoorParent: this.outdoor,
      interiorParent: this.interior.group,
      interiorColliders: this.interior.colliders,
    })
    this.crowd = camera
      ? new ChurchCrowd({
          kit: this.kit,
          outdoor: this.outdoor,
          interior: this.interior.group,
          outdoorColliders,
          interiorColliders: this.interior.colliders,
          playerPosition: camera.position,
          mo: this.mo,
        })
      : null
    this.hoanKiemCrowd = camera
      ? new HoanKiemCrowd({
          kit: this.kit,
          parent: this.outdoor,
          colliders: outdoorColliders,
          playerPosition: camera.position,
        })
      : null

    this.staticBatches = [
      batchStaticMeshes(this.church.group, {
        name: 'Nhà thờ · mesh tĩnh đã gộp',
      }),
      batchStaticMeshes(this.hoanKiemCoverageDistrict.group, {
        cellSize: 60,
        name: 'Hoàn Kiếm coverage · mesh tĩnh theo ô',
      }),
      batchStaticMeshes(this.oldQuarterConnector.group, {
        cellSize: 36,
        name: 'Phố nối · mesh tĩnh theo ô',
      }),
      batchStaticMeshes(this.props.group, {
        cellSize: 36,
        name: 'Props Nhà Chung · mesh tĩnh theo ô',
      }),
      batchStaticMeshes(this.hoanKiemDistrict.group, {
        cellSize: 48,
        name: 'Hồ Gươm · mesh tĩnh theo ô',
      }),
      batchStaticMeshes(this.ngocSonBranch.group, {
        cellSize: 36,
        name: 'Ngọc Sơn · mesh tĩnh theo ô',
      }),
      ...this.streetBuildingGroups.map((group, index) => batchStaticMeshes(group, {
        name: `Nhà phố ${index + 1} · mesh tĩnh đã gộp`,
      })),
    ]

    this.districts = Object.freeze({
      churchDistrict: { center: new THREE.Vector2(0, -28), activationRadius: 75 },
      oldQuarterConnector: { center: new THREE.Vector2(50, 19), activationRadius: 43 },
      hoanKiemDistrict: { center: new THREE.Vector2(101, 0), activationRadius: 72 },
      ngocSonBranch: { center: new THREE.Vector2(119, 48), activationRadius: 38 },
    })
    this.npcRouteAnchors = Object.freeze({
      churchPlaza: new THREE.Vector3(6.8, 0, -0.5),
      nhaChungTurn: new THREE.Vector3(51.5, 0, 5),
      lakeViewpoint: new THREE.Vector3(68, 0, -3),
    })

    const interiorPortals = this.interior.exits.map((exit) => ({
      ...exit,
      position: new THREE.Vector3(exit.position.x, exit.position.y, exit.position.z),
    }))
    this.areas = {
      outdoor: {
        mapId: 'hoanKiem',
        name: 'outdoor',
        group: this.outdoor,
        colliders: outdoorColliders,
        bounds: this.hoanKiemCoverageDistrict.bounds,
        groundHeight: 0,
        ceilingHeight: Infinity,
        groundSampler: getOutdoorGroundHeight,
        spawn: this.hoanKiemCoverageDistrict.spawn,
        portals: this.hoanKiemCoverageDistrict.interactions,
        portal: this.hoanKiemCoverageDistrict.interactions[0],
        coverage: this.hoanKiemCoverageDistrict.coverage,
      },
      baDinh: {
        mapId: 'baDinh',
        name: 'baDinh',
        group: this.baDinhDistrict.group,
        colliders: this.baDinhDistrict.colliders,
        bounds: this.baDinhDistrict.bounds,
        groundHeight: 0,
        ceilingHeight: Infinity,
        spawn: this.baDinhDistrict.spawn,
        portals: this.baDinhDistrict.interactions,
        portal: this.baDinhDistrict.interactions[0],
        coverage: this.baDinhDistrict.coverage,
      },
      longBien: {
        mapId: 'longBien',
        name: 'longBien',
        group: this.longBienDistrict.group,
        colliders: this.longBienDistrict.colliders,
        bounds: this.longBienDistrict.bounds,
        groundHeight: 0,
        ceilingHeight: Infinity,
        spawn: this.longBienDistrict.spawn,
        portals: this.longBienDistrict.interactions,
        portal: this.longBienDistrict.interactions[0],
        coverage: this.longBienDistrict.coverage,
      },
      interior: {
        mapId: 'churchInterior',
        name: 'interior',
        group: this.interior.group,
        colliders: this.interior.colliders,
        bounds: this.interior.bounds,
        groundHeight: 0,
        ceilingHeight: 10.4,
        spawn: this.interior.spawn,
        portals: interiorPortals,
        portal: interiorPortals[0],
        coverage: this.interior.coverage,
      },
    }
    this.activeAreaName = 'outdoor'
    this.activeMapId = MAP_REGISTRY.hoanKiem.id
    this.profiler = null
    this.practicalLightsByArea = null
    this.practicalLightAreaNames = []
    this.activePracticalLightArea = null
    this.lightWorldPosition = new THREE.Vector3()
    this.colliders = this.areas.outdoor.colliders
    this.bounds = this.areas.outdoor.bounds
    this.spawn = this.areas.outdoor.spawn
    this.#setAreaVisibility('outdoor')
    this.#applyAtmosphere('outdoor')
  }

  setProfiler(profiler) {
    this.profiler = profiler
    this.crowd?.setProfiler(profiler)
    this.hoanKiemCrowd?.setProfiler(profiler)
    this.shops.setProfiler(profiler)
  }

  getActivePortal() {
    return this.areas[this.activeAreaName].portals[0] ?? null
  }

  getActiveInteractions(position = null, maxDistance = Infinity) {
    const interactions = []
    const appendNearby = (candidates) => {
      for (const interaction of candidates) {
        if (!interaction) continue
        if (position) {
          const dx = position.x - interaction.position.x
          const dz = position.z - interaction.position.z
          const range = maxDistance + (interaction.radius ?? 0)
          if (dx * dx + dz * dz > range * range) continue
        }
        interactions.push(interaction)
      }
    }
    appendNearby(this.areas[this.activeAreaName].portals)
    appendNearby([this.mo?.getInteraction()])
    appendNearby(this.crowd?.getInteractions(
      this.activeAreaName,
      position,
      maxDistance,
    ) ?? [])
    appendNearby(this.shops.getInteractions(
      this.activeAreaName,
      position,
      maxDistance,
    ))
    if (this.activeAreaName === 'outdoor') {
      appendNearby(this.oldQuarterConnector.interactions)
      appendNearby(this.hoanKiemDistrict.interactions)
      appendNearby(this.ngocSonBranch.interactions)
      appendNearby(this.hoanKiemCrowd?.getInteractions(
        'outdoor',
        position,
        maxDistance,
      ) ?? [])
    }
    return interactions
  }

  update(deltaTime, clock = null) {
    this.#updateDistrictVisibility()
    if (clock) this.crowd?.update(deltaTime, clock, this.activeAreaName)
    if (clock) this.hoanKiemCrowd?.update(deltaTime, clock, this.activeAreaName)
    if (clock) this.shops.update(deltaTime, clock, this.activeAreaName)
    const moStartedAt = this.profiler?.begin() ?? 0
    this.mo?.update(deltaTime, this.activeAreaName)
    if (this.mo?.ready && this.mo.areaName === this.activeAreaName) {
      this.profiler?.addCount('npcUpdates', 1)
    }
    this.profiler?.end('npc', moStartedAt)
  }

  getPerformanceStats() {
    const countMeshes = (root) => {
      let total = 0
      let shadowCasters = 0
      let ancestor = root
      while (ancestor) {
        if (!ancestor.visible) return { total, shadowCasters }
        ancestor = ancestor.parent
      }
      root?.traverseVisible((object) => {
        if (!object.isMesh && !object.isSprite && !object.isInstancedMesh) return
        total += 1
        if (object.castShadow) shadowCasters += 1
      })
      return { total, shadowCasters }
    }
    return {
      activeNpc: this.getActiveNpcCount(),
      npcPool: (this.crowd?.manager.entries.length ?? 0)
        + (this.hoanKiemCrowd?.manager.entries.length ?? 0)
        + (this.mo ? 1 : 0),
      npcUpdated: (this.crowd?.manager.lastUpdatedCount ?? 0)
        + (this.hoanKiemCrowd?.manager.lastUpdatedCount ?? 0)
        + (this.mo?.ready && this.mo.areaName === this.activeAreaName ? 1 : 0),
      npcUpdatedOutsideArea: (this.crowd?.manager.lastSkippedAreaCount ?? 0)
        + (this.hoanKiemCrowd?.manager.lastSkippedAreaCount ?? 0),
      shopsTotal: this.shops.shops.length,
      shopsUpdated: this.shops.lastUpdatedShopCount,
      customersUpdated: this.shops.lastUpdatedCustomerCount,
      customerPoolCreated: this.shops.shops.reduce((total, shop) => (
        total + (shop.customerPool?.customers.length ?? 0)
      ), 0),
      colliderPool: this.colliders.length,
      groups: {
        church: countMeshes(this.church.group),
        street: countMeshes(this.oldQuarterConnector.group),
        lake: countMeshes(this.hoanKiemDistrict.group),
        coverage: countMeshes(this.hoanKiemCoverageDistrict.group),
        interior: countMeshes(this.interior.group),
      },
    }
  }

  getLightingContext() {
    const emissiveMaterials = [
      'warmGlass',
      'lampPool',
      'redGlass',
      'blueGlass',
      'amberGlass',
      'tealGlass',
      'lampGlow',
      'lakeWater',
      'waterReflection',
      'shopInterior',
      'shopGlass',
    ].map((name) => this.kit.material(name))
    const outdoorContext = (pointLights, spotLights = []) => ({
      ambient: this.outdoorLighting.ambient,
      hemisphere: this.outdoorLighting.hemisphere,
      directional: this.outdoorLighting.sun,
      rim: this.outdoorLighting.rim,
      pointLights,
      spotLights,
      emissiveMaterials,
    })

    const contexts = {
      outdoor: outdoorContext(
        [
          ...this.props.streetLights,
          ...this.props.cafeLights,
          ...this.streetBuildingLights,
          ...this.oldQuarterConnector.lights,
          ...this.hoanKiemDistrict.lights,
          ...this.ngocSonBranch.lights,
          ...this.hoanKiemCoverageDistrict.lights,
          ...this.shops.lights,
        ],
        this.church.facadeLights,
      ),
      baDinh: outdoorContext(this.baDinhDistrict.lights),
      longBien: outdoorContext(this.longBienDistrict.lights),
      interior: {
        ambient: this.interior.lighting.ambient,
        pointLights: this.interior.lighting.pendantLights,
        spotLights: [this.interior.lighting.altarLight],
        emissiveMaterials,
      },
    }
    this.practicalLightsByArea = Object.fromEntries(
      Object.entries(contexts).map(([areaName, context]) => [
        areaName,
        [...(context.pointLights ?? []), ...(context.spotLights ?? [])]
          .map((entry) => entry?.light ?? entry)
          .filter(Boolean),
      ]),
    )
    this.practicalLightAreaNames = Object.keys(this.practicalLightsByArea)
    return contexts
  }

  getActiveNpcCount() {
    return (this.crowd?.getActiveCount(this.activeAreaName) ?? 0) + (
      this.mo?.ready && this.mo.areaName === this.activeAreaName ? 1 : 0
    ) + (this.hoanKiemCrowd?.getActiveCount(this.activeAreaName) ?? 0)
      + (this.activeAreaName === 'outdoor' ? this.shops.getActiveCount() : 0)
  }

  getActiveDistrictNames(position) {
    if (this.activeAreaName !== 'outdoor') {
      return [this.areas[this.activeAreaName].mapId]
    }
    return ['hoanKiem', ...Object.entries(this.districts)
      .filter(([, district]) => Math.hypot(
        district.center.x - position.x,
        district.center.y - position.z,
      ) <= district.activationRadius)
      .map(([name]) => name)]
  }

  getNamedNpc(name) {
    if (name === 'Mơ') return this.mo
    return this.crowd?.getActorByName(name) ?? this.hoanKiemCrowd?.getActorByName(name) ?? null
  }

  transition(target) {
    const destination = resolveMapDestination(target)
    const areaName = destination.definition.areaName
    const area = this.areas[areaName]
    if (!area) throw new Error(`Map area is not mounted: ${areaName}`)

    this.activeAreaName = areaName
    this.activeMapId = destination.definition.id
    this.#setAreaVisibility(areaName)
    this.#applyAtmosphere(areaName)

    const spawn = destination.spawn
    this.colliders = area.colliders
    this.bounds = area.bounds
    this.spawn = spawn
    return { ...area, spawn, exitId: destination.exitId }
  }

  #buildOutdoorLighting() {
    const group = new THREE.Group()
    group.name = 'Ánh sáng dùng chung cho các bản đồ ngoài trời'
    const ambient = new THREE.AmbientLight(0x84909f, 0.5)
    const sky = new THREE.HemisphereLight(0x8d9caf, 0x4c4137, 1.2)
    const sun = new THREE.DirectionalLight(0xffd39b, 1.9)
    sun.name = 'Ánh chiều tối'
    // Keep the original light direction while centering the shadow volume over
    // the rebuilt 64.5 m cathedral, which extends toward negative Z.
    sun.position.set(-18, 26, -7)
    sun.target.position.set(0, 5, -41)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -70
    sun.shadow.camera.right = 70
    sun.shadow.camera.top = 70
    sun.shadow.camera.bottom = -70
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 150
    sun.shadow.bias = -0.0005
    const rim = new THREE.DirectionalLight(0x8498b6, 0.42)
    rim.name = 'Ánh trời xanh cuối ngày'
    rim.position.set(22, 18, -30)
    rim.target.position.set(0, 8, -12)
    this.outdoorLighting = { group, ambient, hemisphere: sky, sun, rim }
    this.root.add(group)
    group.add(ambient, sky, sun, sun.target, rim, rim.target)
  }

  #buildGround(colliders) {
    this.kit.box(this.outdoor, {
      name: 'Nền khu phố',
      size: [70, 0.32, 130],
      position: [0, -0.22, -32],
      material: 'stoneDark',
      receiveShadow: true,
    })
    this.kit.box(this.outdoor, {
      name: 'Sân Nhà thờ lát đá',
      size: [30, 0.16, 25],
      position: [0, -0.02, -3.5],
      material: 'plaza',
      receiveShadow: true,
    })
    this.kit.box(this.outdoor, {
      name: 'Lòng đường Nhà Chung',
      size: [68, 0.12, 8],
      position: [0, -0.02, 13],
      material: 'asphalt',
      receiveShadow: true,
    })
    for (const z of [8.4, 17.6]) {
      this.kit.box(this.outdoor, {
        name: 'Vỉa hè phố Nhà Chung',
        size: [68, 0.18, 1.2],
        position: [0, 0.04, z],
        material: 'sidewalk',
        receiveShadow: true,
      })
      this.kit.box(this.outdoor, {
        name: 'Bó vỉa',
        size: [68, 0.24, 0.18],
        position: [0, 0.08, z + (z < 13 ? 0.62 : -0.62)],
        material: 'curb',
      })
    }
    for (let x = -29; x <= 29; x += 7.2) {
      this.kit.box(this.outdoor, {
        name: 'Vạch giữa đường',
        size: [3.4, 0.025, 0.12],
        position: [x, 0.05, 13],
        material: 'whiteMarking',
      })
    }
    for (const x of [-18, 5, 27]) {
      this.kit.cylinder(this.outdoor, {
        name: 'Nắp cống',
        radius: 0.46,
        height: 0.035,
        position: [x, 0.055, 14.7],
        material: 'metal',
      })
    }
    this.kit.box(this.outdoor, {
      name: 'Mặt ngõ Ấu Triệu',
      size: [3.15, 0.14, 14],
      position: [-9.9, 0, 25],
      material: 'sidewalk',
      receiveShadow: true,
    })

    this.#buildPlazaAccents()
    this.#buildSurfaceDetails()
    this.#buildSideBoundaries(colliders)
  }

  #buildPlazaAccents() {
    for (const x of [-7.2, 0, 7.2]) {
      this.kit.box(this.outdoor, {
        name: 'Dải đá sân Nhà thờ',
        size: [0.12, 0.025, 21],
        position: [x, 0.075, -3.3],
        material: 'stoneLight',
      })
    }
    for (const z of [-10, -3, 4]) {
      this.kit.box(this.outdoor, {
        name: 'Dải đá ngang sân Nhà thờ',
        size: [27, 0.025, 0.12],
        position: [0, 0.075, z],
        material: 'stoneLight',
      })
    }
  }

  #buildSurfaceDetails() {
    this.kit.instancedBoxes(this.outdoor, {
      name: 'Đá lát sân đổi sắc',
      material: 'stoneWarm',
      receiveShadow: true,
      instances: [
        [-10.5, -8.2], [-4.2, -6.1], [3.7, -8.8], [9.4, -4.8],
        [-12.2, -0.9], [-5.8, 2.1], [2.4, -1.7], [10.8, 2.6],
        [-9.1, 5.8], [-1.6, 5.1], [5.7, 4.6], [12.1, 6.3],
      ].map(([x, z], index) => ({
        size: [1.15 + (index % 3) * 0.22, 0.018, 0.28],
        position: [x, 0.078, z],
        rotation: [0, index % 2 === 0 ? 0 : Math.PI / 2, 0],
      })),
    })
    this.kit.instancedBoxes(this.outdoor, {
      name: 'Miếng vá mặt đường',
      material: 'roadPatch',
      receiveShadow: true,
      instances: [
        { size: [3.2, 0.018, 1.2], position: [-22, 0.052, 11.8], rotation: [0, 0.1, 0] },
        { size: [2.4, 0.018, 0.8], position: [-2.5, 0.052, 14.4], rotation: [0, -0.08, 0] },
        { size: [3.8, 0.018, 1.05], position: [18.5, 0.052, 12.1], rotation: [0, 0.06, 0] },
      ],
    })
  }

  #buildSideBoundaries(colliders) {
    for (const side of [-1, 1]) {
      const x = side * 31.65
      const segments = side < 0
        ? [
            { z: -9.2, depth: 11.2, height: 8.4, material: 'oldYellow', sign: 'TRÀ CHANH' },
            { z: 1.4, depth: 9.6, height: 11.6, material: 'brick', sign: null },
            { z: 10, depth: 7.4, height: 9.3, material: 'sage', sign: 'MAY ĐO' },
          ]
        : [
            { z: -9.4, depth: 10.8, height: 11.2, material: 'plaster', sign: null },
            { z: 1.2, depth: 10, height: 8.7, material: 'oldYellow', sign: 'BÁNH MÌ' },
            { z: 10.1, depth: 7.4, height: 12.2, material: 'brick', sign: null },
          ]

      for (const [index, segment] of segments.entries()) {
        this.kit.box(this.outdoor, {
          name: `Dãy nhà phố bên ${side < 0 ? 'tây' : 'đông'}`,
          size: [4.3, segment.height, segment.depth],
          position: [x, segment.height / 2, segment.z],
          material: segment.material,
          collision: true,
          colliders,
          castShadow: index === 1,
        })
        const frontX = x - side * 2.2
        const windowLevels = segment.height > 10 ? [3.1, 6.1, 8.8] : [3.1, 6.2]
        for (const y of windowLevels) {
          for (const offset of [-segment.depth * 0.24, segment.depth * 0.24]) {
            this.kit.box(this.outdoor, {
              name: 'Cửa sổ dãy nhà bên',
              size: [0.12, 1.45, 1.35],
              position: [frontX, y, segment.z + offset],
              material: y === 3.1 && (index + side) % 2 === 0 ? 'warmGlass' : 'glass',
            })
          }
        }
        this.kit.box(this.outdoor, {
          name: 'Gờ mái dãy nhà bên',
          size: [4.65, 0.3, segment.depth + 0.2],
          position: [x, segment.height + 0.04, segment.z],
          material: 'stoneDark',
          castShadow: true,
        })
        if (index === 1) {
          const balcony = this.kit.box(this.outdoor, {
            name: 'Ban công dãy nhà bên',
            size: [0.86, 0.16, segment.depth * 0.55],
            position: [frontX - side * 0.36, 5.05, segment.z],
            material: 'stoneDark',
            castShadow: true,
          })
          balcony.rotation.z = side * 0.04
        }
        if (segment.sign) {
          this.kit.sign(this.outdoor, {
            text: segment.sign,
            width: Math.min(3.9, segment.depth * 0.55),
            height: 0.62,
            position: [frontX - side * 0.09, 3.75, segment.z],
            rotation: [0, -side * Math.PI / 2, 0],
            background: index % 2 === 0 ? '#80443c' : '#315c55',
            foreground: '#f4e3bd',
          })
          this.shops.addShop({
            parent: this.outdoor,
            sign: segment.sign,
            width: Math.min(6.2, segment.depth * 0.7),
            position: [frontX - side * 0.17, 0, segment.z],
            rotationY: side < 0 ? -Math.PI / 2 : Math.PI / 2,
          })
        }
      }
    }
    this.kit.sign(this.outdoor, {
      text: 'NHÀ THỜ  ←   HỒ GƯƠM  →',
      width: 4.9,
      height: 0.72,
      position: [33.86, 3.15, 7.2],
      rotation: [0, Math.PI / 2, 0],
      background: '#315c55',
      foreground: '#f4e7c8',
    })
  }

  #buildStreet(colliders) {
    const buildings = [
      { x: -29, width: 6, height: 8.2, material: 'brick', variant: 'home', sign: 'TẠP HÓA', roof: 'tile' },
      { x: -22.5, width: 6.5, height: 11.5, material: 'oldYellow', variant: 'shop', sign: 'PHỞ GÀ', roof: 'flat' },
      { x: -15.5, width: 6.7, height: 9.6, material: 'sage', variant: 'home', sign: null, roof: 'tile' },
      { x: -4.2, width: 6.8, height: 12.5, material: 'plaster', variant: 'shop', sign: 'TIỆM SÁCH', roof: 'flat' },
      { x: 2.1, width: 6.9, height: 9.7, material: 'brick', variant: 'home', sign: null, roof: 'tile' },
      { x: 9.9, width: 8.2, height: 11.2, material: 'oldYellow', variant: 'shop', sign: 'ĐỒ GỐM', roof: 'flat' },
      { x: 19.5, width: 9, height: 10.3, material: 'sage', variant: 'cafe', sign: 'CÀ PHÊ NHÀ THỜ', roof: 'tile', castShadow: true },
      { x: 29.5, width: 9.4, height: 12.4, material: 'plaster', variant: 'home', sign: null, roof: 'flat' },
    ]
    this.streetBuildingGroups = []
    buildings.forEach((building, index) => {
      const streetBuilding = new StreetBuilding({
        kit: this.kit,
        parent: this.outdoor,
        colliders,
        config: {
          ...building,
          name: `Nhà phố ${index + 1}`,
          z: 25.5,
          depth: 10.5,
          detailSeed: index,
          signColor: index % 2 === 0 ? '#315c55' : '#80443c',
        },
        shopManager: this.shops,
      })
      streetBuilding.group.userData.centerX = building.x
      this.streetBuildingGroups.push(streetBuilding.group)
      this.streetBuildingLights.push(...streetBuilding.lights)
    })
    this.kit.sign(this.outdoor, {
      text: 'NGÕ ẤU TRIỆU',
      width: 2.45,
      height: 0.58,
      position: [-9.9, 2.85, 19.98],
      rotation: [0, Math.PI, 0],
      background: '#315c55',
      foreground: '#f4e7c8',
    })
  }

  #setAreaVisibility(activeAreaName) {
    Object.entries(this.areas).forEach(([areaName, area]) => {
      area.group.visible = areaName === activeAreaName
    })
    this.outdoorLighting.group.visible = activeAreaName !== 'interior'
  }

  #updateDistrictVisibility() {
    if (!this.playerPosition) return
    this.#updatePracticalLightVisibility()
    if (this.activeAreaName !== 'outdoor') return
    const { x, z } = this.playerPosition
    this.church.group.visible = x < 37
    this.props.group.visible = x < 51
    this.streetBuildingGroups?.forEach((group) => {
      group.visible = x < 64 && Math.abs(x - group.userData.centerX) < 46
    })
    this.oldQuarterConnector.group.visible = x > 24 && x < 106
    this.hoanKiemDistrict.group.visible = x > 52.5
    this.ngocSonBranch.group.visible = x > 60 || z > 28
  }

  #updatePracticalLightVisibility() {
    if (!this.practicalLightsByArea) return
    if (this.activePracticalLightArea !== this.activeAreaName) {
      for (const areaName of this.practicalLightAreaNames) {
        for (const light of this.practicalLightsByArea[areaName]) light.visible = false
      }
      this.activePracticalLightArea = this.activeAreaName
    }
    const lights = this.practicalLightsByArea[this.activeAreaName] ?? []
    for (const light of lights) {
      light.getWorldPosition(this.lightWorldPosition)
      const dx = this.playerPosition.x - this.lightWorldPosition.x
      const dz = this.playerPosition.z - this.lightWorldPosition.z
      const effectiveDistance = light.distance > 0
        ? light.distance + 6
        : light.isSpotLight ? 54 : 38
      light.visible = dx * dx + dz * dz <= effectiveDistance * effectiveDistance
    }
  }

  #applyAtmosphere(areaName) {
    const indoor = areaName === 'interior'
    this.scene.background = new THREE.Color(indoor ? INTERIOR_SKY : OUTDOOR_SKY)
    this.scene.fog = indoor
      ? new THREE.Fog(INTERIOR_SKY, 22, 42)
      : new THREE.Fog(OUTDOOR_SKY, 52, 92)
  }

  dispose() {
    this.crowd?.dispose()
    this.hoanKiemCrowd?.dispose()
    this.shops.dispose()
    disposeSharedNpcResources()
    this.mo?.dispose()
    this.props.dispose()
    this.staticBatches.forEach((batch) => batch.dispose())
    this.kit.dispose()
    this.scene.remove(this.root)
  }
}
