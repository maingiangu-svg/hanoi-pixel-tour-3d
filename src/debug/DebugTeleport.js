export const ENABLE_DEBUG_CHURCH_TELEPORT = Boolean(import.meta.env?.DEV)

export const CHURCH_PLAZA_SPAWN = Object.freeze({
  x: 0,
  z: 6,
  yaw: 0,
})

export const CHURCH_FACADE_LOOK_AT = Object.freeze({
  x: 0,
  y: 7.2,
  z: -15,
})

export function isDebugChurchTeleportHotkey(
  event,
  {
    enabled = ENABLE_DEBUG_CHURCH_TELEPORT,
    choosingDialogueAnswer = false,
  } = {},
) {
  if (
    !enabled
    || choosingDialogueAnswer
    || event?.repeat
    || event?.altKey
    || event?.ctrlKey
    || event?.metaKey
    || event?.shiftKey
  ) return false

  const code = event?.code ?? event?.key
  return code === 'Digit1' || code === '1'
}

/**
 * Development-only orchestration kept outside Game so every cleanup path is
 * testable without constructing a renderer or a second player instance.
 */
export function performChurchDebugTeleport({
  player,
  input,
  collision,
  world,
  ui,
  dialogue,
  interactions,
  mapUi,
  closeMap,
  dayNight,
  clock,
}) {
  const pointerWasLocked = Boolean(player.controls.isLocked)

  if (mapUi.isOpen) closeMap()
  if (dialogue.isActive()) dialogue.cancel({ restoreCamera: false })
  interactions.cancelTransition()

  const destination = world.transition('hoanKiem')
  collision.setWorld(destination)
  player.teleport(CHURCH_PLAZA_SPAWN, CHURCH_PLAZA_SPAWN.yaw)
  player.lookAt(CHURCH_FACADE_LOOK_AT)
  world.update(0, clock)
  dayNight.update(world.activeAreaName)

  const gameplayLocked = pointerWasLocked && player.controls.isLocked
  input.setEnabled(gameplayLocked)
  ui.setLocked(gameplayLocked)
  if (!gameplayLocked) ui.setResumeMode(true)
  ui.setInteraction(null)
  ui.showNotice('Đã dịch chuyển về Nhà thờ Lớn')
  return destination
}

