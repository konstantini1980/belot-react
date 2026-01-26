import React from 'react';
import Card from './Card';
import { CARD_RANKINGS } from '../game/cards';
import './SouthPlayerHand.css';

export default function SouthPlayerHand({ 
  cards, 
  onCardClick, 
  playableCards,
  contract,
  trumpSuit
}) {
  // If no contract is set, assume "all-trumps" for sorting
  const sortingContract = contract || 'all-trump';
  
  const sortedCards = [...cards].sort((a, b) => {
    // Sort by suit first, then by rank using contract-based ranking
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    
    // Determine which ranking to use based on contract and suit
    let rankingArray;
    if (sortingContract === 'all-trump') {
      rankingArray = CARD_RANKINGS.trump;
    } else if (sortingContract === 'no-trump') {
      rankingArray = CARD_RANKINGS.nonTrump;
    } else {
      // Trump suit contract - use trump ranking for trump suit, non-trump for others
      rankingArray = (a.suit === trumpSuit) ? CARD_RANKINGS.trump : CARD_RANKINGS.nonTrump;
    }
    
    const rankA = rankingArray.indexOf(a.rank);
    const rankB = rankingArray.indexOf(b.rank);
    return rankA - rankB;
  });

  return (
    <div className="south-player-hand">
      {sortedCards.map(card => {
        const playable = playableCards && playableCards.includes(card.id);
        return (
          <Card
            key={card.id}
            card={card}
            onClick={(e) => onCardClick(card, e)}
            playable={playable}
          />
        );
      })}
    </div>
  );
}

