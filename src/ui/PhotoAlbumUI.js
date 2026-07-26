import {
  PHOTO_ALBUM_THEMES,
  classifyPhotoTheme,
} from '../photo/PhotoAlbumCatalog.js'

const LIGHTING_PHASE_LABELS = Object.freeze({
  dawn: 'Bình minh',
  day: 'Ban ngày',
  goldenHour: 'Golden hour',
  sunset: 'Hoàng hôn',
  blueHour: 'Blue hour',
  night: 'Ban đêm',
})

const LOCATION_LABELS = Object.freeze({
  hoanKiem: 'Hoàn Kiếm',
  churchInterior: 'Nhà thờ Lớn',
  baDinh: 'Ba Đình',
  longBien: 'Long Biên',
})

function getMetadata(photo) {
  const metadata = photo.metadata ?? photo
  const capture = metadata.capture ?? photo.capture ?? photo
  const location = metadata.location ?? photo.location ?? {}
  const lighting = metadata.lighting ?? photo.lighting ?? {}
  const subjects = metadata.subjects ?? photo.subjects ?? []
  const landmarks = metadata.landmarks ?? photo.landmarks ?? []
  const eventContext = metadata.eventContext ?? photo.eventContext ?? {}
  const classification = metadata.classification ?? photo.classification ?? {}
  const scoring = metadata.scoring ?? photo.scoring ?? null
  const timestamp = capture.timestamp ?? photo.timestamp
  const realTime = timestamp && !Number.isNaN(Date.parse(timestamp))
    ? new Date(timestamp).toLocaleString('vi-VN')
    : 'Không rõ'
  const subjectNames = subjects.map((subject) => subject.name).filter(Boolean)
  const landmarkNames = landmarks.map((landmark) => landmark.name).filter(Boolean)
  const eventNames = (eventContext.events ?? []).map((event) => event.name).filter(Boolean)
  const formatVector = (vector) => vector
    ? `X ${Number(vector.x ?? 0).toFixed(1)} · Y ${Number(vector.y ?? 0).toFixed(1)} · Z ${Number(vector.z ?? 0).toFixed(1)}`
    : 'Không rõ'

  return {
    id: capture.id ?? photo.id ?? 'Không rõ',
    realTime,
    time: capture.gameTime?.formatted ?? photo.gameTime?.formatted ?? '--:--',
    location: location.place
      ?? LOCATION_LABELS[location.mapId ?? photo.mapId]
      ?? (location.areaId === 'interior' || photo.area === 'interior'
        ? 'Nhà thờ Lớn'
        : location.mapName ?? photo.mapId ?? 'Không rõ'),
    area: location.areaName ?? location.areaId ?? photo.area ?? 'Không rõ',
    map: location.mapName ?? LOCATION_LABELS[location.mapId ?? photo.mapId] ?? 'Không rõ',
    focalLength: `${capture.focalLength ?? photo.focalLength ?? '--'}mm`,
    fov: Number.isFinite(capture.fov ?? photo.fov)
      ? `${Number(capture.fov ?? photo.fov).toFixed(1)}°`
      : 'Không rõ',
    lighting: LIGHTING_PHASE_LABELS[lighting.phase ?? photo.lightingPhase]
      ?? lighting.phase
      ?? photo.lightingPhase
      ?? 'Không rõ',
    subjects: subjectNames.length
      ? subjectNames.join(', ')
      : 'Không có chủ thể trong khung hình',
    landmarks: landmarkNames.length
      ? landmarkNames.join(', ')
      : 'Không có landmark trong khung hình',
    events: eventNames.length ? eventNames.join(', ') : 'Không có',
    classification: classification.label ?? 'cảnh–cảnh',
    position: formatVector(capture.playerPosition ?? photo.playerPosition),
    direction: formatVector(capture.cameraDirection ?? photo.cameraDirection),
    scoring,
    scoreLabel: Number.isFinite(scoring?.total)
      ? `${scoring.total}/${scoring.max ?? 100}`
      : 'Chưa chấm điểm',
    stars: Number.isFinite(scoring?.stars)
      ? `${'★'.repeat(scoring.stars)}${'☆'.repeat(Math.max(0, 5 - scoring.stars))}`
      : '☆☆☆☆☆',
  }
}

function createScorePanel(documentRef, photo) {
  const { scoring, scoreLabel, stars } = getMetadata(photo)
  const panel = documentRef.createElement('section')
  panel.className = 'photo-album-score'

  const heading = documentRef.createElement('div')
  heading.className = 'photo-album-score__heading'
  const total = documentRef.createElement('strong')
  total.textContent = scoreLabel
  const starRating = documentRef.createElement('span')
  starRating.className = 'photo-album-score__stars'
  starRating.textContent = stars
  starRating.setAttribute(
    'aria-label',
    scoring ? `${scoring.stars} trên 5 sao` : 'Ảnh chưa được chấm điểm',
  )
  heading.append(total, starRating)
  panel.append(heading)

  if (!scoring) {
    const legacy = documentRef.createElement('p')
    legacy.textContent = 'Ảnh cũ chưa có dữ liệu chấm điểm.'
    panel.append(legacy)
    return panel
  }

  const comment = documentRef.createElement('p')
  comment.textContent = scoring.comment ?? 'Không có nhận xét.'
  panel.append(comment)

  const breakdown = documentRef.createElement('dl')
  breakdown.className = 'photo-album-score__breakdown'
  for (const entry of Object.values(scoring.criteria ?? {})) {
    const row = documentRef.createElement('div')
    const term = documentRef.createElement('dt')
    const value = documentRef.createElement('dd')
    const feedback = documentRef.createElement('small')
    term.textContent = entry.label ?? entry.id ?? 'Tiêu chí'
    value.textContent = `${entry.score ?? 0}/${entry.max ?? 0}`
    feedback.textContent = entry.feedback ?? ''
    row.append(term, value, feedback)
    breakdown.append(row)
  }
  panel.append(breakdown)

  const diagnostics = [
    {
      label: 'Che khuất',
      result: scoring.occlusionScore,
      feedback: scoring.occlusionScore?.feedback,
    },
    {
      label: 'Bố cục nâng cao',
      result: scoring.advancedCompositionScore,
      feedback: scoring.advancedCompositionScore?.feedback?.join?.(' '),
    },
  ].filter((entry) => Number.isFinite(entry.result?.score))
  if (diagnostics.length) {
    const analysisHeading = documentRef.createElement('strong')
    analysisHeading.className = 'photo-album-score__analysis-title'
    analysisHeading.textContent = 'Phân tích bổ sung'
    const analysis = documentRef.createElement('dl')
    analysis.className = 'photo-album-score__breakdown photo-album-score__breakdown--analysis'
    for (const entry of diagnostics) {
      const row = documentRef.createElement('div')
      const term = documentRef.createElement('dt')
      const value = documentRef.createElement('dd')
      const feedback = documentRef.createElement('small')
      term.textContent = entry.label
      value.textContent = `${entry.result.score}/${entry.result.max ?? 100}`
      feedback.textContent = entry.feedback ?? ''
      row.append(term, value, feedback)
      analysis.append(row)
    }
    panel.append(analysisHeading, analysis)
  }

  const notes = documentRef.createElement('div')
  notes.className = 'photo-album-score__notes'
  const strengths = documentRef.createElement('p')
  const strengthsLabel = documentRef.createElement('strong')
  strengthsLabel.textContent = 'Điểm mạnh: '
  strengths.append(
    strengthsLabel,
    documentRef.createTextNode((scoring.strengths ?? []).join(', ') || 'Chưa xác định'),
  )
  const improvements = documentRef.createElement('p')
  const improvementsLabel = documentRef.createElement('strong')
  improvementsLabel.textContent = 'Cần cải thiện: '
  improvements.append(
    improvementsLabel,
    documentRef.createTextNode(
      (scoring.improvements ?? []).join(' ') || 'Chưa có gợi ý.',
    ),
  )
  notes.append(strengths, improvements)
  panel.append(notes)
  return panel
}

function createMetadataList(documentRef, photo, className) {
  const metadata = getMetadata(photo)
  const list = documentRef.createElement('dl')
  list.className = className
  const fields = [
    ['Mã ảnh', metadata.id],
    ['Thời gian thực', metadata.realTime],
    ['Giờ trong game', metadata.time],
    ['Địa điểm', metadata.location],
    ['Khu vực', `${metadata.area} · ${metadata.map}`],
    ['Tiêu cự', metadata.focalLength],
    ['FOV', metadata.fov],
    ['Ánh sáng', metadata.lighting],
    ['Loại ảnh', metadata.classification],
    ['Chủ thể', metadata.subjects],
    ['Landmark', metadata.landmarks],
    ['Sự kiện', metadata.events],
    ['Vị trí player', metadata.position],
    ['Hướng camera', metadata.direction],
  ]
  for (const [label, value] of fields) {
    const item = documentRef.createElement('div')
    const term = documentRef.createElement('dt')
    const description = documentRef.createElement('dd')
    term.textContent = label
    description.textContent = value
    item.append(term, description)
    list.append(item)
  }
  return list
}

function getAlbumData(record) {
  return record.album ?? classifyPhotoTheme(record.photo ?? record)
}

function createAlbumPanel(documentRef, record) {
  const album = getAlbumData(record)
  const panel = documentRef.createElement('section')
  panel.className = 'photo-album-theme-detail'

  const eyebrow = documentRef.createElement('span')
  eyebrow.className = 'photo-album-theme-detail__eyebrow'
  eyebrow.textContent = album.secret ? 'KHOẢNH KHẮC BÍ MẬT' : 'CHỦ ĐỀ ALBUM'
  const title = documentRef.createElement('strong')
  title.textContent = album.secret?.name ?? album.primaryThemeName
  const description = documentRef.createElement('p')
  description.textContent = album.secret?.description ?? album.description
  panel.append(eyebrow, title, description)

  if (album.relatedQuestName) {
    const quest = documentRef.createElement('small')
    quest.textContent = `Nhiệm vụ liên quan · ${album.relatedQuestName}`
    panel.append(quest)
  }
  return panel
}

export class PhotoAlbumUI {
  constructor(root) {
    this.root = root
    this.document = root.ownerDocument ?? document
    this.handlers = {
      close: () => {},
      select: () => {},
      delete: () => {},
      back: () => {},
      themeFilter: () => {},
      starsFilter: () => {},
      sort: () => {},
    }
    this.records = []
    this.selectedId = null

    this.root.insertAdjacentHTML('beforeend', `
      <section
        class="photo-album"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-album-title"
        aria-hidden="true"
        hidden
      >
        <div class="photo-album__backdrop" aria-hidden="true"></div>
        <article class="photo-album__panel">
          <header class="photo-album__header">
            <div>
              <span class="photo-album__eyebrow">ẢNH TRONG PHIÊN NÀY</span>
              <h2 id="photo-album-title">Album ảnh</h2>
              <p class="photo-album__count"></p>
            </div>
            <button class="photo-album__close" type="button" aria-label="Đóng album">
              <kbd>P</kbd><span>Đóng</span>
            </button>
          </header>
          <section class="photo-album__catalog" aria-label="Lọc và tiến độ album">
            <div class="photo-album__filters">
              <label>
                <span>Chủ đề</span>
                <select class="photo-album__theme-filter">
                  <option value="all">Tất cả chủ đề</option>
                </select>
              </label>
              <label>
                <span>Số sao</span>
                <select class="photo-album__stars-filter">
                  <option value="0">Tất cả ảnh</option>
                  <option value="3">Từ 3 sao</option>
                  <option value="4">Từ 4 sao</option>
                  <option value="5">5 sao</option>
                </select>
              </label>
              <label>
                <span>Sắp xếp</span>
                <select class="photo-album__sort">
                  <option value="newest">Ảnh mới nhất</option>
                  <option value="highest">Điểm cao nhất</option>
                </select>
              </label>
            </div>
            <div class="photo-album__progress" aria-label="Tiến độ từng chủ đề"></div>
          </section>
          <div class="photo-album__list-view">
            <div class="photo-album__empty">
              <strong>Chưa có ảnh nào</strong>
              <span>Mở máy ảnh bằng <kbd>C</kbd> rồi nhấn <kbd>Space</kbd> để chụp.</span>
            </div>
            <div class="photo-album__grid" aria-live="polite"></div>
          </div>
          <div class="photo-album__detail" hidden>
            <div class="photo-album__detail-toolbar">
              <button class="photo-album__back" type="button">← Quay lại album</button>
              <button class="photo-album__delete" type="button">Xóa ảnh</button>
            </div>
            <figure class="photo-album__figure">
              <img class="photo-album__full-image" alt="Ảnh đã chụp trong game">
              <figcaption></figcaption>
            </figure>
          </div>
        </article>
      </section>
    `)

    this.element = this.root.querySelector('.photo-album')
    this.panel = this.element.querySelector('.photo-album__panel')
    this.backdrop = this.element.querySelector('.photo-album__backdrop')
    this.closeButton = this.element.querySelector('.photo-album__close')
    this.count = this.element.querySelector('.photo-album__count')
    this.catalogPanel = this.element.querySelector('.photo-album__catalog')
    this.themeFilter = this.element.querySelector('.photo-album__theme-filter')
    this.starsFilter = this.element.querySelector('.photo-album__stars-filter')
    this.sort = this.element.querySelector('.photo-album__sort')
    this.progress = this.element.querySelector('.photo-album__progress')
    this.listView = this.element.querySelector('.photo-album__list-view')
    this.empty = this.element.querySelector('.photo-album__empty')
    this.grid = this.element.querySelector('.photo-album__grid')
    this.detail = this.element.querySelector('.photo-album__detail')
    this.backButton = this.element.querySelector('.photo-album__back')
    this.deleteButton = this.element.querySelector('.photo-album__delete')
    this.fullImage = this.element.querySelector('.photo-album__full-image')
    this.caption = this.element.querySelector('.photo-album__figure figcaption')
    this.previouslyFocused = null

    for (const theme of PHOTO_ALBUM_THEMES) {
      const option = this.document.createElement('option')
      option.value = theme.id
      option.textContent = theme.name
      this.themeFilter.append(option)
    }

    this.handleClose = () => this.handlers.close()
    this.handleBackdrop = () => this.handlers.close()
    this.handleBack = () => this.handlers.back()
    this.handleDelete = () => this.handlers.delete(this.selectedId)
    this.handleGridClick = (event) => {
      const card = event.target.closest?.('[data-photo-id]')
      if (card) this.handlers.select(card.dataset.photoId)
    }
    this.handleThemeFilter = () => this.handlers.themeFilter(this.themeFilter.value)
    this.handleStarsFilter = () => this.handlers.starsFilter(this.starsFilter.value)
    this.handleSort = () => this.handlers.sort(this.sort.value)
    this.closeButton.addEventListener('click', this.handleClose)
    this.backdrop.addEventListener('click', this.handleBackdrop)
    this.backButton.addEventListener('click', this.handleBack)
    this.deleteButton.addEventListener('click', this.handleDelete)
    this.grid.addEventListener('click', this.handleGridClick)
    this.themeFilter.addEventListener('change', this.handleThemeFilter)
    this.starsFilter.addEventListener('change', this.handleStarsFilter)
    this.sort.addEventListener('change', this.handleSort)
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers }
  }

  setOpen(open) {
    if (open) {
      this.previouslyFocused = this.document.activeElement
      this.element.hidden = false
      this.element.setAttribute('aria-hidden', 'false')
      this.root.classList.add('is-photo-album-active')
      this.closeButton.focus({ preventScroll: true })
      return
    }

    this.root.classList.remove('is-photo-album-active')
    this.element.hidden = true
    this.element.setAttribute('aria-hidden', 'true')
    this.fullImage.removeAttribute('src')
    this.closeButton.blur()
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus?.({ preventScroll: true })
    }
    this.previouslyFocused = null
  }

  render(records, selectedId = null, albumState = {}) {
    this.records = records
    this.selectedId = selectedId
    this.albumState = albumState
    const total = albumState.totalCount ?? records.length
    this.count.textContent = records.length === total
      ? `${total} ảnh trong phiên`
      : `${records.length}/${total} ảnh phù hợp bộ lọc`
    this.themeFilter.value = albumState.themeFilter ?? 'all'
    this.starsFilter.value = String(albumState.starsFilter ?? 0)
    this.sort.value = albumState.sortMode ?? 'newest'
    this.#renderProgress()
    this.#renderGrid()
    this.#renderDetail()
  }

  #renderProgress() {
    this.progress.replaceChildren()
    for (const item of this.albumState?.themeProgress ?? []) {
      const progress = this.document.createElement('div')
      progress.className = 'photo-album-progress'
      if (item.completed) progress.classList.add('is-complete')
      const label = this.document.createElement('span')
      label.textContent = item.name
      const value = this.document.createElement('strong')
      value.textContent = `${Math.min(item.count, item.target)}/${item.target}`
      progress.append(label, value)
      this.progress.append(progress)
    }
  }

  #renderGrid() {
    this.grid.replaceChildren()
    this.empty.hidden = this.records.length > 0
    if (!this.records.length) {
      const title = this.empty.querySelector('strong')
      const hint = this.empty.querySelector('span')
      const hasPhotos = (this.albumState?.totalCount ?? 0) > 0
      title.textContent = hasPhotos ? 'Không có ảnh phù hợp' : 'Chưa có ảnh nào'
      hint.textContent = hasPhotos
        ? 'Thử đổi chủ đề, số sao hoặc cách sắp xếp.'
        : ''
      if (!hasPhotos) {
        hint.append(
          'Mở máy ảnh bằng ',
          Object.assign(this.document.createElement('kbd'), { textContent: 'C' }),
          ' rồi nhấn ',
          Object.assign(this.document.createElement('kbd'), { textContent: 'Space' }),
          ' để chụp.',
        )
      }
    }
    for (const record of this.records) {
      const metadata = getMetadata(record.photo)
      const album = getAlbumData(record)
      const card = this.document.createElement('button')
      card.type = 'button'
      card.className = 'photo-album-card'
      card.dataset.photoId = record.id
      card.setAttribute(
        'aria-label',
        `Xem ảnh chụp lúc ${metadata.time}, ${metadata.location}`,
      )

      const image = this.document.createElement('img')
      image.src = record.thumbnailUrl
      image.alt = ''
      image.loading = 'lazy'
      image.decoding = 'async'

      const summary = this.document.createElement('span')
      summary.className = 'photo-album-card__summary'
      const primary = this.document.createElement('strong')
      primary.textContent = `${metadata.time} · ${metadata.location}`
      const secondary = this.document.createElement('small')
      secondary.textContent = `${metadata.subjects} · ${metadata.events}`
      secondary.title = `${metadata.focalLength} · ${metadata.lighting}`
      const description = this.document.createElement('small')
      description.className = 'photo-album-card__description'
      description.textContent = album.secret?.description ?? album.description
      const score = this.document.createElement('span')
      score.className = 'photo-album-card__score'
      score.textContent = `${metadata.stars} · ${metadata.scoreLabel}`
      const theme = this.document.createElement('span')
      theme.className = 'photo-album-card__theme'
      theme.textContent = album.secret
        ? `Bí mật · ${album.secret.name}`
        : album.primaryThemeName
      summary.append(primary, secondary, description, score, theme)
      card.append(image, summary)
      this.grid.append(card)
    }
  }

  #renderDetail() {
    const record = this.records.find((candidate) => candidate.id === this.selectedId)
    const showingDetail = Boolean(record)
    this.listView.hidden = showingDetail
    this.detail.hidden = !showingDetail
    if (!record) {
      this.fullImage.removeAttribute('src')
      this.caption.replaceChildren()
      return
    }

    this.fullImage.src = record.fullUrl
    this.caption.replaceChildren(
      createAlbumPanel(this.document, record),
      createScorePanel(this.document, record.photo),
      createMetadataList(this.document, record.photo, 'photo-album__metadata'),
    )
    this.backButton.focus({ preventScroll: true })
  }

  dispose() {
    this.closeButton.removeEventListener('click', this.handleClose)
    this.backdrop.removeEventListener('click', this.handleBackdrop)
    this.backButton.removeEventListener('click', this.handleBack)
    this.deleteButton.removeEventListener('click', this.handleDelete)
    this.grid.removeEventListener('click', this.handleGridClick)
    this.themeFilter.removeEventListener('change', this.handleThemeFilter)
    this.starsFilter.removeEventListener('change', this.handleStarsFilter)
    this.sort.removeEventListener('change', this.handleSort)
    this.root.classList.remove('is-photo-album-active')
    this.element.remove()
  }
}
