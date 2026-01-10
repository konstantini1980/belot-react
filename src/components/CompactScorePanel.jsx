import React from 'react';
import './ScorePanel.css';

const CONTRACTS = [
  { value: 'clubs', label: '♣ Clubs' },
  { value: 'diamonds', label: '♦ Diamonds' },
  { value: 'hearts', label: '♥ Hearts' },
  { value: 'spades', label: '♠ Spades' },
  { value: 'no-trump', label: 'No Trump' },
  { value: 'all-trump', label: 'All Trump' }
];

export default function CompactScorePanel({ 
  roundScores, 
  contract = null,
  isDouble = false,
  isRedouble = false,
  onClick = null
}) {
  const playerScore = roundScores?.[0] || 0;
  const opponentScore = roundScores?.[1] || 0;

  let contractLabel = contract 
    ? CONTRACTS.find(c => c.value === contract)?.label || contract
    : 'This Round';

  if (contract) {
    if (isRedouble) {
      contractLabel += ' x4';
    } else if (isDouble) {
      contractLabel += ' x2';
    }
  }
  
  return (
    <div 
      className="round-score-panel" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="round-score-title">{contractLabel}</div>
      <div className="round-score-values">
        <div className="round-score-item">
          <span className="round-score-number round-score-green">{playerScore}</span>
          <span className="round-score-label">You</span>
        </div>
        <div className="round-score-item">
          <span className="round-score-number round-score-red">{opponentScore}</span>
          <span className="round-score-label">Opp</span>
        </div>
      </div>
    </div>
  );
}

