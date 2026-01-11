import React, { useState } from 'react';
import Card from './Card';
import CardBack from './CardBack';
import CompactScorePanel from './CompactScorePanel';
import FullScorePanel from './FullScorePanel';
import CombinationBalloon from './CombinationBalloon';
import { GAME_PHASES } from '../game/gameLogic';
import './GameBoard.css';

export default function GameBoard({ 
  players, 
  currentTrick, 
  currentPlayer,
  tricks,
  scores,
  roundScores,
  lastRoundScore,
  contract,
  trumpSuit,
  biddingPanel,
  playerHand,
  phase,
  isDouble = false,
  isRedouble = false,
  onNextDeal = null,
  playerCombinations = {},
  announcedCombinations = [[], []],
  roundBreakdown = null,
  bids = [],
  // Dev/test props
  forceShowScorePanel = false,
  onForceShowScorePanelChange = null
}) {
  const [showFullScorePanel, setShowFullScorePanel] = useState(false);
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;

  const getPlayerPosition = (playerId) => {
    const positions = ['bottom', 'left', 'top', 'right'];
    return positions[playerId];
  };

  // Show full panel when round is over
  React.useEffect(() => {
    if (isRoundOver) {
      setShowFullScorePanel(true);
    } else if (!forceShowScorePanel) {
      // Only auto-close if not force-shown
      setShowFullScorePanel(false);
    }
  }, [isRoundOver, forceShowScorePanel]);

  // Handle forced score panel display - keep it visible while checkbox is on
  React.useEffect(() => {
    if (forceShowScorePanel) {
      setShowFullScorePanel(true);
    }
  }, [forceShowScorePanel]);

  return (
    <div className="game-board">
      <div className="board-center">
        {biddingPanel && (
          <div className="bidding-panel-overlay">
            {biddingPanel}
          </div>
        )}
        {!biddingPanel && currentTrick.map(({ playerId, card }) => (
          <div 
            key={`${playerId}-${card.id}`} 
            className={`trick-card ${getPlayerPosition(playerId)}`}
          >
            <Card 
              card={card} 
              isTrump={contract !== 'no-trump' && contract !== 'all-trump' && card.suit === trumpSuit}
            />
          </div>
        ))}
      </div>
      
      <div className="player-positions">
        {players.map((player, idx) => {
          const position = getPlayerPosition(idx);
          const combinations = playerCombinations[idx] || [];
          return (
            <div key={idx} className={`player-indicator-container ${position}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div className={`player-chip ${currentPlayer === idx ? 'active' : ''}`}>
                  <span className="player-chip-name">{player.name}</span>
                  <span className={`player-turn-dot ${currentPlayer === idx ? 'visible' : ''}`}></span>
                </div>
                {combinations.length > 0 && (
                  <div className={`combination-balloon-wrapper ${position}`}>
                    <CombinationBalloon
                      combinations={combinations}
                      playerName={player.name}
                      onClose={() => {}}
                    />
                  </div>
                )}
              </div>
              {idx !== 0 && (
                <div className="player-cards-back">
                  {Array.from({ length: player.hand.length }).map((_, i) => (
                    <CardBack key={i} size="small" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {playerHand && (
        <div className="player-hand-overlay">
          {playerHand}
        </div>
      )}
      
      <div className="score-board">
        {!isRoundOver && (
          <CompactScorePanel 
            roundScores={roundScores}
            contract={contract}
            isDouble={isDouble}
            isRedouble={isRedouble}
            onClick={() => setShowFullScorePanel(true)}
            contractTeam={contract && bids.length > 0 ? (() => {
              const contractBid = bids.find(b => b.bid === contract);
              return contractBid ? players[contractBid.playerId].team : null;
            })() : null}
          />
        )}
      </div>
      
        {showFullScorePanel && (
        <FullScorePanel 
          scores={scores}
          roundScores={isRoundOver ? lastRoundScore : (forceShowScorePanel ? roundScores : null)}
          phase={phase}
          round={1}
          onNextDeal={isRoundOver ? onNextDeal : null}
          onClose={!isRoundOver && !forceShowScorePanel ? () => {
            setShowFullScorePanel(false);
            if (onForceShowScorePanelChange) {
              onForceShowScorePanelChange(false);
            }
          } : null}
          showOverlay={true}
          announcedCombinations={announcedCombinations}
          tricks={tricks}
          roundBreakdown={isRoundOver ? roundBreakdown : (forceShowScorePanel ? roundBreakdown : null)}
          forceShow={forceShowScorePanel}
        />
      )}
    </div>
  );
}

