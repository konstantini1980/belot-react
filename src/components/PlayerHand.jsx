import React from 'react';
import Card from './Card';
import './PlayerHand.css';

export default function PlayerHand({ 
  cards, 
  onCardClick, 
  selectedCard, 
  playableCards,
  trumpSuit,
  contract 
}) {
  const sortedCards = [...cards].sort((a, b) => {
    // Sort by suit first, then by rank
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return ranks.indexOf(a.rank) - ranks.indexOf(b.rank);
  });

  return (
    <div className="player-hand">
      {sortedCards.map(card => {
        const isTrump = contract !== 'no-trump' && contract !== 'all-trump' && card.suit === trumpSuit;
        const playable = playableCards && playableCards.includes(card.id);
        return (
          <Card
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            selected={selectedCard?.id === card.id}
            playable={playable}
            isTrump={isTrump}
            size="small"
          />
        );
      })}
    </div>
  );
}

