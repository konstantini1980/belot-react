import { describe, it, expect } from 'vitest';
import { BelotGame, GAME_PHASES } from '../gameLogic';
import { Table, FRIEND_SEATS, HOST_SEAT, viewFor, rotateGame, seatFor } from '../onlineTable';

// Runs the table's own steps (deal, AI turns, trick collection) until a human must act
function runSteps(table) {
  for (let step = table.nextStep(); step; step = table.nextStep()) step.run();
}

// The view a seat gets, as the app reads it
const view = (table, seat) => BelotGame.deserialize(viewFor(table.game, seat));

// A human acting from their own view only: a legal bid or card, as their app would offer
function humanMove(table, seat) {
  const mine = view(table, seat);
  if (mine.phase === GAME_PHASES.BIDDING) {
    return { type: 'bid', bid: mine.bids.length === 0 ? 'clubs' : 'pass' };
  }
  const me = mine.players[0];
  const card = me.hand.find(c => mine.isValidCardPlay(me, c));
  return { type: 'play', cardId: card.id };
}

const token = () => crypto.randomUUID();

function tableWithFriend(friendSeat) {
  const table = new Table(friendSeat, token());
  table.join(token());
  table.handle(HOST_SEAT, { type: 'start' });
  return table;
}

describe('Online table: seats and lobby', () => {
  it('Gives the friend the free seat, then turns others away; tokens bring players back', () => {
    const host = token();
    const friend = token();
    const table = new Table(FRIEND_SEATS.opponent, host);
    expect(table.join(friend)).toEqual({ seat: 1 });
    expect(table.join(token())).toEqual({ error: 'full' });
    expect(table.join('made-up')).toEqual({ error: 'badToken' });
    expect(table.join(friend)).toEqual({ seat: 1 });
    expect(table.join(host)).toEqual({ seat: 0 });
    expect(table.seatOf(host)).toBe(0);
    expect(table.seatOf(token())).toBeNull();
  });

  it('Starts only when the host asks and the friend is there', () => {
    const table = new Table(FRIEND_SEATS.partner, token());
    expect(table.handle(HOST_SEAT, { type: 'start' })).toBeNull(); // Friend not here yet
    table.join(token());
    expect(table.handle(2, { type: 'start' })).toBeNull(); // Only the host starts
    expect(table.handle(HOST_SEAT, { type: 'start' })).toEqual({ type: 'start', seat: 0 });
    expect(table.nextStep().delay).toBe(0); // Deals right away
  });

  it('Survives a snapshot and restore', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    runSteps(table);
    const restored = Table.restore(JSON.parse(JSON.stringify(table.snapshot())));
    expect(restored.game.serialize()).toBe(table.game.serialize());
    expect(restored.tokens).toEqual(table.tokens);
    expect(restored.started).toBe(true);
  });
});

describe('Online table: what each player sees', () => {
  it('Shows only your own hand, and no undealt cards', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    runSteps(table); // Dealt, AI bids until a human's turn
    for (const seat of [0, 2]) {
      const mine = view(table, seat);
      expect(mine.deck).toEqual([]);
      expect(mine.players[0].hand.map(c => c.id)).toEqual(table.game.players[seat].hand.map(c => c.id));
      for (const other of [1, 2, 3]) {
        expect(mine.players[other].hand.every(c => c.hidden === true && c.id === undefined)).toBe(true);
      }
      // Nothing of another hand appears anywhere in the text
      const text = viewFor(table.game, seat);
      for (const other of [0, 1, 2, 3].filter(s => s !== seat)) {
        for (const card of table.game.players[other].hand) expect(text).not.toContain(`"${card.id}"`);
      }
    }
  });

  it('Turns seats so you are south: partner is north, the next player east', () => {
    expect([0, 1, 2, 3].map(s => seatFor(2, s))).toEqual([2, 3, 0, 1]);
    expect([0, 1, 2, 3].map(s => seatFor(1, s))).toEqual([3, 0, 1, 2]);
  });

  it('Turning by each seat and back gives the same game', () => {
    const table = tableWithFriend(FRIEND_SEATS.opponent);
    runSteps(table);
    const data = JSON.parse(table.game.serialize()).game;
    for (const viewer of [1, 2, 3]) {
      expect(rotateGame(rotateGame(data, viewer), 4 - viewer)).toEqual(data);
    }
  });

  it('Swaps teams for a player on team 1, so scores read "us" first', () => {
    const game = new BelotGame();
    game.totalScores = [30, 70];
    game.dealHistory = [{ contract: 'hearts', bidder: 3, double: false, redouble: false, points: [5, 11], hanging: 0, totals: [30, 70] }];
    game.winner = 1;
    const seen = BelotGame.deserialize(viewFor(game, 1));
    expect(seen.totalScores).toEqual([70, 30]);
    expect(seen.dealHistory[0]).toMatchObject({ bidder: 2, points: [11, 5], totals: [70, 30] });
    expect(seen.winner).toBe(0);
    expect(seen.players.map(p => p.team)).toEqual([0, 1, 0, 1]);
  });
});

describe('Online table: playing', () => {
  it('Rejects moves out of turn and actions at the wrong time', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    runSteps(table);
    const game = table.game;
    const waiting = [0, 2].find(seat => seat !== game.currentBidder);
    expect(table.handle(waiting, { type: 'bid', bid: 'spades' })).toBeNull();
    expect(table.handle(game.currentBidder, { type: 'nextDeal' })).toBeNull();
    expect(table.handle(game.currentBidder, { type: 'newGame' })).toBeNull();
    expect(table.handle(game.currentBidder, { type: 'bogus' })).toBeNull();
  });

  it('Plays whole games to the end with both humans acting from their own views', () => {
    for (const friendSeat of [FRIEND_SEATS.partner, FRIEND_SEATS.opponent]) {
      const table = tableWithFriend(friendSeat);
      let deals = 0;
      while (table.game.phase !== GAME_PHASES.FINISHED && deals < 200) {
        runSteps(table);
        const game = table.game;
        if (game.phase === GAME_PHASES.SCORING) {
          deals++;
          expect(table.handle(friendSeat, { type: 'nextDeal' })).toMatchObject({ type: 'deal' });
          continue;
        }
        if (game.phase === GAME_PHASES.FINISHED) break;
        const seat = game.phase === GAME_PHASES.BIDDING ? game.currentBidder : game.currentPlayer;
        expect(table.isHuman(seat)).toBe(true);
        expect(table.handle(seat, humanMove(table, seat))).not.toBeNull();
      }
      expect(table.game.phase).toBe(GAME_PHASES.FINISHED);
      expect(table.handle(HOST_SEAT, { type: 'newGame' })).toMatchObject({ type: 'newGame' });
      expect(table.game.phase).toBe(GAME_PHASES.DEALING);
    }
  });

  it('Leaves a full trick on the table, then collects it', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    // Play until a trick is full
    while (table.game.currentTrick.cards.length < 4) {
      const step = table.nextStep();
      if (step) { step.run(); continue; }
      const game = table.game;
      const seat = game.phase === GAME_PHASES.BIDDING ? game.currentBidder : game.currentPlayer;
      table.handle(seat, humanMove(table, seat));
    }
    const show = table.nextStep();
    expect(show.delay).toBe(2000);
    expect(show.run()).toEqual({ type: 'collect' });
    expect(table.game.currentPlayer).toBeNull();
    expect(table.handle(HOST_SEAT, { type: 'play', cardId: table.game.players[0].hand[0].id })).toBeNull();
    const collect = table.nextStep();
    expect(collect.delay).toBe(1000);
    collect.run();
    expect(table.game.tricks).toHaveLength(1);
    expect(table.game.currentTrick.cards).toHaveLength(0);
  });
});
