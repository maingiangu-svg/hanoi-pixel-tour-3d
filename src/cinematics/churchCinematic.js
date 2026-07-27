import * as THREE from 'three'
import { CinematicPoint } from './CinematicPoint.js'
import { CinematicTimeline } from './CinematicTimeline.js'

export const CHURCH_CINEMATIC_POINT_ID = 'church-introduction'

export function createChurchCinematicPoint() {
  return new CinematicPoint({
    id: CHURCH_CINEMATIC_POINT_ID,
    region: 'churchDistrict',
    area: 'outdoor',
    position: { x: 0, y: 0, z: 5.5 },
    radius: 3.6,
    promptText: 'Xem đoạn giới thiệu',
    title: 'Nhà thờ Lớn Hà Nội',
    subtitle: 'Một khoảng lặng Gothic giữa nhịp phố Hà Nội',
    replayable: true,
    timeline: ({ playerPose }) => {
      const playerForward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(playerPose.quaternion)
        .normalize()
      const returnTarget = playerPose.position.clone().addScaledVector(playerForward, 8)

      return new CinematicTimeline({
        shots: [
          {
            id: 'street-reveal',
            position: { x: 0, y: 3.4, z: 24 },
            target: { x: 0, y: 7.4, z: -15 },
            duration: 0.45,
            holdTime: 1.65,
            fov: 55,
            easing: 'easeOut',
          },
          {
            id: 'facade-approach',
            position: { x: 0, y: 4.15, z: -1.5 },
            target: { x: 0, y: 8.1, z: -15 },
            duration: 2.15,
            holdTime: 0.85,
            fov: 48,
            easing: 'easeInOut',
          },
          {
            id: 'plaza-pan',
            position: { x: -11, y: 3.05, z: 7.5 },
            target: { x: 6.2, y: 1.45, z: -0.8 },
            duration: 2.35,
            holdTime: 1.05,
            fov: 58,
            easing: 'easeInOut',
          },
          {
            id: 'return-to-player',
            position: playerPose.position,
            target: returnTarget,
            duration: 2.05,
            holdTime: 0.45,
            fov: playerPose.fov,
            easing: 'easeInOut',
          },
        ],
      })
    },
  })
}
