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
  
  return (
    <div 
      className="round-score-panel" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="round-score-title">
        {contract ? (
          <span className="contract-chip">{contractLabel(contract, t) + multiplierLabel(isDouble, isRedouble)}</span>
        ) : t('thisRound')}
      </div>
      <div className="round-score-values">
        <div className={`round-score-item team-us ${contractTeam === 0 ? 'has-contract' : ''}`}>
          <span className="round-score-label">{t('you')}</span>
          <span className="round-score-number">{playerScore}</span>
        </div>
        <div className={`round-score-item team-them ${contractTeam === 1 ? 'has-contract' : ''}`}>
          <span className="round-score-label">{t('opp')}</span>
          <span className="round-score-number">{opponentScore}</span>
        </div>
      </div>
    </div>
  );
}
