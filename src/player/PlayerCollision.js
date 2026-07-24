const EPSILON = 0.0001
const COLLISION_CELL_SIZE = 6

export class PlayerCollision {
  constructor({
    colliders,
    bounds,
    radius = 0.36,
    groundHeight = 0,
    ceilingHeight = Infinity,
    groundSampler = null,
    ceilingSampler = null,
  }) {
    this.colliders = colliders
    this.bounds = bounds
    this.radius = radius
    this.maxStep = radius * 0.45
    this.groundHeight = groundHeight
    this.ceilingHeight = ceilingHeight
    this.groundSampler = groundSampler
    this.ceilingSampler = ceilingSampler
    this.profiler = null
    this.lastColliderChecks = 0
    this.lastNearbyColliderCount = 0
    this.staticGrid = new Map()
    this.dynamicColliders = []
    this.nearbyColliders = []
    this.seenColliders = new Set()
    this.#rebuildSpatialIndex()
  }

  setProfiler(profiler) {
    this.profiler = profiler
  }

  setWorld({
    colliders,
    bounds,
    groundHeight = 0,
    ceilingHeight = Infinity,
    groundSampler = null,
    ceilingSampler = null,
  }) {
    this.colliders = colliders
    this.bounds = bounds
    this.groundHeight = groundHeight
    this.ceilingHeight = ceilingHeight
    this.groundSampler = groundSampler
    this.ceilingSampler = ceilingSampler
    this.#rebuildSpatialIndex()
  }

  move(position, displacement) {
    const profileStartedAt = this.profiler?.begin() ?? 0
    this.lastColliderChecks = 0
    this.lastNearbyColliderCount = 0
    const distance = Math.hypot(displacement.x, displacement.z)
    const stepCount = Math.max(1, Math.ceil(distance / this.maxStep))
    const stepX = displacement.x / stepCount
    const stepZ = displacement.z / stepCount

    for (let step = 0; step < stepCount; step += 1) {
      position.x += stepX
      position.z += stepZ
      this.#clampToBounds(position)
      this.#resolveObstacles(position)
      this.#clampToBounds(position)
    }

    this.profiler?.addCount('colliderChecks', this.lastColliderChecks)
    this.profiler?.addCount('nearbyColliders', this.lastNearbyColliderCount)
    this.profiler?.end('collision', profileStartedAt)
    return position
  }

  getGroundHeight(position) {
    const sampled = this.groundSampler?.(position)
    return Number.isFinite(sampled) ? sampled : this.groundHeight
  }

  getCeilingHeight(position) {
    const sampled = this.ceilingSampler?.(position)
    return Number.isFinite(sampled) ? sampled : this.ceilingHeight
  }

  moveVertical(position, displacementY, {
    eyeHeight,
    headClearance = 0.14,
    groundTolerance = 0.025,
  }) {
    const groundEyeY = this.getGroundHeight(position) + eyeHeight
    const ceilingEyeY = this.getCeilingHeight(position) - headClearance
    let nextY = position.y + displacementY
    let grounded = false
    let hitCeiling = false

    if (displacementY > 0 && nextY >= ceilingEyeY) {
      nextY = Math.max(groundEyeY, ceilingEyeY)
      hitCeiling = true
    }

    if (
      displacementY <= 0
      && nextY <= groundEyeY + groundTolerance
    ) {
      nextY = groundEyeY
      grounded = true
    } else if (nextY < groundEyeY) {
      nextY = groundEyeY
      grounded = true
    }

    position.y = nextY
    return { grounded, hitCeiling, groundEyeY, ceilingEyeY }
  }

  #resolveObstacles(position) {
    const candidates = this.#queryNearby(position)
    for (let iteration = 0; iteration < 5; iteration += 1) {
      let resolvedCollision = false

      for (const box of candidates) {
        this.lastColliderChecks += 1
        if (box.disabled) continue
        const closestX = Math.max(box.minX, Math.min(position.x, box.maxX))
        const closestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ))
        const offsetX = position.x - closestX
        const offsetZ = position.z - closestZ
        const distanceSquared = offsetX * offsetX + offsetZ * offsetZ

        if (distanceSquared >= this.radius * this.radius) continue

        if (distanceSquared > EPSILON * EPSILON) {
          const distance = Math.sqrt(distanceSquared)
          const correction = this.radius - distance + EPSILON
          position.x += (offsetX / distance) * correction
          position.z += (offsetZ / distance) * correction
        } else {
          this.#pushOutFromInside(position, box)
        }

        resolvedCollision = true
      }

      if (!resolvedCollision) break
    }
  }

  #rebuildSpatialIndex() {
    this.staticGrid.clear()
    this.dynamicColliders.length = 0
    for (const box of this.colliders) {
      if (box.disabled) continue
      if (box.dynamic) {
        this.dynamicColliders.push(box)
        continue
      }
      const minCellX = Math.floor((box.minX - this.radius) / COLLISION_CELL_SIZE)
      const maxCellX = Math.floor((box.maxX + this.radius) / COLLISION_CELL_SIZE)
      const minCellZ = Math.floor((box.minZ - this.radius) / COLLISION_CELL_SIZE)
      const maxCellZ = Math.floor((box.maxZ + this.radius) / COLLISION_CELL_SIZE)
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
          const key = `${cellX}:${cellZ}`
          let cell = this.staticGrid.get(key)
          if (!cell) {
            cell = []
            this.staticGrid.set(key, cell)
          }
          cell.push(box)
        }
      }
    }
  }

  #queryNearby(position) {
    this.nearbyColliders.length = 0
    this.seenColliders.clear()
    const cellX = Math.floor(position.x / COLLISION_CELL_SIZE)
    const cellZ = Math.floor(position.z / COLLISION_CELL_SIZE)
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
        const cell = this.staticGrid.get(`${cellX + offsetX}:${cellZ + offsetZ}`)
        if (!cell) continue
        for (const box of cell) {
          if (this.seenColliders.has(box)) continue
          this.seenColliders.add(box)
          this.nearbyColliders.push(box)
        }
      }
    }
    for (const box of this.dynamicColliders) {
      if (box.disabled || this.seenColliders.has(box)) continue
      const dynamicRange = COLLISION_CELL_SIZE + this.radius
      if (
        position.x < box.minX - dynamicRange
        || position.x > box.maxX + dynamicRange
        || position.z < box.minZ - dynamicRange
        || position.z > box.maxZ + dynamicRange
      ) continue
      this.seenColliders.add(box)
      this.nearbyColliders.push(box)
    }
    this.lastNearbyColliderCount = Math.max(
      this.lastNearbyColliderCount,
      this.nearbyColliders.length,
    )
    return this.nearbyColliders
  }

  #pushOutFromInside(position, box) {
    const distances = [
      { axis: 'x', amount: box.minX - position.x - this.radius },
      { axis: 'x', amount: box.maxX - position.x + this.radius },
      { axis: 'z', amount: box.minZ - position.z - this.radius },
      { axis: 'z', amount: box.maxZ - position.z + this.radius },
    ]
    const nearest = distances.reduce((best, candidate) =>
      Math.abs(candidate.amount) < Math.abs(best.amount) ? candidate : best,
    )

    position[nearest.axis] += nearest.amount
  }

  #clampToBounds(position) {
    position.x = Math.max(
      this.bounds.minX + this.radius,
      Math.min(position.x, this.bounds.maxX - this.radius),
    )
    position.z = Math.max(
      this.bounds.minZ + this.radius,
      Math.min(position.z, this.bounds.maxZ - this.radius),
    )
  }
}
