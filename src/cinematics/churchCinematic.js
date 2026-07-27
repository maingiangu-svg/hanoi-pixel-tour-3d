import * as THREE from 'three'
import { CinematicPoint } from './CinematicPoint.js'
import { CinematicTimeline } from './CinematicTimeline.js'

export const CHURCH_CINEMATIC_POINT_ID = 'church-introduction'

export function createChurchCinematicPoint() {
  return new CinematicPoint({
    id: CHURCH_CINEMATIC_POINT_ID,
    region: 'churchDistrict',
    area: 'outdoor',
    position: { x: -3, y: 0, z: 4.2 },
    radius: 3.7,
    promptText: 'Xem giới thiệu',
    title: 'Nhà thờ Lớn Hà Nội',
    subtitle: 'Một khoảng lặng Gothic giữa nhịp phố Hà Nội',
    audioCue: 'church-reveal',
    ambientLevel: 0.3,
    marker: { visibleDistance: 26 },
    replayable: true,
    timeline: ({ playerPose }) => {
      const playerForward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(playerPose.quaternion)
        .normalize()
      const returnTarget = playerPose.position.clone().addScaledVector(playerForward, 8)

      return new CinematicTimeline({
        shots: [
          {
            id: 'foreground-street-reveal',
            position: { x: -12.8, y: 2.65, z: 16 },
            target: { x: 0, y: 7.4, z: -15 },
            duration: 0.5,
            holdTime: 1.7,
            fov: 55,
            easing: 'easeOut',
            cameraPath: { type: 'pan' },
            foregroundParallax: true,
          },
          {
            id: 'facade-approach',
            position: { x: 0, y: 4.05, z: -1.5 },
            target: { x: 0, y: 8.1, z: -15 },
            duration: 2.6,
            holdTime: 0.7,
            fov: 48,
            easing: 'easeInOut',
            cameraPath: { type: 'dolly-in' },
          },
          {
            id: 'facade-tilt-and-crane',
            position: { x: -8.2, y: 3.2, z: 9.1 },
            target: { x: 0, y: 14.2, z: -15 },
            duration: 2.2,
            holdTime: 0.6,
            fov: 52,
            easing: 'easeInOut',
            cameraPath: { type: 'crane' },
          },
          {
            id: 'plaza-orbit-climax',
            position: { x: 8.2, y: 3.6, z: 9.1 },
            target: { x: 4.2, y: 1.45, z: -0.7 },
            duration: 3.8,
            holdTime: 1,
            fov: 58,
            easing: 'easeInOut',
            cameraPath: {
              type: 'orbit',
              center: { x: 0, y: 0, z: 1.5 },
              radius: 11.2,
              startAngle: -47,
              endAngle: 47,
              startHeight: 3.2,
              endHeight: 3.6,
            },
            timeScale: 0.48,
            slowMotionStart: 0.9,
            slowMotionDuration: 2.4,
            audioCue: 'church-climax',
            audioFadeIn: 0.45,
            audioFadeOut: 0.55,
            foregroundParallax: true,
          },
          {
            id: 'return-to-player',
            position: playerPose.position,
            target: returnTarget,
            duration: 2.4,
            holdTime: 0.4,
            fov: playerPose.fov,
            easing: 'easeInOut',
            cameraPath: { type: 'dolly-out' },
            audioCue: 'church-reveal',
            audioFadeIn: 0.4,
            audioFadeOut: 0.5,
          },
        ],
      })
    },
  })
}
