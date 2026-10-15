import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './Card.css';

// Cards are drawn in CSS (corner indices, a big pip or a framed court card),
// so they stay sharp at any size and need no image assets.
const SUIT_SYMBOLS = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠'
};

const COURT_RANKS = ['J', 'Q', 'K'];

export default function Card({ card, onClick, selected, playable, showBack = false, cardId, className = '', style }) {
  const { t } = useLanguage();
  // If showing back, card prop is optional
  if (!showBack && !card) return null;

  const handleClick = (e) => {
    // Only allow clicks on playable cards
    if (playable && onClick) {
      onClick(e);
    }
  };

  // Determine card ID: use explicit cardId prop, or card.id
  // Always ensure we have a valid ID for data-card-id attribute
  const finalCardId = cardId || card?.id;
  const classes = `card ${selected ? 'selected' : ''} ${playable ? 'playable' : ''} ${showBack ? 'back' : ''} ${className}`;

  if (showBack) {
    return (
      <div
        className={classes.replace(/\s+/g, ' ').trim()}
        onClick={handleClick}
        data-card-id={finalCardId}
        style={style}
        role="img"
        aria-label={t('cardBack')}
      />
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const index = (
    <>
      <span className="card-rank">{card.rank}</span>
      <span className="card-index-suit">{symbol}</span>
    </>
  );

  return (
    <div
      className={`${classes} ${isRed ? 'red' : ''}`.replace(/\s+/g, ' ').trim()}
      onClick={handleClick}
      data-card-id={finalCardId}
      style={style}
      role="img"
      aria-label={t('cardName', { rank: card.rank, suit: t(card.suit) })}
    >
      <span className="card-index" aria-hidden="true">{index}</span>
      {COURT_RANKS.includes(card.rank) ? (
        <span className="card-court" aria-hidden="true">
          {card.rank}
          <span className="card-court-suit">{symbol}</span>
        </span>
      ) : (
        <span className="card-pip" aria-hidden="true">{symbol}</span>
      )}
      <span className="card-index card-index-bottom" aria-hidden="true">{index}</span>
    </div>
  );
}
