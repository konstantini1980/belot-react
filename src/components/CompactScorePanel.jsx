import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './ScorePanel.css';

export default function CompactScorePanel({ 
  roundScores, 
  contract = null,
  isDouble = false,
  isRedouble = false,
  onClick = null,
  contractTeam = null
}) {
  const { t } = useLanguage();
  
  const CONTRACTS = [
    { value: 'clubs', label: `♣ ${t('clubs')}` },
    { value: 'diamonds', label: `♦ ${t('diamonds')}` },
    { value: 'hearts', label: `♥ ${t('hearts')}` },
    { value: 'spades', label: `♠ ${t('spades')}` },
    { value: 'no-trump', label: t('noTrump') },
    { value: 'all-trump', label: t('allTrump') }
  ];
  const playerScore = roundScores?.[0] || 0;
  const opponentScore = roundScores?.[1] || 0;

  let contractLabel = contract 
    ? CONTRACTS.find(c => c.value === contract)?.label || contract
    : t('thisRound');

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
          <span className="round-score-label">
            {t('you')}            
          </span>
          {contractTeam === 0 && <span className="contract-indicator"></span>}
        </div>
        <div className="round-score-item">
          <span className="round-score-number round-score-red">{opponentScore}</span>
          <span className="round-score-label">
            {t('opp')}            
          </span>
          {contractTeam === 1 && <span className="contract-indicator"></span>}
        </div>
      </div>
    </div>
  );
}

