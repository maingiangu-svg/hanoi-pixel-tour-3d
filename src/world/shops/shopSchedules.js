export const SHOP_OPENING_SCHEDULES = Object.freeze({
  breakfastDinner: Object.freeze({
    id: 'breakfastDinner',
    label: '06:00–10:30 · 16:30–21:30',
    intervals: Object.freeze([[6 * 60, 10 * 60 + 30], [16 * 60 + 30, 21 * 60 + 30]]),
  }),
  riceMeals: Object.freeze({
    id: 'riceMeals',
    label: '10:30–14:30 · 17:00–21:00',
    intervals: Object.freeze([[10 * 60 + 30, 14 * 60 + 30], [17 * 60, 21 * 60]]),
  }),
  cafe: Object.freeze({
    id: 'cafe',
    label: '06:30–22:30',
    intervals: Object.freeze([[6 * 60 + 30, 22 * 60 + 30]]),
  }),
  tea: Object.freeze({
    id: 'tea',
    label: '14:00–23:00',
    intervals: Object.freeze([[14 * 60, 23 * 60]]),
  }),
  bakery: Object.freeze({
    id: 'bakery',
    label: '06:00–21:30',
    intervals: Object.freeze([[6 * 60, 21 * 60 + 30]]),
  }),
  drinks: Object.freeze({
    id: 'drinks',
    label: '10:00–22:30',
    intervals: Object.freeze([[10 * 60, 22 * 60 + 30]]),
  }),
  general: Object.freeze({
    id: 'general',
    label: '08:00–22:00',
    intervals: Object.freeze([[8 * 60, 22 * 60]]),
  }),
})

const MINUTES_PER_DAY = 24 * 60

function normalizeMinutes(minutes) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

export function isShopOpen(scheduleId, minutes) {
  const schedule = SHOP_OPENING_SCHEDULES[scheduleId]
  if (!schedule || !Number.isFinite(minutes)) return false
  const time = normalizeMinutes(minutes)
  return schedule.intervals.some(([start, end]) => (
    start <= end ? time >= start && time < end : time >= start || time < end
  ))
}

export function getShopScheduleLabel(scheduleId) {
  return SHOP_OPENING_SCHEDULES[scheduleId]?.label ?? ''
}

export function getMinutesUntilShopCloses(scheduleId, minutes) {
  const schedule = SHOP_OPENING_SCHEDULES[scheduleId]
  if (!schedule || !Number.isFinite(minutes)) return 0
  const time = normalizeMinutes(minutes)

  for (const [start, end] of schedule.intervals) {
    if (start <= end && time >= start && time < end) return end - time
    if (start > end && (time >= start || time < end)) {
      return time >= start
        ? MINUTES_PER_DAY - time + end
        : end - time
    }
  }
  return 0
}
