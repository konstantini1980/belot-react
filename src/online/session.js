// Where the online game server is, and which table this browser sits at.
// The server address comes from the build (VITE_ONLINE_SERVER, e.g. wss://belot.<name>.workers.dev);
// without it the app offers local play only. `npm run dev` uses a local `wrangler dev` server.
export const SERVER_URL = import.meta.env.VITE_ONLINE_SERVER
  || (import.meta.env.DEV ? `ws://${window.location.hostname}:8787` : '');

// { code, token, left } of our last table: a reload rejoins it, unless we left it;
// after leaving, the same link still gets our seat back
const STORAGE_KEY = 'belot-online';
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O or 1/I, easy to read out
export const CODE_LENGTH = 6;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null; // Storage blocked: the table is just not remembered
  }
}

export function loadSession() {
  try {
    const session = JSON.parse(storage()?.getItem(STORAGE_KEY) || 'null');
    return session?.code ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(code, token, left = false) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify({ code, token, left }));
  } catch {
    // Storage full or blocked: a reload won't rejoin, nothing else breaks
  }
}


export function newRoomCode() {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
  return Array.from(values, v => CODE_LETTERS[v % CODE_LETTERS.length]).join('');
}

// A typed code cleaned up: upper case, only the letters codes use
export function normalizeCode(text) {
  return text.toUpperCase().split('').filter(ch => CODE_LETTERS.includes(ch)).join('').slice(0, CODE_LENGTH);
}

// The link a friend opens to sit at this table
export function shareLink(code) {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

// The table code in the page address (a shared link), removed from the address once read
export function takeRoomFromUrl() {
  const url = new URL(window.location.href);
  const code = normalizeCode(url.searchParams.get('room') || '');
  if (url.searchParams.has('room')) {
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url);
  }
  return code.length === CODE_LENGTH ? code : null;
}

// Which table to open when the page loads: a shared link, else the table we were at
export function initialTable() {
  if (!SERVER_URL) return null;
  const saved = loadSession();
  const linked = takeRoomFromUrl();
  if (linked) return { code: linked, token: saved?.code === linked ? saved.token : newToken() };
  return saved && !saved.left ? { code: saved.code, token: saved.token } : null;
}

// Our secret for a seat at a table: the server seats whoever brings it
export function newToken() {
  return globalThis.crypto.randomUUID();
}
