import React from 'react';
import Card from './Card';
import { CARD_RANKINGS } from '../game/cards';
import './AIPlayerHand.css';

export default function AIPlayerHand({ 
  cards, 
  position, // 'west', 'north', or 'east'
  playerIndex, // Player index for cardId
  showCards = false,
  contract,
  trumpSuit
}) {
  // If no contract is set, assume "all-trumps" for sorting
  const sortingContract = contract || 'all-trump';
  
  // Sort cards by suit first, then by rank using contract-based ranking
  const sortedCards = [...cards].sort((a, b) => {
    // Sort by suit first, then by rank
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
    <div className={`ai-player-hand ai-player-hand-${position}`}>
      {showCards ? (
        // Show actual cards when showCards is enabled
        sortedCards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            className="small"
          />
        ))
      ) : (
        // Show card backs normally
        Array.from({ length: cards.length }).map((_, i) => (
          <Card key={i} showBack cardId={`player-${playerIndex}-back-${i}`} />
        ))
      )}
    </div>
  );
}
