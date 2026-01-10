import React, { useState } from 'react';
import Card from './Card';
import CardBack from './CardBack';
import CompactScorePanel from './CompactScorePanel';
import FullScorePanel from './FullScorePanel';
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
  onNextDeal = null
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
    } else {
      setShowFullScorePanel(false);
    }
  }, [isRoundOver]);

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
        {players.map((player, idx) => (
          <div key={idx} className={`player-indicator-container ${getPlayerPosition(idx)}`}>
            <div className={`player-chip ${currentPlayer === idx ? 'active' : ''}`}>
              <span className="player-chip-name">{player.name}</span>
              {currentPlayer === idx && (
                <span className="player-turn-dot"></span>
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
        ))}
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
          />
        )}
      </div>
      
      {showFullScorePanel && (
        <FullScorePanel 
          scores={scores}
          roundScores={isRoundOver ? lastRoundScore : null}
          phase={phase}
          round={1}
          onNextDeal={isRoundOver ? onNextDeal : null}
          onClose={!isRoundOver ? () => setShowFullScorePanel(false) : null}
          showOverlay={true}
        />
      )}
    </div>
  );
}

