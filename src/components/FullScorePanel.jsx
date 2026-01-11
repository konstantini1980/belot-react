import React, { useEffect, useRef } from 'react';
import { GAME_PHASES } from '../game/gameLogic';
import { useLanguage } from '../contexts/LanguageContext';
import './ScorePanel.css';

export default function FullScorePanel({ 
  scores, 
  roundScores = null,
  lastRoundRoundedPoints = null,
  hangingPoints = 0,
  phase,
  round = 1,
  onNextDeal = null,
  onClose = null,
  showOverlay = false,
  roundBreakdown = null,
  announcedCombinations = [[], []],
  forceShow = false
}) {
  const { t } = useLanguage();
  const maxScore = 151;
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;
  const panelRef = useRef(null);
  
  const playerTotalScore = scores[0] || 0;
  const opponentTotalScore = scores[1] || 0;
  const playerTotalProgress = (playerTotalScore / maxScore) * 100;
  const opponentTotalProgress = (opponentTotalScore / maxScore) * 100;
  
  const playerRoundScore = roundScores ? (roundScores[0] || 0) : 0;
  const opponentRoundScore = roundScores ? (roundScores[1] || 0) : 0;

  // Close panel when clicking outside (only during gameplay, not when round is over, and not when force-shown)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isRoundOver && !forceShow && onClose && panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (showOverlay && !isRoundOver && !forceShow && onClose) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showOverlay, isRoundOver, onClose, forceShow]);

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
          <span className="score-title">{t('gameScore')}</span>
        </div>
      </div>

      {isRoundOver && roundScores && (
        <>
          <div className="score-section-title">{t('lastDeal')}</div>
          
          {/* Player Team Breakdown */}
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
                <span className="team-name team-name-green">{t('youAndPartner')}</span>
              </div>
              <div className="score-value">{lastRoundRoundedPoints ? lastRoundRoundedPoints[0] : Math.round(playerRoundScore / 10)}</div>
            </div>
            {roundBreakdown && roundBreakdown[0] && (
              <div className="score-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">{t('cardPoints')}</span>
                  <span className="breakdown-value">{roundBreakdown[0].cardPoints}</span>
                </div>
                {roundBreakdown[0].combinationPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('combinations')}</span>
                    <span className="breakdown-value">+{roundBreakdown[0].combinationPoints}</span>
                  </div>
                )}
                {roundBreakdown[0].valatPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('valat')}</span>
                    <span className="breakdown-value">+{roundBreakdown[0].valatPoints}</span>
                  </div>
                )}
                {announcedCombinations[0] && announcedCombinations[0].length > 0 && (
                  <div className="breakdown-combinations">
                    {announcedCombinations[0].map((combo, idx) => (
                      <span key={idx} className="combination-badge">
                        {combo.type.toUpperCase()} (+{combo.points})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Opponent Team Breakdown */}
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
                <span className="team-name team-name-red">{t('opponents')}</span>
              </div>
              <div className="score-value">{lastRoundRoundedPoints ? lastRoundRoundedPoints[1] : Math.round(opponentRoundScore / 10)}</div>
            </div>
            {roundBreakdown && roundBreakdown[1] && (
              <div className="score-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">{t('cardPoints')}</span>
                  <span className="breakdown-value">{roundBreakdown[1].cardPoints}</span>
                </div>
                {roundBreakdown[1].combinationPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('combinations')}</span>
                    <span className="breakdown-value">+{roundBreakdown[1].combinationPoints}</span>
                  </div>
                )}
                {roundBreakdown[1].valatPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('valat')}</span>
                    <span className="breakdown-value">+{roundBreakdown[1].valatPoints}</span>
                  </div>
                )}
                {announcedCombinations[1] && announcedCombinations[1].length > 0 && (
                  <div className="breakdown-combinations">
                    {announcedCombinations[1].map((combo, idx) => (
                      <span key={idx} className="combination-badge">
                        {combo.type.toUpperCase()} (+{combo.points})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="score-section-divider"></div>
        </>
      )}

      {isRoundOver && hangingPoints > 0 && (
        <>
          <div className="score-section-title">{t('hangingPoints')}</div>
          <div className="score-section hanging-points-section">
            <div className="score-row">
              <div className="score-row-left">
                <span className="hanging-points-label">{t('pointsForNextRoundWinner')}</span>
              </div>
              <div className="score-value hanging-points-value">{hangingPoints}</div>
            </div>
            <div className="hanging-points-description">
              {t('hangingPointsDescription')}
            </div>
          </div>
          <div className="score-section-divider"></div>
        </>
      )}

      <div className="score-section-title">{t('totalScore')}</div>
      {renderScoreSection(t('youAndPartner'), 'green', playerTotalScore, playerTotalProgress)}
      {renderScoreSection(t('opponents'), 'red', opponentTotalScore, opponentTotalProgress)}

      <div className="score-footer">        
        {onNextDeal && (
          <button 
            onClick={onNextDeal}
            className="next-deal-button"
          >
            {t('nextDeal')}
          </button>
        )}
        <span className="win-condition">{t('firstTo151Wins')}</span>
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

