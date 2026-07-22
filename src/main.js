import './styles/main.css'
import { Game } from './core/Game.js'

const app = document.querySelector('#app')
app.innerHTML = '<div class="render-root"></div><div class="ui-root"></div>'

const game = new Game(
  app.querySelector('.render-root'),
  app.querySelector('.ui-root'),
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose())
}
