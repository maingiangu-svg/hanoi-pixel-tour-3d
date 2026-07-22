export const MINUTES_PER_DAY = 24 * 60

export const CHURCH_TIMES = Object.freeze({
  arrivalsBegin: 17 * 60 + 40,
  moLeavesPlaza: 17 * 60 + 50,
  serviceBegins: 18 * 60,
  serviceEnds: 19 * 60,
  departuresEnd: 19 * 60 + 25,
})

export const MO_OUTFIT_TIMES = Object.freeze({
  churchOutfitBegins: 17 * 60,
  idleOutfitReturns: 20 * 60,
})

export function normalizeGameMinutes(minutes) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

export function getMoScheduleState(minutes) {
  const time = normalizeGameMinutes(minutes)
  if (time >= CHURCH_TIMES.serviceBegins && time < CHURCH_TIMES.serviceEnds) {
    return 'insideChurch'
  }
  if (time >= CHURCH_TIMES.moLeavesPlaza && time < CHURCH_TIMES.serviceBegins) {
    return 'walkingToChurch'
  }
  if (time >= CHURCH_TIMES.serviceEnds && time < CHURCH_TIMES.departuresEnd) {
    return 'returningToPlaza'
  }
  if (time >= 15 * 60 + 30 && time < CHURCH_TIMES.moLeavesPlaza) {
    return 'withChildren'
  }
  if (time >= 6 * 60 && time < 15 * 60 + 30) return 'dayStroll'
  return 'courtyardIdle'
}

export function getMoOutfitForTime(minutes) {
  const time = normalizeGameMinutes(minutes)
  return time >= MO_OUTFIT_TIMES.churchOutfitBegins && time < MO_OUTFIT_TIMES.idleOutfitReturns
    ? 'church'
    : 'idle'
}

export function getChurchCrowdState(minutes) {
  const time = normalizeGameMinutes(minutes)
  if (time >= CHURCH_TIMES.arrivalsBegin && time < CHURCH_TIMES.serviceBegins) {
    return 'arriving'
  }
  if (time >= CHURCH_TIMES.serviceBegins && time < CHURCH_TIMES.serviceEnds) {
    return 'service'
  }
  if (time >= CHURCH_TIMES.serviceEnds && time < CHURCH_TIMES.departuresEnd) {
    return 'leaving'
  }
  if (time >= CHURCH_TIMES.departuresEnd && time < 21 * 60) return 'postService'
  return 'quiet'
}

export function getAmbientDensity(minutes) {
  const time = normalizeGameMinutes(minutes)
  if (time >= 17 * 60 && time < 21 * 60 + 30) return 'busy'
  if (time >= 6 * 60 && time < 17 * 60) return 'day'
  return 'quiet'
}
