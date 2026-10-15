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
  // Only sorted when shown: an online game sends other players' cards face down, with no suit or rank
  const sortedCards = showCards ? sortHand(cards, contract) : cards;
  const middle = (cards.length - 1) / 2;
  // Opponents' cards are a small fan, like the hand they're holding
  const fanStyle = (i) => ({
    '--fan-rot': `${(i - middle) * 5}deg`,
    '--fan-drop': `${(i - middle) * (i - middle) * 1.5}px`,
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
            style={fanStyle(i)}
          />
        ))
      ) : (
        // Show card backs normally
        Array.from({ length: cards.length }).map((_, i) => (
          <Card key={i} showBack cardId={`player-${playerIndex}-back-${i}`} style={fanStyle(i)} />
        ))
      )}
    </div>
  );
}
