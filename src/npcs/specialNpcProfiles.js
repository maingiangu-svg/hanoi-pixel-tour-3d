export const SPECIAL_NPC_CANONICAL_HEIGHT = 1.745

const freezeProfile = (profile) => Object.freeze({ ...profile })

export const SPECIAL_NPC_PROFILES = Object.freeze({
  gymmer: freezeProfile({
    id: 'gymmer',
    label: 'Anh Gymer',
    height: 1.92,
    skinColor: 0xc98762,
    hairColor: 0x161719,
    bodyWidth: 1.42,
    limbBulk: 1.38,
    faceWidth: 0.7,
    faceHeight: 0.62,
    faceCenterY: 1.435,
    colliderRadius: 0.39,
    colliderDepth: 0.3,
    focusRatio: 0.84,
    defaultOutfit: 'gym',
  }),
  basketball: freezeProfile({
    id: 'basketball',
    label: 'Cầu thủ Elite',
    // The requested character is exactly 1.5 times the canonical NPC height.
    height: SPECIAL_NPC_CANONICAL_HEIGHT * 1.5,
    skinColor: 0xcd8a63,
    hairColor: 0x5a3826,
    bodyWidth: 1,
    limbBulk: 1.04,
    faceWidth: 0.69,
    faceHeight: 0.62,
    faceCenterY: 1.435,
    colliderRadius: 0.34,
    colliderDepth: 0.27,
    focusRatio: 0.84,
    defaultOutfit: 'court',
  }),
  mo: freezeProfile({
    id: 'mo',
    label: 'Mơ',
    height: 1.7,
    skinColor: 0xd79b76,
    hairColor: 0x211b1a,
    bodyWidth: 0.88,
    limbBulk: 0.84,
    faceWidth: 0.82,
    faceHeight: 0.75,
    faceCenterY: 1.37,
    colliderRadius: 0.25,
    colliderDepth: 0.2,
    focusRatio: 0.83,
    defaultOutfit: 'idle',
  }),
})

export const SPECIAL_NPC_PROFILE_NAMES = Object.freeze(
  Object.keys(SPECIAL_NPC_PROFILES),
)

export function getSpecialNpcProfile(id) {
  const profile = SPECIAL_NPC_PROFILES[id]
  if (!profile) throw new RangeError(`Unknown special NPC profile: ${id}`)
  return profile
}
