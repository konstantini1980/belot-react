import React from 'react';
import Card from './Card';
import './AIPlayerHand.css';

export default function AIPlayerHand({ 
  cards, 
  position, // 'west', 'north', or 'east'
  playerIndex, // Player index for cardId
  showCards = false,
}) {
  return (
    <div className={`ai-player-hand ai-player-hand-${position}`}>
      {showCards ? (
        // Show actual cards when showCards is enabled
        cards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
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
