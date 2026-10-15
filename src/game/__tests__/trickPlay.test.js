import { describe, it, expect } from 'vitest';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';

describe('playCard on a full trick', () => {
  it('refuses a fifth card while the trick waits to be collected', () => {
    const game = new BelotGame();
    game.phase = 'playing';
    game.contract = 'hearts';
    game.trumpSuit = 'hearts';
    game.tricks = [{ cards: [] }]; // Not the first trick, so no announcements
    game.players[0].hand = [new Card('spades', '7'), new Card('spades', '8')];
    game.players[1].hand = [new Card('spades', 'A')];
    game.players[2].hand = [new Card('spades', '10')];
    game.players[3].hand = [new Card('spades', 'K')];

    // Play goes counter-clockwise: 3, 2, 1, then you (0) last
    game.currentPlayer = 3;
    expect(game.playCard(3, 'spades-K')).toBe(true);
    expect(game.playCard(2, 'spades-10')).toBe(true);
    expect(game.playCard(1, 'spades-A')).toBe(true);
    expect(game.playCard(0, 'spades-7')).toBe(true);

    // Player 0 is still currentPlayer until completeTrick(), but may not play again
    expect(game.currentPlayer).toBe(0);
    expect(game.playCard(0, 'spades-8')).toBe(false);
    expect(game.currentTrick.cards).toHaveLength(4);
    expect(game.players[0].hand.map(c => c.id)).toEqual(['spades-8']);
  });
});
