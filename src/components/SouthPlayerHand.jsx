import React from 'react';
import Card from './Card';
import { sortHand } from '../game/cards';
import './SouthPlayerHand.css';

// Your hand is fanned: each card turns a little and the outer ones sit lower
const FAN_DEGREES_PER_CARD = 3;
const FAN_DROP_PX = 2;

export default function SouthPlayerHand({ 
  cards, 
  onCardClick, 
  playableCards,
  contract
}) {
  const sortedCards = sortHand(cards, contract);
  const middle = (sortedCards.length - 1) / 2;
  // While it's your turn, the cards you can't play are dimmed
  const isChoosing = playableCards && playableCards.length > 0;

  return (
    <div className={`south-player-hand ${isChoosing ? 'choosing' : ''}`}>
      {sortedCards.map((card, i) => {
        const playable = playableCards && playableCards.includes(card.id);
        const offset = i - middle;
        return (
          <Card
            key={card.id}
            card={card}
            onClick={(e) => onCardClick(card, e)}
            playable={playable}
            style={{
              '--fan-rot': `${offset * FAN_DEGREES_PER_CARD}deg`,
              '--fan-drop': `${offset * offset * FAN_DROP_PX}px`,
            }}
          />
        );
      })}
    </div>
  );
}
