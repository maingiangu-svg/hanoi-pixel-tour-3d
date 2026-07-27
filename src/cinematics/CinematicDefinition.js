export const CINEMATIC_TRIGGER_TYPES = Object.freeze({
  INTERACTION: 'interaction',
  STORY: 'story',
})

export class CinematicDefinition {
  constructor({
    id,
    triggerType = CINEMATIC_TRIGGER_TYPES.STORY,
    title = '',
    subtitle = '',
    audioCue = null,
    ambientLevel = 0.34,
    conditions = () => true,
    timeline,
    metadata = {},
  }) {
    if (!id) throw new TypeError('Cinematic definition requires an id')
    if (!Object.values(CINEMATIC_TRIGGER_TYPES).includes(triggerType)) {
      throw new TypeError(`Unsupported cinematic trigger type: ${triggerType}`)
    }
    if (typeof timeline !== 'function') {
      throw new TypeError(`Cinematic "${id}" requires a timeline factory`)
    }
    if (typeof conditions !== 'function') {
      throw new TypeError(`Cinematic "${id}" conditions must be a function`)
    }

    this.id = id
    this.triggerType = triggerType
    this.title = title
    this.subtitle = subtitle
    this.audioCue = audioCue
    this.ambientLevel = Math.max(0, Math.min(1, Number(ambientLevel) || 0))
    this.conditions = conditions
    this.timelineFactory = timeline
    this.metadata = Object.freeze({ ...metadata })
    this.playCount = 0
  }

  canPlay(context = {}) {
    return this.conditions(context) !== false
  }

  createTimeline(context) {
    return this.timelineFactory(context)
  }
}
