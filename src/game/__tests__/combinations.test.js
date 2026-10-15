import { describe, it, expect } from 'vitest';
import { Card } from '../cards';
import { findSequences, findEquals, getAllCombinations, findBelotOnPlay } from '../combinations';

describe('Combination Discovery', () => {
  describe('findSequences', () => {
    it('should find a tierce (3-card sequence)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', '7')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('tierce');
      expect(sequences[0].cards).toHaveLength(3);
      expect(sequences[0].points).toBe(20);
    });

    it('should find a quarte (4-card sequence)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('spades', '7')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('quarte');
      expect(sequences[0].cards).toHaveLength(4);
      expect(sequences[0].points).toBe(50);
    });

    it('should find a quint (5+ card sequence)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10'),
        new Card('spades', '7')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('quint');
      expect(sequences[0].cards).toHaveLength(5);
      expect(sequences[0].points).toBe(100);
    });

    it('should find multiple sequences in different suits', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('spades', 'Q')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(2);
      expect(sequences.every(s => s.type === 'tierce')).toBe(true);
    });

    it('should not find sequences with gaps', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'J'), // Missing Q
        new Card('hearts', '10')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(0);
    });

    it('should find longest sequence when multiple sequences exist', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10'),
        new Card('hearts', '9')
      ];

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('quint');
      // Only five cards of the 6-card run count
      expect(sequences[0].cards).toHaveLength(5);
    });
    it('should count only the top five cards of a 6-card run as a quint', () => {
      const cards = ['A', 'K', 'Q', 'J', '10', '9'].map(r => new Card('hearts', r));

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('quint');
      expect(sequences[0].points).toBe(100);
      expect(sequences[0].cards.map(c => c.rank)).toEqual(['A', 'K', 'Q', 'J', '10']);
    });

    it('should count a 7-card run as a single quint', () => {
      const cards = ['K', 'Q', 'J', '10', '9', '8', '7'].map(r => new Card('spades', r));

      const sequences = findSequences(cards);
      expect(sequences).toHaveLength(1);
      expect(sequences[0].type).toBe('quint');
      expect(sequences[0].cards.map(c => c.rank)).toEqual(['K', 'Q', 'J', '10', '9']);
    });

    it('should count an 8-card run as a quint plus a tierce (120 points)', () => {
      const cards = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'].map(r => new Card('clubs', r));

      const sequences = findSequences(cards);
      expect(sequences.map(s => s.type)).toEqual(['quint', 'tierce']);
      expect(sequences[0].cards.map(c => c.rank)).toEqual(['A', 'K', 'Q', 'J', '10']);
      expect(sequences[1].cards.map(c => c.rank)).toEqual(['9', '8', '7']);
      expect(sequences.reduce((sum, s) => sum + s.points, 0)).toBe(120);
    });
  });

  describe('findEquals', () => {
    it('should find four Jacks', () => {
      const cards = [
        new Card('hearts', 'J'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J')
      ];

      const equals = findEquals(cards);
      expect(equals).toHaveLength(1);
      expect(equals[0].type).toBe('equal');
      expect(equals[0].cards).toHaveLength(4);
      expect(equals[0].points).toBe(200);
    });

    it('should find four Nines', () => {
      const cards = [
        new Card('hearts', '9'),
        new Card('spades', '9'),
        new Card('diamonds', '9'),
        new Card('clubs', '9')
      ];

      const equals = findEquals(cards);
      expect(equals).toHaveLength(1);
      expect(equals[0].points).toBe(150);
    });

    it('should find four Aces', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'A')
      ];

      const equals = findEquals(cards);
      expect(equals).toHaveLength(1);
      expect(equals[0].points).toBe(100);
    });

    it('should not find equals with less than 4 cards', () => {
      const cards = [
        new Card('hearts', 'J'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J')
      ];

      const equals = findEquals(cards);
      expect(equals).toHaveLength(0);
    });

    it('should find multiple equals', () => {
      const cards = [
        new Card('hearts', 'J'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J'),
        new Card('hearts', '9'),
        new Card('spades', '9'),
        new Card('diamonds', '9'),
        new Card('clubs', '9')
      ];

      const equals = findEquals(cards);
      expect(equals).toHaveLength(2);
    });
  });

  describe('getAllCombinations', () => {
    it('should return all sequences and equals', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J'),
        new Card('hearts', 'J')
      ];

      const combinations = getAllCombinations(cards, 'hearts');
      expect(combinations.length).toEqual(2);
      const sequences = combinations.filter(c => c.type === 'tierce' || c.type === 'quarte' || c.type === 'quint');
      expect(sequences.length).toEqual(1);
      expect(sequences[0].type).toEqual('tierce');
      expect(sequences[0].cards).toEqual([
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q')
      ]);

      const equals = combinations.filter(c => c.type === 'equal');
      expect(equals.length).toEqual(1);
      expect(equals[0].type).toEqual('equal');
      expect(equals[0].cards).toEqual([
        new Card('spades', 'J'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'J'),
        new Card('hearts', 'J')
      ]);
    });

    it('should not count a card in both four of a kind and a sequence', () => {
      // Four nines (150) share the 9 of hearts with the hearts tierce 10-9-8
      const cards = [
        new Card('hearts', '9'),
        new Card('spades', '9'),
        new Card('diamonds', '9'),
        new Card('clubs', '9'),
        new Card('hearts', '10'),
        new Card('hearts', '8'),
        new Card('spades', 'A'),
        new Card('clubs', '7')
      ];

      const combos = getAllCombinations(cards, 'spades');
      expect(combos.map(c => c.type)).toEqual(['equal']);
      expect(combos[0].points).toBe(150);
    });

    it('should keep sequences that the four of a kind does not break', () => {
      // Four tens take the 10 of spades; K-Q-J of spades is still a tierce
      const cards = [
        new Card('hearts', '10'),
        new Card('spades', '10'),
        new Card('diamonds', '10'),
        new Card('clubs', '10'),
        new Card('spades', 'K'),
        new Card('spades', 'Q'),
        new Card('spades', 'J'),
        new Card('spades', '9')
      ];

      const combos = getAllCombinations(cards, 'hearts');
      expect(combos.map(c => c.type)).toEqual(['equal', 'tierce']);
      expect(combos.reduce((sum, c) => sum + c.points, 0)).toBe(120);
      expect(combos[1].cards.map(c => c.rank)).toEqual(['K', 'Q', 'J']);
    });

    it('should announce an 8-card run as a quint and a tierce', () => {
      const cards = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'].map(r => new Card('diamonds', r));

      const combos = getAllCombinations(cards, 'hearts');
      expect(combos.reduce((sum, c) => sum + c.points, 0)).toBe(120);
    });

    it('should return empty array when no combinations exist', () => {
      const cards = [
        new Card('hearts', '7'),
        new Card('spades', '8'),
        new Card('diamonds', '9'),
        new Card('clubs', '10')
      ];

      const combinations = getAllCombinations(cards, 'hearts');
      expect(combinations).toHaveLength(0);
    });
  });

  describe('findBelotOnPlay', () => {
    it('should find belot when Queen is played in trump suit', () => {
      const contract = 'hearts';
      const playedCard = new Card('hearts', 'Q');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).not.toBeNull();
      expect(belot.type).toBe('belot');
      expect(belot.cards).toHaveLength(2);
      expect(belot.points).toBe(20);
    });

    it('should find belot when King is played in trump suit', () => {
      const contract = 'hearts';
      const playedCard = new Card('hearts', 'K');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).not.toBeNull();
      expect(belot.type).toBe('belot');
    });

    it('should not find belot when Queen is played but King is missing', () => {
      const contract = 'hearts';
      const playedCard = new Card('hearts', 'Q');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('spades', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).toBeNull();
    });

    it('should not find belot in no-trump contract', () => {
      const contract = 'no-trump';
      const playedCard = new Card('hearts', 'Q');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).toBeNull();
    });

    it('should find belot in all-trump contract', () => {
      const contract = 'all-trump';
      const playedCard = new Card('hearts', 'Q');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).not.toBeNull();
      expect(belot.type).toBe('belot');

      const leadSuit2 = 'spades';
      const belot2 = findBelotOnPlay(contract, playedCard, playerHand, leadSuit2);
      expect(belot2).toBeNull();
    });

    it('should not find belot when card is not in trump suit (trump contract)', () => {
      const contract = 'hearts';
      const playedCard = new Card('spades', 'Q');
      const leadSuit = 'spades';
      const playerHand = [
        new Card('spades', 'Q'),
        new Card('spades', 'K'),
        new Card('hearts', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).toBeNull();
    });

    it('should not find belot when non-Q/K card is played', () => {
      const contract = 'hearts';
      const playedCard = new Card('hearts', 'A');
      const leadSuit = 'hearts';
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('hearts', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).toBeNull();
    });

    it('should not find belot if trick lead suit is different', () => {
      const contract = 'hearts';
      const playedCard = new Card('clubs', 'Q');
      const leadSuit = 'spades'; 
      const playerHand = [
        new Card('clubs', 'Q'),
        new Card('clubs', 'K'),
        new Card('clubs', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).toBeNull();
    });

    it('should find belot if trick lead suit is different but we are trumping', () => {
      const contract = 'hearts';
      const playedCard = new Card('hearts', 'Q');
      const leadSuit = 'spades'; // trick was led in spades, we are cutting with trump
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('spades', 'A')
      ];

      const belot = findBelotOnPlay(contract, playedCard, playerHand, leadSuit);
      expect(belot).not.toBeNull();
      expect(belot.type).toBe('belot');
    });
    it('should not find belot in all-trump when following a different led suit', () => {
      const playedCard = new Card('clubs', 'K');
      const playerHand = [
        new Card('clubs', 'Q'),
        new Card('clubs', 'K'),
        new Card('spades', '7')
      ];

      expect(findBelotOnPlay('all-trump', playedCard, playerHand, 'hearts')).toBeNull();
    });

    it('should find belot in all-trump when leading the trick with Q or K', () => {
      const playedCard = new Card('clubs', 'Q');
      const playerHand = [
        new Card('clubs', 'Q'),
        new Card('clubs', 'K'),
        new Card('spades', '7')
      ];

      // playCard passes the played card's own suit as the lead suit when leading
      const belot = findBelotOnPlay('all-trump', playedCard, playerHand, 'clubs');
      expect(belot).not.toBeNull();
      expect(belot.cards.every(c => c.suit === 'clubs')).toBe(true);
    });

    it('should not find belot from a Q and K of different suits', () => {
      const playedCard = new Card('hearts', 'Q');
      const playerHand = [
        new Card('hearts', 'Q'),
        new Card('spades', 'K')
      ];

      expect(findBelotOnPlay('hearts', playedCard, playerHand, 'hearts')).toBeNull();
      expect(findBelotOnPlay('all-trump', playedCard, playerHand, 'hearts')).toBeNull();
    });

    it('should not find belot when the partner card was already played', () => {
      // Q of hearts already played earlier, now playing the K
      const playedCard = new Card('hearts', 'K');
      const playerHand = [new Card('hearts', 'K'), new Card('spades', 'A')];

      expect(findBelotOnPlay('hearts', playedCard, playerHand, 'hearts')).toBeNull();
    });
  });
});
