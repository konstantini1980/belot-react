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

export function findBelot(cards, trumpSuit) {
  const queen = cards.find(c => c.suit === trumpSuit && c.rank === 'Q');
  const king = cards.find(c => c.suit === trumpSuit && c.rank === 'K');
  
  if (queen && king) {
    return {
      type: 'belot',
      cards: [queen, king],
      points: 20
    };
  }
  
  return null;
}

export function getAllCombinations(cards, trumpSuit) {
  const sequences = findSequences(cards);
  const equals = findEquals(cards);
  const belot = findBelot(cards, trumpSuit);
  
  const all = [...sequences, ...equals];
  if (belot) all.push(belot);
  
  return all;
}

