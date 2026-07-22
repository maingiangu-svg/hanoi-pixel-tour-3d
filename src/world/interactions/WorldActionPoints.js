import * as THREE from 'three'

function asVector3(value) {
  if (value?.isVector3) return value.clone()
  if (Array.isArray(value)) return new THREE.Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0)
  return new THREE.Vector3(value?.x ?? 0, value?.y ?? 0, value?.z ?? 0)
}

export function createNoticePoint({
  position,
  radius = 2,
  label,
  message,
  lookAt = null,
}) {
  const target = lookAt ? asVector3(lookAt) : null
  return {
    type: 'action',
    position: asVector3(position),
    radius,
    label,
    activate({ player, ui }) {
      if (target) player.lookAt?.(target)
      ui.showNotice?.(message)
    },
  }
}

export function createPhotoPoint({ position, radius = 2.3, lookAt, message }) {
  const target = asVector3(lookAt)
  return {
    type: 'action',
    position: asVector3(position),
    radius,
    label: 'Chụp ảnh',
    activate({ player, ui }) {
      player.lookAt?.(target)
      ui.flashPhoto?.()
      ui.showNotice?.(message ?? 'Đã lưu một góc nhìn Hồ Gươm.')
    },
  }
}

export function createSeatPoint({ position, seatPosition, lookAt, radius = 1.8 }) {
  const seat = asVector3(seatPosition)
  const target = asVector3(lookAt)
  return {
    type: 'action',
    position: asVector3(position),
    radius,
    label: 'Ngồi ghế ven hồ',
    activate({ player, ui }) {
      player.teleport({ x: seat.x, z: seat.z }, 0)
      player.lookAt?.(target)
      ui.showNotice?.('Bạn ngồi lại một lát, nhìn ra Tháp Rùa.')
    },
  }
}
