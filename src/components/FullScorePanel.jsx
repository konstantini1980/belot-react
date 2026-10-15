import React, { useEffect, useRef } from 'react';
import { GAME_PHASES, WINNING_SCORE } from '../game/gameLogic';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlayerNames } from '../contexts/PlayerNamesContext';
import { contractLabel, multiplierLabel } from './contractLabel';
import './ScorePanel.css';

// Suit symbols mapping
const SUIT_SYMBOLS = {
  'spades': '♠',
  'hearts': '♥',
  'diamonds': '♦',
  'clubs': '♣'
};

// Format a card as "A♠" or "9♦"
function formatCard(card) {
  if (!card || !card.rank || !card.suit) return '';
  return `${card.rank}${SUIT_SYMBOLS[card.suit] || ''}`;
}

// Format combination cards as "A♠ K♠ Q♠" or "9♦ 8♦ 7♦"
function formatCombinationCards(combo) {
  if (!combo.cards || !Array.isArray(combo.cards) || combo.cards.length === 0) {
    return '';
  }
  
  const cardStrings = combo.cards.map(formatCard).filter(Boolean);
  return cardStrings.join(' ');
}

export default function FullScorePanel({ 
  totalScores, 
  currentRoundScores = null,
  lastRoundRoundedPoints = null,
  hangingPoints = 0,
  phase,
  onNextDeal = null,
  nextDealWaiting = false, // Online: you clicked "Next deal" and the other players haven't yet
  onNewGame = null,
  winner = null,
  onClose = null,
  showOverlay = false,
  roundBreakdown = null,
  announcedCombinations = [[], []],
  dealHistory = [],
  forceShow = false
}) {
  const { t } = useLanguage();
  const playerNames = usePlayerNames();
  const isGameFinished = phase === GAME_PHASES.FINISHED;
  const maxScore = WINNING_SCORE;
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;
  const panelRef = useRef(null);
  
  const playerTotalScore = totalScores[0] || 0;
  const opponentTotalScore = totalScores[1] || 0;
  // A team reached 151 but the game goes on: say why (a valat deal, or equal totals)
  const wasValat = roundBreakdown?.some(team => team?.valatPoints > 0);
  const noWinnerReason = isRoundOver && !isGameFinished
    && Math.max(playerTotalScore, opponentTotalScore) >= WINNING_SCORE
    ? t(wasValat ? 'noWinnerAfterValat' : 'noWinnerEqualTotals')
    : null;
  const playerTotalProgress = (playerTotalScore / maxScore) * 100;
  const opponentTotalProgress = (opponentTotalScore / maxScore) * 100;
  
  const getRoundPoints = (teamIndex) => {
    if (!currentRoundScores || currentRoundScores[teamIndex] == null) return 0;
    const v = currentRoundScores[teamIndex];
    return typeof v === 'object' && v !== null && 'roundPoints' in v ? v.roundPoints : (v || 0);
  };
  const playerRoundScore = getRoundPoints(0);
  const opponentRoundScore = getRoundPoints(1);

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

      {isRoundOver && currentRoundScores && (
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
              <div className="score-value">
                {(lastRoundRoundedPoints ? lastRoundRoundedPoints[0] : Math.round(playerRoundScore / 10))}
              </div>
            </div>
            {roundBreakdown && roundBreakdown[0] && (
              <div className="score-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">{t('cardPoints')}</span>
                  <span className="breakdown-value">{roundBreakdown[0].cardPoints}</span>
                </div>
                {roundBreakdown[0].valatPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('valat')}</span>
                    <span className="breakdown-value">+{roundBreakdown[0].valatPoints}</span>
                  </div>
                )}
                {roundBreakdown[0].hangingPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('hangingPoints')}</span>
                    <span className="breakdown-value">+{roundBreakdown[0].hangingPoints}</span>
                  </div>
                )}
                {roundBreakdown[0].combinationPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('combinations')}</span>
                    <span className="breakdown-value">+{roundBreakdown[0].combinationPoints}</span>
                  </div>
                )}
                {announcedCombinations[0] && announcedCombinations[0].length > 0 && (
                  <div className="breakdown-combinations">
                    {announcedCombinations[0].map((combo, idx) => {
                      const cardsDisplay = formatCombinationCards(combo);
                      const isValid = combo.valid !== false; // Default to true if not set
                      return cardsDisplay ? (
                        <span key={idx} className={`combination-badge ${!isValid ? 'canceled' : ''}`}>
                          {cardsDisplay}
                        </span>
                      ) : null;
                    })}
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
              <div className="score-value">
                {(lastRoundRoundedPoints ? lastRoundRoundedPoints[1] : Math.round(opponentRoundScore / 10))}
              </div>
            </div>
            {roundBreakdown && roundBreakdown[1] && (
              <div className="score-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">{t('cardPoints')}</span>
                  <span className="breakdown-value">{roundBreakdown[1].cardPoints}</span>
                </div>
                {roundBreakdown[1].valatPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('valat')}</span>
                    <span className="breakdown-value">+{roundBreakdown[1].valatPoints}</span>
                  </div>
                )}
                {roundBreakdown[1].hangingPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('hangingPoints')}</span>
                    <span className="breakdown-value">+{roundBreakdown[1].hangingPoints}</span>
                  </div>
                )}
                {roundBreakdown[1].combinationPoints > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">{t('combinations')}</span>
                    <span className="breakdown-value">+{roundBreakdown[1].combinationPoints}</span>
                  </div>
                )}
                {announcedCombinations[1] && announcedCombinations[1].length > 0 && (
                  <div className="breakdown-combinations">
                    {announcedCombinations[1].map((combo, idx) => {
                      const cardsDisplay = formatCombinationCards(combo);
                      const isValid = combo.valid !== false; // Default to true if not set
                      return cardsDisplay ? (
                        <span key={idx} className={`combination-badge ${!isValid ? 'canceled' : ''}`}>
                          {cardsDisplay}
                        </span>
                      ) : null;
                    })}
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

      {dealHistory.length > 0 && (
        <>
          <div className="score-section-divider"></div>
          <div className="score-section-title">{t('scoreSheet')}</div>
          <table className="score-sheet">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('contract')}</th>
                <th className="score-sheet-points team-name-green">{t('you')}</th>
                <th className="score-sheet-points team-name-red">{t('opp')}</th>
              </tr>
            </thead>
            <tbody>
              {dealHistory.map((deal, idx) => (
                <tr key={idx}>
                  <td className="score-sheet-number">{idx + 1}</td>
                  <td>
                    {contractLabel(deal.contract, t)}{multiplierLabel(deal.double, deal.redouble)}
                    {deal.bidder != null && <span className="score-sheet-note"> · {playerNames[deal.bidder]}</span>}
                    {deal.hanging > 0 && <div className="score-sheet-note">{t('pointsHanging', { points: deal.hanging })}</div>}
                  </td>
                  <td className="score-sheet-points">{deal.points[0]}</td>
                  <td className="score-sheet-points">{deal.points[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="score-footer">
        {isGameFinished && winner != null && onNewGame ? (
          <div className="winner-announcement">
            <h2>{t('teamWins', { team: winner + 1 })}</h2>
            <button onClick={onNewGame} className="new-game-button">
              {t('newGame')}
            </button>
          </div>
        ) : onNextDeal && nextDealWaiting ? (
          <p className="next-deal-waiting" role="status">{t('nextDealWaiting')}</p>
        ) : onNextDeal ? (
          <button 
            onClick={onNextDeal}
            className="next-deal-button"
          >
            {t('nextDeal')}
          </button>
        ) : null}
        {!isGameFinished && <span className="win-condition">{noWinnerReason ?? t('firstTo151Wins')}</span>}
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

