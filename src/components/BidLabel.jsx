import React from 'react';
import './BidLabel.css';
import { useLanguage } from '../contexts/LanguageContext';
import { SUITS } from '../game/cards';

const SUIT_ICONS = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const RED_SUITS = ['hearts', 'diamonds'];

// One bid as the table shows it. In the panel a suit bid is its symbol; with
// `words` (the bubbles) it is named, like "Hearts". The rest are always words.
// A historical bid (one the player has since replaced) is shown in brackets.
export function BidLabel({ bid, historical = false, words: inWords = false }) {
  const { t } = useLanguage();
  const wrap = text => (historical ? `(${text})` : text);

  if (SUITS.includes(bid) && !inWords) {
    // Four suit symbols read as noise, so only a suit bid is a symbol
    return (
      <span className={`bid-suit-icon tone-${RED_SUITS.includes(bid) ? 'red' : 'black'}`}>
        {wrap(SUIT_ICONS[bid])}
      </span>
    );
  }
  const words = {
    clubs: t('clubs'),
    diamonds: t('diamonds'),
    hearts: t('hearts'),
    spades: t('spades'),
    'no-trump': t('noTrump'),
    'all-trump': t('allTrump'),
    pass: t('pass'),
    double: t('double'),
    redouble: t('redouble')
  };
  const tone = SUITS.includes(bid) ? ` tone-${RED_SUITS.includes(bid) ? 'red' : 'black'}`
    : (bid === 'no-trump' || bid === 'all-trump' ? ` tone-${bid}` : '');
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
