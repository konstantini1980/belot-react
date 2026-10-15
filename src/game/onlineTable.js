import { BelotGame, GAME_PHASES } from './gameLogic';
import { makeAIBid, makeAIPlayCard } from './aiplayer';

// One table of an online game: two humans (the host and a friend) and two AI players.
// The game server keeps one Table per room and is the only place the game changes;
// each player's app gets its own view (viewFor) and sends back actions (handle).
// No React and no network here, so the same rules run on the server and in tests.

export const HOST_SEAT = 0;
export const FRIEND_SEATS = { partner: 2, opponent: 1 };

// Same pacing as the local game in App.jsx
export const STEP_MS = { deal: 0, aiTurn: 1000, showFullTrick: 2000, collectTrick: 1000 };

// Each player's app makes up a random token and keeps it; the token is how the table
// knows who sits where, so a reload or a dropped connection gets the same seat back.
export class Table {
  constructor(friendSeat, hostToken) {
    if (!Object.values(FRIEND_SEATS).includes(friendSeat)) throw new Error('Bad friend seat');
    if (!isToken(hostToken)) throw new Error('Bad token');
    this.friendSeat = friendSeat;
    this.tokens = { [HOST_SEAT]: hostToken, [friendSeat]: null };
    this.started = false;
    this.game = new BelotGame();
  }

  // Everything needed to rebuild the table, as JSON-safe data (the server stores it)
  snapshot() {
    return { friendSeat: this.friendSeat, tokens: this.tokens, started: this.started, game: this.game.serialize() };
  }

  static restore(data) {
    const table = new Table(data.friendSeat, data.tokens[HOST_SEAT]);
    table.tokens = data.tokens;
    table.started = data.started;
    table.game = BelotGame.deserialize(data.game);
    return table;
  }

  isHuman(seat) {
    return seat === HOST_SEAT || seat === this.friendSeat;
  }

  get friendJoined() {
    return this.tokens[this.friendSeat] !== null;
  }

  // The seat held by this token, or null
  seatOf(token) {
    if (!isToken(token)) return null;
    return [HOST_SEAT, this.friendSeat].find(seat => this.tokens[seat] === token) ?? null;
  }

  // Who is connecting: a known token gets its seat back, a new one takes the
  // friend's seat while it is free. Returns the seat, or { error }.
  join(token) {
    if (!isToken(token)) return { error: 'badToken' };
    const seat = this.seatOf(token);
    if (seat !== null) return { seat }; // Coming back to their seat
    if (this.friendJoined) return { error: 'full' }; // Both human seats are taken
    this.tokens[this.friendSeat] = token;
    return { seat: this.friendSeat }; // The friend sits down
  }

  // An action from the player in `seat`. Returns the event to pass on to the players
  // ({ type, seat }), or null if the action isn't allowed now and nothing changed.
  handle(seat, action) {
    const game = this.game;
    switch (action?.type) {
      case 'start':
        if (seat !== HOST_SEAT || this.started || !this.friendJoined) return null; // Only the host starts, once both are here
        this.started = true;
        return { type: 'start', seat };
      case 'bid':
        if (!this.started || game.phase !== GAME_PHASES.BIDDING) return null; // Not bidding now
        return game.makeBid(seat, action.bid) ? { type: 'bid', seat } : null; // makeBid checks turn and bid
      case 'play':
        if (!this.started || game.currentTrick.cards.length === 4) return null; // The full trick is still on the table
        return game.playCard(seat, action.cardId) ? { type: 'play', seat } : null; // playCard checks turn and rules
      case 'nextDeal':
        if (game.phase !== GAME_PHASES.SCORING) return null; // Only after a deal is scored
        game.dealer = (game.dealer + 3) % 4; // Next dealer is counter-clockwise
        game.deal();
        return { type: 'deal', seat };
      case 'newGame':
        if (game.phase !== GAME_PHASES.FINISHED) return null; // Only once the game is won
        this.game = new BelotGame();
        return { type: 'newGame', seat };
      default:
        return null; // Unknown action
    }
  }

  // What happens next without a human: { delay, run } where run() makes the change
  // and returns its event, or null while the table waits for a human
  nextStep() {
    const game = this.game;
    if (!this.started) return null; // Still in the lobby
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
