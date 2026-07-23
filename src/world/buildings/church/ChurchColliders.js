import { CHURCH_DIMENSIONS } from './ChurchDimensions.js'

function freezeCollider(spec) {
  return Object.freeze(spec)
}

export function createChurchColliderSpecs(dimensions = CHURCH_DIMENSIONS) {
  const {
    halfWidth,
    towerInnerX,
    towerRearZ,
    apseStartZ,
    rearZ,
    portalHalfWidth,
    portalRecessRearZ,
    colliderFrontZ,
  } = dimensions
  const outerWallX = halfWidth + 0.68

  return Object.freeze([
    freezeCollider({
      name: 'church-tower-west',
      part: 'tower',
      minX: -outerWallX,
      maxX: -towerInnerX,
      minZ: towerRearZ,
      maxZ: colliderFrontZ,
    }),
    freezeCollider({
      name: 'church-tower-east',
      part: 'tower',
      minX: towerInnerX,
      maxX: outerWallX,
      minZ: towerRearZ,
      maxZ: colliderFrontZ,
    }),
    freezeCollider({
      name: 'church-facade-west',
      part: 'facade',
      minX: -towerInnerX,
      maxX: -portalHalfWidth,
      minZ: towerRearZ,
      maxZ: colliderFrontZ,
    }),
    freezeCollider({
      name: 'church-facade-east',
      part: 'facade',
      minX: portalHalfWidth,
      maxX: towerInnerX,
      minZ: towerRearZ,
      maxZ: colliderFrontZ,
    }),
    freezeCollider({
      name: 'church-nave-west',
      part: 'nave',
      minX: -outerWallX,
      maxX: -portalHalfWidth,
      minZ: apseStartZ,
      maxZ: towerRearZ,
    }),
    freezeCollider({
      name: 'church-nave-east',
      part: 'nave',
      minX: portalHalfWidth,
      maxX: outerWallX,
      minZ: apseStartZ,
      maxZ: towerRearZ,
    }),
    freezeCollider({
      name: 'church-nave-center',
      part: 'nave',
      minX: -portalHalfWidth,
      maxX: portalHalfWidth,
      minZ: apseStartZ,
      maxZ: portalRecessRearZ,
    }),
    freezeCollider({
      name: 'church-apse-front',
      part: 'apse',
      minX: -6.95,
      maxX: 6.95,
      minZ: apseStartZ - 1.5,
      maxZ: apseStartZ,
    }),
    freezeCollider({
      name: 'church-apse-mid-front',
      part: 'apse',
      minX: -6.6,
      maxX: 6.6,
      minZ: apseStartZ - 2.55,
      maxZ: apseStartZ - 1.5,
    }),
    freezeCollider({
      name: 'church-apse-mid-rear',
      part: 'apse',
      minX: -5.8,
      maxX: 5.8,
      minZ: rearZ + 0.7,
      maxZ: apseStartZ - 2.55,
    }),
    freezeCollider({
      name: 'church-apse-rear',
      part: 'apse',
      minX: -4.1,
      maxX: 4.1,
      minZ: rearZ - 0.8,
      maxZ: rearZ + 0.7,
    }),
  ])
}

export function colliderContainsPoint(collider, point, padding = 0) {
  if (!collider || !point) return false
  return point.x >= collider.minX - padding
    && point.x <= collider.maxX + padding
    && point.z >= collider.minZ - padding
    && point.z <= collider.maxZ + padding
}

export function circleIntersectsCollider(collider, circle, padding = 0) {
  if (!collider || !circle) return false

  const radius = Math.max(0, (circle.radius ?? 0) + padding)
  const closestX = Math.max(collider.minX, Math.min(circle.x, collider.maxX))
  const closestZ = Math.max(collider.minZ, Math.min(circle.z, collider.maxZ))
  const offsetX = circle.x - closestX
  const offsetZ = circle.z - closestZ

  return offsetX * offsetX + offsetZ * offsetZ <= radius * radius
}
