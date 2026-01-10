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
    if (contract === 'all-trump') {
      return CARD_RANKINGS.trump.indexOf(this.rank);
    } else if (contract === 'no-trump') {
      return CARD_RANKINGS.nonTrump.indexOf(this.rank);
    } 
    
    return this.suit === contract 
      ? CARD_RANKINGS.trump.indexOf(this.rank)
      : CARD_RANKINGS.nonTrump.indexOf(this.rank);
  }

  isHigherThan(otherCard, contract, trumpSuit) {
    const sameSuit = this.suit === otherCard.suit;

    if (sameSuit) {
      if (contract === 'all-trump' || this.suit === trumpSuit) {
        return CARD_RANKINGS.trump.indexOf(this.rank) < CARD_RANKINGS.trump.indexOf(otherCard.rank);
      }
      else if (contract === 'no-trump' || this.suit !== trumpSuit) {
        return CARD_RANKINGS.nonTrump.indexOf(this.rank) < CARD_RANKINGS.nonTrump.indexOf(otherCard.rank);
      } 
    } else {
      return this.suit === trumpSuit;
    }
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

