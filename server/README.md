# Belot game server (online play)

A Cloudflare Worker with one Durable Object per table. It runs the same rules code as the
app (`../src/game/onlineTable.js`), deals, runs the AI players in the seats no person takes, and sends each of up to four humans only
their own cards. The app on GitHub Pages connects to it over a WebSocket.

## Run it locally

```bash
cd server
npm install
npm run dev          # ws://localhost:8787
```

In another terminal, `npm run dev` in the repo root. In dev mode the app uses
`ws://<host>:8787` by itself, so "Play online with friends" works right away. Open the
game in several browser windows (or private windows) to play more than one seat.

## Deploy (owner's step, once)

1. Make a free Cloudflare account at https://dash.cloudflare.com/sign-up.
2. `cd server && npm install && npx wrangler login`, then `npm run deploy`.
   It prints the address, like `https://belot.<your-subdomain>.workers.dev`.
3. In GitHub: Settings → Secrets and variables → Actions → Variables → New repository
   variable `ONLINE_SERVER_URL` = `wss://belot.<your-subdomain>.workers.dev` (wss, not https).
4. Re-run the CI workflow on `main` (or merge anything). The Pages build then shows
   "Play online with friends" on the start screen. Without the variable the site offers
   local play only.

## Automatic deploys (owner's step, once)

After the first deploy, CI can redeploy the server by itself: on every merge to `main` that
changes `server/` or `src/game/`, the `deploy-server` job runs `wrangler deploy`, so the
server always plays by the same rules as the app. It needs one secret:

1. In Cloudflare: My Profile → API Tokens → Create Token → template **Edit Cloudflare
   Workers** → pick your account → Create. Copy the token.
2. In GitHub: Settings → Secrets and variables → Actions → Secrets → New repository secret
   `CLOUDFLARE_API_TOKEN` = that token.

Without the secret the job skips and you redeploy by hand (`npm run deploy` here) whenever
`src/game/` or `server/` changes. A redeploy drops open connections for a moment; the app
reconnects by itself and the table carries on.

## Costs and limits

The Workers free plan covers this: SQLite-backed Durable Objects, 100,000 requests a day.
A table nobody touches for 24 hours (no move, join or deal) is deleted.

## Protocol

Client → server, JSON over the WebSocket at `/rooms/<CODE>`:
- `{ type: 'look' }` (optional, before sitting down): the server answers `{ type: 'seats',
  started, seats }` with each seat's real number, name and state (host at the bottom), and
  again whenever that changes, so the join screen can offer the free seats.
- `{ type: 'hello', token, name?, seat?, create? }` to sit down. The token is a random UUID
  the app keeps; it is how a player gets the same seat back. `seat` is the chosen free seat
  (a real seat number from `seats`); if someone took it first the answer is the error
  `seatTaken` and the socket stays open to pick again.
- `{ type: 'start' }` (host), `{ type: 'rename', name }`,
  `{ type: 'leave' }`, `{ type: 'handOver', seat }` (host; anyone if the host is the one away: someone offline
  for a minute leaves their seat, as with `leave`, and the AI plays it), `{ type: 'bid', bid }`, `{ type: 'play', cardId }`, `{ type: 'nextDeal' }`,
  `{ type: 'newGame' }`. Seats in actions are numbered as the sender sees the table (they are 0).

Server → client: `{ type: 'joined' }`, `{ type: 'error', error }` (`noRoom`, `full`,
`taken`, `badToken`, `seatTaken`), and `{ type: 'state', isHost, started, canStart, seats, handOverAfter,
waitingForNextDeal, event, game }` after every change. `seats` lists the four seats turned the
same way (`name`, `state`: empty / human, `online`, `offlineFor`, `host`). `game` is the game as that player sees it
(`viewFor`): turned so they are player 0, other hands face down.
