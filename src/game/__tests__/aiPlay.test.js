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
