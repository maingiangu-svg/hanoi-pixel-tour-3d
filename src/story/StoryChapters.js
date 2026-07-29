/**
 * Mo's Hanoi Story — Chapter-based storyline.
 *
 * Mo leads the player through Hanoi's iconic locations,
 * each chapter tied to a time of day and emotional arc.
 */

export const STORY_CHAPTERS = Object.freeze([
  // ──────────────────────────────────────────────
  // CHAPTER 1: BÌNH MINH — Awakening
  // ──────────────────────────────────────────────
  Object.freeze({
    id: 'chapter-dawn',
    title: 'Bình Minh',
    subtitle: 'Khi thành phố còn ngái ngủ',
    description: 'Mơ dẫn bạn đến Hồ Gươm lúc sáng sớm. Mặt nước phẳng lặng, chim hót, người tập thể dục.',
    requiredHour: { start: 5.5, end: 7 },
    unlockCondition: null, // Always unlocked
    quests: Object.freeze([
      Object.freeze({
        id: 'story-dawn-lake',
        name: 'Hồ Gươm lúc rạng đông',
        description: 'Chụp Hồ Gươm lúc bình minh — mặt nước phản chiếu bầu trời.',
        subject: 'Hồ Gươm bình minh',
        landmarkIds: ['thapRua'],
        location: { label: 'Bờ tây Hồ Gươm', mapId: 'hoanKiem' },
        time: { start: 330, end: 420, phases: ['dawn'] },
        minimumScore: 55,
        reward: { unlock: 'chapter-morning' },
      }),
      Object.freeze({
        id: 'story-dawn-exercise',
        name: 'Khởi động buổi sáng',
        description: 'Chụp nhóm người tập thể dục bên hồ — khoảnh khắc đồng đội.',
        subject: 'Nhóm tập thể dục',
        location: { label: 'Bờ tây Hồ Gươm', mapId: 'hoanKiem' },
        time: { start: 330, end: 480, phases: ['dawn', 'day'] },
        minimumScore: 58,
        reward: { dialogue: 'mo-dawn-complete' },
      }),
    ]),
    dialogue: Object.freeze([
      { expression: 'smile', text: 'Chào buổi sáng! Bạn dậy sớm thật.' },
      { expression: 'smile', text: 'Hồ Gươm lúc này yên tĩnh lắm. Mặt nước như gương.' },
      { expression: 'surprised', text: 'Nhìn kìa — Tháp Rùa đang phản chiếu xuống mặt hồ!' },
      { expression: 'smile', text: 'Chụp nhanh đi, khoảnh khắc này không kéo dài lâu đâu.' },
      { expression: 'smile', text: 'Tuyệt vời! Bạn thấy không — Hà Nội đẹp nhất lúc sáng sớm.' },
    ]),
  }),

  // ──────────────────────────────────────────────
  // CHAPTER 2: NHỊP SỐNG — The Rhythm
  // ──────────────────────────────────────────────
  Object.freeze({
    id: 'chapter-morning',
    title: 'Nhịp Sống',
    subtitle: 'Phố xá bắt đầu nhộn nhịp',
    description: 'Thành phố thức dậy. Tiếng xe, tiếng rao, quán xá mở cửa.',
    requiredHour: { start: 7, end: 12 },
    unlockCondition: 'chapter-dawn',
    quests: Object.freeze([
      Object.freeze({
        id: 'story-morning-church',
        name: 'Nhà thờ Lớn buổi sáng',
        description: 'Chụp mặt tiền Nhà thờ Lớn trong ánh sáng buổi sáng.',
        subject: 'Nhà thờ Lớn',
        landmarkIds: ['nhaThoLon'],
        location: { label: 'Sân Nhà thờ Lớn', mapId: 'hoanKiem' },
        time: { start: 420, end: 720, phases: ['day'] },
        minimumScore: 60,
        reward: { unlock: 'chapter-afternoon' },
      }),
      Object.freeze({
        id: 'story-morning-tea',
        name: 'Cốc trà đá đầu ngày',
        description: 'Chụp khoảnh khắc cô trà đá rót trà cho khách.',
        subject: 'Cô trà đá và khách',
        location: { label: 'Quán trà đá', mapId: 'hoanKiem' },
        time: { start: 390, end: 720, phases: ['dawn', 'day'] },
        minimumScore: 62,
        reward: { dialogue: 'mo-morning-complete' },
      }),
      Object.freeze({
        id: 'story-morning-street',
        name: 'Phố phường buổi sáng',
        description: 'Chụp con phố với người đi bộ, xe máy, quán xá.',
        subject: 'Nhịp sống phố phường',
        location: { label: 'Phố Nhà thờ', mapId: 'hoanKiem' },
        time: { start: 420, end: 720, phases: ['day'] },
        minimumScore: 58,
      }),
    ]),
    dialogue: Object.freeze([
      { expression: 'smile', text: 'Phố xá bắt đầu đông rồi!' },
      { expression: 'smile', text: 'Bạn nghe thấy không? Tiếng xe, tiếng rao hàng...' },
      { expression: 'surprised', text: 'Quán trà đá kia — Cô Hương bán ở đây 30 năm rồi đấy.' },
      { expression: 'smile', text: 'Mỗi sáng, cụ già trong phố đều ra đây uống trà.' },
      { expression: 'smile', text: 'Đây là nhịp sống thật sự của Hà Nội.' },
    ]),
  }),

  // ──────────────────────────────────────────────
  // CHAPTER 3: HOÀNG HÔN — Golden Hour
  // ──────────────────────────────────────────────
  Object.freeze({
    id: 'chapter-afternoon',
    title: 'Hoàng Hôn',
    subtitle: 'Ánh vàng phủ khắp phố',
    description: 'Chiều xuống, ánh nắng vàng rực chiếu lên mọi thứ. Đây là khoảnh khắc đẹp nhất.',
    requiredHour: { start: 16, end: 18.5 },
    unlockCondition: 'chapter-morning',
    quests: Object.freeze([
      Object.freeze({
        id: 'story-afternoon-lake',
        name: 'Hồ Gươm hoàng hôn',
        description: 'Chụp Hồ Gươm lúc hoàng hôn — mặt nước phản chiếu ánh vàng.',
        subject: 'Hồ Gươm hoàng hôn',
        landmarkIds: ['thapRua'],
        location: { label: 'Bờ tây Hồ Gươm', mapId: 'hoanKiem' },
        time: { start: 960, end: 1050, phases: ['goldenHour', 'sunset'] },
        minimumScore: 68,
        reward: { unlock: 'chapter-night' },
      }),
      Object.freeze({
        id: 'story-afternoon-bridge',
        name: 'Cầu Thê Húc lúc chiều tà',
        description: 'Chụp Cầu Thê Húc trong ánh hoàng hôn — cầu đỏ rực rỡ.',
        subject: 'Cầu Thê Húc',
        landmarkIds: ['cauTheHuc'],
        location: { label: 'Cầu Thê Húc', mapId: 'hoanKiem' },
        time: { start: 960, end: 1080, phases: ['goldenHour', 'sunset'] },
        minimumScore: 70,
        reward: { dialogue: 'mo-afternoon-complete' },
      }),
    ]),
    dialogue: Object.freeze([
      { expression: 'smile', text: 'Hoàng hôn rồi... Bạn có thấy ánh vàng trên mặt nước không?' },
      { expression: 'smile', text: 'Cầu Thê Húc lúc này đỏ rực luôn.' },
      { expression: 'sad', text: 'Mỗi lần ngắm hoàng hôn, mình lại thấy thời gian trôi nhanh quá.' },
      { expression: 'smile', text: 'Nhưng mà... khoảnh khắc này đẹp thật.' },
      { expression: 'smile', text: 'Chụp đi — lưu lại khoảnh khắc này.' },
    ]),
  }),

  // ──────────────────────────────────────────────
  // CHAPTER 4: ĐÊM HÀ NỘI — Night Lights
  // ──────────────────────────────────────────────
  Object.freeze({
    id: 'chapter-night',
    title: 'Đêm Hà Nội',
    subtitle: 'Thành phố lên đèn',
    description: 'Đêm xuống, Hà Nội thay áo mới. Đèn lồng, phố đi bộ, quán xá sáng rực.',
    requiredHour: { start: 18.5, end: 22 },
    unlockCondition: 'chapter-afternoon',
    quests: Object.freeze([
      Object.freeze({
        id: 'story-night-tower',
        name: 'Tháp Rùa lên đèn',
        description: 'Chụp Tháp Rùa lúc đêm — đèn sáng phản chiếu mặt hồ.',
        subject: 'Tháp Rùa ban đêm',
        landmarkIds: ['thapRua'],
        location: { label: 'Điểm ngắm Tháp Rùa', mapId: 'hoanKiem' },
        time: { start: 1110, end: 1320, phases: ['blueHour', 'night'] },
        minimumScore: 72,
        reward: { unlock: 'story-complete' },
      }),
      Object.freeze({
        id: 'story-night-street',
        name: 'Phố đêm nhộn nhịp',
        description: 'Chụp con phố đêm với đèn lồng, người đi bộ, quán xá.',
        subject: 'Phố đêm Hà Nội',
        location: { label: 'Phố đi bộ', mapId: 'hoanKiem' },
        time: { start: 1110, end: 1320, phases: ['blueHour', 'night'] },
        minimumScore: 68,
        reward: { dialogue: 'mo-night-complete' },
      }),
      Object.freeze({
        id: 'story-night-reflection',
        name: 'Phản chiếu đêm',
        description: 'Chụp ánh đèn phản chiếu trên mặt hồ lúc đêm.',
        subject: 'Đèn đêm phản chiếu',
        location: { label: 'Bờ Hồ Gươm', mapId: 'hoanKiem' },
        time: { start: 1140, end: 1320, phases: ['night'] },
        minimumScore: 70,
      }),
    ]),
    dialogue: Object.freeze([
      { expression: 'surprised', text: 'Wow... Hà Nội về đêm đẹp quá!' },
      { expression: 'smile', text: 'Đèn lồng, đèn đường, đèn quán... tất cả phản chiếu xuống mặt hồ.' },
      { expression: 'smile', text: 'Bạn biết không — mình sinh ra ở Hà Nội.' },
      { expression: 'sad', text: 'Mỗi lần ngắm thành phố về đêm, mình lại nhớ ngày nhỏ.' },
      { expression: 'smile', text: 'Cảm ơn bạn đã đi cùng mình hôm nay. Đây là Hà Nội của mình.' },
    ]),
  }),
])

/**
 * Get the next chapter to unlock after completing a given chapter.
 */
export function getNextChapter(currentChapterId) {
  const index = STORY_CHAPTERS.findIndex((ch) => ch.id === currentChapterId)
  if (index < 0 || index >= STORY_CHAPTERS.length - 1) return null
  return STORY_CHAPTERS[index + 1]
}

/**
 * Get chapter by ID.
 */
export function getChapterById(id) {
  return STORY_CHAPTERS.find((ch) => ch.id === id) ?? null
}

/**
 * Get all unlocked chapters based on completed chapter IDs.
 */
export function getUnlockedChapters(completedChapterIds) {
  const completed = new Set(completedChapterIds)
  return STORY_CHAPTERS.filter((ch) => {
    if (!ch.unlockCondition) return true
    return completed.has(ch.unlockCondition)
  })
}
