const freezeRule = (rule) => Object.freeze({
  maxCustomers: 0,
  customerPresets: Object.freeze([]),
  ...rule,
  customerPresets: Object.freeze(rule.customerPresets ?? []),
})

export const SHOP_CUSTOMER_STATES = Object.freeze([
  'entering',
  'ordering',
  'waiting',
  'sitting',
  'eatingOrDrinking',
  'leaving',
])

export const SHOP_CUSTOMER_RULES = Object.freeze({
  pho: freezeRule({
    maxCustomers: 5,
    layout: 'meal',
    customerPresets: ['student', 'officeWorker', 'middleAged', 'tourist', 'elderly'],
  }),
  bun: freezeRule({
    maxCustomers: 5,
    layout: 'meal',
    customerPresets: ['officeWorker', 'student', 'middleAged', 'elderly', 'tourist'],
  }),
  rice: freezeRule({
    maxCustomers: 5,
    layout: 'meal',
    customerPresets: ['officeWorker', 'middleAged', 'student', 'elderly', 'tourist'],
  }),
  cafe: freezeRule({
    maxCustomers: 4,
    layout: 'cafe',
    customerPresets: ['student', 'officeWorker', 'tourist', 'middleAged'],
  }),
  tea: freezeRule({
    maxCustomers: 4,
    layout: 'cafe',
    customerPresets: ['elderly', 'student', 'middleAged', 'officeWorker'],
  }),
  bakery: freezeRule({
    maxCustomers: 2,
    layout: 'counter',
    customerPresets: ['officeWorker', 'student'],
  }),
  drinks: freezeRule({
    maxCustomers: 2,
    layout: 'counter',
    customerPresets: ['student', 'middleAged'],
  }),
  general: freezeRule({
    maxCustomers: 0,
    layout: 'counter',
    customerPresets: [],
  }),
})

const DENSITY_WINDOWS = Object.freeze({
  pho: Object.freeze([
    [6 * 60, 7 * 60, 2],
    [7 * 60, 9 * 60, 5],
    [9 * 60, 10 * 60 + 30, 3],
    [16 * 60 + 30, 17 * 60 + 30, 2],
    [17 * 60 + 30, 20 * 60, 4],
    [20 * 60, 21 * 60 + 30, 2],
  ]),
  bun: Object.freeze([
    [6 * 60, 7 * 60, 2],
    [7 * 60, 9 * 60, 5],
    [9 * 60, 10 * 60 + 30, 3],
    [16 * 60 + 30, 18 * 60, 2],
    [18 * 60, 20 * 60 + 30, 4],
    [20 * 60 + 30, 21 * 60 + 30, 2],
  ]),
  rice: Object.freeze([
    [10 * 60 + 30, 11 * 60 + 30, 2],
    [11 * 60 + 30, 13 * 60 + 30, 5],
    [13 * 60 + 30, 14 * 60 + 30, 2],
    [17 * 60, 18 * 60, 2],
    [18 * 60, 20 * 60, 4],
    [20 * 60, 21 * 60, 2],
  ]),
  cafe: Object.freeze([
    [6 * 60 + 30, 10 * 60, 3],
    [10 * 60, 14 * 60, 2],
    [14 * 60, 18 * 60, 4],
    [18 * 60, 21 * 60 + 30, 3],
    [21 * 60 + 30, 22 * 60 + 30, 1],
  ]),
  tea: Object.freeze([
    [14 * 60, 16 * 60, 1],
    [16 * 60, 18 * 60, 3],
    [18 * 60, 21 * 60 + 30, 4],
    [21 * 60 + 30, 23 * 60, 2],
  ]),
  bakery: Object.freeze([
    [6 * 60, 9 * 60, 2],
    [9 * 60, 16 * 60, 1],
    [16 * 60, 19 * 60, 2],
    [19 * 60, 21 * 60 + 30, 1],
  ]),
  drinks: Object.freeze([
    [10 * 60, 15 * 60, 1],
    [15 * 60, 21 * 60, 2],
    [21 * 60, 22 * 60 + 30, 1],
  ]),
})

function normalizeMinutes(minutes) {
  const day = 24 * 60
  return ((minutes % day) + day) % day
}

/**
 * Returns a stable target headcount for a shop and time. Shop variation is
 * deterministic, so advancing/reloading the game clock never accumulates NPCs.
 */
export function getShopCustomerTarget(
  profileId,
  minutes,
  { shopVariant = 0, open = true, closingSoon = false } = {},
) {
  const rule = SHOP_CUSTOMER_RULES[profileId] ?? SHOP_CUSTOMER_RULES.general
  if (!open || closingSoon || !Number.isFinite(minutes) || rule.maxCustomers === 0) return 0

  const time = normalizeMinutes(minutes)
  const window = (DENSITY_WINDOWS[profileId] ?? [])
    .find(([start, end]) => time >= start && time < end)
  if (!window) return 0

  const baseTarget = Math.min(rule.maxCustomers, window[2])
  const halfHour = Math.floor(time / 30)
  const quietVariation = (Math.abs(shopVariant) + halfHour) % 4 === 3 ? 1 : 0
  return Math.max(1, baseTarget - quietVariation)
}

export function getShopCustomerRule(profileId) {
  return SHOP_CUSTOMER_RULES[profileId] ?? SHOP_CUSTOMER_RULES.general
}
