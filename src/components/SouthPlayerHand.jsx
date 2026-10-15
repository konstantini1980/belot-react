import React from 'react';
import Card from './Card';
import { sortHand } from '../game/cards';
import './SouthPlayerHand.css';

export default function SouthPlayerHand({ 
  cards, 
  onCardClick, 
  playableCards,
  contract
}) {
  const sortedCards = sortHand(cards, contract);

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

