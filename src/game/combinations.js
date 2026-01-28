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

// Add sequential combination based on length
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
      cards: [...cards],
      points: 100
    });
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
  } else {
    // In trump suit game, belot must be in the trump suit
    if (playedCard.suit !== contract) {
      return null; // Card is not in trump suit
    }
    targetSuit = contract;
  }
  
  // Belot can only be announced if the current trick is led in the same suit as the belot suit
  // (i.e., the lead card suit of the trick must match the suit of the belot being announced)
  if (leadSuit && leadSuit !== targetSuit) {
    return null;
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

export function getAllCombinations(cards, trumpSuit) {
  const equals = findEquals(cards);
  if (equals.length > 0) {
    const remainingCards = cards.filter(c => !equals.some(e => e.cards.includes(c)));
    const sequences = findSequences(remainingCards);
    
    return [...equals, ...sequences];
  } else {
    const sequences = findSequences(cards);
    
    return [...sequences];
  }
}

