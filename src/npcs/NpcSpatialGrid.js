function cellKey(x, z, cellSize) {
  return `${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`
}

/**
 * Small reusable X/Z grid for ambient actors. Buckets are rebuilt from the
 * fixed actor pool, so queries never scan NPCs from distant streets.
 */
export class NpcSpatialGrid {
  constructor(cellSize = 16) {
    this.cellSize = Math.max(4, cellSize)
    this.cells = new Map()
    this.results = []
  }

  clear() {
    for (const bucket of this.cells.values()) bucket.length = 0
    this.cells.clear()
  }

  insert(item, position = item?.position) {
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return
    const key = cellKey(position.x, position.z, this.cellSize)
    let bucket = this.cells.get(key)
    if (!bucket) {
      bucket = []
      this.cells.set(key, bucket)
    }
    bucket.push(item)
  }

  rebuild(items, getPosition = (item) => item?.position) {
    this.clear()
    for (const item of items) this.insert(item, getPosition(item))
  }

  query(position, radius, predicate = null) {
    this.results.length = 0
    if (!position || !Number.isFinite(radius)) return this.results
    const minX = Math.floor((position.x - radius) / this.cellSize)
    const maxX = Math.floor((position.x + radius) / this.cellSize)
    const minZ = Math.floor((position.z - radius) / this.cellSize)
    const maxZ = Math.floor((position.z + radius) / this.cellSize)
    const radiusSquared = radius * radius
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const bucket = this.cells.get(`${x}:${z}`)
        if (!bucket) continue
        for (const item of bucket) {
          const itemPosition = item?.position ?? item?.actor?.position
          if (!itemPosition) continue
          const dx = itemPosition.x - position.x
          const dz = itemPosition.z - position.z
          if (dx * dx + dz * dz > radiusSquared) continue
          if (!predicate || predicate(item)) this.results.push(item)
        }
      }
    }
    return this.results
  }
}
