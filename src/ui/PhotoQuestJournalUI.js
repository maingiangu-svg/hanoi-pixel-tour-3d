const STATUS_LABELS = Object.freeze({
  locked: 'Chưa mở',
  active: 'Đang làm',
  completed: 'Hoàn thành',
})

function formatMinutes(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export class PhotoQuestJournalUI {
  constructor(root) {
    this.root = root
    this.document = root.ownerDocument ?? document
    this.handlers = { close: () => {} }
    this.previouslyFocused = null

    this.root.insertAdjacentHTML('beforeend', `
      <section class="photo-quest-journal" role="dialog" aria-modal="true"
        aria-labelledby="photo-quest-title" aria-hidden="true" hidden>
        <button class="photo-quest-journal__backdrop" type="button"
          aria-label="Đóng nhiệm vụ"></button>
        <article class="photo-quest-journal__panel">
          <header class="photo-quest-journal__header">
            <div>
              <span class="photo-quest-journal__eyebrow">NHẬT KÝ NHIẾP ẢNH</span>
              <h2 id="photo-quest-title">Nhiệm vụ chụp ảnh</h2>
              <p class="photo-quest-journal__summary"></p>
            </div>
            <button class="photo-quest-journal__close" type="button">
              <kbd>J</kbd><span>Đóng</span>
            </button>
          </header>
          <div class="photo-quest-journal__groups"></div>
        </article>
      </section>
    `)

    this.element = this.root.querySelector('.photo-quest-journal')
    this.backdrop = this.element.querySelector('.photo-quest-journal__backdrop')
    this.closeButton = this.element.querySelector('.photo-quest-journal__close')
    this.summary = this.element.querySelector('.photo-quest-journal__summary')
    this.groups = this.element.querySelector('.photo-quest-journal__groups')
    this.handleClose = () => this.handlers.close()
    this.closeButton.addEventListener('click', this.handleClose)
    this.backdrop.addEventListener('click', this.handleClose)
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers }
  }

  setOpen(open) {
    if (open) {
      this.previouslyFocused = this.document.activeElement
      this.element.hidden = false
      this.element.setAttribute('aria-hidden', 'false')
      this.root.classList.add('is-photo-quest-active')
      this.closeButton.focus({ preventScroll: true })
      return
    }
    this.root.classList.remove('is-photo-quest-active')
    this.element.hidden = true
    this.element.setAttribute('aria-hidden', 'true')
    this.closeButton.blur()
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus?.({ preventScroll: true })
    }
    this.previouslyFocused = null
  }

  render(groups, records) {
    const total = groups.reduce((sum, group) => sum + group.totalCount, 0)
    const completed = groups.reduce((sum, group) => sum + group.completedCount, 0)
    this.summary.textContent = `${completed}/${total} khoảnh khắc đã hoàn thành`
    this.groups.replaceChildren()
    const recordsById = new Map(records.map((record) => [record.id, record]))

    for (const group of groups) {
      const section = this.document.createElement('section')
      section.className = `photo-quest-group is-${group.status}`
      const header = this.document.createElement('header')
      const heading = this.document.createElement('div')
      const title = this.document.createElement('h3')
      const description = this.document.createElement('p')
      const progress = this.document.createElement('span')
      title.textContent = group.name
      description.textContent = group.description
      progress.className = 'photo-quest-group__progress'
      progress.textContent = group.status === 'locked'
        ? STATUS_LABELS.locked
        : `${group.completedCount}/${group.totalCount}`
      heading.append(title, description)
      header.append(heading, progress)
      section.append(header)

      const list = this.document.createElement('div')
      list.className = 'photo-quest-group__list'
      for (const quest of group.quests) {
        list.append(this.#questCard(quest, recordsById))
      }
      section.append(list)
      this.groups.append(section)
    }
  }

  dispose() {
    this.closeButton.removeEventListener('click', this.handleClose)
    this.backdrop.removeEventListener('click', this.handleClose)
    this.root.classList.remove('is-photo-quest-active')
    this.element.remove()
  }

  #questCard(quest, recordsById) {
    const card = this.document.createElement('article')
    card.className = `photo-quest-card is-${quest.status}`
    const copy = this.document.createElement('div')
    copy.className = 'photo-quest-card__copy'
    const row = this.document.createElement('div')
    row.className = 'photo-quest-card__title-row'
    const title = this.document.createElement('h4')
    const status = this.document.createElement('span')
    title.textContent = quest.name
    status.textContent = STATUS_LABELS[quest.status]
    status.className = 'photo-quest-card__status'
    row.append(title, status)

    const description = this.document.createElement('p')
    description.textContent = quest.description
    const requirements = this.document.createElement('small')
    const climax = quest.climaxRequired ? 'cao trào bắt buộc' : 'cao trào tùy chọn'
    requirements.textContent = [
      quest.location.label,
      `${formatMinutes(quest.time.start)}–${formatMinutes(quest.time.end)}`,
      `tối thiểu ${quest.minimumScore} điểm`,
      climax,
    ].join(' · ')
    copy.append(row, description, requirements)
    card.append(copy)

    if (quest.completion) {
      const figure = this.document.createElement('figure')
      figure.className = 'photo-quest-card__photo'
      const record = recordsById.get(quest.completion.photoId)
      if (record) {
        const image = this.document.createElement('img')
        image.src = record.thumbnailUrl
        image.alt = `Ảnh hoàn thành ${quest.name}`
        image.loading = 'lazy'
        figure.append(image)
      } else {
        const missing = this.document.createElement('div')
        missing.className = 'photo-quest-card__photo-missing'
        missing.textContent = 'Ảnh đã xóa khỏi album'
        figure.append(missing)
      }
      const caption = this.document.createElement('figcaption')
      caption.textContent = `${quest.completion.gameTime ?? '--:--'} · ${quest.completion.score} điểm`
      figure.append(caption)
      card.append(figure)
    }
    return card
  }
}

