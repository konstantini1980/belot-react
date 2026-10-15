// Card suits and ranks for Belot (32-card deck: 7, 8, 9, 10, J, Q, K, A)
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Card values for scoring
export const CARD_VALUES = {
  trump: {
    '7': 0, '8': 0, '9': 14, '10': 10,
    'J': 20, 'Q': 3, 'K': 4, 'A': 11
  },
  nonTrump: {
    '7': 0, '8': 0, '9': 0, '10': 10,
    'J': 2, 'Q': 3, 'K': 4, 'A': 11
  }
};

// Card rankings for different contract types
export const CARD_RANKINGS = {
  trump: ['J', '9', 'A', '10', 'K', 'Q', '8', '7'],
  nonTrump: ['A', '10', 'K', 'Q', 'J', '9', '8', '7']
};

// Sequence order for combinations
export const SEQUENCE_ORDER = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Rank order (strongest first) of a suit under a contract
export function rankingFor(contract, suit) {
  const isTrump = contract === 'all-trump' || (contract !== 'no-trump' && suit === contract);
  return isTrump ? CARD_RANKINGS.trump : CARD_RANKINGS.nonTrump;
}

// A hand sorted for display: grouped by suit, strongest first. Before the
// contract is known, cards are ordered as in all-trump.
export function sortHand(cards, contract) {
  const sortingContract = contract || 'all-trump';
  return [...cards].sort((a, b) => a.suit.localeCompare(b.suit)
    || rankingFor(sortingContract, a.suit).indexOf(a.rank) - rankingFor(sortingContract, b.suit).indexOf(b.rank));
}

export class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${suit}-${rank}`;
  }

  getValue(contract) {
    if (contract === 'no-trump') {
      return CARD_VALUES.nonTrump[this.rank] || 0;
    }
    
    const isTrump = contract === 'all-trump' || contract === this.suit;
    return isTrump 
      ? CARD_VALUES.trump[this.rank] || 0
      : CARD_VALUES.nonTrump[this.rank] || 0;
  }

  getRanking(contract) {
    return rankingFor(contract, this.suit).indexOf(this.rank);
  }

  // True if this card beats otherCard (played earlier in the same trick)
  isHigherThan(otherCard, contract) {
    if (this.suit === otherCard.suit) {
      return this.getRanking(contract) < otherCard.getRanking(contract); // Same suit: the stronger rank wins
    }
    return this.suit === contract; // Different suits: only a trump of a suit contract beats it
  }
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(new Card(suit, rank));
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

