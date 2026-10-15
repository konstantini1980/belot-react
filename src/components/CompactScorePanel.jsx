import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { contractLabel, multiplierLabel } from './contractLabel';
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
  
  const playerScore = roundScores?.[0] || 0;
  const opponentScore = roundScores?.[1] || 0;
  const contractTitle = contract
    ? contractLabel(contract, t) + multiplierLabel(isDouble, isRedouble)
    : t('thisRound');
  
  return (
    <div 
      className="round-score-panel" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="round-score-title">{contractTitle}</div>
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

