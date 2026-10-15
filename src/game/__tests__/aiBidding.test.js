import { describe, it, expect } from 'vitest';
import { makeAIBid } from '../aiplayer';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';

const players = new BelotGame().players; // 0 and 2 vs 1 and 3
const hand = (...cards) => cards.map(([suit, rank]) => new Card(suit, rank));

// Clubs J, 9, A (45 trump points) and spades J, 9, 10 (34): both biddable, clubs stronger
const TWO_SUITS = hand(
  ['spades', 'J'], ['spades', '9'], ['spades', '10'],
  ['clubs', 'J'], ['clubs', '9'], ['clubs', 'A']
);

// Clubs J, 9, K: 34, just enough for clubs; 34 in all-trump, too little for anything else
const CLUBS_FAIR = hand(['clubs', 'J'], ['clubs', '9'], ['clubs', 'K'], ['hearts', '7'], ['spades', '8']);

describe('AI bidding', () => {
  it('bids its strongest suit, not the first one that qualifies', () => {
    expect(makeAIBid(TWO_SUITS, [], players, 1)).toBe('clubs');
  });

  it('bids a higher contract it can play when its best one is already outranked', () => {
    expect(makeAIBid(TWO_SUITS, [{ playerId: 2, bid: 'diamonds' }], players, 1)).toBe('spades');
  });

  it('raises its partner\'s suit to all-trump with a fair all-trump hand', () => {
    // All-trump top cards: two jacks, two nines and an ace = 79, at least 0.75 x 60
    expect(makeAIBid(TWO_SUITS, [{ playerId: 3, bid: 'diamonds' }], players, 1)).toBe('all-trump');
  });

  it('does not outbid its partner\'s suit with another suit', () => {
    expect(makeAIBid(CLUBS_FAIR, [{ playerId: 3, bid: 'diamonds' }], players, 1)).toBe('pass');
  });

  it('doubles an opponent\'s contract it is strong in', () => {
    // Clubs J, 9, A is 45, at least 1.25 x 34
    expect(makeAIBid(TWO_SUITS, [{ playerId: 0, bid: 'clubs' }], players, 1)).toBe('double');
  });

  it('does not double a contract it is only fair in', () => {
    // Clubs J, 9 is 34, below 1.25 x 34, and nothing it could play outranks clubs
    expect(makeAIBid(CLUBS_FAIR, [{ playerId: 0, bid: 'clubs' }], players, 1)).toBe('pass');
  });

  it('redoubles a double on its team\'s contract when strong in it', () => {
    const bids = [{ playerId: 3, bid: 'clubs' }, { playerId: 2, bid: 'double' }];
    expect(makeAIBid(TWO_SUITS, bids, players, 1)).toBe('redouble');
  });

  it('does not redouble twice', () => {
    const bids = [{ playerId: 3, bid: 'clubs' }, { playerId: 2, bid: 'double' }, { playerId: 1, bid: 'redouble' }];
    expect(makeAIBid(TWO_SUITS, bids, players, 3)).toBe('pass');
  });

  it('passes with a weak hand', () => {
    expect(makeAIBid(hand(['spades', '7'], ['hearts', '8'], ['clubs', 'Q'], ['diamonds', 'K'], ['hearts', '9']), [], players, 1)).toBe('pass');
  });
});
