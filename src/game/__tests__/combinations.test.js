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
      // The algorithm finds A, K, Q, J, 10, 9 as a sequence of 6 consecutive cards
      expect(sequences[0].cards.length).toBeGreaterThanOrEqual(5);
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
  });
});

