import { mapCoordinates } from '../world/map/MapCoordinateSystem.js'
import { MAP_REGISTRY } from '../world/map/MapRegistry.js'
import {
  HOAN_KIEM_EXPANSION_PLAZAS,
  HOAN_KIEM_EXPANSION_ROADS,
  HOAN_KIEM_LAKE_OUTLINE,
  HOAN_KIEM_PROMENADE_OUTLINE,
} from '../world/map/hoanKiemExpansionLayout.js'
import { HOAN_KIEM_PEDESTRIAN_ZONES } from '../world/map/hoanKiemPedestrianLayout.js'
import {
  getUrbanBuildingFootprint,
  HOAN_KIEM_URBAN_CLUSTERS,
  HOAN_KIEM_URBAN_SIDE_ROADS,
} from '../world/map/hoanKiemUrbanEdgeLayout.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export function createMapViewModel(mapId) {
  const definition = MAP_REGISTRY[mapId]
  if (!definition) throw new Error(`Unknown map overlay map: ${mapId}`)
  const data = definition.data
  const sourceBounds = mapCoordinates.sourceBounds(mapId)
  const expansion = mapId === 'hoanKiem'
    ? createHoanKiemExpansionViewModel()
    : null
  return {
    mapId,
    name: definition.name,
    minX: sourceBounds.x,
    minY: sourceBounds.y,
    width: sourceBounds.width,
    height: sourceBounds.height,
    groundPatches: data.groundPatches ?? [],
    water: expansion ? [] : data.water ?? [],
    walkZones: data.walkZones ?? [],
    buildings: data.buildings ?? [],
    shops: [...(data.shops ?? []), ...(data.vehicleShops ?? [])],
    landmarks: data.landmarks ?? [],
    exits: data.exits ?? [],
    parkingSpots: data.parkingSpots ?? [],
    fixtures: data.interiorFixtures ?? [],
    expansion,
  }
}

export function projectWorldPositionToMap(
  mapId,
  worldPosition,
  worldDirection = { x: 0, z: -1 },
  coordinates = mapCoordinates,
) {
  const definition = MAP_REGISTRY[mapId]
  if (!definition) throw new Error(`Unknown map projection map: ${mapId}`)
  if (!Number.isFinite(worldPosition?.x) || !Number.isFinite(worldPosition?.z)) {
    throw new TypeError('Map projection requires a finite world X/Z position')
  }

  const source = coordinates.worldToSource(mapId, worldPosition)
  const directionX = Number.isFinite(worldDirection?.x) ? worldDirection.x : 0
  const directionZ = Number.isFinite(worldDirection?.z) ? worldDirection.z : -1
  const ahead = coordinates.worldToSource(mapId, {
    x: worldPosition.x + directionX,
    z: worldPosition.z + directionZ,
  })
  const deltaX = ahead.x - source.x
  const deltaY = ahead.y - source.y
  const heading = Math.hypot(deltaX, deltaY) > 1e-9
    ? normalizeDegrees(Math.atan2(deltaY, deltaX) * 180 / Math.PI + 90)
    : 0
  const sourceBounds = coordinates.sourceBounds(mapId)
  const minX = sourceBounds.x
  const minY = sourceBounds.y
  const maxX = minX + sourceBounds.width
  const maxY = minY + sourceBounds.height

  return {
    x: clamp(source.x, minX, maxX),
    y: clamp(source.y, minY, maxY),
    rawX: source.x,
    rawY: source.y,
    heading,
    inside: source.x >= minX && source.x <= maxX && source.y >= minY && source.y <= maxY,
  }
}

export function getMapHotkeyAction(event, isOpen) {
  if (event?.repeat) return null
  const code = event?.code ?? event?.key
  if (code === 'KeyM' || code === 'm' || code === 'M') {
    return isOpen ? 'close-resume' : 'open'
  }
  if ((code === 'Escape' || code === 'Esc') && isOpen) return 'close'
  return null
}

export class MapOverlay {
  constructor(root, { onRequestClose = () => {} } = {}) {
    this.root = root
    this.onRequestClose = onRequestClose
    this.document = root.ownerDocument ?? document
    this.isOpen = false
    this.mapId = null
    this.lastCoordinateLabel = ''
    this.previouslyFocused = null

    this.root.insertAdjacentHTML('beforeend', `
      <section
        class="map-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-overlay-title"
        aria-hidden="true"
        hidden
      >
        <div class="map-overlay__backdrop" aria-hidden="true"></div>
        <article class="map-overlay__panel">
          <header class="map-overlay__header">
            <div>
              <span class="map-overlay__eyebrow">BẢN ĐỒ KHU VỰC</span>
              <h2 class="map-overlay__title" id="map-overlay-title"></h2>
              <p class="map-overlay__coordinates"></p>
            </div>
            <button class="map-overlay__close" type="button" aria-label="Đóng bản đồ">
              <kbd>M</kbd>
              <span>Đóng</span>
            </button>
          </header>
          <div class="map-overlay__body">
            <div class="map-overlay__frame">
              <svg
                class="map-overlay__svg"
                role="img"
                preserveAspectRatio="xMidYMid meet"
              ></svg>
            </div>
            <aside class="map-overlay__legend" aria-label="Chú giải bản đồ">
              <strong>CHÚ GIẢI</strong>
              <span><i class="map-key map-key--player"></i> Vị trí hiện tại</span>
              <span><i class="map-key map-key--road"></i> Đường đi</span>
              <span><i class="map-key map-key--water"></i> Mặt nước</span>
              <span><i class="map-key map-key--building"></i> Công trình</span>
              <span><i class="map-key map-key--landmark"></i> Landmark</span>
              <span><i class="map-key map-key--exit"></i> Lối chuyển khu</span>
              <small>Marker hình mũi tên cho biết vị trí và hướng đang nhìn.</small>
            </aside>
          </div>
          <footer class="map-overlay__footer">
            <span><kbd>M</kbd> đóng và tiếp tục</span>
            <span><kbd>Esc</kbd> đóng, giữ chuột tự do</span>
          </footer>
        </article>
      </section>
    `)

    this.element = this.root.querySelector('.map-overlay')
    this.backdrop = this.element.querySelector('.map-overlay__backdrop')
    this.panel = this.element.querySelector('.map-overlay__panel')
    this.title = this.element.querySelector('.map-overlay__title')
    this.coordinatesLabel = this.element.querySelector('.map-overlay__coordinates')
    this.closeButton = this.element.querySelector('.map-overlay__close')
    this.svg = this.element.querySelector('.map-overlay__svg')

    this.handleCloseClick = () => this.onRequestClose('button')
    this.handleBackdropClick = () => this.onRequestClose('backdrop')
    this.closeButton.addEventListener('click', this.handleCloseClick)
    this.backdrop.addEventListener('click', this.handleBackdropClick)
  }

  open(mapId, worldPosition, worldDirection) {
    this.previouslyFocused = this.document.activeElement
    this.isOpen = true
    this.element.hidden = false
    this.element.setAttribute('aria-hidden', 'false')
    this.#renderMap(mapId)
    this.updatePosition(mapId, worldPosition, worldDirection)
    this.closeButton.focus({ preventScroll: true })
  }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    this.element.hidden = true
    this.element.setAttribute('aria-hidden', 'true')
    this.closeButton.blur()
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus?.({ preventScroll: true })
    }
    this.previouslyFocused = null
  }

  updatePosition(mapId, worldPosition, worldDirection) {
    if (!this.isOpen) return null
    if (mapId !== this.mapId) this.#renderMap(mapId)
    const marker = projectWorldPositionToMap(mapId, worldPosition, worldDirection)
    this.markerPosition.setAttribute('transform', `translate(${marker.x} ${marker.y})`)
    this.markerDirection.setAttribute('transform', `rotate(${marker.heading})`)
    this.markerPosition.classList.toggle('is-outside', !marker.inside)

    const coordinateLabel = `Vị trí hiện tại · X ${Math.round(marker.rawX)} · Y ${Math.round(marker.rawY)}`
    if (coordinateLabel !== this.lastCoordinateLabel) {
      this.coordinatesLabel.textContent = coordinateLabel
      this.lastCoordinateLabel = coordinateLabel
    }
    return marker
  }

  #renderMap(mapId) {
    const view = createMapViewModel(mapId)
    this.mapId = mapId
    this.title.textContent = view.name
    this.svg.setAttribute('viewBox', `${view.minX} ${view.minY} ${view.width} ${view.height}`)
    this.svg.setAttribute('aria-label', `Bản đồ ${view.name} và vị trí hiện tại của bạn`)
    this.svg.style.setProperty('--map-stroke', String(Math.max(3, view.width / 620)))
    this.svg.style.setProperty('--map-label-size', `${Math.max(22, view.width / 64)}px`)
    this.svg.replaceChildren()

    this.svg.append(
      this.#svg('title', {}, `Bản đồ ${view.name}`),
      this.#svg('desc', {}, 'Bản đồ khu vực hiện tại với đường, công trình, landmark, lối chuyển khu và vị trí người chơi.'),
      this.#svg('rect', {
        class: 'map-shape map-base',
        x: view.minX,
        y: view.minY,
        width: view.width,
        height: view.height,
      }),
    )

    view.groundPatches.forEach((entry) => this.#appendRect(entry, `map-ground map-ground--${entry.kind}`))
    view.expansion?.roads.forEach((entry) => this.#appendRect(entry, 'map-zone map-zone--road'))
    view.expansion?.urbanRoads.forEach((entry) => this.#appendRect(entry, 'map-zone map-zone--road'))
    view.expansion?.plazas.filter((entry) => entry.kind !== 'sidewalk').forEach(
      (entry) => this.#appendRect(entry, `map-zone map-zone--${entry.kind}`),
    )
    view.expansion?.promenadePolygons.forEach(
      (entry) => this.#appendPolygon(entry, 'map-zone map-zone--sidewalk'),
    )
    view.water.forEach((entry) => this.#appendRect(entry, 'map-water'))
    view.expansion?.waterPolygons.forEach((entry) => this.#appendPolygon(entry, 'map-water'))
    view.expansion?.plazas.filter((entry) => entry.kind === 'sidewalk').forEach(
      (entry) => this.#appendRect(entry, 'map-zone map-zone--sidewalk'),
    )
    view.expansion?.pedestrianZones.forEach(
      (entry) => this.#appendRect(entry, `map-zone map-zone--${entry.kind}`),
    )
    view.walkZones.forEach((entry) => this.#appendRect(entry, `map-zone map-zone--${entry.kind}`))
    view.parkingSpots.forEach((entry) => this.#appendRect(entry, 'map-parking'))
    view.buildings.forEach((entry) => this.#appendRect(entry, `map-structure map-structure--${entry.kind}`))
    view.expansion?.urbanBuildings.forEach(
      (entry) => this.#appendRect(entry, 'map-structure map-structure--urban'),
    )
    view.shops.forEach((entry) => this.#appendRect(entry, 'map-structure map-shop'))
    view.fixtures.forEach((entry) => this.#appendFixture(entry))
    view.landmarks.forEach((entry) => this.#appendLandmark(entry, view.width))
    view.exits.forEach((entry) => this.#appendExit(entry, view.width))
    this.#appendPlayerMarker(view.width)
  }

  #appendRect(entry, className) {
    if (![entry.x, entry.y, entry.width, entry.height].every(Number.isFinite)) return
    const rect = this.#svg('rect', {
      class: `map-shape ${className}`,
      x: entry.x,
      y: entry.y,
      width: Math.max(0, entry.width),
      height: Math.max(0, entry.height),
    })
    rect.append(this.#svg('title', {}, entry.name ?? entry.label ?? entry.id))
    this.svg.append(rect)
  }

  #appendPolygon(entry, className) {
    if (!Array.isArray(entry.points) || entry.points.length < 3) return
    const polygon = this.#svg('polygon', {
      class: `map-shape ${className}`,
      points: entry.points.map(([x, y]) => `${x},${y}`).join(' '),
      'fill-rule': entry.fillRule ?? 'nonzero',
    })
    polygon.append(this.#svg('title', {}, entry.name ?? entry.id))
    this.svg.append(polygon)
  }

  #appendFixture(entry) {
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return
    if (Number.isFinite(entry.width) && Number.isFinite(entry.height)) {
      this.#appendRect(entry, `map-fixture map-fixture--${entry.kind}`)
      return
    }
    this.svg.append(this.#svg('circle', {
      class: `map-shape map-fixture map-fixture--${entry.kind}`,
      cx: entry.x,
      cy: entry.y,
      r: 14,
    }))
  }

  #appendLandmark(entry, mapWidth) {
    this.#appendRect(entry, `map-landmark-zone map-landmark-zone--${entry.kind}`)
    const x = entry.x + entry.width / 2
    const y = entry.y + entry.height / 2
    const label = this.#svg('text', {
      class: 'map-landmark-label',
      x,
      y,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }, entry.name)
    label.setAttribute('stroke-width', String(Math.max(2, mapWidth / 1200)))
    this.svg.append(label)
  }

  #appendExit(entry, mapWidth) {
    const point = entry.interactionPoint ?? {
      x: entry.x + entry.width / 2,
      y: entry.y + entry.height / 2,
    }
    const group = this.#svg('g', { class: 'map-exit' })
    group.append(
      this.#svg('circle', {
        cx: point.x,
        cy: point.y,
        r: Math.max(12, mapWidth / 105),
      }),
      this.#svg('text', {
        x: point.x,
        y: point.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }, '↗'),
      this.#svg('title', {}, entry.name ?? entry.id),
    )
    this.svg.append(group)
  }

  #appendPlayerMarker(mapWidth) {
    const size = Math.max(12, mapWidth / 108)
    this.markerPosition = this.#svg('g', { class: 'map-player-marker' })
    const pulse = this.#svg('circle', { class: 'map-player-marker__pulse', r: size * 1.35 })
    const core = this.#svg('circle', { class: 'map-player-marker__core', r: size * 0.62 })
    this.markerDirection = this.#svg('g', { class: 'map-player-marker__direction' })
    this.markerDirection.append(this.#svg('path', {
      d: `M 0 ${-size * 1.75} L ${size * 0.66} ${size * 0.38} L 0 ${size * 0.06} L ${-size * 0.66} ${size * 0.38} Z`,
    }))
    const label = this.#svg('text', {
      class: 'map-player-marker__label',
      x: 0,
      y: -size * 2.15,
      'text-anchor': 'middle',
    }, 'BẠN')
    this.markerPosition.append(pulse, this.markerDirection, core, label)
    this.svg.append(this.markerPosition)
  }

  #svg(tagName, attributes = {}, text = null) {
    const element = this.document.createElementNS(SVG_NAMESPACE, tagName)
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)))
    if (text !== null) element.textContent = text
    return element
  }

  dispose() {
    this.closeButton.removeEventListener('click', this.handleCloseClick)
    this.backdrop.removeEventListener('click', this.handleBackdropClick)
    this.element.remove()
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360
}

function createHoanKiemExpansionViewModel() {
  return {
    roads: HOAN_KIEM_EXPANSION_ROADS.map(worldRectToSourceRect),
    plazas: HOAN_KIEM_EXPANSION_PLAZAS.map(worldRectToSourceRect),
    waterPolygons: [{
      id: 'expanded-hoan-kiem-lake',
      name: 'Hồ Gươm mở rộng',
      points: worldPolygonToSource(HOAN_KIEM_LAKE_OUTLINE),
    }],
    promenadePolygons: [{
      id: 'expanded-hoan-kiem-promenade',
      name: 'Luồng đi bộ chính quanh Hồ Gươm',
      points: worldPolygonToSource(HOAN_KIEM_PROMENADE_OUTLINE),
    }],
    pedestrianZones: HOAN_KIEM_PEDESTRIAN_ZONES.map(worldRectToSourceRect),
    urbanRoads: HOAN_KIEM_URBAN_SIDE_ROADS.map(worldRectToSourceRect),
    urbanBuildings: HOAN_KIEM_URBAN_CLUSTERS.flatMap((cluster) => (
      cluster.buildings.map((building) => worldRectToSourceRect({
        ...getUrbanBuildingFootprint(building),
        id: building.id,
        name: building.name,
        kind: building.sign ? 'shopHouse' : 'tubeHouse',
      }))
    )),
  }
}

function worldRectToSourceRect(rect) {
  const first = mapCoordinates.worldToSource('hoanKiem', {
    x: rect.x - rect.width / 2,
    z: rect.z - rect.depth / 2,
  })
  const second = mapCoordinates.worldToSource('hoanKiem', {
    x: rect.x + rect.width / 2,
    z: rect.z + rect.depth / 2,
  })
  return {
    ...rect,
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(second.x - first.x),
    height: Math.abs(second.y - first.y),
  }
}

function worldPolygonToSource(points) {
  return points.map(([x, z]) => {
    const source = mapCoordinates.worldToSource('hoanKiem', { x, z })
    return [source.x, source.y]
  })
}
