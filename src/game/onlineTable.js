import { BelotGame, GAME_PHASES } from './gameLogic';
import { makeAIBid, makeAIPlayCard } from './aiplayer';

// One table of an online game: up to four humans, with AI players in the other seats.
// The game server keeps one Table per room and is the only place the game changes;
// each player's app gets its own view (viewFor) and sends back actions (handle).
// No React and no network here, so the same rules run on the server and in tests.

export const HOST_SEAT = 0; // Whoever creates the table sits south
const JOIN_ORDER = [2, 1, 3, 0]; // No seat chosen: the first free one, partner first
export const HAND_OVER_AFTER_MS = 60 * 1000; // How long a player is offline before the AI may take over
export const NAME_LENGTH = 16;

// Same pacing as the local game in App.jsx
export const STEP_MS = { deal: 0, aiTurn: 1000, showFullTrick: 2000, collectTrick: 1000 };

// Each player's app makes up a random token and keeps it; the token is how the table
// knows who sits where, so a reload or a dropped connection gets the same seat back.
//
// seats[s] is null or { token, name, ai, offlineSince }. Before the start a null seat is
// empty; once the game runs, the AI plays it and anyone with the code can take it.
// ai: true means the AI plays for a player who is away; they get the seat back by returning.
export class Table {
  constructor(hostToken, hostName = '') {
    if (!isToken(hostToken)) throw new Error('Bad token');
    this.seats = [null, null, null, null];
    this.seats[HOST_SEAT] = newSeat(hostToken, hostName);
    this.hostSeat = HOST_SEAT;
    this.started = false;
    this.readyForNextDeal = []; // Human seats that clicked "Next deal" after this deal was scored
    this.game = new BelotGame();
  }

  // Everything needed to rebuild the table, as JSON-safe data (the server stores it)
  snapshot() {
    return {
      seats: this.seats, hostSeat: this.hostSeat, started: this.started,
      readyForNextDeal: this.readyForNextDeal, game: this.game.serialize(),
    };
  }

  static restore(data) {
    const table = Object.create(Table.prototype);
    if (data.seats) {
      table.seats = data.seats;
      table.hostSeat = data.hostSeat;
    } else {
      // Saved by the two-player server: { friendSeat, tokens: { seat: token } }
      table.seats = [0, 1, 2, 3].map(s => (data.tokens?.[s] ? newSeat(data.tokens[s]) : null));
      table.hostSeat = HOST_SEAT;
    }
    table.started = data.started;
    table.readyForNextDeal = data.readyForNextDeal ?? []; // Tables saved before this field had nobody waiting
    table.game = BelotGame.deserialize(data.game);
    return table;
  }

  // A person plays this seat (not empty, and not handed over to the AI)
  isHuman(seat) {
    const entry = this.seats[seat];
    return Boolean(entry) && !entry.ai;
  }

  humanSeats() {
    return [0, 1, 2, 3].filter(seat => this.isHuman(seat));
  }

  // The host may start once at least one friend sat down
  get canStart() {
    return !this.started && this.humanSeats().length >= 2;
  }

  // Whether this seat clicked "Next deal" and waits for the other humans
  isWaitingForNextDeal(seat) {
    return this.readyForNextDeal.includes(seat);
  }

  // The seat held by this token, or null
  seatOf(token) {
    if (!isToken(token)) return null;
    const seat = this.seats.findIndex(entry => entry?.token === token);
    return seat === -1 ? null : seat;
  }

  // Who is connecting: a known token gets its seat back (from the AI too, if it played
  // for them); a new one sits in the free seat it chose. Returns { seat }, or { error }.
  join(token, name, seat) {
    if (!isToken(token)) return { error: 'badToken' };
    const known = this.seatOf(token);
    if (known !== null) {
      const entry = this.seats[known];
      entry.ai = false; // Coming back: the AI hands the seat back
      entry.offlineSince = null;
      if (cleanName(name)) entry.name = cleanName(name);
      return { seat: known };
    }
    if (this.isFull) return { error: 'full' }; // Four people already sit here
    const chosen = Number.isInteger(seat) && seat >= 0 && seat < 4 ? seat : JOIN_ORDER.find(s => this.seats[s] === null);
    if (this.seats[chosen] !== null) return { error: 'seatTaken' }; // Someone sat there first
    this.seats[chosen] = newSeat(token, name);
    if (this.hostSeat === null) this.hostSeat = chosen; // First person at a table everyone left hosts it
    return { seat: chosen };
  }

  get isFull() {
    return this.seats.every(entry => entry !== null);
  }

  // The connection state of a seat, as the server sees its sockets
  setOnline(seat, online, now = Date.now()) {
    const entry = this.seats[seat];
    if (!entry) return;
    if (online) entry.offlineSince = null;
    else entry.offlineSince ??= now;
  }

  // Milliseconds this seat's player has been offline, or null while online
  offlineFor(seat, now = Date.now()) {
    const since = this.seats[seat]?.offlineSince;
    return since == null ? null : Math.max(0, now - since);
  }

  // Another player may let the AI play for someone who has been offline long enough
  canHandOver(seat, now = Date.now()) {
    return this.started && this.isHuman(seat) && this.offlineFor(seat, now) >= HAND_OVER_AFTER_MS;
  }

  // An action from the player in `seat`. A seat named in an action (handOver) is
  // as the sender sees the table (they are south). Returns the event to pass on to the
  // players ({ type, seat }), or null if the action isn't allowed now and nothing changed.
  handle(seat, action, now = Date.now()) {
    const game = this.game;
    if (!this.isHuman(seat)) return null; // Only someone sitting at the table acts
    const named = s => (Number.isInteger(s) && s >= 0 && s < 4 ? (s + seat) % 4 : null); // Their view → real seat
    switch (action?.type) {
      case 'rename': {
        const name = cleanName(action.name);
        if (name === this.seats[seat].name) return null; // Nothing changes
        this.seats[seat].name = name;
        return { type: 'rename', seat };
      }
      case 'start':
        if (seat !== this.hostSeat || !this.canStart) return null; // Only the host starts, once a friend is here
        this.started = true; // Empty seats are played by the AI from now on
        return { type: 'start', seat };
      case 'leave':
        this.seats[seat] = null; // In the lobby the seat is free again; in a game the AI plays it
        if (this.hostSeat === seat) this.passHost();
        return this.seatsChanged({ type: 'leave', seat });
      case 'handOver': {
        const target = named(action.seat);
        if (target === null || target === seat || !this.canHandOver(target, now)) return null; // Only for someone offline long enough
        this.seats[target].ai = true; // The seat stays theirs; they take it back by returning
        return this.seatsChanged({ type: 'handOver', seat: target });
      }
      case 'bid':
        if (!this.started || game.phase !== GAME_PHASES.BIDDING) return null; // Not bidding now
        return game.makeBid(seat, action.bid) ? { type: 'bid', seat } : null; // makeBid checks turn and bid
      case 'play':
        if (!this.started || game.currentTrick.cards.length === 4) return null; // The full trick is still on the table
        return game.playCard(seat, action.cardId) ? { type: 'play', seat } : null; // playCard checks turn and rules
      case 'nextDeal':
        if (!this.started || game.phase !== GAME_PHASES.SCORING) return null; // Only after a deal is scored
        if (this.readyForNextDeal.includes(seat)) return null; // Already clicked
        this.readyForNextDeal.push(seat);
        return this.dealIfAllReady() ?? { type: 'ready', seat }; // Waits for every human (AI players are always ready)
      case 'newGame':
        if (game.phase !== GAME_PHASES.FINISHED) return null; // Only once the game is won
        this.game = new BelotGame();
        this.readyForNextDeal = [];
        return { type: 'newGame', seat };
      default:
        return null; // Unknown action
    }
  }

  // A human left or the AI took a seat over: they no longer hold up "Next deal"
  seatsChanged(event) {
    this.readyForNextDeal = this.readyForNextDeal.filter(seat => this.isHuman(seat));
    return this.dealIfAllReady() ?? event;
  }

  // After a scored deal, deals the next one once every human clicked "Next deal"
  dealIfAllReady() {
    if (!this.started || this.game.phase !== GAME_PHASES.SCORING) return null; // Nothing to deal
    const humans = this.humanSeats();
    if (humans.length === 0 || !humans.every(seat => this.readyForNextDeal.includes(seat))) return null; // Someone hasn't clicked
    this.readyForNextDeal = [];
    this.game.dealer = (this.game.dealer + 3) % 4; // Next dealer is counter-clockwise
    this.game.deal();
    return { type: 'deal', seat: null };
  }

  // The host left: the person in the lowest seat hosts now (or the next one to arrive)
  passHost() {
    const next = this.humanSeats()[0] ?? this.seats.findIndex(Boolean);
    this.hostSeat = next === undefined || next === -1 ? null : next;
  }

  // What happens next without a human: { delay, run } where run() makes the change
  // and returns its event, or null while the table waits for a human
  nextStep() {
    const game = this.game;
    if (!this.started) return null; // Still in the lobby
    if (this.humanSeats().length === 0) return null; // Everyone left: the AI doesn't play on alone
    if (game.phase === GAME_PHASES.DEALING) {
      return { delay: STEP_MS.deal, run: () => { game.deal(); return { type: 'deal' }; } };
    }
    if (game.phase === GAME_PHASES.BIDDING && !this.isHuman(game.currentBidder)) {
      return { delay: STEP_MS.aiTurn, run: () => this.aiBid() };
    }
    if (game.phase !== GAME_PHASES.PLAYING) return null; // Scoring or finished: a human continues
    if (game.currentTrick.cards.length === 4) {
      if (game.currentPlayer !== null) {
        // Leave the full trick on the table, then nobody's turn while it is collected
        return { delay: STEP_MS.showFullTrick, run: () => { game.currentPlayer = null; return { type: 'collect' }; } };
      }
      return { delay: STEP_MS.collectTrick, run: () => { game.completeTrick(); return { type: 'trick' }; } };
    }
    if (!this.isHuman(game.currentPlayer)) {
      return { delay: STEP_MS.aiTurn, run: () => this.aiPlay() };
    }
    return null; // A human's turn
  }

  aiBid() {
    const game = this.game;
    const seat = game.currentBidder;
    const bid = makeAIBid(game.players[seat].hand, game.bids, game.players, seat);
    if (!game.makeBid(seat, bid)) {
      game.makeBid(seat, 'pass'); // Invalid AI bid falls back to pass
    }
    return { type: 'bid', seat };
  }

  aiPlay() {
    const game = this.game;
    const seat = game.currentPlayer;
    const card = makeAIPlayCard(game, seat);
    if (!card || !game.playCard(seat, card.id)) return null; // Should not happen
    return { type: 'play', seat };
  }
}

function newSeat(token, name = '') {
  return { token, name: cleanName(name), ai: false, offlineSince: null };
}

// A player's name as shown at the table: one line, short; '' shows the seat's usual label
export function cleanName(name) {
  return typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH) : '';
}

// Tokens are random UUIDs made by the player's app
function isToken(token) {
  return typeof token === 'string' && /^[0-9a-f-]{36}$/i.test(token);
}

// Seat `seat` as the player at `viewer` sees it: everyone sees themselves as player 0
// (south), so the app can draw an online game exactly like a local one
export function seatFor(viewer, seat) {
  return seat === null || seat === undefined ? seat : (seat - viewer + 4) % 4;
}

// The game as the player in `viewer`'s seat may see it, as serialize() text:
// other players' hands are face-down placeholders and the undealt cards are gone,
// and every seat and team is turned so the viewer is player 0 on team 0.
export function viewFor(game, viewer) {
  const saved = JSON.parse(game.serialize());
  saved.game = rotateGame(saved.game, viewer);
  saved.game.deck = []; // The cards still to be dealt are secret
  saved.game.players.forEach((player, id) => {
    if (id !== 0) player.hand = player.hand.map(() => ({ hidden: true })); // Only the count shows
  });
  return JSON.stringify(saved);
}

// Turns plain game data (from serialize) so that `viewer` becomes player 0.
// Seats move by -viewer; when viewer is on team 1 the two teams also swap,
// so every per-team pair ([team 0, team 1]) is swapped too.
export function rotateGame(data, viewer) {
  const seat = id => seatFor(viewer, id);
  const swap = viewer % 2 === 1;
  const team = t => (t === null || t === undefined ? t : (swap ? 1 - t : t));
  const pair = values => (swap ? [values[1], values[0]] : values);
  const plays = trick => ({ ...trick, cards: trick.cards.map(p => ({ ...p, playerId: seat(p.playerId) })),
    winner: seat(trick.winner), team: team(trick.team) });
  const combos = list => list.map(c => ({ ...c, playerId: seat(c.playerId) }));

  const players = [];
  data.players.forEach(p => { players[seat(p.id)] = { ...p, id: seat(p.id), team: seat(p.id) % 2 }; });

  return {
    ...data,
    players,
    dealer: seat(data.dealer),
    currentBidder: seat(data.currentBidder),
    currentPlayer: seat(data.currentPlayer),
    bids: data.bids.map(b => ({ ...b, playerId: seat(b.playerId) })),
    currentTrick: plays(data.currentTrick),
    tricks: data.tricks.map(plays),
    totalScores: pair(data.totalScores),
    currentRoundScore: pair(data.currentRoundScore),
    lastRoundBreakdown: pair(data.lastRoundBreakdown),
    lastRoundRoundedPoints: pair(data.lastRoundRoundedPoints),
    announcedCombinations: pair(data.announcedCombinations).map(combos),
    lastPlayAnnouncements: combos(data.lastPlayAnnouncements),
    dealHistory: data.dealHistory.map(d => ({ ...d, bidder: seat(d.bidder), points: pair(d.points), totals: pair(d.totals) })),
    winner: team(data.winner),
  };
}
