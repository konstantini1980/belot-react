import { SEQUENCE_ORDER } from './cards';

// Sequence order for sorting (descending: A, K, Q, J, 10, 9, 8, 7)
const SEQUENCE_ORDER_DESC = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

// Check if two cards are consecutive (x is higher than y in sequence)
function isConsequent(x, y) {
  const xIndex = SEQUENCE_ORDER_DESC.indexOf(x.rank);
  const yIndex = SEQUENCE_ORDER_DESC.indexOf(y.rank);
  
  // Check if y is the next card after x in descending order
  return xIndex !== -1 && yIndex !== -1 && yIndex === xIndex + 1;
}

// Add the combinations for one run of consecutive cards (sorted high to low).
// Only five cards of a run count: 6 or 7 in a row is still a quint (the top five),
// and 8 in a row is announced as a quint plus a tierce.
function addSequentialCombination(cards, sequences) {
  if (cards.length === 3) {
    sequences.push({
      type: 'tierce',
      cards: [...cards],
      points: 20
    });
  } else if (cards.length === 4) {
    sequences.push({
      type: 'quarte',
      cards: [...cards],
      points: 50
    });
  } else if (cards.length >= 5) {
    sequences.push({
      type: 'quint',
      cards: cards.slice(0, 5),
      points: 100
    });
    if (cards.length === 8) {
      sequences.push({
        type: 'tierce',
        cards: cards.slice(5),
        points: 20
      });
    }
  }
}

// Find sequential combinations for a specific suit
function findSequentialForColor(suitCards, sequences) {
  // Sort cards in descending order (A, K, Q, J, 10, 9, 8, 7)
  const sorted = [...suitCards].sort((a, b) => {
    const aIndex = SEQUENCE_ORDER_DESC.indexOf(a.rank);
    const bIndex = SEQUENCE_ORDER_DESC.indexOf(b.rank);
    return aIndex - bIndex;
  });
  
  const foundCards = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (isConsequent(sorted[i], sorted[i + 1])) {
      if (foundCards.length === 0) {
        foundCards.push(sorted[i]);
      }
      foundCards.push(sorted[i + 1]);
    } else {
      if (foundCards.length > 0) {
        addSequentialCombination(foundCards, sequences);
        foundCards.length = 0; // Clear array
      }
    }
  }
  
  // Check if there's a sequence at the end
  if (foundCards.length > 0) {
    addSequentialCombination(foundCards, sequences);
  }
}

export function findSequences(cards) {
  const sequences = [];
  const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
  
  for (const suit of suits) {
    const suitCards = cards.filter(c => c.suit === suit);
    
    if (suitCards.length > 2) {
      findSequentialForColor(suitCards, sequences);
    }
  }
  
  return sequences;
}

export function findEquals(cards) {
  const equals = [];
  
  // Point values for four equals combinations
  const fourEqualsPoints = {
    'J': 200,
    '9': 150,
    'A': 100,
    '10': 100,
    'K': 100,
    'Q': 100
  };
  
  // Check each rank that can form a four equals combination
  const ranksToCheck = ['J', '9', 'A', '10', 'K', 'Q'];
  
  for (const rank of ranksToCheck) {
    const foundCards = cards.filter(c => c.rank === rank);
    
    if (foundCards.length === 4) {
      equals.push({
        type: 'equal',
        cards: foundCards,
        points: fourEqualsPoints[rank] || 100
      });
    }
  }
  
  return equals;
}

// Check for belot when a specific card (Q or K) is played
// contract: the game contract ('all-trump', 'no-trump', or a suit)
// playedCard: the card being played (must be Q or K)
// playerHand: the player's current hand (including the card being played)
// leadSuit: the leading suit of the current trick (suit of the first card in the trick)
export function findBelotOnPlay(contract, playedCard, playerHand, leadSuit) {
  // Belot is not valid in no-trump
  if (contract === 'no-trump') {
    return null;
  }
  
  // Belot can only be announced when Q or K is played
  if (playedCard.rank !== 'Q' && playedCard.rank !== 'K') {
    return null;
  }
  
  let targetSuit;
  
  if (contract === 'all-trump') {
    // In all-trump, belot can be in any suit
    targetSuit = playedCard.suit;

    // Belot can only be announced if the current trick is led in the same suit as the belot suit
    // (i.e., the lead card suit of the trick must match the suit of the belot being announced)
    if (leadSuit && leadSuit !== targetSuit) {
      return null;
    }
  } else {
    // In trump suit game, belot must be in the trump suit
    // This also covers the case of trumping and same time announcing belot
    if (playedCard.suit !== contract) {
      return null; // Card is not in trump suit
    }
    targetSuit = contract;
  }
  
  // Check if player has both Queen and King of the target suit
  const queen = playerHand.find(c => c.suit === targetSuit && c.rank === 'Q');
  const king = playerHand.find(c => c.suit === targetSuit && c.rank === 'K');
  
  if (queen && king) {
    return {
      type: 'belot',
      cards: [queen, king],
      points: 20
    };
  }
  
  return null;
}

// Legacy function for backward compatibility (used for auto-announce, but belot won't be included)
export function findBelot(cards, trumpSuit) {
  // This function is kept for backward compatibility but belot should not be auto-announced
  // Belot should only be announced when Q or K is actually played
  return null;
}

const comboPoints = (combos) => combos.reduce((sum, c) => sum + c.points, 0);

// A card can't count in both a four of a kind and a sequence, and the player picks
// which to announce. Try every choice of fours to keep and announce the split worth
// the most points; on a tie the fours are kept.
export function getAllCombinations(cards, trumpSuit) {
  const allEquals = findEquals(cards);
  let best = null;

  for (let mask = (1 << allEquals.length) - 1; mask >= 0; mask--) {
    const equals = allEquals.filter((_, i) => mask & (1 << i));
    const remainingCards = cards.filter(c => !equals.some(e => e.cards.includes(c)));
    const combos = [...equals, ...findSequences(remainingCards)];

    if (!best || comboPoints(combos) > comboPoints(best)) {
      best = combos;
    }
  }

  return best;
}
