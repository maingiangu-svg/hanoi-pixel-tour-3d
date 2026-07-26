import {
  createMultiActorMoment,
  createSimpleMoment,
} from './MomentTemplates.js'
import { SCENIC_MOMENT_CAST_GROUPS } from '../npcs/scenicMomentCast.js'

export const SCENIC_MOMENT_REGIONS = Object.freeze({
  lake: 'hoanKiemDistrict',
  bridge: 'theHucBridge',
  temple: 'ngocSonTemple',
})

const DURATIONS = Object.freeze({
  preparing: 2,
  starting: 2.5,
  active: 6,
  climax: 2.5,
  ending: 3,
})

const CAPACITY = Object.freeze({
  lakeWest: 'lake-moment-capacity-west',
  lakeEast: 'lake-moment-capacity-east',
  bridge: 'the-huc-moment-capacity',
  temple: 'ngoc-son-moment-capacity',
})

const names = (groupId) => (
  SCENIC_MOMENT_CAST_GROUPS[groupId].map(({ name }) => name)
)

const activity = (actorId, id, options = {}) => ({
  type: 'activities',
  actorId,
  activities: [{ id, ...options }],
})

const route = (actorId, waypoints) => ({
  type: 'route',
  actorId,
  waypoints,
  loop: false,
})

const cue = (state, actions) => ({ state, actions })

function createOfficialMoment(config) {
  const stagingPoints = config.stages.map((stage, index) => ({
    id: `${config.id}-stage-${index + 1}`,
    position: stage.slice(0, 3),
    yaw: stage[3] ?? null,
  }))
  const definition = {
    area: 'outdoor',
    triggerRadius: 6.5,
    pauseDistance: 11,
    cleanupDistance: 18,
    durations: DURATIONS,
    cooldown: 65,
    maxRepeats: Infinity,
    priority: 27,
    typeCooldown: 8,
    resourceFailurePolicy: 'wait',
    exclusionRadius: 4.5,
    photoType: config.actors.length > 1 ? 'people-people' : 'people-scene',
    metadata: {
      official: true,
      scenicMoment: true,
      location: config.location,
      quiet: config.region === SCENIC_MOMENT_REGIONS.temple,
    },
    ...config,
    npcIds: config.actors,
    stagingPoints,
    initialStaging: config.actors.map((actorId, index) => ({
      actorId,
      stagingId: stagingPoints[index].id,
    })),
  }
  delete definition.actors
  delete definition.stages
  const factory = config.actors.length <= 2
    ? createSimpleMoment
    : createMultiActorMoment
  return factory(definition)
}

function lakeMoments(resolveNpc) {
  const exercise = names('lakeExercise')
  const elderly = names('lakeElderlyCouple')
  const runner = names('lakeRunner')[0]
  const children = names('lakeBirdChildren')
  const family = names('lakeFamily')
  const photoGroup = names('lakePhotoHelp')
  const reader = names('lakeReader')[0]
  const sunsetCouple = names('lakeSunsetCouple')

  return [
    createOfficialMoment({
      id: 'lake-morning-exercise',
      name: 'Nhóm tập thể dục buổi sáng',
      momentType: 'morning-exercise',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Bờ tây Hồ Gươm',
      position: { x: 68, y: 0, z: -5.5 },
      timeWindow: { start: 5 * 60 + 30, end: 8 * 60 + 15 },
      timingBonus: 1.45,
      performanceAreaIds: [CAPACITY.lakeWest],
      actors: exercise,
      primarySubjectIds: exercise,
      stages: [
        [67, 0, -5.7, Math.PI / 2],
        [68.1, 0, -5.2, Math.PI / 2],
        [69.2, 0, -5.7, Math.PI / 2],
      ],
      timeline: [
        cue('preparing', exercise.map((id) => activity(id, 'idle', { duration: 3 }))),
        cue('starting', exercise.map((id) => activity(id, 'exercise', { duration: 3, speed: 0.75 }))),
        cue('active', exercise.map((id, index) => activity(id, 'exercise', {
          duration: 7, loop: true, speed: 0.9 + index * 0.08,
        }))),
        cue('climax', exercise.map((id) => activity(id, 'exercise', {
          duration: 3, loop: true, speed: 1.35,
        }))),
        cue('ending', exercise.map((id) => activity(id, 'wave', { duration: 3 }))),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-elderly-walk-and-sit',
      name: 'Cặp lớn tuổi đi bộ rồi ngồi ngắm hồ',
      momentType: 'elderly-lakeside-rest',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Ghế đá bờ tây Hồ Gươm',
      position: { x: 67, y: 0, z: 7 },
      timeWindow: { start: 6 * 60, end: 10 * 60 + 30 },
      timingBonus: 1.35,
      performanceAreaIds: [CAPACITY.lakeWest],
      actors: elderly,
      primarySubjectIds: elderly,
      stages: [[67, 0, 6.55, Math.PI / 2], [67, 0, 7.45, Math.PI / 2]],
      timeline: [
        cue('preparing', elderly.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
        cue('starting', elderly.flatMap((id, index) => [
          route(id, [[67, 0, 6.55 + index * 0.9], [67.8, 0, 6.55 + index * 0.9]]),
          activity(id, 'walk', { duration: 4, loop: true, speed: 0.8 }),
        ])),
        cue('active', elderly.map((id) => activity(id, 'sit', { duration: 7, loop: true }))),
        cue('climax', elderly.map((id) => activity(id, 'lookAtLandmark', {
          duration: 3, loop: true, target: { x: 103, y: 2.5, z: 0 },
        }))),
        cue('ending', elderly.map((id) => activity(id, 'idle', { duration: 3 }))),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-golden-light-runner',
      name: 'Người chạy qua vùng ánh sáng đẹp',
      momentType: 'golden-light-runner',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Bờ đông Hồ Gươm',
      position: { x: 135.5, y: 0, z: -15 },
      timeWindow: { start: 16 * 60 + 15, end: 18 * 60 + 20 },
      timingBonus: 1.55,
      performanceAreaIds: [CAPACITY.lakeEast],
      actors: [runner],
      primarySubjectIds: [runner],
      stages: [[135.5, 0, -23, 0]],
      timeline: [
        cue('preparing', [activity(runner, 'idle', { duration: 2 })]),
        cue('starting', [
          route(runner, [[135.5, 0, -23], [135.5, 0, 5]]),
          activity(runner, 'walk', { duration: 3, loop: true, speed: 1.5 }),
        ]),
        cue('active', [activity(runner, 'walk', { duration: 7, loop: true, speed: 1.8 })]),
        cue('climax', [activity(runner, 'walk', { duration: 3, loop: true, speed: 2 })]),
        cue('ending', [activity(runner, 'walk', { duration: 3, loop: true, speed: 1.1 })]),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-children-feed-birds',
      name: 'Trẻ em cho chim ăn',
      momentType: 'children-feed-birds',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Lối đi phía nam Hồ Gươm',
      position: { x: 89, y: 0, z: -36.4 },
      timeWindow: { start: 6 * 60 + 30, end: 10 * 60 },
      timingBonus: 1.5,
      performanceAreaIds: [CAPACITY.lakeEast],
      actors: children,
      primarySubjectIds: children,
      stages: [[88.3, 0, -36.2, 0], [89.7, 0, -36.2, 0]],
      timeline: [
        cue('preparing', children.map((id) => activity(id, 'point', { duration: 3 }))),
        cue('starting', children.map((id) => activity(id, 'feedBirds', { duration: 3, speed: 0.7 }))),
        cue('active', children.map((id) => activity(id, 'feedBirds', { duration: 7, loop: true }))),
        cue('climax', children.map((id) => activity(id, 'feedBirds', {
          duration: 3, loop: true, speed: 1.4,
        }))),
        cue('ending', children.map((id) => activity(id, 'clap', { duration: 3 }))),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-family-stroll',
      name: 'Gia đình đi dạo ven hồ',
      momentType: 'family-stroll',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Lối đi phía bắc Hồ Gươm',
      position: { x: 88, y: 0, z: 36.4 },
      timeWindow: { start: 9 * 60, end: 20 * 60 },
      timingBonus: 1.35,
      performanceAreaIds: [CAPACITY.lakeEast],
      actors: family,
      primarySubjectIds: family,
      stages: [[84, 0, 36.1, Math.PI / 2], [82.8, 0, 36.5, Math.PI / 2], [83.4, 0, 35.3, Math.PI / 2]],
      timeline: [
        cue('preparing', family.map((id) => activity(id, 'idle', { duration: 3 }))),
        cue('starting', family.flatMap((id, index) => [
          route(id, [[84 - index * 0.5, 0, 36.1 - index * 0.35], [91 - index * 0.45, 0, 36.1 - index * 0.35]]),
          activity(id, 'walk', { duration: 4, loop: true }),
        ])),
        cue('active', family.map((id) => activity(id, 'walk', { duration: 7, loop: true }))),
        cue('climax', [
          activity(family[0], 'point', { duration: 3 }),
          activity(family[1], 'lookAtLandmark', { duration: 3, target: { x: 103, y: 3, z: 0 } }),
          activity(family[2], 'wave', { duration: 3 }),
        ]),
        cue('ending', family.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-stranger-photo-help',
      name: 'Người lạ giúp chụp ảnh bên hồ',
      momentType: 'stranger-photo-help',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Điểm ngắm Tháp Rùa',
      position: { x: 68, y: 0, z: 1 },
      timeWindow: { start: 8 * 60, end: 20 * 60 + 30 },
      timingBonus: 1.5,
      performanceAreaIds: [CAPACITY.lakeWest],
      propIds: ['lake-photo-help-camera'],
      actors: photoGroup,
      primarySubjectIds: photoGroup,
      stages: [[68.4, 0, -0.3, Math.PI / 2], [68.4, 0, 1.2, Math.PI / 2], [65.3, 0, 0.45, -Math.PI / 2]],
      timeline: [
        cue('preparing', [
          activity(photoGroup[0], 'point', { duration: 3 }),
          activity(photoGroup[1], 'lookAtLandmark', { duration: 3, target: { x: 103, y: 2, z: 0 } }),
          activity(photoGroup[2], 'idle', { duration: 3 }),
        ]),
        cue('starting', [
          ...photoGroup.slice(0, 2).map((id) => activity(id, 'pose', { duration: 4, loop: true })),
          activity(photoGroup[2], 'takePhoto', {
            duration: 4, props: [{ type: 'camera', id: 'lake-photo-help-camera' }],
          }),
        ]),
        cue('active', [
          ...photoGroup.slice(0, 2).map((id) => activity(id, 'pose', { duration: 7, loop: true })),
          activity(photoGroup[2], 'takePhoto', {
            duration: 7, loop: true, props: [{ type: 'camera', id: 'lake-photo-help-camera' }],
          }),
        ]),
        cue('climax', [
          ...photoGroup.slice(0, 2).map((id) => activity(id, 'pose', { duration: 3, loop: true })),
          activity(photoGroup[2], 'takePhoto', {
            duration: 3, props: [{ type: 'camera', id: 'lake-photo-help-camera' }],
          }),
        ]),
        cue('ending', photoGroup.map((id) => activity(id, 'viewPhoto', { duration: 3 }))),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-bench-reader',
      name: 'Người đọc sách trên ghế',
      momentType: 'lakeside-reading',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Ghế đá bờ tây Hồ Gươm',
      position: { x: 68.2, y: 0, z: -11 },
      timeWindow: { start: 7 * 60, end: 17 * 60 + 30 },
      timingBonus: 1.25,
      performanceAreaIds: [CAPACITY.lakeWest],
      propIds: ['lake-reader-book'],
      actors: [reader],
      primarySubjectIds: [reader],
      stages: [[68.2, 0.2, -11, Math.PI / 2]],
      timeline: [
        cue('preparing', [activity(reader, 'sit', { duration: 3 })]),
        cue('starting', [activity(reader, 'read', {
          duration: 3, props: [{ type: 'book', id: 'lake-reader-book' }],
        })]),
        cue('active', [activity(reader, 'read', {
          duration: 7, loop: true, props: [{ type: 'book', id: 'lake-reader-book' }],
        })]),
        cue('climax', [activity(reader, 'read', {
          duration: 3, loop: true, props: [{ type: 'book', id: 'lake-reader-book' }],
        })]),
        cue('ending', [activity(reader, 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        })]),
      ],
      resolveNpc,
    }),
    createOfficialMoment({
      id: 'lake-sunset-couple',
      name: 'Cặp đôi ngắm hoàng hôn',
      momentType: 'sunset-couple',
      region: SCENIC_MOMENT_REGIONS.lake,
      location: 'Bờ tây Hồ Gươm',
      position: { x: 68.2, y: 0, z: 22 },
      timeWindow: { start: 16 * 60 + 45, end: 18 * 60 + 45 },
      timingBonus: 1.65,
      performanceAreaIds: [CAPACITY.lakeWest],
      actors: sunsetCouple,
      primarySubjectIds: sunsetCouple,
      stages: [[68.2, 0.2, 21.55, Math.PI / 2], [68.2, 0.2, 22.45, Math.PI / 2]],
      timeline: [
        cue('preparing', sunsetCouple.map((id) => activity(id, 'sit', { duration: 3 }))),
        cue('starting', sunsetCouple.map((id) => activity(id, 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        }))),
        cue('active', sunsetCouple.map((id) => activity(id, 'lookAtLandmark', {
          duration: 7, loop: true, target: { x: 103, y: 2.5, z: 0 },
        }))),
        cue('climax', [
          activity(sunsetCouple[0], 'point', { duration: 3 }),
          activity(sunsetCouple[1], 'lookAtLandmark', { duration: 3, target: { x: 103, y: 2.5, z: 0 } }),
        ]),
        cue('ending', sunsetCouple.map((id) => activity(id, 'sit', { duration: 3 }))),
      ],
      resolveNpc,
    }),
  ]
}

function bridgeMoments(resolveNpc) {
  const family = names('bridgeFamily')
  const help = names('bridgePhotoHelp')
  const couple = names('bridgeCouple')
  const railPhotographer = names('bridgeRailPhotographer')[0]
  const friends = names('bridgeFriends')
  const pointing = names('bridgePointing')
  const silhouette = names('bridgeSilhouette')[0]

  const bridgeMoment = (config) => createOfficialMoment({
    region: SCENIC_MOMENT_REGIONS.bridge,
    location: 'Cầu Thê Húc',
    performanceAreaIds: [CAPACITY.bridge],
    triggerRadius: 5.5,
    pauseDistance: 9,
    cleanupDistance: 14,
    ...config,
    resolveNpc,
  })

  return [
    bridgeMoment({
      id: 'bridge-family-pose',
      name: 'Gia đình bước lên cầu và tạo dáng',
      momentType: 'bridge-family-photo',
      position: { x: 119, y: 0.35, z: 36.2 },
      timeWindow: { start: 8 * 60, end: 18 * 60 },
      timingBonus: 1.5,
      actors: family,
      primarySubjectIds: family,
      stages: [[117.9, 0.29, 34.3, 0], [119, 0.29, 34.1, 0], [120.1, 0.29, 34.3, 0]],
      timeline: [
        cue('preparing', family.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
        cue('starting', family.flatMap((id, index) => [
          route(id, [[117.9 + index * 1.1, 0.29, index === 1 ? 34.1 : 34.3], [117.9 + index * 1.1, 0.36, index === 1 ? 36.1 : 35.9]]),
          activity(id, 'walk', { duration: 3, loop: true, speed: 1.4 }),
        ])),
        cue('active', family.map((id) => activity(id, 'pose', { duration: 7, loop: true }))),
        cue('climax', family.map((id) => activity(id, 'pose', { duration: 3, loop: true, speed: 1.2 }))),
        cue('ending', family.map((id) => activity(id, 'viewPhoto', { duration: 3 }))),
      ],
    }),
    bridgeMoment({
      id: 'bridge-stranger-photo-help',
      name: 'Người lạ giúp du khách chụp ảnh',
      momentType: 'bridge-stranger-photo-help',
      position: { x: 119, y: 0.45, z: 38.5 },
      timeWindow: { start: 8 * 60, end: 19 * 60 },
      timingBonus: 1.55,
      propIds: ['bridge-help-camera'],
      actors: help,
      primarySubjectIds: help,
      stages: [[117.95, 0.45, 38.3, Math.PI / 2], [120.05, 0.45, 38.3, -Math.PI / 2]],
      timeline: [
        cue('preparing', [activity(help[0], 'point', { duration: 3 }), activity(help[1], 'idle', { duration: 3 })]),
        cue('starting', [activity(help[0], 'pose', { duration: 3 }), activity(help[1], 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'bridge-help-camera' }],
        })]),
        cue('active', [activity(help[0], 'pose', { duration: 7, loop: true }), activity(help[1], 'takePhoto', {
          duration: 7, loop: true, props: [{ type: 'camera', id: 'bridge-help-camera' }],
        })]),
        cue('climax', [activity(help[0], 'pose', { duration: 3 }), activity(help[1], 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'bridge-help-camera' }],
        })]),
        cue('ending', help.map((id) => activity(id, 'viewPhoto', { duration: 3 }))),
      ],
    }),
    bridgeMoment({
      id: 'bridge-couple-lake-view',
      name: 'Cặp đôi ngắm hồ trên cầu',
      momentType: 'bridge-couple-view',
      position: { x: 119, y: 0.47, z: 40 },
      timeWindow: { start: 15 * 60 + 30, end: 19 * 60 },
      timingBonus: 1.5,
      actors: couple,
      primarySubjectIds: couple,
      stages: [[117.9, 0.47, 40, Math.PI / 2], [118.8, 0.47, 40.2, Math.PI / 2]],
      timeline: [
        cue('preparing', couple.map((id) => activity(id, 'idle', { duration: 3 }))),
        cue('starting', couple.map((id) => activity(id, 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        }))),
        cue('active', couple.map((id) => activity(id, 'lookAtLandmark', {
          duration: 7, loop: true, target: { x: 103, y: 2.5, z: 0 },
        }))),
        cue('climax', [activity(couple[0], 'point', { duration: 3 }), activity(couple[1], 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        })]),
        cue('ending', couple.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
      ],
    }),
    bridgeMoment({
      id: 'bridge-rail-photographer',
      name: 'Người tựa lan can chụp ảnh',
      momentType: 'bridge-rail-photo',
      position: { x: 118, y: 0.43, z: 42 },
      timeWindow: { start: 7 * 60, end: 19 * 60 },
      timingBonus: 1.4,
      propIds: ['bridge-rail-camera'],
      actors: [railPhotographer],
      primarySubjectIds: [railPhotographer],
      stages: [[117.85, 0.41, 42, Math.PI / 2]],
      timeline: [
        cue('preparing', [activity(railPhotographer, 'lookAtLandmark', { duration: 3, target: { x: 103, y: 2.5, z: 0 } })]),
        cue('starting', [activity(railPhotographer, 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'bridge-rail-camera' }],
        })]),
        cue('active', [activity(railPhotographer, 'takePhoto', {
          duration: 7, loop: true, props: [{ type: 'camera', id: 'bridge-rail-camera' }],
        })]),
        cue('climax', [activity(railPhotographer, 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'bridge-rail-camera' }],
        })]),
        cue('ending', [activity(railPhotographer, 'viewPhoto', { duration: 3 })]),
      ],
    }),
    bridgeMoment({
      id: 'bridge-friends-review-photo',
      name: 'Nhóm bạn xem lại ảnh trên cầu',
      momentType: 'bridge-photo-review',
      position: { x: 119, y: 0.4, z: 42.7 },
      timeWindow: { start: 9 * 60, end: 20 * 60 },
      timingBonus: 1.35,
      propIds: ['bridge-friends-phone'],
      actors: friends,
      primarySubjectIds: friends,
      stages: [[118.05, 0.39, 42.7, 0], [119.1, 0.39, 42.7, 0]],
      timeline: [
        cue('preparing', friends.map((id) => activity(id, 'idle', { duration: 3 }))),
        cue('starting', [activity(friends[0], 'viewPhoto', {
          duration: 3, props: [{ type: 'phone', id: 'bridge-friends-phone' }],
        }), activity(friends[1], 'point', { duration: 3 })]),
        cue('active', [activity(friends[0], 'viewPhoto', {
          duration: 7, loop: true, props: [{ type: 'phone', id: 'bridge-friends-phone' }],
        }), activity(friends[1], 'viewPhoto', { duration: 7, loop: true, props: [] })]),
        cue('climax', friends.map((id) => activity(id, 'clap', { duration: 3, loop: true }))),
        cue('ending', friends.map((id) => activity(id, 'wave', { duration: 3 }))),
      ],
    }),
    bridgeMoment({
      id: 'bridge-adult-points-view',
      name: 'Người lớn chỉ cảnh cho trẻ em',
      momentType: 'bridge-guided-view',
      position: { x: 119, y: 0.36, z: 36.7 },
      timeWindow: { start: 8 * 60, end: 18 * 60 + 30 },
      timingBonus: 1.45,
      actors: pointing,
      primarySubjectIds: pointing,
      stages: [[117.95, 0.37, 36.8, Math.PI / 2], [119.1, 0.37, 36.8, Math.PI / 2]],
      timeline: [
        cue('preparing', pointing.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
        cue('starting', [activity(pointing[0], 'point', { duration: 3 }), activity(pointing[1], 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        })]),
        cue('active', [activity(pointing[0], 'point', { duration: 7, loop: true }), activity(pointing[1], 'lookAtLandmark', {
          duration: 7, loop: true, target: { x: 103, y: 2.5, z: 0 },
        })]),
        cue('climax', [activity(pointing[0], 'point', { duration: 3 }), activity(pointing[1], 'wave', { duration: 3 })]),
        cue('ending', pointing.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
      ],
    }),
    bridgeMoment({
      id: 'bridge-blue-hour-silhouette',
      name: 'Bóng người trên Cầu Thê Húc',
      momentType: 'bridge-silhouette',
      position: { x: 119, y: 0.47, z: 40.5 },
      timeWindow: { start: 17 * 60 + 30, end: 19 * 60 + 15 },
      timingBonus: 1.7,
      actors: [silhouette],
      primarySubjectIds: [silhouette],
      stages: [[120.05, 0.47, 40.5, -Math.PI / 2]],
      timeline: [
        cue('preparing', [activity(silhouette, 'walk', { duration: 3, loop: true })]),
        cue('starting', [activity(silhouette, 'lookAtLandmark', {
          duration: 3, target: { x: 103, y: 2.5, z: 0 },
        })]),
        cue('active', [activity(silhouette, 'lookAtLandmark', {
          duration: 7, loop: true, target: { x: 103, y: 2.5, z: 0 },
        })]),
        cue('climax', [activity(silhouette, 'pose', { duration: 3, loop: true })]),
        cue('ending', [activity(silhouette, 'walk', { duration: 3, loop: true })]),
      ],
    }),
  ]
}

function templeMoments(resolveNpc) {
  const signReader = names('templeSignReader')[0]
  const tourists = names('templeTourists')
  const observer = names('templeObserver')[0]
  const family = names('templeFamily')
  const photographer = names('templePhotographer')[0]
  const respectful = names('templeRespectful')[0]

  const templeMoment = (config) => createOfficialMoment({
    region: SCENIC_MOMENT_REGIONS.temple,
    location: 'Đền Ngọc Sơn',
    performanceAreaIds: [CAPACITY.temple],
    triggerRadius: 5.5,
    pauseDistance: 9,
    cleanupDistance: 14,
    metadata: {
      official: true,
      scenicMoment: true,
      location: 'Đền Ngọc Sơn',
      quiet: true,
    },
    ...config,
    resolveNpc,
  })

  return [
    templeMoment({
      id: 'temple-information-reader',
      name: 'Người đọc bảng thông tin',
      momentType: 'temple-information-reading',
      position: { x: 115.5, y: 0.16, z: 48.3 },
      timeWindow: { start: 7 * 60, end: 18 * 60 + 30 },
      timingBonus: 1.3,
      actors: [signReader],
      primarySubjectIds: [signReader],
      stages: [[115.3, 0.16, 48.4, Math.PI]],
      timeline: [
        cue('preparing', [activity(signReader, 'walk', { duration: 3, loop: true })]),
        cue('starting', [activity(signReader, 'read', { duration: 3, props: [] })]),
        cue('active', [activity(signReader, 'read', { duration: 7, loop: true, props: [] })]),
        cue('climax', [activity(signReader, 'point', { duration: 3 })]),
        cue('ending', [activity(signReader, 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 3.5, z: 53.6 },
        })]),
      ],
    }),
    templeMoment({
      id: 'temple-slow-tourists',
      name: 'Nhóm du khách đi chậm',
      momentType: 'temple-slow-tour',
      position: { x: 112.5, y: 0.16, z: 52 },
      timeWindow: { start: 8 * 60, end: 18 * 60 },
      timingBonus: 1.25,
      actors: tourists,
      primarySubjectIds: tourists,
      stages: [[112.2, 0.16, 49.5, 0], [113.1, 0.16, 49.2, 0]],
      timeline: [
        cue('preparing', tourists.map((id) => activity(id, 'idle', { duration: 3 }))),
        cue('starting', tourists.flatMap((id, index) => [
          route(id, [[112.2 + index * 0.9, 0.16, 49.5 - index * 0.3], [112.2 + index * 0.9, 0.16, 54.4]]),
          activity(id, 'walk', { duration: 4, loop: true, speed: 0.65 }),
        ])),
        cue('active', tourists.map((id) => activity(id, 'walk', { duration: 7, loop: true, speed: 0.55 }))),
        cue('climax', [activity(tourists[0], 'point', { duration: 3 }), activity(tourists[1], 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 4, z: 53.6 },
        })]),
        cue('ending', tourists.map((id) => activity(id, 'walk', { duration: 3, loop: true, speed: 0.6 }))),
      ],
    }),
    templeMoment({
      id: 'temple-architecture-observer',
      name: 'Người quan sát kiến trúc',
      momentType: 'temple-architecture-observation',
      position: { x: 124.5, y: 0.16, z: 48.8 },
      timeWindow: { start: 7 * 60 + 30, end: 18 * 60 + 30 },
      timingBonus: 1.35,
      actors: [observer],
      primarySubjectIds: [observer],
      stages: [[124.3, 0.16, 48.8, -0.35]],
      timeline: [
        cue('preparing', [activity(observer, 'idle', { duration: 3 })]),
        cue('starting', [activity(observer, 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 4.5, z: 53.6 },
        })]),
        cue('active', [activity(observer, 'lookAtLandmark', {
          duration: 7, loop: true, target: { x: 119, y: 4.5, z: 53.6 },
        })]),
        cue('climax', [activity(observer, 'point', { duration: 3 })]),
        cue('ending', [activity(observer, 'walk', { duration: 3, loop: true })]),
      ],
    }),
    templeMoment({
      id: 'temple-family-rest',
      name: 'Gia đình dừng nghỉ',
      momentType: 'temple-family-rest',
      position: { x: 123, y: 0.16, z: 58 },
      timeWindow: { start: 9 * 60, end: 17 * 60 + 30 },
      timingBonus: 1.25,
      actors: family,
      primarySubjectIds: family,
      stages: [[122.5, 0.16, 58, Math.PI], [123.5, 0.16, 58, Math.PI]],
      timeline: [
        cue('preparing', family.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
        cue('starting', family.map((id) => activity(id, 'sit', { duration: 3 }))),
        cue('active', family.map((id) => activity(id, 'sit', { duration: 7, loop: true }))),
        cue('climax', [activity(family[0], 'point', { duration: 3 }), activity(family[1], 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 4, z: 53.6 },
        })]),
        cue('ending', family.map((id) => activity(id, 'walk', { duration: 3, loop: true }))),
      ],
    }),
    templeMoment({
      id: 'temple-detail-photographer',
      name: 'Người chụp chi tiết kiến trúc',
      momentType: 'temple-detail-photo',
      position: { x: 112.5, y: 0.16, z: 54 },
      timeWindow: { start: 8 * 60, end: 18 * 60 },
      timingBonus: 1.45,
      propIds: ['temple-detail-camera'],
      actors: [photographer],
      primarySubjectIds: [photographer],
      stages: [[112.5, 0.16, 54, 1.1]],
      timeline: [
        cue('preparing', [activity(photographer, 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 4.5, z: 53.6 },
        })]),
        cue('starting', [activity(photographer, 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'temple-detail-camera' }],
        })]),
        cue('active', [activity(photographer, 'takePhoto', {
          duration: 7, loop: true, props: [{ type: 'camera', id: 'temple-detail-camera' }],
        })]),
        cue('climax', [activity(photographer, 'takePhoto', {
          duration: 3, props: [{ type: 'camera', id: 'temple-detail-camera' }],
        })]),
        cue('ending', [activity(photographer, 'viewPhoto', { duration: 3 })]),
      ],
    }),
    templeMoment({
      id: 'temple-respectful-pause',
      name: 'Một người dừng lại trang nghiêm',
      momentType: 'temple-respectful-pause',
      position: { x: 119, y: 0.16, z: 48.8 },
      timeWindow: { start: 6 * 60, end: 19 * 60 + 30 },
      timingBonus: 1.5,
      actors: [respectful],
      primarySubjectIds: [respectful],
      stages: [[119, 0.16, 48.7, 0]],
      timeline: [
        cue('preparing', [activity(respectful, 'walk', { duration: 3, loop: true })]),
        cue('starting', [activity(respectful, 'idle', { duration: 3 })]),
        cue('active', [activity(respectful, 'respectfulPause', { duration: 7, loop: true })]),
        cue('climax', [activity(respectful, 'respectfulPause', { duration: 3, loop: true })]),
        cue('ending', [activity(respectful, 'lookAtLandmark', {
          duration: 3, target: { x: 119, y: 4, z: 53.6 },
        })]),
      ],
    }),
  ]
}

export function createLakeBridgeTempleMoments({ resolveNpc } = {}) {
  return Object.freeze([
    ...lakeMoments(resolveNpc),
    ...bridgeMoments(resolveNpc),
    ...templeMoments(resolveNpc),
  ])
}

export function registerLakeBridgeTempleMoments(momentSystem, options = {}) {
  const definitions = createLakeBridgeTempleMoments(options)
  definitions.forEach((definition) => momentSystem.registerMoment(definition))
  return definitions
}
