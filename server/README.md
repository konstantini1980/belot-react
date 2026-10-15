# Belot game server (online play)

A Cloudflare Worker with one Durable Object per table. It runs the same rules code as the
app (`../src/game/onlineTable.js`), deals, runs the two AI players, and sends each human only
their own cards. The app on GitHub Pages connects to it over a WebSocket.

## Run it locally

```bash
cd server
npm install
npm run dev          # ws://localhost:8787
```

In another terminal, `npm run dev` in the repo root. In dev mode the app uses
`ws://<host>:8787` by itself, so "Play online with friends" works right away. Open the
game in two browser windows (or a private window) to play both seats.

## Deploy (owner's step, once)

1. Make a free Cloudflare account at https://dash.cloudflare.com/sign-up.
2. `cd server && npm install && npx wrangler login`, then `npm run deploy`.
   It prints the address, like `https://belot.<your-subdomain>.workers.dev`.
3. In GitHub: Settings → Secrets and variables → Actions → Variables → New repository
   variable `ONLINE_SERVER_URL` = `wss://belot.<your-subdomain>.workers.dev` (wss, not https).
4. Re-run the CI workflow on `main` (or merge anything). The Pages build then shows
   "Play online with friends" on the start screen. Without the variable the site offers
   local play only.

Redeploy the server (`npm run deploy`) whenever `src/game/` or `server/` changes, so the
server plays by the same rules as the app.

## Costs and limits

The Workers free plan covers this: SQLite-backed Durable Objects, 100,000 requests a day.
A table nobody touches for 7 days is deleted.

## Protocol

Client → server, JSON over the WebSocket at `/rooms/<CODE>`:
- `{ type: 'hello', token, create?: { friend: 'partner' | 'opponent' } }` first. The token
  is a random UUID the app keeps; it is how a player gets the same seat back.
- `{ type: 'start' }` (host), `{ type: 'bid', bid }`, `{ type: 'play', cardId }`,
  `{ type: 'nextDeal' }`, `{ type: 'newGame' }`.

Server → client: `{ type: 'joined' }`, `{ type: 'error', error }` (`noRoom`, `full`,
`taken`, `badToken`), and `{ type: 'state', isHost, started, friendJoined, friendAt,
friendOnline, event, game }` after every change. `game` is the game as that player sees it
(`viewFor`): turned so they are player 0, other hands face down.
