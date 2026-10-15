import { BelotGame, GAME_PHASES } from './gameLogic';

// The game in progress is kept in the browser, so a page reload picks it up again
const STORAGE_KEY = 'belot-saved-game';

// Storage can be missing or refuse access (private mode, blocked site data), and a
// lost save is only an inconvenience, so every failure is ignored.
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveGame(game, store = storage()) {
  try {
    if (game.phase === GAME_PHASES.FINISHED) {
      store?.removeItem(STORAGE_KEY); // A finished game isn't resumed
    } else {
      store?.setItem(STORAGE_KEY, game.serialize());
    }
  } catch {
    // Storage full or blocked: carry on without saving
  }
}

// The saved game, or null if there is none or it can't be read
export function loadSavedGame(store = storage()) {
  try {
    const text = store?.getItem(STORAGE_KEY);
    const game = text ? BelotGame.deserialize(text) : null;
    return game && game.phase !== GAME_PHASES.FINISHED ? game : null;
  } catch {
    return null;
  }
}
