const freezeSeller = (seller) => Object.freeze({
  defaultBehavior: 'standing',
  walkSpeed: 0.48,
  shoes: 'charcoal',
  accessory: 'apron',
  ...seller,
})

export const SHOP_SELLER_PRESETS = Object.freeze({
  auntieRedApron: freezeSeller({
    id: 'auntieRedApron',
    label: 'Cô bán hàng',
    height: 1.58,
    skin: 'skinWarm',
    top: 'cream',
    bottom: 'darkBrown',
    hair: 'bun',
    hairColor: 'hairBlack',
    accent: 'red',
    pose: 'serve',
  }),
  uncleBlueApron: freezeSeller({
    id: 'uncleBlueApron',
    label: 'Chú bán hàng',
    height: 1.68,
    skin: 'skinDeep',
    top: 'blue',
    bottom: 'charcoal',
    hair: 'short',
    hairColor: 'hairBlack',
    accent: 'cream',
    pose: 'wipe',
  }),
  youngCafeStaff: freezeSeller({
    id: 'youngCafeStaff',
    label: 'Nhân viên cà phê',
    height: 1.64,
    skin: 'skinLight',
    top: 'teal',
    bottom: 'navy',
    hair: 'bob',
    hairColor: 'hairBrown',
    accent: 'oldYellow',
    pose: 'welcome',
  }),
  teaAuntie: freezeSeller({
    id: 'teaAuntie',
    label: 'Cô bán trà',
    height: 1.56,
    skin: 'skinWarm',
    top: 'oldYellow',
    bottom: 'brown',
    hair: 'bun',
    hairColor: 'hairGray',
    accent: 'greenDoor',
    pose: 'pour',
  }),
  bakerySeller: freezeSeller({
    id: 'bakerySeller',
    label: 'Người bán bánh',
    height: 1.66,
    skin: 'skinLight',
    top: 'mustard',
    bottom: 'denim',
    hair: 'short',
    hairColor: 'hairBrown',
    accent: 'cream',
    pose: 'serve',
  }),
  shopkeeperGreen: freezeSeller({
    id: 'shopkeeperGreen',
    label: 'Chủ cửa hàng',
    height: 1.62,
    skin: 'skinWarm',
    top: 'sage',
    bottom: 'navy',
    hair: 'short',
    hairColor: 'hairBlack',
    accent: 'oldYellow',
    pose: 'welcome',
  }),
})

const profile = (value) => Object.freeze({
  closedMessage: 'Cửa hàng hiện đang đóng.',
  lightColor: 0xf2b36b,
  lightIntensity: 3.8,
  counterMaterial: 'darkWood',
  awningMaterial: 'greenDoor',
  ...value,
  sellerPresetIds: Object.freeze(value.sellerPresetIds),
})

export const SHOP_FRONT_PROFILES = Object.freeze({
  pho: profile({
    id: 'pho',
    label: 'Quán phở',
    scheduleId: 'breakfastDinner',
    dialogue: 'Ăn bát phở nóng không cháu?',
    propSet: 'noodle',
    awningMaterial: 'brick',
    sellerPresetIds: ['auntieRedApron', 'uncleBlueApron'],
    customerPreset: 'elderly',
  }),
  bun: profile({
    id: 'bun',
    label: 'Quán bún',
    scheduleId: 'breakfastDinner',
    dialogue: 'Hôm nay bún mới làm đấy.',
    propSet: 'noodle',
    awningMaterial: 'oldYellow',
    sellerPresetIds: ['uncleBlueApron', 'auntieRedApron'],
    customerPreset: 'student',
  }),
  rice: profile({
    id: 'rice',
    label: 'Quán cơm',
    scheduleId: 'riceMeals',
    dialogue: 'Cơm nóng vừa dọn xong đấy cháu.',
    propSet: 'rice',
    awningMaterial: 'terracotta',
    sellerPresetIds: ['auntieRedApron', 'uncleBlueApron'],
    customerPreset: 'student',
  }),
  cafe: profile({
    id: 'cafe',
    label: 'Quán cà phê',
    scheduleId: 'cafe',
    dialogue: 'Vào ngồi uống cà phê nhé?',
    propSet: 'cafe',
    lightColor: 0xefaa5f,
    lightIntensity: 4.4,
    sellerPresetIds: ['youngCafeStaff', 'uncleBlueApron'],
    customerPreset: 'tourist',
  }),
  tea: profile({
    id: 'tea',
    label: 'Quán trà',
    scheduleId: 'tea',
    dialogue: 'Có trà nóng và trà đá đây.',
    propSet: 'tea',
    awningMaterial: 'greenDoor',
    sellerPresetIds: ['teaAuntie', 'youngCafeStaff'],
    customerPreset: 'elderly',
  }),
  bakery: profile({
    id: 'bakery',
    label: 'Hàng bánh',
    scheduleId: 'bakery',
    dialogue: 'Bánh mới ra lò, thơm lắm cháu ạ.',
    propSet: 'bakery',
    awningMaterial: 'brick',
    sellerPresetIds: ['bakerySeller', 'auntieRedApron'],
  }),
  drinks: profile({
    id: 'drinks',
    label: 'Quán nước',
    scheduleId: 'drinks',
    dialogue: 'Có nước mát đây cháu.',
    propSet: 'tea',
    sellerPresetIds: ['teaAuntie', 'shopkeeperGreen'],
  }),
  general: profile({
    id: 'general',
    label: 'Cửa hàng nhỏ',
    scheduleId: 'general',
    dialogue: 'Cháu cứ xem, cần gì thì gọi cô chú nhé.',
    propSet: 'display',
    lightIntensity: 3.2,
    sellerPresetIds: ['shopkeeperGreen', 'bakerySeller', 'uncleBlueApron'],
  }),
})

const SIGN_RULES = Object.freeze([
  [/(PHỞ)/u, 'pho'],
  [/(BÚN)/u, 'bun'],
  [/(CƠM)/u, 'rice'],
  [/(CÀ PHÊ|CAFE|CAFÉ)/u, 'cafe'],
  [/(TRÀ|CHÈ)/u, 'tea'],
  [/(BÁNH)/u, 'bakery'],
  [/(NƯỚC)/u, 'drinks'],
  [/(TẠP HÓA|TIỆM SÁCH|ĐỒ GỐM|ĐỒ THỦ CÔNG|HIỆU ẢNH|MAY ĐO|LỤA|GỐM VIỆT)/u, 'general'],
])

export function getShopProfileForSign(sign = '') {
  const normalized = String(sign).normalize('NFC').toUpperCase()
  const match = SIGN_RULES.find(([pattern]) => pattern.test(normalized))
  return match ? SHOP_FRONT_PROFILES[match[1]] : null
}

export function getShopSellerPreset(profile, variantIndex = 0) {
  const presetIds = profile?.sellerPresetIds ?? SHOP_FRONT_PROFILES.general.sellerPresetIds
  const presetId = presetIds[Math.abs(variantIndex) % presetIds.length]
  return SHOP_SELLER_PRESETS[presetId] ?? SHOP_SELLER_PRESETS.shopkeeperGreen
}
