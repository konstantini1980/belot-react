import React from 'react';
import './Card.css';

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const SUIT_COLORS = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black'
};

export default function Card({ card, onClick, selected, playable, isTrump, size }) {
  if (!card) return null;
  
  const suitColor = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  
  const handleClick = () => {
    // Only allow clicks on playable cards
    if (playable && onClick) {
      onClick();
    }
  };
  
  return (
    <div
      className={`card ${size === 'small' ? 'small' : ''} ${selected ? 'selected' : ''} ${playable ? 'playable' : ''} ${isTrump ? 'trump' : ''}`}
      onClick={handleClick}
      style={{ color: suitColor }}
    >
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{suitSymbol}</div>
    </div>
  );
}
