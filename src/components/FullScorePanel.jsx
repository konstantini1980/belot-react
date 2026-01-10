import React, { useEffect, useRef } from 'react';
import { GAME_PHASES } from '../game/gameLogic';
import './ScorePanel.css';

export default function FullScorePanel({ 
  scores, 
  roundScores = null,
  phase,
  round = 1,
  onNextDeal = null,
  onClose = null,
  showOverlay = false
}) {
  const maxScore = 151;
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;
  const panelRef = useRef(null);
  
  const playerTotalScore = scores[0] || 0;
  const opponentTotalScore = scores[1] || 0;
  const playerTotalProgress = (playerTotalScore / maxScore) * 100;
  const opponentTotalProgress = (opponentTotalScore / maxScore) * 100;
  
  const playerRoundScore = roundScores ? (roundScores[0] || 0) : 0;
  const opponentRoundScore = roundScores ? (roundScores[1] || 0) : 0;

  // Close panel when clicking outside (only during gameplay, not when round is over)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isRoundOver && onClose && panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (showOverlay && !isRoundOver && onClose) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showOverlay, isRoundOver, onClose]);

  const renderScoreSection = (teamName, teamColor, score, progress) => (
    <div className="score-section">
      <div className="score-row">
        <div className="score-row-left">
          <div className={`team-icon team-icon-${teamColor}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <span className={`team-name team-name-${teamColor}`}>{teamName}</span>
        </div>
        <div className="score-value">{score}</div>
      </div>
      <div className="progress-bar">
        <div 
          className={`progress-fill progress-fill-${teamColor}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  const panelContent = (
    <div className="score-panel score-panel-full" ref={panelRef}>
      <div className="score-header">
        <div className="score-header-left">
          <span className="trophy-icon">🏆</span>
          <span className="score-title">Game score</span>
        </div>
      </div>

      {isRoundOver && roundScores && (
        <>
          <div className="score-section-title">Last Deal</div>
          <div className="score-section">
            <div className="score-row">
              <div className="score-row-left">
                <div className="team-icon team-icon-green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <span className="team-name team-name-green">You & Partner</span>
              </div>
              <div className="score-value">{playerRoundScore}</div>
            </div>
          </div>
          <div className="score-section">
            <div className="score-row">
              <div className="score-row-left">
                <div className="team-icon team-icon-red">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <span className="team-name team-name-red">Opponents</span>
              </div>
              <div className="score-value">{opponentRoundScore}</div>
            </div>
          </div>
          <div className="score-section-divider"></div>
        </>
      )}

      <div className="score-section-title">Total Score</div>
      {renderScoreSection('You & Partner', 'green', playerTotalScore, playerTotalProgress)}
      {renderScoreSection('Opponents', 'red', opponentTotalScore, opponentTotalProgress)}

      <div className="score-footer">
        <span className="win-condition">First to 151 wins</span>
        {onNextDeal && (
          <button 
            onClick={onNextDeal}
            className="next-deal-button"
          >
            Next Deal
          </button>
        )}
      </div>
    </div>
  );

  if (showOverlay) {
    return (
      <div className="score-panel-overlay">
        {panelContent}
      </div>
    );
  }

  return panelContent;
}

