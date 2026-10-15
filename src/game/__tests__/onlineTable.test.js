import { describe, it, expect } from 'vitest';
import { BelotGame, GAME_PHASES } from '../gameLogic';
import { Table, HOST_SEAT, HAND_OVER_AFTER_MS, viewFor, rotateGame, seatFor } from '../onlineTable';

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

const FRIEND_SEATS = { partner: 2, opponent: 1 };

// A started table with the host and one friend in the seat they chose
function tableWithFriend(friendSeat) {
  const table = new Table(token());
  table.join(token(), '', friendSeat);
  table.handle(HOST_SEAT, { type: 'start' });
  return table;
}

// A started table where every seat is a person
function fullTable() {
  const table = new Table(token(), 'Host');
  for (const seat of [2, 1, 3]) table.join(token(), '', seat);
  table.handle(HOST_SEAT, { type: 'start' });
  return table;
}

// Every human clicks "Next deal"; returns the last event
function allNextDeal(table) {
  let event = null;
  for (const seat of table.humanSeats()) event = table.handle(seat, { type: 'nextDeal' });
  return event;
}

describe('Online table: seats and lobby', () => {
  it('Seats people where they chose, then turns a fifth away; tokens bring players back', () => {
    const host = token();
    const table = new Table(host, 'Ana');
    const opp = token();
    expect(table.join(opp, 'Bo', 3)).toEqual({ seat: 3 });
    expect(table.join(token(), '', 3)).toEqual({ error: 'seatTaken' }); // Someone sat there first
    expect(table.join(token(), '', 0)).toEqual({ error: 'seatTaken' }); // The host's seat
    expect(table.join(token(), '', 1)).toEqual({ seat: 1 });
    expect(table.join(token(), '', 2)).toEqual({ seat: 2 });
    expect(table.join(token(), '', 2)).toEqual({ error: 'full' });
    expect(table.join('made-up')).toEqual({ error: 'badToken' });
    expect(table.join(opp)).toEqual({ seat: 3 });
    expect(table.join(host)).toEqual({ seat: 0 });
    expect(table.seats[3].name).toBe('Bo');
    expect(table.seatOf(host)).toBe(0);
    expect(table.seatOf(token())).toBeNull();
  });

  it('Without a chosen seat, takes the partner seat first, then the opponents', () => {
    const table = new Table(token());
    expect([table.join(token()), table.join(token()), table.join(token())]).toEqual([{ seat: 2 }, { seat: 1 }, { seat: 3 }]);
  });

  it('Starts only when the host asks and a friend is there; empty seats go to the AI', () => {
    const table = new Table(token());
    expect(table.handle(HOST_SEAT, { type: 'start' })).toBeNull(); // Nobody else here yet
    table.join(token(), '', 1);
    expect(table.handle(1, { type: 'start' })).toBeNull(); // Only the host starts
    expect(table.handle(HOST_SEAT, { type: 'start' })).toEqual({ type: 'start', seat: 0 });
    expect(table.humanSeats()).toEqual([0, 1]);
    expect(table.nextStep().delay).toBe(0); // Deals right away
  });

  it('Keeps names short and on one line', () => {
    const table = new Table(token(), '  Maria   Ivanova  Petrova ');
    expect(table.seats[0].name).toBe('Maria Ivanova Pe');
    expect(table.handle(0, { type: 'rename', name: 'Mimi' })).toEqual({ type: 'rename', seat: 0 });
    expect(table.handle(0, { type: 'rename', name: 'Mimi' })).toBeNull();
    expect(table.seats[0].name).toBe('Mimi');
  });

  it('Frees a seat when someone leaves the lobby, and passes on hosting', () => {
    const host = token();
    const table = new Table(host);
    const friend = token();
    table.join(friend, '', 1);
    expect(table.handle(HOST_SEAT, { type: 'leave' })).toMatchObject({ type: 'leave', seat: 0 });
    expect(table.seats[0]).toBeNull();
    expect(table.hostSeat).toBe(1);
    expect(table.handle(HOST_SEAT, { type: 'start' })).toBeNull(); // Not at the table any more
    expect(table.join(host)).toEqual({ seat: 2 }); // Back as a newcomer, in a free seat
  });

  it('Reads tables saved by the two-player server', () => {
    const host = token();
    const friend = token();
    const game = new BelotGame();
    const old = { friendSeat: 1, tokens: { 0: host, 1: friend }, started: true, game: game.serialize() };
    const table = Table.restore(JSON.parse(JSON.stringify(old)));
    expect(table.seatOf(host)).toBe(0);
    expect(table.seatOf(friend)).toBe(1);
    expect(table.humanSeats()).toEqual([0, 1]);
    expect(table.hostSeat).toBe(0);
    expect(table.readyForNextDeal).toEqual([]);
  });

  it('Survives a snapshot and restore', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    runSteps(table);
    const restored = Table.restore(JSON.parse(JSON.stringify(table.snapshot())));
    expect(restored.game.serialize()).toBe(table.game.serialize());
    expect(restored.seats).toEqual(table.seats);
    expect(restored.hostSeat).toBe(table.hostSeat);
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

  it('Plays whole games to the end with every human acting from their own view', () => {
    for (const makeTable of [() => tableWithFriend(FRIEND_SEATS.partner), () => tableWithFriend(FRIEND_SEATS.opponent), fullTable]) {
      const table = makeTable();
      let deals = 0;
      while (table.game.phase !== GAME_PHASES.FINISHED && deals < 200) {
        runSteps(table);
        const game = table.game;
        if (game.phase === GAME_PHASES.SCORING) {
          deals++;
          expect(table.handle(HOST_SEAT, { type: 'nextDeal' })).toMatchObject({ type: 'ready' });
          expect(allNextDeal(table)).toMatchObject({ type: 'deal' });
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

  it('Deals the next deal only after both humans click Next deal', () => {
    const table = tableWithFriend(FRIEND_SEATS.opponent);
    table.game.phase = GAME_PHASES.SCORING; // A deal was just scored
    const dealer = table.game.dealer;

    expect(table.handle(HOST_SEAT, { type: 'nextDeal' })).toEqual({ type: 'ready', seat: HOST_SEAT });
    expect(table.game.phase).toBe(GAME_PHASES.SCORING); // Still waiting for the friend
    expect(table.isWaitingForNextDeal(HOST_SEAT)).toBe(true);
    expect(table.isWaitingForNextDeal(FRIEND_SEATS.opponent)).toBe(false);
    expect(table.handle(HOST_SEAT, { type: 'nextDeal' })).toBeNull(); // Clicking twice changes nothing
    expect(table.nextStep()).toBeNull(); // Nothing moves on its own

    // The wait survives a server restart
    const restored = Table.restore(JSON.parse(JSON.stringify(table.snapshot())));
    expect(restored.isWaitingForNextDeal(HOST_SEAT)).toBe(true);

    expect(restored.handle(FRIEND_SEATS.opponent, { type: 'nextDeal' })).toEqual({ type: 'deal', seat: null });
    expect(restored.game.phase).toBe(GAME_PHASES.BIDDING);
    expect(restored.game.dealer).toBe((dealer + 3) % 4);
    expect(restored.isWaitingForNextDeal(HOST_SEAT)).toBe(false); // Fresh for the next deal
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

describe('Online table: four people, and people leaving', () => {
  it('Shows each of four players only their own hand', () => {
    const table = fullTable();
    runSteps(table);
    for (const seat of [0, 1, 2, 3]) {
      const text = viewFor(table.game, seat);
      for (const other of [0, 1, 2, 3].filter(s => s !== seat)) {
        for (const card of table.game.players[other].hand) expect(text).not.toContain(`"${card.id}"`);
      }
    }
  });

  it('Waits for all four to click Next deal', () => {
    const table = fullTable();
    table.game.phase = GAME_PHASES.SCORING;
    for (const seat of [0, 1, 2]) expect(table.handle(seat, { type: 'nextDeal' })).toMatchObject({ type: 'ready' });
    expect(table.game.phase).toBe(GAME_PHASES.SCORING);
    expect(table.handle(3, { type: 'nextDeal' })).toMatchObject({ type: 'deal' });
    expect(table.game.phase).toBe(GAME_PHASES.BIDDING);
  });

  it('Lets another player hand an offline player\'s seat to the AI only after the wait', () => {
    const table = fullTable();
    runSteps(table);
    table.setOnline(3, false, 1000);
    // The east player is offline; the host sees east as seat 3, the partner (seat 2) sees them as seat 1
    expect(table.handle(HOST_SEAT, { type: 'handOver', seat: 3 }, 1000 + HAND_OVER_AFTER_MS - 1)).toBeNull(); // Too soon
    expect(table.handle(3, { type: 'handOver', seat: 0 }, 1000 + HAND_OVER_AFTER_MS)).toBeNull(); // Not for yourself
    expect(table.handle(2, { type: 'handOver', seat: 1 }, 1000 + HAND_OVER_AFTER_MS)).toMatchObject({ type: 'handOver', seat: 3 });
    expect(table.isHuman(3)).toBe(false);
    expect(table.handle(3, { type: 'play', cardId: table.game.players[3].hand[0].id })).toBeNull(); // The AI plays it now
  });

  it('The AI plays a handed-over seat until its player comes back', () => {
    const table = fullTable();
    const east = table.seats[3].token;
    table.setOnline(3, false, 0);
    table.handle(HOST_SEAT, { type: 'handOver', seat: 3 }, HAND_OVER_AFTER_MS);
    // Play until it is east's turn: the table plays it by itself
    for (let i = 0; i < 200 && !(table.game.phase === GAME_PHASES.PLAYING && table.game.currentPlayer === 3); i++) {
      const step = table.nextStep();
      if (step) { step.run(); continue; }
      const game = table.game;
      const seat = game.phase === GAME_PHASES.BIDDING ? game.currentBidder : game.currentPlayer;
      table.handle(seat, humanMove(table, seat));
    }
    expect(table.game.currentPlayer).toBe(3);
    expect(table.nextStep().delay).toBe(1000); // An AI turn
    expect(table.join(east)).toEqual({ seat: 3 }); // Back
    expect(table.isHuman(3)).toBe(true);
    expect(table.nextStep()).toBeNull(); // Their own turn again
  });

  it('Someone leaving a running game: the AI plays their seat and anyone can take it', () => {
    const table = fullTable();
    table.game.phase = GAME_PHASES.SCORING;
    table.handle(0, { type: 'nextDeal' });
    table.handle(2, { type: 'nextDeal' });
    table.handle(3, { type: 'nextDeal' });
    // The last one who hadn't clicked leaves: the deal goes on without them
    expect(table.handle(1, { type: 'leave' })).toMatchObject({ type: 'deal' });
    expect(table.seats[1]).toBeNull();
    expect(table.humanSeats()).toEqual([0, 2, 3]);
    expect(table.join(token(), 'New', 1)).toEqual({ seat: 1 }); // Anyone can take over the free seat
  });

  it('Stops when everyone has left', () => {
    const table = tableWithFriend(FRIEND_SEATS.partner);
    table.handle(0, { type: 'leave' });
    table.handle(2, { type: 'leave' });
    expect(table.hostSeat).toBeNull();
    expect(table.nextStep()).toBeNull();
  });
});
