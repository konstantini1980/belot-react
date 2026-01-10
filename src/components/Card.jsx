import React from 'react';
import './Card.css';

// Import all card images
import AceClubs from '../assets/ac.bmp';
import AceDiamonds from '../assets/ad.bmp';
import AceHearts from '../assets/ah.bmp';
import AceSpades from '../assets/as.bmp';
import EightClubs from '../assets/ec.bmp';
import EightDiamonds from '../assets/ed.bmp';
import EightHearts from '../assets/eh.bmp';
import EightSpades from '../assets/es.bmp';
import JackClubs from '../assets/jc.bmp';
import JackDiamonds from '../assets/jd.bmp';
import JackHearts from '../assets/jh.bmp';
import JackSpades from '../assets/js.bmp';
import KingClubs from '../assets/kc.bmp';
import KingDiamonds from '../assets/kd.bmp';
import KingHearts from '../assets/kh.bmp';
import KingSpades from '../assets/ks.bmp';
import NineClubs from '../assets/nc.bmp';
import NineDiamonds from '../assets/nd.bmp';
import NineHearts from '../assets/nh.bmp';
import NineSpades from '../assets/ns.bmp';
import QueenClubs from '../assets/qc.bmp';
import QueenDiamonds from '../assets/qd.bmp';
import QueenHearts from '../assets/qh.bmp';
import QueenSpades from '../assets/qs.bmp';
import SevenClubs from '../assets/sc.bmp';
import SevenDiamonds from '../assets/sd.bmp';
import SevenHearts from '../assets/sh.bmp';
import SevenSpades from '../assets/ss.bmp';
import TenClubs from '../assets/tc.bmp';
import TenDiamonds from '../assets/td.bmp';
import TenHearts from '../assets/th.bmp';
import TenSpades from '../assets/ts.bmp';

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

export default function Card({ card, onClick, selected, playable, isTrump, size }) {
  if (!card) return null;
  
  // Get the image based on rank and suit
  const rankName = RANK_MAP[card.rank];
  const suitName = SUIT_MAP[card.suit];
  const imageKey = `${rankName}${suitName}`;
  const imageSrc = CARD_IMAGES[imageKey];
  
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
    >
      <img 
        src={imageSrc} 
        alt={`${card.rank} of ${card.suit}`}
        className="card-image"
      />
    </div>
  );
}
