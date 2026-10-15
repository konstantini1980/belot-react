import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './Card.css';

// Standard English-pattern card faces (public domain SVGs, see assets/cards/README.md).
// The card back is drawn in CSS.
const FACE_URLS = import.meta.glob('../assets/cards/*.svg', { eager: true, query: '?url', import: 'default' });

const SUIT_LETTERS = {
  clubs: 'c',
  diamonds: 'd',
  hearts: 'h',
  spades: 's'
};

function faceUrl(card) {
  return FACE_URLS[`../assets/cards/${card.rank.toLowerCase()}${SUIT_LETTERS[card.suit]}.svg`];
}

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

  return (
    <div
      className={classes.replace(/\s+/g, ' ').trim()}
      onClick={handleClick}
      data-card-id={finalCardId}
      style={style}
      role="img"
      aria-label={t('cardName', { rank: card.rank, suit: t(card.suit) })}
    >
      <img className="card-face" src={faceUrl(card)} alt="" draggable="false" />
    </div>
  );
}
