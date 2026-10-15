import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './Card.css';

// Import all card images
import AceClubs from '../assets/ac.png';
import AceDiamonds from '../assets/ad.png';
import AceHearts from '../assets/ah.png';
import AceSpades from '../assets/as.png';
import EightClubs from '../assets/ec.png';
import EightDiamonds from '../assets/ed.png';
import EightHearts from '../assets/eh.png';
import EightSpades from '../assets/es.png';
import JackClubs from '../assets/jc.png';
import JackDiamonds from '../assets/jd.png';
import JackHearts from '../assets/jh.png';
import JackSpades from '../assets/js.png';
import KingClubs from '../assets/kc.png';
import KingDiamonds from '../assets/kd.png';
import KingHearts from '../assets/kh.png';
import KingSpades from '../assets/ks.png';
import NineClubs from '../assets/nc.png';
import NineDiamonds from '../assets/nd.png';
import NineHearts from '../assets/nh.png';
import NineSpades from '../assets/ns.png';
import QueenClubs from '../assets/qc.png';
import QueenDiamonds from '../assets/qd.png';
import QueenHearts from '../assets/qh.png';
import QueenSpades from '../assets/qs.png';
import SevenClubs from '../assets/sc.png';
import SevenDiamonds from '../assets/sd.png';
import SevenHearts from '../assets/sh.png';
import SevenSpades from '../assets/ss.png';
import TenClubs from '../assets/tc.png';
import TenDiamonds from '../assets/td.png';
import TenHearts from '../assets/th.png';
import TenSpades from '../assets/ts.png';
import backImage from '../assets/back.png';

// Mapping from game rank to rank name
const RANK_MAP = {
  'A': 'Ace',
  'K': 'King',
  'Q': 'Queen',
  'J': 'Jack',
  '10': 'Ten',
  '9': 'Nine',
  '8': 'Eight',
  '7': 'Seven'
};

// Mapping from game suit to suit name
const SUIT_MAP = {
  'clubs': 'Clubs',
  'diamonds': 'Diamonds',
  'hearts': 'Hearts',
  'spades': 'Spades'
};

// Map of image keys to imported images
const CARD_IMAGES = {
  'AceClubs': AceClubs, 'AceDiamonds': AceDiamonds, 'AceHearts': AceHearts, 'AceSpades': AceSpades,
  'EightClubs': EightClubs, 'EightDiamonds': EightDiamonds, 'EightHearts': EightHearts, 'EightSpades': EightSpades,
  'JackClubs': JackClubs, 'JackDiamonds': JackDiamonds, 'JackHearts': JackHearts, 'JackSpades': JackSpades,
  'KingClubs': KingClubs, 'KingDiamonds': KingDiamonds, 'KingHearts': KingHearts, 'KingSpades': KingSpades,
  'NineClubs': NineClubs, 'NineDiamonds': NineDiamonds, 'NineHearts': NineHearts, 'NineSpades': NineSpades,
  'QueenClubs': QueenClubs, 'QueenDiamonds': QueenDiamonds, 'QueenHearts': QueenHearts, 'QueenSpades': QueenSpades,
  'SevenClubs': SevenClubs, 'SevenDiamonds': SevenDiamonds, 'SevenHearts': SevenHearts, 'SevenSpades': SevenSpades,
  'TenClubs': TenClubs, 'TenDiamonds': TenDiamonds, 'TenHearts': TenHearts, 'TenSpades': TenSpades
};

export default function Card({ card, onClick, selected, playable, showBack = false, cardId, className = '' }) {
  const { t } = useLanguage();
  // If showing back, card prop is optional
  if (!showBack && !card) return null;
  
  const handleClick = (e) => {
    // Only allow clicks on playable cards
    if (playable && onClick) {
      onClick(e);
    }
  };
  
  // Determine image source
  let imageSrc;
  let altText;
  
  if (showBack) {
    imageSrc = backImage;
    altText = t('cardBack');
  } else {
    // Get the image based on rank and suit
    const rankName = RANK_MAP[card.rank];
    const suitName = SUIT_MAP[card.suit];
    const imageKey = `${rankName}${suitName}`;
    imageSrc = CARD_IMAGES[imageKey];
    altText = t('cardName', { rank: card.rank, suit: t(card.suit) });
  }
  
  // Determine card ID: use explicit cardId prop, or card.id
  // Always ensure we have a valid ID for data-card-id attribute
  const finalCardId = cardId || card?.id;
  
  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${playable ? 'playable' : ''} ${showBack ? 'back' : ''} ${className}`.trim()}
      onClick={handleClick}
      data-card-id={finalCardId}
    >
      <img 
        src={imageSrc} 
        alt={altText}
        className="card-image"
      />
    </div>
  );
}
