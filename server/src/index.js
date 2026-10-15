import { DurableObject } from 'cloudflare:workers';
import { Table, HAND_OVER_AFTER_MS, viewFor, seatFor } from '../../src/game/onlineTable.js';

// Online Belot server. The React app (on GitHub Pages) opens a WebSocket to
// /rooms/<CODE>; every room code is one GameRoom, which holds the table, runs
// the AI players and sends each human only what their seat may see.

const ROOM_CODE = /^[A-Z2-9]{4,8}$/;
const FORGET_AFTER_MS = 24 * 60 * 60 * 1000; // A table nobody touches for 24 hours is deleted

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/rooms\/([^/]+)$/);
    if (!match || !ROOM_CODE.test(match[1])) {
      return new Response('Belot game server', { status: match ? 400 : 404 });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }
    const room = env.ROOMS.get(env.ROOMS.idFromName(match[1]));
    return room.fetch(request);
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.table = null;
    this.timer = null;
    // Load the table before any message is handled (also after the room wakes up)
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('table');
      this.table = saved ? Table.restore(saved) : null;
      // Players whose connection didn't survive a restart count as offline from now
      const online = new Set(this.openSockets().map(ws => this.seatOf(ws)));
      [0, 1, 2, 3].forEach(seat => { if (!online.has(seat)) this.table?.setOnline(seat, false); });
      this.schedule();
    });
  }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    // Hibernatable socket: the room can sleep between messages without dropping players
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, text) {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return; // Not ours
    }
    if (message.type === 'hello') {
      await this.hello(ws, message);
      return;
    }
    const seat = this.seatOf(ws);
    if (seat === null) return; // Must say hello first (or left the table)
    const event = this.table.handle(seat, message);
    if (message.type === 'leave') ws.close(1000, 'left'); // Leaving also ends the connection
    if (event) await this.changed(event);
  }

  // The seat of the player on this socket. Looked up by token each time, because the
  // host can move people to other seats before the game starts.
  seatOf(ws) {
    const token = ws.deserializeAttachment()?.token;
    return this.table && token ? this.table.seatOf(token) : null;
  }

  // A player arrives with their token, name and the role from their invite link: creates
  // the table, takes a free seat, or comes back to their own (saying hello twice is harmless)
  async hello(ws, { token, name, as: role, create }) {
    if (!this.table) {
      if (!create) return this.refuse(ws, 'noRoom');
      try {
        this.table = new Table(token, name);
      } catch {
        return this.refuse(ws, 'badToken');
      }
    } else if (create && this.table.seatOf(token) === null) {
      return this.refuse(ws, 'taken'); // Someone else's table has this code; the app picks another
    } else {
      const joined = this.table.join(token, name, role);
      if (joined.error) return this.refuse(ws, joined.error);
    }
    ws.serializeAttachment({ token });
    ws.send(JSON.stringify({ type: 'joined' }));
    await this.changed(null);
  }

  refuse(ws, error) {
    ws.send(JSON.stringify({ type: 'error', error }));
    ws.close(1000, error);
  }

  // A connection dropped: if it was that player's last one, they count as offline from now
  // (the others see it, and after a while may let the AI play for them)
  async webSocketClose(ws) {
    await this.disconnected(ws);
  }

  async webSocketError(ws) {
    await this.disconnected(ws);
  }

  async disconnected(ws) {
    const seat = this.seatOf(ws);
    if (seat === null) return;
    const stillHere = this.openSockets().some(other => other !== ws && this.seatOf(other) === seat);
    if (stillHere) return;
    this.table.setOnline(seat, false);
    await this.ctx.storage.put('table', this.table.snapshot());
    this.broadcast(null);
  }

  openSockets() {
    return this.ctx.getWebSockets().filter(ws => ws.readyState === WebSocket.OPEN);
  }

  // After every change: save, tell everyone, and line up the next automatic step
  async changed(event) {
    await this.ctx.storage.put('table', this.table.snapshot());
    await this.ctx.storage.setAlarm(Date.now() + FORGET_AFTER_MS);
    this.broadcast(event);
    this.schedule();
  }

  schedule() {
    clearTimeout(this.timer);
    const step = this.table?.nextStep();
    if (!step) return;
    this.timer = setTimeout(async () => {
      const event = step.run();
      await this.changed(event);
    }, step.delay);
  }

  broadcast(event) {
    const table = this.table;
    if (!table) return;
    const sockets = this.openSockets();
    const online = new Set(sockets.map(ws => this.seatOf(ws)));
    const now = Date.now();
    // Who sits where, as one list for the whole table; each player gets it turned
    // so that they are first (south), like the game view
    const seats = [0, 1, 2, 3].map(seat => {
      const entry = table.seats[seat];
      return {
        name: entry?.name ?? '',
        state: !entry ? 'empty' : entry.ai ? 'away' : 'human', // empty: free, or the AI plays it; away: the AI plays for them
        online: online.has(seat),
        offlineFor: table.isHuman(seat) && !online.has(seat) ? table.offlineFor(seat, now) : null,
        host: seat === table.hostSeat,
      };
    });
    for (const ws of sockets) {
      const seat = this.seatOf(ws);
      if (seat === null) continue;
      ws.send(JSON.stringify({
        type: 'state',
        isHost: seat === table.hostSeat,
        started: table.started,
        canStart: table.canStart,
        seats: [0, 1, 2, 3].map(s => seats[(s + seat) % 4]),
        handOverAfter: HAND_OVER_AFTER_MS,
        waitingForNextDeal: table.isWaitingForNextDeal(seat), // Clicked "Next deal", others haven't yet
        event: event && { type: event.type, seat: seatFor(seat, event.seat) },
        game: viewFor(table.game, seat),
      }));
    }
  }

  // Nobody has used the table for 24 hours: forget it
  async alarm() {
    clearTimeout(this.timer);
    this.table = null;
    await this.ctx.storage.deleteAll();
  }
}
