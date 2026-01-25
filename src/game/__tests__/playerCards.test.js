import { describe, it, expect, beforeEach } from 'vitest';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';

describe('Setting Cards for Players', () => {
  let game;

  beforeEach(() => {
    game = new BelotGame();
  });

  describe('Setting player hand directly', () => {
    it('should allow setting cards for a player', () => {
      const player = game.players[0];
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', '7')
      ];

      player.hand = cards;

      expect(player.hand).toHaveLength(4);
      expect(player.hand[0].suit).toBe('hearts');
      expect(player.hand[0].rank).toBe('A');
    });

    it('should allow setting different cards for different players', () => {
      const player1 = game.players[0];
      const player2 = game.players[1];

      player1.hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q')
      ];

      player2.hand = [
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('spades', 'Q')
      ];

      expect(player1.hand).toHaveLength(3);
      expect(player2.hand).toHaveLength(3);
      expect(player1.hand[0].suit).toBe('hearts');
      expect(player2.hand[0].suit).toBe('spades');
    });

    it('should allow setting full hand (8 cards)', () => {
      const player = game.players[0];
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('spades', 'Q'),
        new Card('spades', 'J')
      ];

      player.hand = cards;

      expect(player.hand).toHaveLength(8);
    });

    it('should allow replacing player hand', () => {
      const player = game.players[0];
      const initialCards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K')
      ];

      player.hand = initialCards;
      expect(player.hand).toHaveLength(2);

      const newCards = [
        new Card('spades', '7'),
        new Card('spades', '8'),
        new Card('spades', '9')
      ];

      player.hand = newCards;
      expect(player.hand).toHaveLength(3);
      expect(player.hand[0].suit).toBe('spades');
    });
  });

  describe('Card operations after setting', () => {
    it('should allow playing cards from set hand', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;

      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q')
      ];

      player.hand = cards;
      expect(player.hand).toHaveLength(3);

      const cardToPlay = player.hand[0];
      const result = game.playCard(0, cardToPlay.id);

      expect(result).toBe(true);
      expect(player.hand).toHaveLength(2);
      expect(player.hand.find(c => c.id === cardToPlay.id)).toBeUndefined();
    });

    it('should allow finding combinations from set hand', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;
      game.currentTrick = { cards: [] };
      game.tricks = [];

      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J'),
        new Card('hearts', 'J')
      ];

      player.hand = cards;

      // Play first card to trigger auto-announce
      game.playCard(0, player.hand[0].id);

      const combinations = game.announcedCombinations[player.team];
      expect(combinations.length).toBeGreaterThan(0);
    });

    it('should allow validating cards from set hand', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;
      game.currentTrick = { cards: [] };

      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('spades', '7')
      ];

      player.hand = cards;

      // Leading - all cards should be valid
      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(true);
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(true);

      // Set up trick with lead suit
      game.currentTrick = {
        cards: [
          { playerId: 1, card: new Card('hearts', '10') }
        ]
      };

      // Must follow suit
      // In trump ranking: J=0, 9=1, A=2, 10=3, K=4, Q=5
      // Since hearts 10 (ranking 3) is led:
      // - hearts A (ranking 2) is higher, so must play A if available
      // - hearts K (ranking 4) is lower, so can't play K if A is available
      player.hand = [
        new Card('hearts', 'A'), // Ranking 2 (higher than 10)
        new Card('hearts', 'K'), // Ranking 4 (lower than 10)
        new Card('spades', '7')
      ];
      expect(game.isValidCardPlay(player, player.hand[0])).toBe(true); // hearts A (valid, higher)
      expect(game.isValidCardPlay(player, player.hand[1])).toBe(false); // hearts K (invalid, lower than 10 and A available)
      expect(game.isValidCardPlay(player, player.hand[2])).toBe(false); // spades 7 (invalid, wrong suit)
    });
  });

  describe('Setting cards for testing scenarios', () => {
    it('should allow setting specific combination cards', () => {
      const player = game.players[0];
      
      // Set cards that form a tierce
      player.hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', '7')
      ];

      expect(player.hand).toHaveLength(4);
      const heartsCards = player.hand.filter(c => c.suit === 'hearts');
      expect(heartsCards).toHaveLength(3);
    });

    it('should allow setting cards for belot test', () => {
      const player = game.players[0];
      
      // Set cards that form belot
      player.hand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      expect(player.hand).toHaveLength(3);
      const queen = player.hand.find(c => c.rank === 'Q' && c.suit === 'hearts');
      const king = player.hand.find(c => c.rank === 'K' && c.suit === 'hearts');
      expect(queen).toBeDefined();
      expect(king).toBeDefined();
    });

    it('should allow setting cards for equals test', () => {
      const player = game.players[0];
      
      // Set four Jacks
      player.hand = [
        new Card('hearts', 'J'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J')
      ];

      expect(player.hand).toHaveLength(4);
      expect(player.hand.every(c => c.rank === 'J')).toBe(true);
    });

    it('should allow setting cards for validation test scenarios', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;

      // Set cards where player must follow suit
      player.hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('spades', '7'),
        new Card('clubs', '8')
      ];

      game.currentTrick = {
        cards: [
          { playerId: 1, card: new Card('hearts', '10') }
        ]
      };

      // Player has hearts, so must play hearts
      const heartsCards = player.hand.filter(c => c.suit === 'hearts');
      expect(heartsCards.length).toBeGreaterThan(0);
      
      // Check if hearts cards are valid
      // The logic requires playing higher trump if available when trump is led
      // hearts 10 (ranking 3) is led
      // hearts A (ranking 2) is higher than 10, so must play A
      // hearts K (ranking 4) is lower than 10, so can't play K if A is available
      const heartsA = heartsCards.find(c => c.rank === 'A');
      const heartsK = heartsCards.find(c => c.rank === 'K');
      
      if (heartsA) {
        expect(game.isValidCardPlay(player, heartsA)).toBe(true); // A is higher than 10, valid
      }
      if (heartsK && heartsA) {
        // K is lower than 10, and A (higher) is available, so must play A
        expect(game.isValidCardPlay(player, heartsK)).toBe(false);
      } else if (heartsK) {
        // If A is not available, K might be valid depending on other cards
        // But since 10 is led and K is lower, and we need to check if there are higher cards
        // For simplicity, let's just check that non-hearts cards are invalid
        const nonHeartsCards = player.hand.filter(c => c.suit !== 'hearts');
        nonHeartsCards.forEach(card => {
          expect(game.isValidCardPlay(player, card)).toBe(false);
        });
      }

      const nonHeartsCards = player.hand.filter(c => c.suit !== 'hearts');
      nonHeartsCards.forEach(card => {
        expect(game.isValidCardPlay(player, card)).toBe(false);
      });
    });
  });

  describe('Card removal after setting', () => {
    it('should remove card from hand when played', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;

      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q')
      ];

      player.hand = [...cards]; // Create copy
      const originalLength = player.hand.length;
      const cardToPlay = player.hand[0];

      game.playCard(0, cardToPlay.id);

      expect(player.hand).toHaveLength(originalLength - 1);
      expect(player.hand.find(c => c.id === cardToPlay.id)).toBeUndefined();
    });

    it('should maintain other cards when one is played', () => {
      const player = game.players[0];
      game.phase = 'playing';
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.currentPlayer = 0;

      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q')
      ];

      player.hand = [...cards];
      const cardToPlay = player.hand[1]; // Play K
      const remainingCard1 = player.hand[0]; // A
      const remainingCard2 = player.hand[2]; // Q

      game.playCard(0, cardToPlay.id);

      expect(player.hand).toHaveLength(2);
      expect(player.hand.find(c => c.id === remainingCard1.id)).toBeDefined();
      expect(player.hand.find(c => c.id === remainingCard2.id)).toBeDefined();
    });
  });
});

