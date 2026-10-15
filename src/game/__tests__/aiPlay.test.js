import { describe, it, expect, beforeEach } from 'vitest';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';
import { makeAIPlayCard } from '../aiplayer';

const hand = (...ids) => ids.map(id => {
  const [suit, rank] = id.split('-');
  return new Card(suit, rank);
});

// AI leads when none of its cards is likely to win the trick (rule 2.1.2)
describe('AI fallback lead', () => {
  let game;

  beforeEach(() => {
    game = new BelotGame();
    game.phase = 'playing';
    game.currentPlayer = 1;
    game.currentTrick = { cards: [] };
    game.bids = [{ playerId: 0, bid: 'hearts' }];
    game.contract = 'hearts';
    game.trumpSuit = 'hearts';
    // Opponents and partner hold all the high cards
    game.players[0].hand = hand('spades-A', 'spades-10', 'clubs-A', 'hearts-J');
    game.players[2].hand = hand('spades-K', 'clubs-10', 'hearts-9', 'diamonds-A');
    game.players[3].hand = hand('spades-Q', 'clubs-K', 'hearts-A', 'diamonds-10');
  });

  it('leads the weakest card of its longest plain suit, keeping trumps', () => {
    game.players[1].hand = hand('hearts-7', 'clubs-8', 'spades-8', 'spades-7', 'diamonds-9');
    for (let i = 0; i < 20; i++) {
      expect(makeAIPlayCard(game, 1).id).toBe('spades-7');
    }
  });

  it('prefers the cheaper suit when two suits are equally long', () => {
    game.players[1].hand = hand('clubs-J', 'clubs-9', 'spades-8', 'spades-7');
    expect(makeAIPlayCard(game, 1).id).toBe('spades-7');
  });

  it('leads its weakest trump when it holds only trumps', () => {
    game.players[1].hand = hand('hearts-8', 'hearts-7', 'hearts-Q');
    expect(makeAIPlayCard(game, 1).id).toBe('hearts-7');
  });
});

// West (1) plays last after south (0) led, east (3, the partner) and north (2) followed
function lastToPlay(trick, westHand, otherHands = [[], [], []]) {
  const game = new BelotGame();
  game.phase = 'playing';
  game.bids = [{ playerId: 0, bid: 'hearts' }];
  game.contract = 'hearts';
  game.trumpSuit = 'hearts';
  game.currentTrick = { cards: [0, 3, 2].map((playerId, i) => ({ playerId, card: hand(trick[i])[0] })) };
  game.players[1].hand = hand(...westHand);
  [0, 2, 3].forEach((playerId, i) => { game.players[playerId].hand = hand(...otherHands[i]); });
  game.currentPlayer = 1;
  return game;
}

// Rule 2.2.0: last to play, an opponent holds the trick
describe('AI playing last takes a trick it can win', () => {
  it('beats the opponent with a card that is not the top of its suit', () => {
    const game = lastToPlay(['spades-J', 'spades-7', 'spades-8'], ['spades-K', 'spades-9', 'clubs-A'], [['spades-A'], ['spades-10'], []]);
    expect(makeAIPlayCard(game, 1).id).toBe('spades-K');
  });

  it('wins with the cheapest card that does it', () => {
    const game = lastToPlay(['spades-J', 'spades-7', 'spades-8'], ['spades-A', 'spades-K', 'clubs-7'], [['spades-10'], [], []]);
    expect(makeAIPlayCard(game, 1).id).toBe('spades-K');
  });

  it('overtrumps with its lowest higher trump, not its top trump', () => {
    const game = lastToPlay(['spades-A', 'spades-7', 'hearts-7'], ['hearts-J', 'hearts-8', 'clubs-7'], [['hearts-9'], [], []]);
    expect(makeAIPlayCard(game, 1).id).toBe('hearts-8');
  });
});

// Rules 2.2.1 and 2.2.2.x.1: the partner (east) holds the trick and west plays last
describe('AI playing last when the partner holds the trick', () => {
  it('gives the partner points it would lose later anyway', () => {
    // The spades A is still out, but nobody plays after west, so east's 10 keeps the trick
    const game = lastToPlay(['spades-7', 'spades-10', 'spades-8'], ['clubs-10', 'diamonds-7'], [['spades-A'], ['clubs-A'], ['diamonds-A']]);
    expect(makeAIPlayCard(game, 1).id).toBe('clubs-10');
  });

  it("doesn't overtrump the partner's trump with its top trump", () => {
    const game = lastToPlay(['spades-A', 'hearts-8', 'spades-7'], ['hearts-J', 'hearts-7', 'clubs-K'], [['spades-10'], ['clubs-A'], []]);
    expect(makeAIPlayCard(game, 1).id).not.toBe('hearts-J');
  });
});
