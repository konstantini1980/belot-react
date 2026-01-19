import React from 'react';
import Card from './Card';
import './SouthPlayerHand.css';

export default function SouthPlayerHand({ 
  cards, 
  onCardClick, 
  playableCards
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

