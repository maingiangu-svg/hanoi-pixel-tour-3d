const EPSILON = 0.0001

export class PlayerCollision {
  constructor({ colliders, bounds, radius = 0.36 }) {
    this.colliders = colliders
    this.bounds = bounds
    this.radius = radius
    this.maxStep = radius * 0.45
  }

  setWorld({ colliders, bounds }) {
    this.colliders = colliders
    this.bounds = bounds
  }

  move(position, displacement) {
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

    return position
  }

  #resolveObstacles(position) {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      let resolvedCollision = false

      for (const box of this.colliders) {
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
