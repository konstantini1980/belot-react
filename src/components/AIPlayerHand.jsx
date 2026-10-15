import React from 'react';
import Card from './Card';
import { sortHand } from '../game/cards';
import './AIPlayerHand.css';

export default function AIPlayerHand({ 
  cards, 
  position, // 'west', 'north', or 'east'
  playerIndex, // Player index for cardId
  showCards = false,
  contract
}) {
  const sortedCards = sortHand(cards, contract);

  return (
    <div className={`ai-player-hand ai-player-hand-${position}`}>
      {showCards ? (
        // Show actual cards when showCards is enabled
        sortedCards.map((card) => (
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
