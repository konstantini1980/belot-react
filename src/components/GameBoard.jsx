import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Card from './Card';
import CompactScorePanel from './CompactScorePanel';
import FullScorePanel from './FullScorePanel';
import CombinationBalloon from './CombinationBalloon';
import { BidLabel, ThinkingDots } from './BidLabel';
import SouthPlayerHand from './SouthPlayerHand';
import AIPlayerHand from './AIPlayerHand';
import { GAME_PHASES } from '../game/gameLogic';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlayerNames } from '../contexts/PlayerNamesContext';
import './GameBoard.css';

// The card size lives in CSS (--card-w / --card-h, smaller on phones); read it so
// trick positions and animations match what's on screen.
function readCardSize(element) {
  const style = getComputedStyle(element);
  return {
    width: parseFloat(style.getPropertyValue('--card-w')) || 88,
    height: parseFloat(style.getPropertyValue('--card-h')) || 124,
  };
}

export default function GameBoard({ 
  players, 
  currentTrick, 
  currentPlayer,
  currentBidder = null,
  bids = [],
  tricks,
  totalScores,
  currentRoundScores,
  lastRoundRoundedPoints,
  hangingPoints = 0,
  contract,
  biddingPanel,
  playableCards = [],
  onCardClick = null,
  cardPositions = new Map(), // Map of cardId -> { x, y } positions from App.jsx
  phase,
  isDouble = false,
  isRedouble = false,
  onNextDeal = null,
  winner = null,
  onNewGame = null,
  playerCombinations = {},
  announcedCombinations = [[], []],
  dealHistory = [],
  roundBreakdown = null,
  contractTeam = null,
  tableControls = null,
  trickComplete = false,
  // Dev/test props
  forceShowScorePanel = false,
  onForceShowScorePanelChange = null,
  showCards = false,
  // Mobile start button props
  isGameStarted = true,
  onStartGame = null,
  startButtonText = '',
  onStartNewGame = null,
  onPlayOnline = null, // Start screen: play online with friends (when a game server is set up)
}) {
  const { t } = useLanguage();
  const [showFullScorePanel, setShowFullScorePanel] = useState(false);
  const [showLastTrick, setShowLastTrick] = useState(false); // Peeking at the previous trick
  const [animatingCardsToCenter, setAnimatingCardsToCenter] = useState(new Map()); // Track cards animating to board
  const [holderPosition, setHolderPosition] = useState({ x: 0, y: 0 } );
  const [cardPositionInBoard, setCardPositionInBoard] = useState({ 
    south: { x: 0, y: 0 }, // South (player 0)
    west: { x: 0, y: 0 },   // West (player 1)
    north: { x: 0, y: 0 },    // North (player 2)
    east: { x: 0, y: 0 }   // East (player 3)
  });
  const holderRef = useRef(null);
  const boardCenterRef = useRef(null);
  const prevTrickLengthRef = useRef(0);
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;

  // Count tricks won by each team
  const tricksByTeam = {
    team0: tricks.filter(t => t.team === 0).length,
    team1: tricks.filter(t => t.team === 1).length
  };

  // Player names follow the current language (and name the friend in an online game)
  const playerNames = usePlayerNames();

  // Card-to-center animation timers, cancelled if the board unmounts
  const animationTimersRef = useRef(new Set());
  useEffect(() => {
    const timers = animationTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const getPlayerPosition = (playerId) => {
    const positions = ['south', 'west', 'north', 'east'];
    return positions[playerId];
  };

  // The last-trick peek closes by itself when another trick is taken or the deal ends
  useEffect(() => {
    setShowLastTrick(false);
  }, [tricks.length, phase]);
  const lastTrick = tricks.length > 0 ? tricks[tricks.length - 1] : null;
  const isShowingLastTrick = showLastTrick && lastTrick !== null && !trickComplete;

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


  // Track when cards are added to trick - capture source position and start animation
  // Use useLayoutEffect to capture position synchronously before React removes card from DOM
  useLayoutEffect(() => {
    if (phase === GAME_PHASES.PLAYING && currentTrick.cards.length > prevTrickLengthRef.current) {
      // A new card was added to the trick - capture source position before it's removed from hand
      const newCard = currentTrick.cards[currentTrick.cards.length - 1];
      if (newCard && boardCenterRef.current) {
        const cardKey = `${newCard.playerId}-${newCard.card.id}`;
        
        // Mark this card as animating (for all players, including player 0)
        setAnimatingCardsToCenter(prev => {
          const newMap = new Map(prev);
          newMap.set(cardKey, true);
          return newMap;
        });
        
        // After animation completes (1 second), remove from animating set (card becomes visible)
        // Also clean up the stored position
        const timer = setTimeout(() => {
          animationTimersRef.current.delete(timer);
          setAnimatingCardsToCenter(prev => {
            const newMap = new Map(prev);
            newMap.delete(cardKey);
            return newMap;
          });
        }, 1000); // Match CSS animation duration
        animationTimersRef.current.add(timer);
      }
    }
    prevTrickLengthRef.current = currentTrick.cards.length;
  }, [currentTrick.cards, phase, cardPositions]);

  // Calculate fixed card positions within board-center for each player
  const calculateCentralCardPositions = () => {
    if (boardCenterRef.current) {
      const boardCenter = boardCenterRef.current.getBoundingClientRect();
      
      // Calculate fixed positions for each player within board-center
      // These are relative to board-center (not screen coordinates)
      const { width: cardWidth, height: cardHeight } = readCardSize(boardCenterRef.current);
      
      // Use TOP-LEFT coordinates for `left/top` positioning.
      // Bottom (South, player 0): centered horizontally, near bottom
      const southX = boardCenter.width / 2 - cardWidth / 2;
      const southY = boardCenter.height - cardHeight;
      
      // Left (West, player 1): centered vertically, near left
      const westX = 0;
      const westY = boardCenter.height / 2 - cardHeight / 2;
      
      // Top (North, player 2): centered horizontally, near top
      const northX = boardCenter.width / 2 - cardWidth / 2;
      const northY = 0;
      
      // Right (East, player 3): centered vertically, near right
      const eastX = boardCenter.width - cardWidth;
      const eastY = boardCenter.height / 2 - cardHeight / 2;
      
      setCardPositionInBoard({
        south: { x: southX, y: southY },
        west: { x: westX, y: westY },
        north: { x: northX, y: northY },
        east: { x: eastX, y: eastY }
      });
    }
  };

  const calculateHolderPosition = () => {
    if (holderRef.current && boardCenterRef.current) {
      const boardCenter = boardCenterRef.current.getBoundingClientRect();
      const holder = holderRef.current.getBoundingClientRect();
      
      // Target is the CENTER of the holders container, expressed in `.board-center` coordinates.
      // Since trick cards are absolutely positioned inside `.board-center`, we convert viewport
      // coordinates -> local coordinates by subtracting `.board-center` top-left.
      const { width: cardWidth, height: cardHeight } = readCardSize(boardCenterRef.current);
      const holderCenterX = holder.left + holder.width / 2;
      const holderCenterY = holder.top + holder.height / 2;
      const targetX = holderCenterX - boardCenter.left - cardWidth / 2;
      const targetY = holderCenterY - boardCenter.top - cardHeight / 2;
      
      setHolderPosition({  x: targetX, y: targetY } );
    }
  };

  useEffect(() => {       
    // Initial calculation + recalculate on window resize
    calculateCentralCardPositions();
    const handleResize = () => {
      calculateCentralCardPositions();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [phase]);

  // Handle trick completion - animate cards to holder
  useLayoutEffect(() => {
    if (trickComplete) {      
      // Measure synchronously before paint so the animation starts with the correct target.
      calculateHolderPosition();
    }
  }, [trickComplete, phase, currentTrick.cards.length]);

  const showStartButton = !isGameStarted && onStartGame;
  const isYourTurnToPlay = phase === GAME_PHASES.PLAYING && currentPlayer === 0 && !trickComplete
    && !isShowingLastTrick && !currentTrick.cards.some(({ playerId }) => playerId === 0);
  
  return (
    <div className={`game-board ${showStartButton ? 'show-start-button-only' : ''} ${biddingPanel ? 'bidding' : ''}`}>
      {tableControls && (
        <div className="table-controls">
          {tableControls}
        </div>
      )}
      {showStartButton && (
        <div className="start-button-overlay">
          <button className="start-button" onClick={onStartGame}>
            {startButtonText}
          </button>
          {onStartNewGame && (
            <button className="start-new-game-button" onClick={onStartNewGame}>
              {t('newGame')}
            </button>
          )}
          {onPlayOnline && (
            <button className="start-new-game-button" onClick={onPlayOnline}>
              {t('playOnline')}
            </button>
          )}
        </div>
      )}
      {biddingPanel && (
        <div className="bidding-panel-overlay">
          {biddingPanel}
        </div>
      )}
      {/* An empty place in front of you while the trick waits for your card. It sits in
          a copy of the trick area drawn under the hands, so your cards cover its outline. */}
      {isYourTurnToPlay && (
        <div className="board-center board-center-under">
          <div
            className="trick-slot"
            style={{ left: `${cardPositionInBoard.south.x}px`, top: `${cardPositionInBoard.south.y}px` }}
          />
        </div>
      )}
      <div
        className={`board-center ${isShowingLastTrick ? 'showing-last-trick' : ''}`}
        ref={boardCenterRef}
        onClick={isShowingLastTrick ? () => setShowLastTrick(false) : undefined}
      >
        {/* The previous trick, each card in front of the player who played it */}
        {isShowingLastTrick && (
          <>
            {lastTrick.cards.map(({ playerId, card }) => {
              const targetPos = cardPositionInBoard[getPlayerPosition(playerId)];
              return (
                <div
                  key={`last-${playerId}-${card.id}`}
                  className={`trick-card last-trick-card from-${getPlayerPosition(playerId)}`}
                  style={{ left: `${targetPos.x}px`, top: `${targetPos.y}px` }}
                >
                  <Card card={card} />
                </div>
              );
            })}
            <div className="last-trick-label">
              <span>{t('lastTrick')}</span>
              <span className="last-trick-hint">{t('tapToClose')}</span>
            </div>
          </>
        )}

        {!biddingPanel && !trickComplete && !isShowingLastTrick && currentTrick.cards.map(({ playerId, card }) => {
          const cardKey = `${playerId}-${card.id}`;
          const isAnimating = animatingCardsToCenter.has(cardKey);
          const position = getPlayerPosition(playerId);
          // Use stored position from cardPositions prop (captured in App.jsx)
          const sourcePos = cardPositions.get(cardKey);
          const targetPos = cardPositionInBoard[position];
          
          return (
            <div 
              key={cardKey} 
              className={`trick-card from-${position} ${isAnimating ? 'animating-to-center' : ''}`}
              style={{
                left: targetPos ? `${targetPos.x}px` : undefined,
                top: targetPos ? `${targetPos.y}px` : undefined,
                '--card-source-x': sourcePos ? `${sourcePos.x}px` : '0px',
                '--card-source-y': sourcePos ? `${sourcePos.y}px` : '0px',
                '--card-target-x': targetPos ? `${targetPos.x}px` : '0px',
                '--card-target-y': targetPos ? `${targetPos.y}px` : '0px',
              }}
            >
              <Card card={card} />
            </div>
          );
        })}

        {trickComplete && currentTrick.cards.map(({ playerId, card }) => {
          const cardKey = `${playerId}-${card.id}`;
          const position = getPlayerPosition(playerId);
          // Use stored position from cardPositions prop (captured in App.jsx)
          const sourcePos = cardPositionInBoard[position];
          
          return (
            <div 
              key={cardKey} 
              className={`trick-card from-${position} moving-to-holder`}
              style={{
                left: sourcePos ? `${sourcePos.x}px` : undefined,
                top: sourcePos ? `${sourcePos.y}px` : undefined,
                '--board-source-x': sourcePos ? `${sourcePos.x}px` : '0px',
                '--board-source-y': sourcePos ? `${sourcePos.y}px` : '0px',
                '--holder-target-x': `${holderPosition.x}px`,
                '--holder-target-y': `${holderPosition.y}px`,
              }}
            >
              <Card card={card} />
            </div>
          );
        })}
      </div>
      
      {/* Card Holders - Team 0 (N/S) vertical, Team 1 (E/W) horizontal - show during playing phase */}
      {phase === GAME_PHASES.PLAYING && (
        <div
          className={`card-holders-container ${lastTrick && !trickComplete ? 'can-show-last-trick' : ''}`}
          ref={holderRef}
          onClick={lastTrick && !trickComplete ? () => setShowLastTrick(show => !show) : undefined}
          title={lastTrick ? t('showLastTrick') : undefined}
        >
          {/* Team 0 (N/S) - Vertical holder */}
          <div className="card-holder card-holder-team0">
            {/* Show contour only if no tricks won yet */}
            {tricksByTeam.team0 === 0 && (
              <div className="card-holder-contour card-holder-contour-vertical"></div>
            )}
            {/* Show card backs if tricks have been won */}
            {tricksByTeam.team0 > 0 && Array.from({ length: tricksByTeam.team0 }).map((_, index) => {
              return (
                <div 
                  key={`team0-cardback-${index}`}
                  className="card-holder-card"
                >
                  <Card showBack cardId={`team0-cardback-${index}`} />
                </div>
              );
            })}
          </div>
          
          {/* Team 1 (E/W) - Horizontal holder */}
          <div className="card-holder card-holder-team1">
            {/* Show contour only if no tricks won yet */}
            {tricksByTeam.team1 === 0 && (
              <div className="card-holder-contour card-holder-contour-horizontal"></div>
            )}
            {/* Show card backs if tricks have been won */}
            {tricksByTeam.team1 > 0 && Array.from({ length: tricksByTeam.team1 }).map((_, index) => (
              <div 
                key={`team1-cardback-${index}`}
                className="card-holder-card"
              >
                <Card showBack cardId={`team1-cardback-${index}`} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="player-positions">
        {players.map((player, idx) => {
          const position = getPlayerPosition(idx);
          const combinations = playerCombinations[idx] || [];
          const isSouth = idx === 0;
          const isTrickWinner = currentTrick.winner === idx;
          // Show dot during bidding phase for current bidder, or during playing phase for current player
          // (not while a full trick waits to be collected: then the trick's winner pulses)
          const isActive = phase === GAME_PHASES.BIDDING
            ? (currentBidder !== null && currentBidder === idx)
            : (phase === GAME_PHASES.PLAYING && currentPlayer === idx && currentTrick.cards.length < 4);
          // While bidding, a bubble shows each player's latest bid for the whole bidding;
          // the player choosing now gets looping dots before it
          const lastBid = phase === GAME_PHASES.BIDDING
            ? bids.filter(bid => bid.playerId === idx).at(-1)
            : undefined;
          const showBidBalloon = phase === GAME_PHASES.BIDDING && (lastBid || currentBidder === idx);
          return (
            <div key={idx} className={`player-container ${position}`} data-player-id={idx}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div className={`player-chip team-${idx % 2} ${isActive ? 'active' : ''} ${isTrickWinner ? 'won-trick' : ''}` }>
                  <span className="player-avatar">
                    {playerNames[idx].charAt(0)}
                    {/* On phones the opponents' cards are hidden; this badge counts them */}
                    {!isSouth && <span className="player-card-count">{player.hand.length}</span>}
                  </span>
                  <span className="player-chip-name">{playerNames[idx]}</span>
                </div>
                {showBidBalloon && (
                  <div className={`combination-balloon-wrapper ${position}`}>
                    <div className="combination-balloon bid-balloon visible">
                      {currentBidder === idx && <ThinkingDots />}
                      {lastBid && <BidLabel bid={lastBid.bid} words />}
                    </div>
                  </div>
                )}
                {!showBidBalloon && combinations.length > 0 && (
                  <div className={`combination-balloon-wrapper ${position}`}>
                    <CombinationBalloon
                      combinations={combinations}
                    />
                  </div>
                )}
              </div>
              {isSouth ? (
                <SouthPlayerHand
                  cards={player.hand}
                  onCardClick={onCardClick}
                  playableCards={playableCards}
                  contract={contract}
                />
              ) : (
                <AIPlayerHand
                  cards={player.hand}
                  position={position}
                  playerIndex={idx}
                  showCards={showCards}
                  contract={contract}
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="score-board">
        {!isRoundOver && (
          <CompactScorePanel 
            roundScores={currentRoundScores}
            totalScores={totalScores}
            contract={contract}
            isDouble={isDouble}
            isRedouble={isRedouble}
            onClick={() => setShowFullScorePanel(true)}
            contractTeam={contractTeam}
          />
        )}
      </div>
      
        {showFullScorePanel && (
        <FullScorePanel 
          totalScores={totalScores}
          currentRoundScores={isRoundOver ? lastRoundRoundedPoints : (forceShowScorePanel ? currentRoundScores : null)}
          lastRoundRoundedPoints={isRoundOver ? lastRoundRoundedPoints : null}
          hangingPoints={isRoundOver ? hangingPoints : 0}
          phase={phase}
          onNextDeal={phase === GAME_PHASES.FINISHED ? null : (isRoundOver ? onNextDeal : null)}
          winner={winner}
          onNewGame={onNewGame}
          onClose={!isRoundOver && !forceShowScorePanel ? () => {
            setShowFullScorePanel(false);
            if (onForceShowScorePanelChange) {
              onForceShowScorePanelChange(false);
            }
          } : null}
          showOverlay={true}
          announcedCombinations={announcedCombinations}
          dealHistory={dealHistory}
          tricks={tricks}
          roundBreakdown={isRoundOver ? roundBreakdown : (forceShowScorePanel ? roundBreakdown : null)}
          forceShow={forceShowScorePanel}
        />
      )}
    </div>
  );
}

