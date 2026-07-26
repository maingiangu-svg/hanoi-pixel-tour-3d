import { createMultiActorMoment } from './MomentTemplates.js'

export const PEDESTRIAN_MOMENT_REGION = 'pedestrianDistrict'

const SMALL_DURATIONS = Object.freeze({
  preparing: 2,
  starting: 3,
  active: 6,
  climax: 2.5,
  ending: 3,
})

const LARGE_DURATIONS = Object.freeze({
  preparing: 3,
  starting: 4,
  active: 8,
  climax: 3,
  ending: 4,
})

const CAPACITY = Object.freeze({
  performance: 'pedestrian-capacity-performance',
  portrait: 'pedestrian-capacity-portrait',
  photo: 'pedestrian-capacity-photo',
  iceCream: 'pedestrian-capacity-ice-cream',
})

const activity = (actorId, id, options = {}) => ({
  type: 'activities',
  actorId,
  activities: [{ id, ...options }],
})

const attachProp = (actorId, propType, id, options = {}) => ({
  type: 'attachProp',
  actorId,
  propType,
  options: { id, ...options },
})

const transferProp = (actorId, recipientId, propId) => ({
  type: 'transferProp',
  actorId,
  recipientId,
  propId,
})

const route = (actorId, waypoints) => ({
  type: 'route',
  actorId,
  waypoints,
  loop: false,
})

const cue = (state, actions) => ({ state, actions })

function createPedestrianMoment(config) {
  return createMultiActorMoment({
    area: 'outdoor',
    region: PEDESTRIAN_MOMENT_REGION,
    triggerRadius: 8,
    pauseDistance: 13,
    cleanupDistance: 20,
    durations: SMALL_DURATIONS,
    cooldown: 70,
    maxRepeats: Infinity,
    priority: 22,
    typeCooldown: 10,
    resourceFailurePolicy: 'wait',
    exclusionRadius: 5,
    metadata: {
      official: true,
      pedestrianMoment: true,
      location: config.location,
      variant: config.variant ?? null,
    },
    ...config,
  })
}

function streetDance(resolveNpc) {
  const dancers = [
    'Vũ công phố đi bộ 1',
    'Vũ công phố đi bộ 2',
    'Vũ công phố đi bộ 3',
  ]
  const audience = ['Khán giả nhảy 1', 'Khán giả nhảy 2']
  const recorders = [
    'Người quay video phố đi bộ 1',
    'Người quay video phố đi bộ 2',
  ]
  const child = 'Em nhỏ bắt chước vũ công'
  const npcIds = [...dancers, ...audience, ...recorders, child]

  return createPedestrianMoment({
    id: 'pedestrian-street-dance',
    name: 'Nhóm nhảy đường phố',
    momentType: 'street-dance',
    location: 'Sân biểu diễn phố đi bộ',
    position: { x: 66, y: 0, z: 122 },
    triggerRadius: 11,
    pauseDistance: 17,
    cleanupDistance: 25,
    durations: LARGE_DURATIONS,
    timeWindow: { start: 17 * 60, end: 21 * 60 + 30 },
    cooldown: 95,
    priority: 34,
    timingBonus: 1.6,
    npcIds,
    primarySubjectIds: [...dancers, child],
    propIds: [
      'pedestrian-dance-phone-1',
      'pedestrian-dance-phone-2',
    ],
    audioChannelIds: ['pedestrian-street-performance-music'],
    // Holding every zone-capacity lock makes this the sole large event.
    performanceAreaIds: Object.values(CAPACITY),
    stagingPoints: [
      { id: 'dance-left', position: [62, 0, 111], yaw: 0 },
      { id: 'dance-center', position: [66, 0, 110], yaw: 0 },
      { id: 'dance-right', position: [70, 0, 111], yaw: 0 },
      { id: 'dance-audience-left-start', position: [55, 0, 122], yaw: Math.PI },
      { id: 'dance-audience-right-start', position: [77, 0, 122], yaw: Math.PI },
      { id: 'dance-recorder-left', position: [58, 0, 118], yaw: Math.PI },
      { id: 'dance-recorder-right', position: [74, 0, 118], yaw: Math.PI },
      { id: 'dance-child-start', position: [72, 0, 123], yaw: Math.PI },
    ],
    initialStaging: [
      { actorId: dancers[0], stagingId: 'dance-left' },
      { actorId: dancers[1], stagingId: 'dance-center' },
      { actorId: dancers[2], stagingId: 'dance-right' },
      { actorId: audience[0], stagingId: 'dance-audience-left-start' },
      { actorId: audience[1], stagingId: 'dance-audience-right-start' },
      { actorId: recorders[0], stagingId: 'dance-recorder-left' },
      { actorId: recorders[1], stagingId: 'dance-recorder-right' },
      { actorId: child, stagingId: 'dance-child-start' },
    ],
    timeline: [
      cue('preparing', [
        ...dancers.map((id) => activity(id, 'pose', { duration: 4, loop: true })),
        ...audience.map((id) => activity(id, 'idle', { duration: 4, loop: true })),
        ...recorders.map((id) => activity(id, 'idle', { duration: 4, loop: true })),
        activity(child, 'idle', { duration: 4, loop: true }),
      ]),
      cue('starting', [
        route(audience[0], [[55, 0, 122], [59, 0, 118]]),
        route(audience[1], [[77, 0, 122], [73, 0, 118]]),
        route(child, [[72, 0, 123], [70, 0, 117]]),
        ...audience.map((id) => activity(id, 'walk', {
          duration: 5,
          loop: true,
          speed: 1.15,
        })),
        activity(child, 'walk', { duration: 5, loop: true, speed: 1.15 }),
        ...dancers.map((id) => activity(id, 'dance', {
          duration: 5,
          loop: true,
        })),
      ]),
      cue('active', [
        ...dancers.map((id, index) => activity(id, 'dance', {
          duration: 9,
          loop: true,
          speed: 1 + index * 0.08,
        })),
        ...audience.map((id) => activity(id, 'clap', { duration: 9, loop: true })),
        ...recorders.map((id, index) => activity(id, 'recordVideo', {
          duration: 9,
          loop: true,
          props: [{
            type: 'phone',
            id: `pedestrian-dance-phone-${index + 1}`,
          }],
        })),
        activity(child, 'dance', { duration: 9, loop: true, speed: 0.82 }),
      ]),
      cue('climax', [
        ...dancers.map((id) => activity(id, 'dance', {
          duration: 4,
          loop: true,
          speed: 1.45,
        })),
        ...audience.map((id) => activity(id, 'clap', {
          duration: 4,
          loop: true,
          speed: 1.4,
        })),
        ...recorders.map((id, index) => activity(id, 'recordVideo', {
          duration: 4,
          loop: true,
          props: [{
            type: 'phone',
            id: `pedestrian-dance-phone-${index + 1}`,
          }],
        })),
        activity(child, 'dance', { duration: 4, loop: true, speed: 1.35 }),
      ]),
      cue('ending', [
        ...dancers.map((id) => activity(id, 'wave', { duration: 4 })),
        ...audience.map((id) => activity(id, 'clap', { duration: 4, loop: true })),
        ...recorders.map((id, index) => activity(id, 'viewPhoto', {
          duration: 4,
          props: [{
            type: 'phone',
            id: `pedestrian-dance-phone-${index + 1}`,
          }],
        })),
        activity(child, 'clap', { duration: 4, loop: true }),
      ]),
    ],
    resolveNpc,
  })
}

function portraitSession(resolveNpc) {
  const artist = 'Họa sĩ chân dung phố đi bộ'
  const model = 'Khách làm mẫu chân dung'
  const viewers = ['Người xem vẽ 1', 'Người xem vẽ 2']
  return createPedestrianMoment({
    id: 'pedestrian-portrait-session',
    name: 'Vẽ và trao tranh chân dung',
    momentType: 'portrait-drawing',
    location: 'Khu vẽ chân dung phố đi bộ',
    position: { x: 30, y: 0, z: 99 },
    timeWindow: { start: 8 * 60, end: 18 * 60 + 30 },
    timingBonus: 1.45,
    npcIds: [artist, model, ...viewers],
    primarySubjectIds: [artist, model],
    propIds: ['pedestrian-finished-portrait', 'pedestrian-portrait-pencil'],
    performanceAreaIds: [CAPACITY.portrait],
    stagingPoints: [
      { id: 'portrait-artist', position: [27, 0, 91], yaw: Math.PI / 2 },
      { id: 'portrait-model-start', position: [35, 0, 96], yaw: -Math.PI / 2 },
      { id: 'portrait-viewer-left', position: [27, 0, 96], yaw: Math.PI },
      { id: 'portrait-viewer-right', position: [33, 0, 97], yaw: Math.PI },
    ],
    initialStaging: [
      { actorId: artist, stagingId: 'portrait-artist' },
      { actorId: model, stagingId: 'portrait-model-start' },
      { actorId: viewers[0], stagingId: 'portrait-viewer-left' },
      { actorId: viewers[1], stagingId: 'portrait-viewer-right' },
    ],
    timeline: [
      cue('preparing', [
        attachProp(artist, 'drawingBoard', 'pedestrian-finished-portrait'),
        activity(artist, 'idle', { duration: 3 }),
        activity(model, 'idle', { duration: 3 }),
        ...viewers.map((id) => activity(id, 'idle', { duration: 3 })),
      ]),
      cue('starting', [
        route(model, [[35, 0, 96], [31, 0.15, 92]]),
        activity(model, 'walk', { duration: 4, loop: true, speed: 1.1 }),
        activity(artist, 'pose', { duration: 4, loop: true }),
        ...viewers.map((id) => activity(id, 'point', { duration: 4 })),
      ]),
      cue('active', [
        activity(model, 'sit', { duration: 7, loop: true }),
        activity(artist, 'draw', {
          duration: 7,
          loop: true,
          props: [{
            type: 'pencil',
            id: 'pedestrian-portrait-pencil',
          }],
        }),
        ...viewers.map((id) => activity(id, 'pose', { duration: 7, loop: true })),
      ]),
      cue('climax', [
        transferProp(artist, model, 'pedestrian-finished-portrait'),
        activity(artist, 'giveItem', { duration: 3, loop: true }),
        activity(model, 'receiveItem', { duration: 3, loop: true }),
        ...viewers.map((id) => activity(id, 'clap', { duration: 3, loop: true })),
      ]),
      cue('ending', [
        activity(artist, 'wave', { duration: 3 }),
        activity(model, 'viewPhoto', { duration: 3, props: [] }),
        ...viewers.map((id) => activity(id, 'clap', { duration: 3, loop: true })),
      ]),
    ],
    resolveNpc,
  })
}

function groupPhoto(resolveNpc) {
  const group = [
    'Bạn chụp ảnh nhóm 1',
    'Bạn chụp ảnh nhóm 2',
    'Bạn chụp ảnh nhóm 3',
  ]
  const photographer = 'Người cầm máy nhóm bạn'
  return createPedestrianMoment({
    id: 'pedestrian-group-photo',
    name: 'Nhóm bạn tự chụp ảnh',
    momentType: 'group-photo',
    location: 'Khu chụp ảnh phố đi bộ',
    variant: 'friends',
    position: { x: 165, y: 0, z: 51 },
    timeWindow: { start: 9 * 60, end: 20 * 60 + 30 },
    timingBonus: 1.4,
    npcIds: [...group, photographer],
    primarySubjectIds: group,
    propIds: ['pedestrian-group-camera', 'pedestrian-group-review-phone'],
    performanceAreaIds: [CAPACITY.photo],
    stagingPoints: [
      { id: 'group-photo-left', position: [161.5, 0, 44], yaw: Math.PI },
      { id: 'group-photo-center', position: [165, 0, 43.5], yaw: Math.PI },
      { id: 'group-photo-right', position: [168.5, 0, 44], yaw: Math.PI },
      { id: 'group-photo-camera', position: [165, 0, 49], yaw: 0 },
    ],
    initialStaging: [
      { actorId: group[0], stagingId: 'group-photo-left' },
      { actorId: group[1], stagingId: 'group-photo-center' },
      { actorId: group[2], stagingId: 'group-photo-right' },
      { actorId: photographer, stagingId: 'group-photo-camera' },
    ],
    timeline: [
      cue('preparing', [
        attachProp(photographer, 'camera', 'pedestrian-group-camera'),
        ...group.map((id) => activity(id, 'point', { duration: 3 })),
        activity(photographer, 'idle', { duration: 3 }),
      ]),
      cue('starting', [
        ...group.map((id) => activity(id, 'pose', { duration: 4, loop: true })),
        activity(photographer, 'takePhoto', {
          duration: 4,
          loop: true,
          props: [],
        }),
      ]),
      cue('active', [
        ...group.map((id) => activity(id, 'pose', { duration: 7, loop: true })),
        activity(photographer, 'takePhoto', {
          duration: 7,
          loop: true,
          props: [],
        }),
      ]),
      cue('climax', [
        ...group.map((id) => activity(id, 'pose', { duration: 3, loop: true })),
        activity(photographer, 'takePhoto', {
          duration: 3,
          loop: true,
          props: [],
        }),
      ]),
      cue('ending', [
        activity(group[0], 'viewPhoto', {
          duration: 4,
          props: [{
            type: 'phone',
            id: 'pedestrian-group-review-phone',
          }],
        }),
        activity(group[1], 'clap', { duration: 4, loop: true }),
        activity(group[2], 'wave', { duration: 4 }),
        activity(photographer, 'viewPhoto', { duration: 4, props: [] }),
      ]),
    ],
    resolveNpc,
  })
}

function strangerPhoto(resolveNpc) {
  const family = [
    'Khách chụp ảnh cùng gia đình 1',
    'Khách chụp ảnh cùng gia đình 2',
    'Khách chụp ảnh cùng gia đình 3',
  ]
  const stranger = 'Người lạ giúp chụp ảnh'
  return createPedestrianMoment({
    id: 'pedestrian-stranger-photo-help',
    name: 'Người lạ giúp gia đình chụp ảnh',
    momentType: 'stranger-assisted-photo',
    location: 'Khu chụp ảnh phố đi bộ',
    variant: 'stranger-assisted',
    position: { x: 165, y: 0, z: 51 },
    timeWindow: { start: 9 * 60 + 30, end: 20 * 60 },
    timingBonus: 1.5,
    npcIds: [...family, stranger],
    primarySubjectIds: family,
    propIds: ['pedestrian-stranger-camera', 'pedestrian-family-review-phone'],
    performanceAreaIds: [CAPACITY.photo],
    stagingPoints: [
      { id: 'family-photo-left', position: [161.8, 0, 44], yaw: Math.PI },
      { id: 'family-photo-center', position: [165, 0, 43.7], yaw: Math.PI },
      { id: 'family-photo-right', position: [168.2, 0, 44], yaw: Math.PI },
      { id: 'family-photo-stranger', position: [165, 0, 49], yaw: 0 },
    ],
    initialStaging: [
      { actorId: family[0], stagingId: 'family-photo-left' },
      { actorId: family[1], stagingId: 'family-photo-center' },
      { actorId: family[2], stagingId: 'family-photo-right' },
      { actorId: stranger, stagingId: 'family-photo-stranger' },
    ],
    timeline: [
      cue('preparing', [
        attachProp(family[0], 'camera', 'pedestrian-stranger-camera'),
        activity(family[0], 'giveItem', { duration: 3 }),
        activity(stranger, 'receiveItem', { duration: 3 }),
        ...family.slice(1).map((id) => activity(id, 'idle', { duration: 3 })),
      ]),
      cue('starting', [
        transferProp(family[0], stranger, 'pedestrian-stranger-camera'),
        ...family.map((id) => activity(id, 'pose', { duration: 4, loop: true })),
        activity(stranger, 'takePhoto', {
          duration: 4,
          loop: true,
          props: [],
        }),
      ]),
      cue('active', [
        ...family.map((id) => activity(id, 'pose', { duration: 7, loop: true })),
        activity(stranger, 'takePhoto', {
          duration: 7,
          loop: true,
          props: [],
        }),
      ]),
      cue('climax', [
        ...family.map((id) => activity(id, 'pose', { duration: 3, loop: true })),
        activity(stranger, 'takePhoto', {
          duration: 3,
          loop: true,
          props: [],
        }),
      ]),
      cue('ending', [
        activity(family[0], 'viewPhoto', {
          duration: 4,
          props: [{
            type: 'phone',
            id: 'pedestrian-family-review-phone',
          }],
        }),
        activity(family[1], 'clap', { duration: 4, loop: true }),
        activity(family[2], 'wave', { duration: 4 }),
        activity(stranger, 'wave', { duration: 4 }),
      ]),
    ],
    resolveNpc,
  })
}

function parentChildIceCream(resolveNpc) {
  const vendor = 'Người bán kem cho gia đình'
  const parent = 'Phụ huynh mua kem'
  const child = 'Em nhỏ nhận kem'
  const waiting = 'Khách xếp hàng mua kem'
  return createPedestrianMoment({
    id: 'pedestrian-ice-cream-parent-child',
    name: 'Cha mẹ đưa kem cho con',
    momentType: 'ice-cream-parent-child',
    location: 'Khu bán kem phố đi bộ',
    variant: 'parent-child',
    position: { x: 195, y: 0, z: -99 },
    timeWindow: { start: 14 * 60, end: 21 * 60 + 30 },
    timingBonus: 1.4,
    npcIds: [vendor, parent, child, waiting],
    primarySubjectIds: [parent, child],
    propIds: ['pedestrian-child-ice-cream'],
    performanceAreaIds: [CAPACITY.iceCream],
    stagingPoints: [
      { id: 'ice-family-vendor', position: [195, 0, -108], yaw: 0 },
      { id: 'ice-family-parent', position: [195, 0, -105], yaw: Math.PI },
      { id: 'ice-family-child', position: [193.6, 0, -103], yaw: Math.PI },
      { id: 'ice-family-waiting', position: [197, 0, -102], yaw: Math.PI },
    ],
    initialStaging: [
      { actorId: vendor, stagingId: 'ice-family-vendor' },
      { actorId: parent, stagingId: 'ice-family-parent' },
      { actorId: child, stagingId: 'ice-family-child' },
      { actorId: waiting, stagingId: 'ice-family-waiting' },
    ],
    timeline: [
      cue('preparing', [
        attachProp(vendor, 'iceCream', 'pedestrian-child-ice-cream'),
        activity(vendor, 'pose', { duration: 3 }),
        activity(parent, 'point', { duration: 3 }),
        activity(child, 'idle', { duration: 3 }),
        activity(waiting, 'idle', { duration: 3 }),
      ]),
      cue('starting', [
        activity(vendor, 'giveItem', { duration: 4, loop: true }),
        activity(parent, 'receiveItem', { duration: 4, loop: true }),
        activity(child, 'pose', { duration: 4, loop: true }),
        activity(waiting, 'idle', { duration: 4, loop: true }),
      ]),
      cue('active', [
        transferProp(vendor, parent, 'pedestrian-child-ice-cream'),
        activity(vendor, 'giveItem', { duration: 7, loop: true }),
        activity(parent, 'receiveItem', { duration: 7, loop: true }),
        activity(child, 'clap', { duration: 7, loop: true }),
        activity(waiting, 'point', { duration: 7 }),
      ]),
      cue('climax', [
        transferProp(parent, child, 'pedestrian-child-ice-cream'),
        activity(parent, 'giveItem', { duration: 3, loop: true }),
        activity(child, 'receiveItem', { duration: 3, loop: true }),
        activity(vendor, 'clap', { duration: 3, loop: true }),
        activity(waiting, 'wave', { duration: 3 }),
      ]),
      cue('ending', [
        activity(parent, 'wave', { duration: 3 }),
        activity(child, 'pose', { duration: 3, loop: true }),
        activity(vendor, 'idle', { duration: 3 }),
        activity(waiting, 'idle', { duration: 3 }),
      ]),
    ],
    resolveNpc,
  })
}

function coupleIceCream(resolveNpc) {
  const vendor = 'Người bán kem cho cặp đôi'
  const couple = [
    'Người trong cặp đôi ăn kem 1',
    'Người trong cặp đôi ăn kem 2',
  ]
  const waiting = 'Khách chờ mua kem'
  return createPedestrianMoment({
    id: 'pedestrian-ice-cream-couple',
    name: 'Cặp đôi chia kem',
    momentType: 'ice-cream-couple',
    location: 'Khu bán kem phố đi bộ',
    variant: 'couple-sharing',
    position: { x: 195, y: 0, z: -99 },
    timeWindow: { start: 15 * 60, end: 21 * 60 + 30 },
    timingBonus: 1.35,
    npcIds: [vendor, ...couple, waiting],
    primarySubjectIds: couple,
    propIds: ['pedestrian-couple-ice-cream'],
    performanceAreaIds: [CAPACITY.iceCream],
    stagingPoints: [
      { id: 'ice-couple-vendor', position: [195, 0, -108], yaw: 0 },
      { id: 'ice-couple-buyer', position: [194.2, 0, -105], yaw: Math.PI },
      { id: 'ice-couple-partner', position: [196, 0, -103.5], yaw: Math.PI },
      { id: 'ice-couple-waiting', position: [198, 0, -102], yaw: Math.PI },
    ],
    initialStaging: [
      { actorId: vendor, stagingId: 'ice-couple-vendor' },
      { actorId: couple[0], stagingId: 'ice-couple-buyer' },
      { actorId: couple[1], stagingId: 'ice-couple-partner' },
      { actorId: waiting, stagingId: 'ice-couple-waiting' },
    ],
    timeline: [
      cue('preparing', [
        attachProp(vendor, 'iceCream', 'pedestrian-couple-ice-cream'),
        activity(vendor, 'pose', { duration: 3 }),
        activity(couple[0], 'point', { duration: 3 }),
        activity(couple[1], 'idle', { duration: 3 }),
        activity(waiting, 'idle', { duration: 3 }),
      ]),
      cue('starting', [
        activity(vendor, 'giveItem', { duration: 4, loop: true }),
        activity(couple[0], 'receiveItem', { duration: 4, loop: true }),
        activity(couple[1], 'pose', { duration: 4, loop: true }),
        activity(waiting, 'idle', { duration: 4, loop: true }),
      ]),
      cue('active', [
        transferProp(vendor, couple[0], 'pedestrian-couple-ice-cream'),
        activity(vendor, 'giveItem', { duration: 7, loop: true }),
        activity(couple[0], 'receiveItem', { duration: 7, loop: true }),
        activity(couple[1], 'clap', { duration: 7, loop: true }),
        activity(waiting, 'point', { duration: 7 }),
      ]),
      cue('climax', [
        transferProp(couple[0], couple[1], 'pedestrian-couple-ice-cream'),
        activity(couple[0], 'giveItem', { duration: 3, loop: true }),
        activity(couple[1], 'receiveItem', { duration: 3, loop: true }),
        activity(vendor, 'clap', { duration: 3, loop: true }),
        activity(waiting, 'wave', { duration: 3 }),
      ]),
      cue('ending', [
        ...couple.map((id) => activity(id, 'pose', { duration: 3, loop: true })),
        activity(vendor, 'idle', { duration: 3 }),
        activity(waiting, 'idle', { duration: 3 }),
      ]),
    ],
    resolveNpc,
  })
}

export function createPedestrianMoments({ resolveNpc } = {}) {
  return Object.freeze([
    streetDance(resolveNpc),
    portraitSession(resolveNpc),
    groupPhoto(resolveNpc),
    strangerPhoto(resolveNpc),
    parentChildIceCream(resolveNpc),
    coupleIceCream(resolveNpc),
  ])
}

export function registerPedestrianMoments(momentSystem, options = {}) {
  const definitions = createPedestrianMoments(options)
  definitions.forEach((definition) => momentSystem.registerMoment(definition))
  return definitions
}
