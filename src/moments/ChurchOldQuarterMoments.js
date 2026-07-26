import {
  createMultiActorMoment,
  createSimpleMoment,
} from './MomentTemplates.js'

export const OFFICIAL_MOMENT_REGIONS = Object.freeze({
  CHURCH: 'churchDistrict',
  OLD_QUARTER: 'oldQuarterConnector',
})

const DEFAULT_DURATIONS = Object.freeze({
  preparing: 1.5,
  starting: 1,
  active: 5,
  climax: 2.5,
  ending: 1.5,
})

const activity = (actorId, id, options = {}) => Object.freeze({
  type: 'activities',
  actorId,
  activities: Object.freeze([Object.freeze({ id, ...options })]),
})

const attachProp = (actorId, propType, id, options = {}) => Object.freeze({
  type: 'attachProp',
  actorId,
  propType,
  options: Object.freeze({ id, ...options }),
})

const transferProp = (actorId, recipientId, propId) => Object.freeze({
  type: 'transferProp',
  actorId,
  recipientId,
  propId,
})

const route = (actorId, waypoints, loop = false) => Object.freeze({
  type: 'route',
  actorId,
  waypoints: Object.freeze(waypoints.map((point) => Object.freeze([...point]))),
  loop,
})

function createOfficialMoment(config) {
  const create = config.npcIds.length <= 2
    ? createSimpleMoment
    : createMultiActorMoment
  return create({
    area: 'outdoor',
    triggerRadius: 5.25,
    pauseDistance: 8,
    cleanupDistance: 12,
    durations: DEFAULT_DURATIONS,
    cooldown: 55,
    maxRepeats: Infinity,
    priority: 20,
    typeCooldown: 8,
    resourceFailurePolicy: 'wait',
    exclusionRadius: 2.5,
    performanceAreaIds: [`performance:${config.id}`],
    metadata: {
      official: true,
      location: config.location,
    },
    ...config,
  })
}

function churchMoments(resolveNpc) {
  return [
    createOfficialMoment({
      id: 'church-flower-gift',
      name: 'Trao hoa trước Nhà thờ',
      momentType: 'gift',
      location: 'Sân Nhà thờ Lớn',
      region: OFFICIAL_MOMENT_REGIONS.CHURCH,
      position: { x: -12, y: 0, z: 8 },
      timeWindow: { start: 8 * 60, end: 16 * 60 + 45 },
      priority: 28,
      timingBonus: 1.35,
      npcIds: ['Bạn trẻ 1', 'Bạn trẻ 2'],
      primarySubjectIds: ['Bạn trẻ 1', 'Bạn trẻ 2'],
      propIds: ['church-flower-bouquet'],
      stagingPoints: [
        { id: 'church-flower-seller-stage', position: [-12.7, 0, 8], yaw: Math.PI / 2 },
        { id: 'church-flower-customer-stage', position: [-11.2, 0, 8], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Bạn trẻ 1', stagingId: 'church-flower-seller-stage' },
        { actorId: 'Bạn trẻ 2', stagingId: 'church-flower-customer-stage' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            attachProp('Bạn trẻ 1', 'flowers', 'church-flower-bouquet'),
            activity('Bạn trẻ 1', 'pose', { duration: 3 }),
            activity('Bạn trẻ 2', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Bạn trẻ 1', 'giveItem', { duration: 6, loop: true }),
            activity('Bạn trẻ 2', 'receiveItem', { duration: 6, loop: true }),
          ],
        },
        {
          state: 'climax',
          actions: [
            transferProp('Bạn trẻ 1', 'Bạn trẻ 2', 'church-flower-bouquet'),
            activity('Bạn trẻ 1', 'giveItem', { duration: 3, loop: true }),
            activity('Bạn trẻ 2', 'receiveItem', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Bạn trẻ 1', 'wave', { duration: 2 }),
            activity('Bạn trẻ 2', 'wave', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'church-elderly-newspaper-coffee',
      name: 'Đọc báo và uống cà phê',
      momentType: 'quiet-life',
      location: 'Ghế đá sân Nhà thờ Lớn',
      region: OFFICIAL_MOMENT_REGIONS.CHURCH,
      position: { x: 9.5, y: 0, z: 1 },
      triggerRadius: 4.5,
      timeWindow: { start: 6 * 60 + 30, end: 11 * 60 + 30 },
      timingBonus: 1.15,
      npcIds: ['Cụ ngồi ghế đá'],
      primarySubjectIds: ['Cụ ngồi ghế đá'],
      propIds: ['church-elderly-newspaper', 'church-elderly-coffee'],
      stagingPoints: [
        { id: 'church-elderly-bench-stage', position: [9.5, 0.36, 0.95], yaw: Math.PI },
      ],
      initialStaging: [
        { actorId: 'Cụ ngồi ghế đá', stagingId: 'church-elderly-bench-stage' },
      ],
      timeline: [
        {
          state: 'preparing',
          actorId: 'Cụ ngồi ghế đá',
          activity: { id: 'sit', duration: 3 },
        },
        {
          state: 'active',
          actorId: 'Cụ ngồi ghế đá',
          activity: {
            id: 'read',
            duration: 6,
            loop: true,
            props: [{ type: 'newspaper', id: 'church-elderly-newspaper' }],
          },
        },
        {
          state: 'climax',
          actorId: 'Cụ ngồi ghế đá',
          activity: {
            id: 'drink',
            duration: 3,
            loop: true,
            props: [{ type: 'cup', id: 'church-elderly-coffee' }],
          },
        },
        {
          state: 'ending',
          actorId: 'Cụ ngồi ghế đá',
          activity: { id: 'sit', duration: 2 },
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'church-cyclist-crossing',
      name: 'Xe đạp qua quảng trường',
      momentType: 'street-motion',
      location: 'Quảng trường Nhà thờ Lớn',
      region: OFFICIAL_MOMENT_REGIONS.CHURCH,
      position: { x: 0, y: 0, z: 13 },
      triggerRadius: 5.75,
      pauseDistance: 9,
      cleanupDistance: 15,
      timeWindow: { start: 7 * 60, end: 9 * 60 + 30 },
      priority: 24,
      timingBonus: 1.25,
      npcIds: ['Người đi dạo phía sân'],
      primarySubjectIds: ['Người đi dạo phía sân'],
      propIds: ['church-crossing-bicycle'],
      stagingPoints: [
        { id: 'church-cycle-start', position: [-14, 0, 13], yaw: Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Người đi dạo phía sân', stagingId: 'church-cycle-start' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            activity('Người đi dạo phía sân', 'idle', { duration: 2 }),
          ],
        },
        {
          state: 'active',
          actions: [
            route('Người đi dạo phía sân', [[-14, 0, 13], [0, 0, 13], [14, 0, 13]]),
            activity('Người đi dạo phía sân', 'cycle', {
              duration: 8,
              loop: true,
              speed: 1.3,
              props: [{
                type: 'bicycle',
                id: 'church-crossing-bicycle',
                mount: 'root',
              }],
            }),
          ],
        },
        {
          state: 'climax',
          actorId: 'Người đi dạo phía sân',
          activity: {
            id: 'cycle',
            duration: 3,
            loop: true,
            speed: 1.3,
            props: [{
              type: 'bicycle',
              id: 'church-crossing-bicycle',
              mount: 'root',
            }],
          },
        },
        {
          state: 'ending',
          actorId: 'Người đi dạo phía sân',
          activity: { id: 'idle', duration: 2 },
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'church-friends-review-photo',
      name: 'Nhóm bạn xem lại ảnh',
      momentType: 'friends-photo-review',
      location: 'Sân Nhà thờ Lớn',
      region: OFFICIAL_MOMENT_REGIONS.CHURCH,
      position: { x: -3, y: 0, z: 3 },
      timeWindow: { start: 13 * 60 + 30, end: 18 * 60 },
      timingBonus: 1.3,
      npcIds: ['Bạn trẻ 3', 'Khách uống trà 1', 'Khách uống trà 2'],
      primarySubjectIds: ['Bạn trẻ 3', 'Khách uống trà 1', 'Khách uống trà 2'],
      propIds: [
        'church-review-phone-1',
        'church-review-phone-2',
        'church-review-phone-3',
      ],
      stagingPoints: [
        { id: 'church-review-left', position: [-4.1, 0, 3.2], yaw: Math.PI / 2 },
        { id: 'church-review-center', position: [-3, 0, 3], yaw: Math.PI },
        { id: 'church-review-right', position: [-1.9, 0, 3.2], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Bạn trẻ 3', stagingId: 'church-review-left' },
        { actorId: 'Khách uống trà 1', stagingId: 'church-review-center' },
        { actorId: 'Khách uống trà 2', stagingId: 'church-review-right' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: ['Bạn trẻ 3', 'Khách uống trà 1', 'Khách uống trà 2'].map(
            (actorId) => activity(actorId, 'idle', { duration: 3 }),
          ),
        },
        {
          state: 'active',
          actions: ['Bạn trẻ 3', 'Khách uống trà 1', 'Khách uống trà 2'].map(
            (actorId, index) => activity(actorId, 'viewPhoto', {
              duration: 7,
              loop: true,
              props: [{ type: 'phone', id: `church-review-phone-${index + 1}` }],
            }),
          ),
        },
        {
          state: 'climax',
          actions: [
            activity('Bạn trẻ 3', 'clap', { duration: 3, loop: true }),
            activity('Khách uống trà 1', 'wave', { duration: 3, loop: true }),
            activity('Khách uống trà 2', 'clap', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: ['Bạn trẻ 3', 'Khách uống trà 1', 'Khách uống trà 2'].map(
            (actorId) => activity(actorId, 'idle', { duration: 2 }),
          ),
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'church-couple-photo-help',
      name: 'Người lạ chụp ảnh cho cặp đôi',
      momentType: 'couple-photo',
      location: 'Mặt tiền Nhà thờ Lớn',
      region: OFFICIAL_MOMENT_REGIONS.CHURCH,
      position: { x: 5, y: 0, z: 5 },
      timeWindow: { start: 9 * 60, end: 17 * 60 + 45 },
      priority: 26,
      timingBonus: 1.45,
      npcIds: [
        'Người trong cặp đôi 1',
        'Người trong cặp đôi 2',
        'Khách chụp ảnh',
      ],
      primarySubjectIds: ['Người trong cặp đôi 1', 'Người trong cặp đôi 2'],
      propIds: ['church-couple-camera'],
      stagingPoints: [
        { id: 'church-couple-left', position: [4.5, 0, 3.7], yaw: Math.PI },
        { id: 'church-couple-right', position: [5.7, 0, 3.7], yaw: Math.PI },
        { id: 'church-couple-photographer', position: [5.1, 0, 6.3], yaw: 0 },
      ],
      initialStaging: [
        { actorId: 'Người trong cặp đôi 1', stagingId: 'church-couple-left' },
        { actorId: 'Người trong cặp đôi 2', stagingId: 'church-couple-right' },
        { actorId: 'Khách chụp ảnh', stagingId: 'church-couple-photographer' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            activity('Người trong cặp đôi 1', 'wave', { duration: 3 }),
            activity('Người trong cặp đôi 2', 'point', { duration: 3 }),
            activity('Khách chụp ảnh', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Người trong cặp đôi 1', 'pose', { duration: 7, loop: true }),
            activity('Người trong cặp đôi 2', 'pose', { duration: 7, loop: true }),
            activity('Khách chụp ảnh', 'takePhoto', {
              duration: 7,
              loop: true,
              props: [{ type: 'camera', id: 'church-couple-camera' }],
            }),
          ],
        },
        {
          state: 'climax',
          actions: [
            activity('Người trong cặp đôi 1', 'pose', { duration: 3, loop: true }),
            activity('Người trong cặp đôi 2', 'pose', { duration: 3, loop: true }),
            activity('Khách chụp ảnh', 'takePhoto', {
              duration: 3,
              loop: true,
              props: [{ type: 'camera', id: 'church-couple-camera' }],
            }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Người trong cặp đôi 1', 'wave', { duration: 2 }),
            activity('Người trong cặp đôi 2', 'viewPhoto', { duration: 2, props: [] }),
            activity('Khách chụp ảnh', 'wave', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
  ]
}

function oldQuarterMoments(resolveNpc) {
  return [
    createOfficialMoment({
      id: 'old-quarter-bike-help',
      name: 'Giúp dựng xe',
      momentType: 'help-bike',
      location: 'Ngã phố Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 42, y: 0, z: 36.5 },
      timeWindow: { start: 8 * 60, end: 19 * 60 },
      priority: 27,
      timingBonus: 1.35,
      npcIds: ['Chú xe ôm phố cổ', 'Du khách Phố Cổ 1'],
      primarySubjectIds: ['Chú xe ôm phố cổ', 'Du khách Phố Cổ 1'],
      propIds: ['old-quarter-fallen-bicycle'],
      stagingPoints: [
        { id: 'old-quarter-bike-helper', position: [41.3, 0, 36.2], yaw: Math.PI / 2 },
        { id: 'old-quarter-bike-owner', position: [42.6, 0, 36.2], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Chú xe ôm phố cổ', stagingId: 'old-quarter-bike-helper' },
        { actorId: 'Du khách Phố Cổ 1', stagingId: 'old-quarter-bike-owner' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            attachProp('Du khách Phố Cổ 1', 'bicycle', 'old-quarter-fallen-bicycle', {
              mount: 'root',
            }),
            activity('Chú xe ôm phố cổ', 'point', { duration: 3 }),
            activity('Du khách Phố Cổ 1', 'help', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Chú xe ôm phố cổ', 'help', { duration: 7, loop: true }),
            activity('Du khách Phố Cổ 1', 'help', { duration: 7, loop: true }),
          ],
        },
        {
          state: 'climax',
          actions: [
            activity('Chú xe ôm phố cổ', 'help', { duration: 3, loop: true }),
            activity('Du khách Phố Cổ 1', 'receiveItem', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Chú xe ôm phố cổ', 'wave', { duration: 2 }),
            activity('Du khách Phố Cổ 1', 'wave', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'old-quarter-delivery-handoff',
      name: 'Giao hàng cho chủ quán',
      momentType: 'delivery',
      location: 'Cửa hàng Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 51, y: 0, z: 36.5 },
      timeWindow: { start: 8 * 60, end: 17 * 60 + 30 },
      timingBonus: 1.3,
      npcIds: ['Người đi bộ ven hồ 1', 'Du khách Phố Cổ 2'],
      primarySubjectIds: ['Người đi bộ ven hồ 1', 'Du khách Phố Cổ 2'],
      propIds: ['old-quarter-delivery-bag'],
      stagingPoints: [
        { id: 'old-quarter-delivery-start', position: [47.5, 0, 36.5], yaw: Math.PI / 2 },
        { id: 'old-quarter-shop-owner', position: [52.8, 0, 35.5], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Người đi bộ ven hồ 1', stagingId: 'old-quarter-delivery-start' },
        { actorId: 'Du khách Phố Cổ 2', stagingId: 'old-quarter-shop-owner' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            attachProp('Người đi bộ ven hồ 1', 'shoppingBag', 'old-quarter-delivery-bag'),
            activity('Du khách Phố Cổ 2', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            route('Người đi bộ ven hồ 1', [[47.5, 0, 36.5], [50, 0, 36.5], [52, 0, 35.7]]),
            activity('Người đi bộ ven hồ 1', 'walk', { duration: 7, loop: true, speed: 0.9 }),
            activity('Du khách Phố Cổ 2', 'receiveItem', { duration: 7, loop: true }),
          ],
        },
        {
          state: 'climax',
          actions: [
            transferProp('Người đi bộ ven hồ 1', 'Du khách Phố Cổ 2', 'old-quarter-delivery-bag'),
            activity('Người đi bộ ven hồ 1', 'giveItem', { duration: 3, loop: true }),
            activity('Du khách Phố Cổ 2', 'receiveItem', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Người đi bộ ven hồ 1', 'wave', { duration: 2 }),
            activity('Du khách Phố Cổ 2', 'wave', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'old-quarter-shop-bag-handoff',
      name: 'Trao túi đồ cho khách',
      momentType: 'shop-handoff',
      location: 'Dãy cửa hàng Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 59, y: 0, z: 35.5 },
      timeWindow: { start: 9 * 60, end: 21 * 60 },
      timingBonus: 1.25,
      npcIds: ['Cô Hương', 'Khách uống trà ven hồ'],
      primarySubjectIds: ['Cô Hương', 'Khách uống trà ven hồ'],
      propIds: ['old-quarter-shopping-bag'],
      stagingPoints: [
        { id: 'old-quarter-seller-stage', position: [58.2, 0, 35.2], yaw: Math.PI / 2 },
        { id: 'old-quarter-customer-stage', position: [59.7, 0, 35.2], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Cô Hương', stagingId: 'old-quarter-seller-stage' },
        { actorId: 'Khách uống trà ven hồ', stagingId: 'old-quarter-customer-stage' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            attachProp('Cô Hương', 'shoppingBag', 'old-quarter-shopping-bag'),
            activity('Cô Hương', 'idle', { duration: 3 }),
            activity('Khách uống trà ven hồ', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Cô Hương', 'giveItem', { duration: 7, loop: true }),
            activity('Khách uống trà ven hồ', 'receiveItem', { duration: 7, loop: true }),
          ],
        },
        {
          state: 'climax',
          actions: [
            transferProp('Cô Hương', 'Khách uống trà ven hồ', 'old-quarter-shopping-bag'),
            activity('Cô Hương', 'giveItem', { duration: 3, loop: true }),
            activity('Khách uống trà ven hồ', 'receiveItem', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Cô Hương', 'wave', { duration: 2 }),
            activity('Khách uống trà ven hồ', 'wave', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'old-quarter-open-awning',
      name: 'Kéo mái hiên mở quán',
      momentType: 'open-awning',
      location: 'Mặt tiền quán Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 49.35, y: 0, z: 31.85 },
      triggerRadius: 4.5,
      timeWindow: { start: 6 * 60 + 30, end: 9 * 60 },
      timingBonus: 1.2,
      npcIds: ['Người đi bộ ven hồ 2'],
      primarySubjectIds: ['Người đi bộ ven hồ 2'],
      interactionPointIds: ['old-quarter-awning-front'],
      stagingPoints: [
        {
          id: 'old-quarter-awning-stage',
          position: [49.35, 0, 31.85],
          yaw: Math.PI,
        },
      ],
      initialStaging: [
        { actorId: 'Người đi bộ ven hồ 2', stagingId: 'old-quarter-awning-stage' },
      ],
      timeline: [
        {
          state: 'preparing',
          actorId: 'Người đi bộ ven hồ 2',
          activity: { id: 'point', duration: 2 },
        },
        {
          state: 'active',
          actorId: 'Người đi bộ ven hồ 2',
          activity: { id: 'openAwning', duration: 7, loop: true },
        },
        {
          state: 'climax',
          actorId: 'Người đi bộ ven hồ 2',
          activity: { id: 'openAwning', duration: 3, loop: true },
        },
        {
          state: 'ending',
          actorId: 'Người đi bộ ven hồ 2',
          activity: { id: 'idle', duration: 2 },
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'old-quarter-street-greeting',
      name: 'Hai người dừng lại chào nhau',
      momentType: 'street-greeting',
      location: 'Ngõ Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 44, y: 0, z: 27 },
      timeWindow: { start: 7 * 60, end: 20 * 60 },
      timingBonus: 1.2,
      npcIds: ['Đôi bạn bên hồ 1', 'Đôi bạn bên hồ 2'],
      primarySubjectIds: ['Đôi bạn bên hồ 1', 'Đôi bạn bên hồ 2'],
      stagingPoints: [
        { id: 'old-quarter-greeting-left', position: [43.3, 0, 27], yaw: Math.PI / 2 },
        { id: 'old-quarter-greeting-right', position: [44.7, 0, 27], yaw: -Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Đôi bạn bên hồ 1', stagingId: 'old-quarter-greeting-left' },
        { actorId: 'Đôi bạn bên hồ 2', stagingId: 'old-quarter-greeting-right' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            activity('Đôi bạn bên hồ 1', 'idle', { duration: 3 }),
            activity('Đôi bạn bên hồ 2', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Đôi bạn bên hồ 1', 'wave', { duration: 7, loop: true }),
            activity('Đôi bạn bên hồ 2', 'wave', { duration: 7, loop: true }),
          ],
        },
        {
          state: 'climax',
          actions: [
            activity('Đôi bạn bên hồ 1', 'wave', { duration: 3, loop: true }),
            activity('Đôi bạn bên hồ 2', 'wave', { duration: 3, loop: true }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Đôi bạn bên hồ 1', 'idle', { duration: 2 }),
            activity('Đôi bạn bên hồ 2', 'idle', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'old-quarter-cafe-street-layers',
      name: 'Nhịp sống trong quán và ngoài phố',
      momentType: 'layered-street-life',
      location: 'Quán cà phê Phố Cổ',
      region: OFFICIAL_MOMENT_REGIONS.OLD_QUARTER,
      position: { x: 64, y: 0, z: 35 },
      triggerRadius: 5.5,
      pauseDistance: 8.5,
      timeWindow: { start: 7 * 60, end: 21 * 60 + 30 },
      timingBonus: 1.3,
      npcIds: ['Khách quen của Cô Hương', 'Người chạy bộ ven hồ 1'],
      primarySubjectIds: ['Khách quen của Cô Hương', 'Người chạy bộ ven hồ 1'],
      propIds: ['old-quarter-cafe-cup'],
      stagingPoints: [
        {
          id: 'old-quarter-cafe-seat',
          position: [63.9, 0.22, 32.56],
          yaw: 0,
        },
        { id: 'old-quarter-street-passerby', position: [61, 0, 36.5], yaw: Math.PI / 2 },
      ],
      initialStaging: [
        { actorId: 'Khách quen của Cô Hương', stagingId: 'old-quarter-cafe-seat' },
        { actorId: 'Người chạy bộ ven hồ 1', stagingId: 'old-quarter-street-passerby' },
      ],
      timeline: [
        {
          state: 'preparing',
          actions: [
            activity('Khách quen của Cô Hương', 'sit', { duration: 3 }),
            activity('Người chạy bộ ven hồ 1', 'idle', { duration: 3 }),
          ],
        },
        {
          state: 'active',
          actions: [
            activity('Khách quen của Cô Hương', 'drink', {
              duration: 7,
              loop: true,
              props: [{ type: 'cup', id: 'old-quarter-cafe-cup' }],
            }),
            route('Người chạy bộ ven hồ 1', [[61, 0, 36.5], [64, 0, 36.5], [67, 0, 36.5]]),
            activity('Người chạy bộ ven hồ 1', 'walk', {
              duration: 7,
              loop: true,
              speed: 0.72,
            }),
          ],
        },
        {
          state: 'climax',
          actions: [
            activity('Khách quen của Cô Hương', 'drink', {
              duration: 3,
              loop: true,
              props: [{ type: 'cup', id: 'old-quarter-cafe-cup' }],
            }),
            activity('Người chạy bộ ven hồ 1', 'walk', {
              duration: 3,
              loop: true,
              speed: 0.72,
            }),
          ],
        },
        {
          state: 'ending',
          actions: [
            activity('Khách quen của Cô Hương', 'sit', { duration: 2 }),
            activity('Người chạy bộ ven hồ 1', 'idle', { duration: 2 }),
          ],
        },
      ],
      resolveNpc,
    }),
  ]
}

export function createChurchOldQuarterMoments({ resolveNpc } = {}) {
  return Object.freeze([
    ...churchMoments(resolveNpc),
    ...oldQuarterMoments(resolveNpc),
  ])
}

export function registerChurchOldQuarterMoments(momentSystem, options = {}) {
  const definitions = createChurchOldQuarterMoments(options)
  definitions.forEach((definition) => momentSystem.registerMoment(definition))
  return definitions
}
