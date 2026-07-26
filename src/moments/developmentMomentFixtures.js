import {
  createMultiActorMoment,
  createSimpleMoment,
} from './MomentTemplates.js'

const ALL_DAY = Object.freeze({ start: 0, end: 0 })

export function createDevelopmentTestMoments({ resolveNpc } = {}) {
  return Object.freeze([
    createSimpleMoment({
      id: 'dev-simple-wave',
      name: 'Development: một NPC vẫy tay',
      region: 'churchDistrict',
      area: 'outdoor',
      position: { x: 5, y: 0, z: 9 },
      triggerRadius: 7,
      pauseDistance: 10,
      cleanupDistance: 15,
      timeWindow: ALL_DAY,
      durations: {
        preparing: 0.8,
        starting: 0.8,
        active: 3,
        climax: 1.5,
        ending: 0.8,
      },
      cooldown: 8,
      maxRepeats: Infinity,
      priority: 90,
      type: 'development-simple',
      momentType: 'wave',
      timingBonus: 1,
      npcIds: ['Khách chụp ảnh'],
      primarySubjectIds: ['Khách chụp ảnh'],
      stagingPoints: [
        { id: 'dev-wave-stage', position: [5, 0, 9], yaw: Math.PI },
      ],
      initialStaging: [
        { actorId: 'Khách chụp ảnh', stagingId: 'dev-wave-stage' },
      ],
      timeline: [
        {
          state: 'preparing',
          actorId: 'Khách chụp ảnh',
          activity: { id: 'idle', duration: 1 },
        },
        {
          state: 'starting',
          actorId: 'Khách chụp ảnh',
          activity: { id: 'wave', duration: 4, loop: true },
        },
        {
          state: 'climax',
          actorId: 'Khách chụp ảnh',
          activity: { id: 'wave', duration: 2, loop: true },
        },
        {
          state: 'ending',
          actorId: 'Khách chụp ảnh',
          activity: { id: 'idle', duration: 1 },
        },
      ],
      resolveNpc,
    }),
    createMultiActorMoment({
      id: 'dev-multi-pose',
      name: 'Development: nhóm NPC tạo dáng',
      region: 'churchDistrict',
      area: 'outdoor',
      position: { x: -7, y: 0, z: 9 },
      triggerRadius: 7,
      pauseDistance: 10,
      cleanupDistance: 15,
      timeWindow: ALL_DAY,
      durations: {
        preparing: 1,
        starting: 1,
        active: 3,
        climax: 2,
        ending: 1,
      },
      cooldown: 10,
      maxRepeats: Infinity,
      priority: 80,
      type: 'development-multi',
      momentType: 'group-pose',
      timingBonus: 1.2,
      npcIds: ['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'],
      primarySubjectIds: ['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'],
      stagingPoints: [
        { id: 'dev-pose-left', position: [-8, 0, 9], yaw: Math.PI },
        { id: 'dev-pose-center', position: [-7, 0, 9], yaw: Math.PI },
        { id: 'dev-pose-right', position: [-6, 0, 9], yaw: Math.PI },
      ],
      initialStaging: [
        { actorId: 'Bạn trẻ 1', stagingId: 'dev-pose-left' },
        { actorId: 'Bạn trẻ 2', stagingId: 'dev-pose-center' },
        { actorId: 'Người trong cặp đôi 1', stagingId: 'dev-pose-right' },
      ],
      timeline: [
        ...['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'].map((actorId) => ({
          id: `prepare-${actorId}`,
          state: 'preparing',
          actorId,
          activity: { id: 'idle', duration: 1.2 },
        })),
        ...['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'].map((actorId) => ({
          id: `pose-${actorId}`,
          state: 'active',
          actorId,
          activity: { id: 'pose', duration: 6, loop: true },
        })),
        ...['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'].map((actorId) => ({
          id: `climax-${actorId}`,
          state: 'climax',
          actorId,
          activity: { id: 'pose', duration: 3, loop: true },
        })),
        ...['Bạn trẻ 1', 'Bạn trẻ 2', 'Người trong cặp đôi 1'].map((actorId) => ({
          id: `ending-${actorId}`,
          state: 'ending',
          actorId,
          activity: { id: 'idle', duration: 1 },
        })),
      ],
      resolveNpc,
    }),
  ])
}

export function registerDevelopmentTestMoments(momentSystem, options = {}) {
  const definitions = createDevelopmentTestMoments(options)
  definitions.forEach((definition) => momentSystem.registerMoment(definition))
  return definitions
}
