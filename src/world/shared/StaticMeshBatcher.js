import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const INFINITE_CELL = Number.POSITIVE_INFINITY

function cellCoordinate(value, cellSize) {
  return cellSize === INFINITE_CELL ? 0 : Math.floor(value / cellSize)
}

function canBatch(mesh, root) {
  let ancestor = mesh.parent
  while (ancestor && ancestor !== root) {
    if (!ancestor.visible || ancestor.userData.dynamicVisibility) return false
    ancestor = ancestor.parent
  }
  return (
    mesh.isMesh
    && !mesh.isInstancedMesh
    && !mesh.isSkinnedMesh
    && !Array.isArray(mesh.material)
    && !mesh.material.transparent
    && mesh.geometry?.attributes?.position
    && mesh.visible
  )
}

export function batchStaticMeshes(root, {
  cellSize = INFINITE_CELL,
  name = `${root.name} · static batches`,
  activationDistance = INFINITE_CELL,
  activationHysteresis = 8,
} = {}) {
  root.updateWorldMatrix(true, true)
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const relativeMatrix = new THREE.Matrix4()
  const worldPosition = new THREE.Vector3()
  const groups = new Map()

  root.traverse((object) => {
    if (!canBatch(object, root)) return
    object.getWorldPosition(worldPosition)
    const attributes = Object.keys(object.geometry.attributes).sort().join(',')
    const key = [
      object.material.uuid,
      attributes,
      object.geometry.index ? 'indexed' : 'plain',
      object.castShadow ? 'cast' : 'no-cast',
      object.receiveShadow ? 'receive' : 'no-receive',
      object.renderOrder,
      cellCoordinate(worldPosition.x, cellSize),
      cellCoordinate(worldPosition.z, cellSize),
    ].join('|')
    let group = groups.get(key)
    if (!group) {
      group = {
        material: object.material,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        renderOrder: object.renderOrder,
        meshes: [],
      }
      groups.set(key, group)
    }
    group.meshes.push(object)
  })

  const batchRoot = new THREE.Group()
  batchRoot.name = name
  root.add(batchRoot)
  const geometries = []
  const entries = []
  const localPlayerPosition = new THREE.Vector3()
  let sourceMeshCount = 0

  for (const group of groups.values()) {
    if (group.meshes.length < 2) continue
    const transformed = group.meshes.map((mesh) => {
      relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld)
      const geometry = mesh.geometry.clone()
      geometry.applyMatrix4(relativeMatrix)
      return geometry
    })
    const merged = mergeGeometries(transformed, false)
    transformed.forEach((geometry) => geometry.dispose())
    if (!merged) continue
    merged.computeBoundingBox()
    merged.computeBoundingSphere()

    const mesh = new THREE.Mesh(merged, group.material)
    mesh.name = `${name} ${geometries.length + 1}`
    mesh.castShadow = group.castShadow
    mesh.receiveShadow = group.receiveShadow
    mesh.renderOrder = group.renderOrder
    mesh.matrixAutoUpdate = false
    mesh.matrix.identity()
    batchRoot.add(mesh)
    geometries.push(merged)
    entries.push({
      mesh,
      center: merged.boundingSphere.center.clone(),
      radius: merged.boundingSphere.radius,
    })

    group.meshes.forEach((source) => {
      source.removeFromParent()
    })
    sourceMeshCount += group.meshes.length
  }

  return {
    root: batchRoot,
    sourceMeshCount,
    batchCount: geometries.length,
    updateVisibility(playerPosition, active = true) {
      batchRoot.visible = active
      if (!active || activationDistance === INFINITE_CELL || !playerPosition) return

      root.updateWorldMatrix(true, false)
      localPlayerPosition.copy(playerPosition)
      root.worldToLocal(localPlayerPosition)
      for (const entry of entries) {
        const threshold = activationDistance
          + entry.radius
          + (entry.mesh.visible ? activationHysteresis : 0)
        const dx = localPlayerPosition.x - entry.center.x
        const dz = localPlayerPosition.z - entry.center.z
        entry.mesh.visible = dx * dx + dz * dz <= threshold * threshold
      }
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose())
      batchRoot.removeFromParent()
    },
  }
}
