import { SEQUENCE_ORDER } from './cards';

// Premium combinations
export const COMBINATIONS = {
  tierce: { name: 'Tierce', points: 20, length: 3 },
  quarte: { name: 'Quarte', points: 50, length: 4 },
  quint: { name: 'Quint', points: 100, length: 5 },
  equal: { name: 'Equal', points: { '10': 100, 'Q': 100, 'Q': 100, 'K': 100, 'A': 100, '9': 150, 'J': 200 } }
};

export function findSequences(cards) {
  const sequences = [];
  const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
  
  for (const suit of suits) {
    const suitCards = cards.filter(c => c.suit === suit).sort((a, b) => {
      return SEQUENCE_ORDER.indexOf(a.rank) - SEQUENCE_ORDER.indexOf(b.rank);
    });
    
    if (suitCards.length >= 3) {
      // Find consecutive sequences
      for (let i = 0; i <= suitCards.length - 3; i++) {
        for (let len = 5; len >= 3; len--) {
          if (i + len <= suitCards.length) {
            const sequence = suitCards.slice(i, i + len);
            if (isConsecutive(sequence)) {
              sequences.push({
                type: len === 3 ? 'tierce' : len === 4 ? 'quarte' : 'quint',
                cards: sequence,
                points: len === 3 ? 20 : len === 4 ? 50 : 100
              });
              break; // Take longest sequence starting at this position
            }
          }
        }
      }
    }
  }
  
  return sequences;
}

function isConsecutive(cards) {
  for (let i = 1; i < cards.length; i++) {
    const prevIndex = SEQUENCE_ORDER.indexOf(cards[i - 1].rank);
    const currIndex = SEQUENCE_ORDER.indexOf(cards[i].rank);
    if (currIndex - prevIndex !== 1) {
      return false;
    }
  }
  return true;
}

export function findEquals(cards) {
  const equals = [];
  const rankGroups = {};
  
  // Group cards by rank
  cards.forEach(card => {
    if (!rankGroups[card.rank]) {
      rankGroups[card.rank] = [];
    }
    rankGroups[card.rank].push(card);
  });
  
  // Find ranks with 4 cards
  Object.keys(rankGroups).forEach(rankKey => {
    if (rankGroups[rankKey].length === 4) {
      const rank = rankGroups[rankKey][0].rank;
      const points = COMBINATIONS.equal.points[rank] || 100;
      equals.push({
        type: 'equal',
        cards: rankGroups[rankKey],
        points: points
      });
    }
  });
  
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

