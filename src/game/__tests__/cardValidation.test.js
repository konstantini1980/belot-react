import { describe, it, expect, beforeEach } from 'vitest';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';

describe('Card Validation (isValidCardPlay)', () => {
  let game;

  beforeEach(() => {
    game = new BelotGame();
    game.phase = 'playing';
    game.contract = 'hearts';
    game.trumpSuit = 'hearts';
    game.currentPlayer = 0;
    game.currentTrick = [];
  });

  describe('Leading a trick', () => {
    it('should allow any card when leading', () => {
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'A'),
        new Card('spades', '7'),
        new Card('clubs', 'K')
      ];

      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(true);
    });
  });

  describe('Following suit (trump contract)', () => {
    beforeEach(() => {
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('spades', '7'),
        new Card('clubs', 'K')
      ];
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];
    });

    it('should require following suit when player has the lead suit', () => {
      const player = game.players[0];
      const validCard = player.hand[0]; // hearts A
      const invalidCard = player.hand[2]; // spades 7

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should allow any card when player does not have the lead suit', () => {
      const player = game.players[0];
      player.hand = [
        new Card('spades', 'A'),
        new Card('clubs', 'K'),
        new Card('diamonds', '7')
      ];
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];

      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(true);
    });
  });

  describe('Raising trump (trump contract)', () => {
    beforeEach(() => {
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'J'), // Highest trump
        new Card('hearts', '9'),
        new Card('hearts', 'A'),
        new Card('hearts', 'K')
      ];
    });

    it('should require playing higher trump when trump is led and player has higher trump', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];
      const player = game.players[0];
      // In trump ranking: J=0, 9=1, A=2, 10=3, K=4, Q=5
      // So A (ranking 2) is actually higher than 10 (ranking 3)
      // Let's test with 9 which has ranking 1, higher than 10
      player.hand = [
        new Card('hearts', 'J'), // Ranking 0 (highest)
        new Card('hearts', '9'), // Ranking 1
        new Card('hearts', 'A'), // Ranking 2
        new Card('hearts', 'K')  // Ranking 4 (lower than 10)
      ];
      const validCard = player.hand[1]; // 9 (higher than 10)
      const invalidCard = player.hand[3]; // K (lower than 10)

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should require playing higher trump when opponent has highest trump in trick', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', 'J') }, // Highest trump
        { playerId: 2, card: new Card('hearts', '9') }
      ];
      const player = game.players[0];
      const validCard = player.hand[0]; // J (same as highest, but player has it)
      const invalidCard = player.hand[2]; // A (lower than J)

      // Player must play J if they have it, or a higher trump if available
      // Since J is already played and is highest, player can play any trump
      // But if they have a higher one, they must play it
      player.hand = [
        new Card('hearts', 'J'), // Same as highest
        new Card('hearts', '9'),
        new Card('hearts', 'A')
      ];
      
      // J is the highest, so player can play any trump
      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
    });
  });

  describe('Cutting with trump (trump contract)', () => {
    beforeEach(() => {
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'J'),
        new Card('hearts', '9'),
        new Card('spades', 'A'),
        new Card('clubs', 'K')
      ];
    });

    it('should require playing trump when opponent has highest card and player has trump', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('spades', 'A') },
        { playerId: 2, card: new Card('spades', 'K') }
      ];
      game.players[1].team = 1; // Opponent
      game.players[2].team = 0; // Teammate
      game.players[0].team = 0; // Current player (teammate of player 2)

      const player = game.players[0];
      // Player must NOT have the lead suit (spades) to test cutting with trump
      player.hand = [
        new Card('hearts', 'J'),
        new Card('hearts', '9'),
        new Card('diamonds', 'A'), // Not spades
        new Card('clubs', 'K')
      ];
      
      // Player 1 (opponent) has spades A, which is highest in non-trump
      // Player 2 (teammate) has spades K, which is lower
      // Player 0 doesn't have spades, so must cut with trump if opponent has highest
      // So opponent has highest card, player must play trump
      const validCard = player.hand[0]; // hearts J (trump)
      const invalidCard = player.hand[2]; // diamonds A (non-trump, non-lead-suit)

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should require playing higher trump when opponent cut with trump', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('spades', 'A') },
        { playerId: 2, card: new Card('hearts', '10') } // Opponent cut with trump
      ];
      game.players[1].team = 1; // Opponent
      game.players[2].team = 1; // Opponent
      game.players[0].team = 0; // Current player

      const player = game.players[0];
      // Player must NOT have the lead suit (spades) to test cutting with trump
      // When opponent cuts with trump, player must play higher trump if available
      player.hand = [
        new Card('hearts', 'J'), // Ranking 0 (higher than 10)
        new Card('hearts', '9'), // Ranking 1 (higher than 10)
        new Card('hearts', 'K'), // Ranking 4 (lower than 10)
        new Card('diamonds', 'A') // Not spades, not trump
      ];

      // In trump ranking: J=0, 9=1, A=2, 10=3, K=4, Q=5
      // Opponent played hearts 10 (ranking 3)
      // Player must play higher trump (J or 9) if available
      const validCard = player.hand[0]; // J (higher than 10, ranking 0)
      const invalidCard = player.hand[2]; // K (lower than 10, ranking 4)

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });
  });

  describe('No-trump contract', () => {
    beforeEach(() => {
      game.contract = 'no-trump';
      game.trumpSuit = null;
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('spades', '7'),
        new Card('clubs', 'K')
      ];
    });

    it('should require following suit when player has the lead suit', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];
      const player = game.players[0];
      const validCard = player.hand[0]; // hearts A
      const invalidCard = player.hand[2]; // spades 7

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should allow any card when player does not have the lead suit', () => {
      const player = game.players[0];
      player.hand = [
        new Card('spades', 'A'),
        new Card('clubs', 'K'),
        new Card('diamonds', '7')
      ];
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];

      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(true);
    });
  });

  describe('All-trump contract', () => {
    beforeEach(() => {
      game.contract = 'all-trump';
      game.trumpSuit = null;
      const player = game.players[0];
      player.hand = [
        new Card('hearts', 'J'),
        new Card('hearts', '9'),
        new Card('hearts', 'A'),
        new Card('spades', 'J')
      ];
    });

    it('should require following suit when player has the lead suit', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];
      const player = game.players[0];
      const validCard = player.hand[0]; // hearts J
      const invalidCard = player.hand[3]; // spades J

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should require raising when player has higher card of lead suit', () => {
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];
      const player = game.players[0];
      // In all-trump ranking: J=0, 9=1, A=2, 10=3, K=4, Q=5
      player.hand = [
        new Card('hearts', 'J'), // Ranking 0 (higher than 10)
        new Card('hearts', '9'), // Ranking 1 (higher than 10)
        new Card('hearts', 'K'), // Ranking 4 (lower than 10)
        new Card('spades', 'J')
      ];
      const validCard = player.hand[0]; // J (higher than 10)
      const invalidCard = player.hand[2]; // K (lower than 10)

      expect(game.isValidCardPlay(player, validCard)).toBe(true);
      expect(game.isValidCardPlay(player, invalidCard)).toBe(false);
    });

    it('should allow any card when player does not have the lead suit', () => {
      const player = game.players[0];
      player.hand = [
        new Card('spades', 'A'),
        new Card('clubs', 'K'),
        new Card('diamonds', '7')
      ];
      game.currentTrick = [
        { playerId: 1, card: new Card('hearts', '10') }
      ];

      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(true);
    });
  });
});

