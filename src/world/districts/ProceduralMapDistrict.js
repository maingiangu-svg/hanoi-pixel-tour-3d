import * as THREE from 'three'
import { mapCoordinates } from '../map/MapCoordinateSystem.js'
import { MAP_REGISTRY } from '../map/MapRegistry.js'
import { createFullCoverageRecord } from '../map/mapCoverage.js'
import {
  buildNonWalkableColliders,
  buildStaticColliders,
  isWorldSpawnClear,
} from '../shared/collisionHelpers.js'
import { MapSurfaceBuilder } from '../shared/MapSurfaceBuilder.js'
import { MapStructureBuilder } from '../shared/MapStructureBuilder.js'
import { MapDecorationBuilder } from '../shared/MapDecorationBuilder.js'
import { LandmarkBuilder } from '../landmarks/LandmarkBuilder.js'

export class ProceduralMapDistrict {
  constructor({
    kit,
    parent,
    mapData,
    colliders = null,
    existingLandmarks = {},
    coordinates = mapCoordinates,
  }) {
    this.kit = kit
    this.mapData = mapData
    this.mapId = mapData.id
    this.coordinates = coordinates
    this.group = new THREE.Group()
    this.group.name = `${mapData.name} · coverage 2D→3D`
    this.group.userData.mapId = mapData.id
    parent.add(this.group)

    this.colliders = colliders ?? []
    this.colliderStartIndex = this.colliders.length
    this.bounds = coordinates.bounds(mapData.id)
    this.spawn = { ...MAP_REGISTRY[mapData.id].spawn }
    this.interactions = []
    this.exits = []
    this.lights = []
    this.coverage = createFullCoverageRecord(mapData.id)

    this.surfaceBuilder = new MapSurfaceBuilder({
      kit, parent: this.group, mapData, colliders: this.colliders, coordinates,
    }).build()
    this.structureBuilder = new MapStructureBuilder({
      kit, parent: this.group, mapData, coordinates,
    }).build()
    this.landmarkBuilder = new LandmarkBuilder({
      kit,
      parent: this.group,
      mapData,
      colliders: this.colliders,
      coordinates,
      existingLandmarks,
    }).build()
    this.decorationBuilder = new MapDecorationBuilder({
      kit, parent: this.group, mapData, colliders: this.colliders, coordinates,
    }).build()
    this.lights.push(...this.decorationBuilder.lights)

    this.#addSourceCollision()
    this.#buildExits()

    this.ownColliders = this.colliders.slice(this.colliderStartIndex)
    this.sourceStaticColliderCount = MAP_REGISTRY[mapData.id].data.kind === 'churchInterior'
      ? mapData.collisionBlocks.length
      : this.coverage.collision
    this.spawnIsClear = isWorldSpawnClear(this)
  }

  getExit(exitId) {
    return this.exits.find((exit) => exit.id === exitId || exit.sourceId === exitId) ?? null
  }

  getLandmarkWorldPoint(landmarkId) {
    const landmark = this.mapData.landmarks.find((candidate) => (
      candidate.id === landmarkId || candidate.sourceId === landmarkId
    ))
    if (!landmark) return null
    return this.coordinates.point(this.mapId, landmark.interactionPoint ?? {
      x: landmark.x + landmark.width / 2,
      y: landmark.y + landmark.height / 2,
    })
  }

  #addSourceCollision() {
    buildStaticColliders(this.mapData, this.coordinates).forEach((collider) => {
      collider.kind = collider.kind ?? 'sourceStatic'
      this.colliders.push(collider)
    })
    buildNonWalkableColliders(this.mapData, this.coordinates).forEach((collider) => {
      collider.kind = 'nonWalkBoundary'
      this.colliders.push(collider)
    })
  }

  #buildExits() {
    MAP_REGISTRY[this.mapId].exits.forEach((registeredExit) => {
      const exit = {
        ...registeredExit,
        position: new THREE.Vector3(
          registeredExit.position.x,
          registeredExit.position.y,
          registeredExit.position.z,
        ),
      }
      this.exits.push(exit)
      this.interactions.push(exit)
      this.#buildExitMarker(exit)
    })
  }

  #buildExitMarker(exit) {
    const group = new THREE.Group()
    group.name = `Điểm nối ${exit.name}`
    group.userData.sourceRef = `${this.mapId}:${exit.sourceId}`
    this.group.add(group)
    const { x, z } = exit.position

    if (exit.kind === 'bus') {
      this.kit.box(group, {
        name: 'Mái trạm xe buýt', size: [4.8, 0.22, 1.6],
        position: [x, 2.75, z], material: 'roof',
      })
      for (const offset of [-2, 2]) {
        this.kit.cylinder(group, {
          name: 'Cột trạm xe buýt', radius: 0.07, height: 2.8,
          position: [x + offset, 1.4, z], material: 'metal',
        })
      }
      this.kit.sign(group, {
        text: 'XE BUÝT', width: 2.6, height: 0.58,
        position: [x, 2.55, z + 0.85],
        background: '#5e4a8b', foreground: '#f5e9c9',
      })
      return
    }

    if (exit.kind === 'churchEntrance' || exit.kind === 'churchExit') {
      this.kit.box(group, {
        name: 'Ngưỡng cửa Nhà thờ', size: [3.1, 0.04, 1],
        position: [x, 0.03, z], material: 'stoneLight',
      })
      return
    }

    this.kit.sign(group, {
      text: exit.name.toUpperCase(),
      width: Math.min(5.8, Math.max(3.2, exit.name.length * 0.33)),
      height: 0.6,
      position: [x, 2.6, z],
      background: '#315c55', foreground: '#f5e9c9',
    })
  }
}
