import React, { useState, useEffect, useRef } from 'react';
import { GAME_PHASES } from '../game/gameLogic';
import { useLanguage } from '../contexts/LanguageContext';
import './ScorePanel.css';

export default function ScorePanel({ 
  scores, 
  roundScores, 
  phase, 
  round = 1,
  contract = null,
  isDouble = false,
  isRedouble = false,
  onNextDeal = null
}) {
  const { t } = useLanguage();
  const maxScore = 151;
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;
  const [showFullPanel, setShowFullPanel] = useState(false);
  const panelRef = useRef(null);
  
  const CONTRACTS = [
    { value: 'clubs', label: `♣ ${t('clubs')}` },
    { value: 'diamonds', label: `♦ ${t('diamonds')}` },
    { value: 'hearts', label: `♥ ${t('hearts')}` },
    { value: 'spades', label: `♠ ${t('spades')}` },
    { value: 'no-trump', label: t('noTrump') },
    { value: 'all-trump', label: t('allTrump') }
  ];
  
  // Use round scores during gameplay, total scores when round is over
  const playerScore = isRoundOver ? scores[0] : (roundScores?.[0] || 0);
  const opponentScore = isRoundOver ? scores[1] : (roundScores?.[1] || 0);
  const playerProgress = (playerScore / maxScore) * 100;
  const opponentProgress = (opponentScore / maxScore) * 100;

  // Close panel when clicking outside (only during gameplay, not when round is over)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isRoundOver && panelRef.current && !panelRef.current.contains(event.target)) {
        setShowFullPanel(false);
      }
    };

    if (showFullPanel && !isRoundOver) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFullPanel, isRoundOver]);

  // Close panel when round is over (it will show automatically)
  useEffect(() => {
    if (isRoundOver) {
      setShowFullPanel(false);
    }
  }, [isRoundOver]);

  // Compact panel during gameplay
  if (!isRoundOver) {
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
      <>
        <div 
          className="round-score-panel" 
          onClick={() => setShowFullPanel(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="round-score-title">{contractLabel}</div>
          <div className="round-score-values">
            <div className="round-score-item">
              <span className="round-score-number round-score-green">{playerScore}</span>
              <span className="round-score-label">{t('you')}</span>
            </div>
            <div className="round-score-item">
              <span className="round-score-number round-score-red">{opponentScore}</span>
              <span className="round-score-label">{t('opp')}</span>
            </div>
          </div>
        </div>
        {showFullPanel && (
          <div className="score-panel-overlay">
            <div className="score-panel score-panel-full" ref={panelRef}>
              <div className="score-header">
                <div className="score-header-left">
                  <span className="trophy-icon">🏆</span>
                  <span className="score-title">{t('gameScore')}</span>
                </div>
              </div>

              <div className="score-section">
                <div className="score-row">
                  <div className="score-row-left">
                    <div className="team-icon team-icon-green">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <span className="team-name team-name-green">{t('youAndPartner')}</span>
                  </div>
                  <div className="score-value">{scores[0]}</div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-fill-green" 
                    style={{ width: `${Math.min((scores[0] / maxScore) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="score-section">
                <div className="score-row">
                  <div className="score-row-left">
                    <div className="team-icon team-icon-red">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <span className="team-name team-name-red">{t('opponents')}</span>
                  </div>
                  <div className="score-value">{scores[1]}</div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-fill-red" 
                    style={{ width: `${Math.min((scores[1] / maxScore) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="score-footer">
                <span className="win-condition">{t('firstTo151Wins')}</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full score panel when round is over
  return (
    <div className="score-panel score-panel-full">
      <div className="score-header">
        <div className="score-header-left">
          <span className="trophy-icon">🏆</span>
          <span className="score-title">{t('gameScore')}</span>
        </div>
        <div className="score-header-right">
          <span className="round-text">Round {round}</span>
        </div>
      </div>

      <div className="score-section">
        <div className="score-row">
          <div className="score-row-left">
            <div className="team-icon team-icon-green">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <span className="team-name team-name-green">{t('youAndPartner')}</span>
          </div>
          <div className="score-value">{playerScore}</div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill progress-fill-green" 
            style={{ width: `${Math.min(playerProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="score-section">
        <div className="score-row">
          <div className="score-row-left">
            <div className="team-icon team-icon-red">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <span className="team-name team-name-red">{t('opponents')}</span>
          </div>
          <div className="score-value">{opponentScore}</div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill progress-fill-red" 
            style={{ width: `${Math.min(opponentProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="score-footer">
        <span className="win-condition">{t('firstTo151Wins')}</span>
        {onNextDeal && (
          <button 
            onClick={onNextDeal}
            className="next-deal-button"
          >
            {t('nextDeal')}
          </button>
        )}
      </div>
    </div>
  );
}

