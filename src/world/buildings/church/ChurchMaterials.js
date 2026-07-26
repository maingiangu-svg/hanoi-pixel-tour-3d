export const CHURCH_MATERIALS = Object.freeze({
  weatheredStone: 'stoneWeathered',
  agedStone: 'stoneAged',
  trimStone: 'stoneTrim',
  recess: 'churchRecess',
  roofTile: 'churchRoofTile',
  darkWood: 'darkWood',
  metal: 'metal',
  glassRed: 'redGlass',
  glassBlue: 'blueGlass',
  glassAmber: 'amberGlass',
  glassTeal: 'tealGlass',
})

export function assertChurchMaterials(kit) {
  if (!kit || typeof kit.material !== 'function') {
    throw new TypeError('Church materials require a SceneKit-compatible material(name) method')
  }

  const resolved = {}
  const missing = []

  for (const [role, materialName] of Object.entries(CHURCH_MATERIALS)) {
    try {
      resolved[role] = kit.material(materialName)
    } catch {
      missing.push(materialName)
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing church materials: ${missing.join(', ')}`)
  }

  return Object.freeze(resolved)
}
