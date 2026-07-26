export class AudioSettingsUI {
  constructor(root, {
    initialVolume = 0.55,
    initialMuted = false,
    onVolumeChange = () => {},
    onMutedChange = () => {},
  } = {}) {
    this.root = root
    this.onVolumeChange = onVolumeChange
    this.onMutedChange = onMutedChange
    this.root.insertAdjacentHTML('beforeend', `
      <aside class="audio-settings" aria-label="Cài đặt âm thanh">
        <button class="audio-settings__mute" type="button" aria-pressed="false">
          Âm thanh
        </button>
        <label>
          <span class="sr-only">Âm lượng</span>
          <input
            class="audio-settings__volume"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${Math.round(initialVolume * 100)}"
          >
        </label>
      </aside>
    `)
    this.element = root.querySelector('.audio-settings')
    this.muteButton = this.element.querySelector('.audio-settings__mute')
    this.volumeInput = this.element.querySelector('.audio-settings__volume')
    this.handleMute = () => this.onMutedChange(
      this.muteButton.getAttribute('aria-pressed') !== 'true',
    )
    this.handleVolume = () => this.onVolumeChange(
      Number(this.volumeInput.value) / 100,
    )
    this.muteButton.addEventListener('click', this.handleMute)
    this.volumeInput.addEventListener('input', this.handleVolume)
    this.render({ volume: initialVolume, muted: initialMuted })
  }

  render({ volume, muted }) {
    this.volumeInput.value = String(Math.round(Math.max(0, Math.min(1, volume)) * 100))
    this.muteButton.setAttribute('aria-pressed', String(Boolean(muted)))
    this.muteButton.textContent = muted ? 'Âm thanh · Tắt' : 'Âm thanh'
  }

  dispose() {
    this.muteButton.removeEventListener('click', this.handleMute)
    this.volumeInput.removeEventListener('input', this.handleVolume)
    this.element.remove()
  }
}
