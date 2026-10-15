import { DurableObject } from 'cloudflare:workers';
import { Table, FRIEND_SEATS, viewFor, seatFor } from '../../src/game/onlineTable.js';

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
    const seat = ws.deserializeAttachment()?.seat;
    if (seat === undefined || !this.table) return; // Must say hello first
    const event = this.table.handle(seat, message);
    if (event) await this.changed(event);
  }

  // A player arrives with their token: creates the table, takes the friend's seat,
  // or comes back to their own seat (saying hello twice is harmless)
  async hello(ws, { token, create }) {
    let joined;
    if (!this.table) {
      if (!create) return this.refuse(ws, 'noRoom');
      try {
        this.table = new Table(FRIEND_SEATS[create.friend] ?? FRIEND_SEATS.partner, token);
      } catch {
        return this.refuse(ws, 'badToken');
      }
      joined = { seat: 0 };
    } else if (create && this.table.seatOf(token) === null) {
      return this.refuse(ws, 'taken'); // Someone else's table has this code; the app picks another
    } else {
      joined = this.table.join(token);
      if (joined.error) return this.refuse(ws, joined.error);
    }
    ws.serializeAttachment({ seat: joined.seat });
    ws.send(JSON.stringify({ type: 'joined' }));
    await this.changed(null);
  }

  refuse(ws, error) {
    ws.send(JSON.stringify({ type: 'error', error }));
    ws.close(1000, error);
  }

  async webSocketClose() {
    this.broadcast(null); // The other player sees who went offline
  }

  async webSocketError() {
    this.broadcast(null);
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
    const sockets = this.ctx.getWebSockets().filter(ws => ws.readyState === WebSocket.OPEN);
    const online = new Set(sockets.map(ws => ws.deserializeAttachment()?.seat));
    for (const ws of sockets) {
      const seat = ws.deserializeAttachment()?.seat;
      if (seat === undefined) continue;
      const other = seat === 0 ? table.friendSeat : 0;
      ws.send(JSON.stringify({
        type: 'state',
        isHost: seat === 0,
        started: table.started,
        friendJoined: table.friendJoined,
        friendAt: seatFor(seat, other), // Where the other human sits, as this player sees the table
        friendOnline: online.has(other),
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
