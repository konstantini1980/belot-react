import { describe, it, expect } from 'vitest';
import { BelotGame, GAME_PHASES, lastContractBid } from '../gameLogic';
import { Card } from '../cards';

describe('clone', () => {
  it('copies everything a move changes, so the original state is untouched', () => {
    const game = new BelotGame();
    game.dealer = 0;
    game.deal();
    for (const bid of ['hearts', 'pass', 'pass', 'pass']) {
      game.makeBid(game.currentBidder, bid);
    }
    expect(game.phase).toBe(GAME_PHASES.PLAYING);

    const before = game.clone();
    const next = game.clone();
    const player = next.players[next.currentPlayer];
    next.playCard(player.id, player.hand.find(card => next.isValidCardPlay(player, card)).id);
    next.totalScores[0] = 99;
    next.announcedCombinations[0].push({ type: 'belot', points: 20 });

    expect(game.players.map(p => p.hand.length)).toEqual(before.players.map(p => p.hand.length));
    expect(game.players.map(p => p.hand.length)).toEqual([8, 8, 8, 8]);
    expect(game.currentTrick.cards).toEqual([]);
    expect(game.currentPlayer).toBe(before.currentPlayer);
    expect(game.totalScores).toEqual([0, 0]);
    expect(game.announcedCombinations).toEqual(before.announcedCombinations);
    expect(next.clone()).toBeInstanceOf(BelotGame);
  });
});

describe('Bidding', () => {
  // Dealer 0 means player 3 bids first, then 2, 1, 0 (counter-clockwise)
  function biddingGame() {
    const game = new BelotGame();
    game.dealer = 0;
    game.deal();
    return game;
  }

  it('finds the last contract bid, skipping pass, double and redouble', () => {
    expect(lastContractBid([
      { playerId: 3, bid: 'hearts' }, { playerId: 2, bid: 'double' }, { playerId: 1, bid: 'pass' }
    ])).toEqual({ playerId: 3, bid: 'hearts' });
    expect(lastContractBid([{ playerId: 3, bid: 'pass' }])).toBeUndefined();
  });

  it('after a double, a new contract must still outrank the doubled one', () => {
    const game = biddingGame();
    expect(game.makeBid(3, 'hearts')).toBe(true);
    expect(game.makeBid(2, 'double')).toBe(true);
    expect(game.makeBid(1, 'clubs')).toBe(false);
    expect(game.makeBid(1, 'spades')).toBe(true);
    expect(game.double).toBe(false);
  });

  it('a doubled contract cannot be doubled again', () => {
    const game = biddingGame();
    game.makeBid(3, 'hearts');
    game.makeBid(2, 'double');
    game.makeBid(1, 'pass');
    expect(game.canDouble(0)).toBe(false);
    expect(game.makeBid(0, 'double')).toBe(false);
  });

  it('the contract team may redouble later in the bidding, not only right after the double', () => {
    const game = biddingGame();
    game.makeBid(3, 'hearts');
    game.makeBid(2, 'double');
    expect(game.canRedouble(1)).toBe(true);
    game.makeBid(1, 'pass');
    expect(game.canRedouble(0)).toBe(false); // the doubling team
    game.makeBid(0, 'pass');
    expect(game.canRedouble(3)).toBe(true);
    expect(game.makeBid(3, 'redouble')).toBe(true);
    expect(game.canRedouble(1)).toBe(false); // already redoubled
  });
});

describe('Announcements of the last played card', () => {
  function firstTrickGame(hand) {
    const game = new BelotGame();
    game.phase = GAME_PHASES.PLAYING;
    game.contract = 'hearts';
    game.trumpSuit = 'hearts';
    game.currentPlayer = 0;
    game.players[0].hand = hand;
    return game;
  }

  it('lists the sequence and the belot the card announced', () => {
    const hand = [
      new Card('hearts', 'Q'), new Card('hearts', 'K'), new Card('hearts', 'A'),
      new Card('clubs', '7'), new Card('clubs', '9'), new Card('spades', '8'),
      new Card('spades', '10'), new Card('diamonds', '7')
    ];
    const game = firstTrickGame(hand);
    game.playCard(0, 'hearts-K');
    expect(game.lastPlayAnnouncements.map(c => c.type)).toEqual(['tierce', 'belot']);
    expect(game.announcedCombinations[0].map(c => c.type)).toEqual(['tierce', 'belot']);
  });

  it('leaves out a tierce already beaten by the opponents\' quarte', () => {
    const hand = [
      new Card('clubs', '7'), new Card('clubs', '8'), new Card('clubs', '9'),
      new Card('spades', 'A'), new Card('spades', 'Q'), new Card('diamonds', '8'),
      new Card('diamonds', '10'), new Card('hearts', '7')
    ];
    const game = firstTrickGame(hand);
    game.announcedCombinations[1] = [{ type: 'quarte', points: 50, cards: [], playerId: 1 }];
    game.playCard(0, 'spades-A');
    expect(game.lastPlayAnnouncements).toEqual([]);
    expect(game.announcedCombinations[0]).toEqual([]);
  });
});
