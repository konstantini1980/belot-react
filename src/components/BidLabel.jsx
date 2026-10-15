import React from 'react';
import './BidLabel.css';
import { useLanguage } from '../contexts/LanguageContext';
import { SUITS } from '../game/cards';

const SUIT_ICONS = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const RED_SUITS = ['hearts', 'diamonds'];

// One bid as the table shows it: a suit bid is its symbol, the rest are words.
// A historical bid (one the player has since replaced) is shown in brackets.
export function BidLabel({ bid, historical = false }) {
  const { t } = useLanguage();
  const wrap = text => (historical ? `(${text})` : text);

  if (SUITS.includes(bid)) {
    // Four suit symbols read as noise, so only a suit bid is a symbol
    return (
      <span className={`bid-suit-icon tone-${RED_SUITS.includes(bid) ? 'red' : 'black'}`}>
        {wrap(SUIT_ICONS[bid])}
      </span>
    );
  }
  const words = {
    'no-trump': t('noTrump'),
    'all-trump': t('allTrump'),
    pass: t('pass'),
    double: t('double'),
    redouble: t('redouble')
  };
  const tone = bid === 'no-trump' || bid === 'all-trump' ? ` tone-${bid}` : '';
  return <span className={`bid-text${tone}`}>{wrap(words[bid] ?? bid)}</span>;
}

// "." -> ".." -> "..." on a loop, for the player who is choosing a bid
export function ThinkingDots() {
  const { t } = useLanguage();
  return (
    <span className="thinking-dots" role="img" aria-label={t('waiting')}>
      <span>.</span><span>.</span><span>.</span>
    </span>
  );
}
