import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import Card from './Card';
import CompactScorePanel from './CompactScorePanel';
import FullScorePanel from './FullScorePanel';
import CombinationBalloon from './CombinationBalloon';
import SouthPlayerHand from './SouthPlayerHand';
import AIPlayerHand from './AIPlayerHand';
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
  lastRoundRoundedPoints,
  hangingPoints = 0,
  contract,
  trumpSuit,
  biddingPanel,
  playableCards = [],
  onCardClick = null,
  cardPositions = new Map(), // Map of cardId -> { x, y } positions from App.jsx
  showEmptyHand = false, // Show completed trick on central board before animation to holders
  phase,
  isDouble = false,
  isRedouble = false,
  onNextDeal = null,
  playerCombinations = {},
  announcedCombinations = [[], []],
  roundBreakdown = null,
  bids = [],
  languageSwitcher = null,
  trickComplete = false,
  winningTeam = null, // 0 for N/S, 1 for E/W
  // Dev/test props
  forceShowScorePanel = false,
  onForceShowScorePanelChange = null,
  showCards = false,
}) {
  const [showFullScorePanel, setShowFullScorePanel] = useState(false);
  const [animatingCards, setAnimatingCards] = useState(new Map()); // Track cards animating to board
  const [cardsMovingToHolder, setCardsMovingToHolder] = useState({ team0: [], team1: [] }); // Track cards moving to holders by team
  const [holderPositions, setHolderPositions] = useState({ team0: { x: 0, y: 0 }, team1: { x: 0, y: 0 } });
  const [cardPositionInBoard, setCardPositionInBoard] = useState({ 
    south: { x: 0, y: 0 }, // South (player 0)
    west: { x: 0, y: 0 },   // West (player 1)
    north: { x: 0, y: 0 },    // North (player 2)
    east: { x: 0, y: 0 }   // East (player 3)
  });
  const holderTeam0Ref = useRef(null);
  const holderTeam1Ref = useRef(null);
  const boardCenterRef = useRef(null);
  const prevTrickLengthRef = useRef(0);
  const prevTrickCompleteRef = useRef(false);
  const isRoundOver = phase === GAME_PHASES.SCORING || phase === GAME_PHASES.FINISHED;

  // Count tricks won by each team
  const tricksByTeam = useMemo(() => {
    if (!tricks || !Array.isArray(tricks) || tricks.length === 0) {
      return { team0: 0, team1: 0 };
    }
    // Filter tricks by team - handle both number and string comparisons
    const team0Count = tricks.filter(t => {
      if (!t) return false;
      // Handle both direct team property and nested structure
      const team = t.team !== undefined && t.team !== null ? Number(t.team) : null;
      return team === 0;
    }).length;
    const team1Count = tricks.filter(t => {
      if (!t) return false;
      // Handle both direct team property and nested structure
      const team = t.team !== undefined && t.team !== null ? Number(t.team) : null;
      return team === 1;
    }).length;
    return { team0: team0Count, team1: team1Count };
  }, [tricks]);

  const getPlayerPosition = (playerId) => {
    const positions = ['south', 'west', 'north', 'east'];
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


  // Track when cards are added to trick - capture source position and start animation
  // Use useLayoutEffect to capture position synchronously before React removes card from DOM
  useLayoutEffect(() => {
    if (phase === GAME_PHASES.PLAYING && currentTrick.length > prevTrickLengthRef.current) {
      // A new card was added to the trick - capture source position before it's removed from hand
      const newCard = currentTrick[currentTrick.length - 1];
      if (newCard && boardCenterRef.current) {
        const cardKey = `${newCard.playerId}-${newCard.card.id}`;
        
        // Use position from cardPositions prop (captured in App.jsx)
        // If not available, query DOM as fallback (shouldn't happen if App.jsx captures correctly)
        let sourceX = 0;
        let sourceY = 0;
        
        const storedPosition = cardPositions.get(cardKey);
        if (storedPosition) {
          // Position was captured in App.jsx and passed via prop
          sourceX = storedPosition.x;
          sourceY = storedPosition.y;
        } else {
          // Fallback: Query the DOM directly (shouldn't normally happen)
          const gameBoard = boardCenterRef.current.closest('.game-board');
          if (gameBoard) {
            const cardElement = gameBoard.querySelector(`[data-card-id="${newCard.card.id}"]`);
            if (cardElement) {
              const boardCenter = boardCenterRef.current.getBoundingClientRect();
              const cardRect = cardElement.getBoundingClientRect();
              // Calculate position relative to board center (matching centralCardPositions coordinate system)
              sourceX = cardRect.left - boardCenter.left;
              sourceY = cardRect.top - boardCenter.top;
            }
          }
        }
        
        // Mark this card as animating (for all players, including player 0)
        setAnimatingCards(prev => {
          const newMap = new Map(prev);
          newMap.set(cardKey, true);
          return newMap;
        });
        
        // After animation completes (1 second), remove from animating set (card becomes visible)
        // Also clean up the stored position
        setTimeout(() => {
          setAnimatingCards(prev => {
            const newMap = new Map(prev);
            newMap.delete(cardKey);
            return newMap;
          });
        }, 1000); // Match CSS animation duration
      }
    }
    prevTrickLengthRef.current = currentTrick.length;
  }, [currentTrick, phase, cardPositions]);

  // Calculate fixed card positions within board-center for each player
  const calculateCentralCardPositions = useCallback(() => {
    if (boardCenterRef.current) {
      const boardCenter = boardCenterRef.current.getBoundingClientRect();
      
      // Calculate fixed positions for each player within board-center
      // These are relative to board-center (not screen coordinates)
      const cardWidth = 80; // Full card width
      const cardHeight = 108; // Full card height
      
      // Cards already have translate 50% left and top, so we don't need to add that here.
      // Bottom (South, player 0): center horizontally, near bottom
      const southX = boardCenter.width / 2;
      const southY = boardCenter.height - cardHeight;
      
      // Left (West, player 1): center vertically, near left
      const westX = 0;
      const westY = boardCenter.height / 2;
      
      // Top (North, player 2): center horizontally, near top
      const northX = boardCenter.width / 2;
      const northY = 0;
      
      // Right (East, player 3): center vertically, near right
      const eastX = boardCenter.width - cardWidth;
      const eastY = boardCenter.height / 2;
      
      setCardPositionInBoard({
        south: { x: southX, y: southY },
        west: { x: westX, y: westY },
        north: { x: northX, y: northY },
        east: { x: eastX, y: eastY }
      });
    }
  }, []);

  useEffect(() => {
    calculateCentralCardPositions();
    
    // Recalculate on window resize
    const handleResize = () => {
      calculateCentralCardPositions();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [phase, calculateCentralCardPositions]);

  // Calculate holder positions relative to board center
  useEffect(() => {
    if (holderTeam0Ref.current && holderTeam1Ref.current && boardCenterRef.current) {
      const boardCenter = boardCenterRef.current.getBoundingClientRect();
      const holder0 = holderTeam0Ref.current.getBoundingClientRect();
      const holder1 = holderTeam1Ref.current.getBoundingClientRect();
      
      // Calculate positions relative to board center
      const team0X = holder0.left + holder0.width / 2 - (boardCenter.left + boardCenter.width / 2);
      const team0Y = holder0.top + holder0.height / 2 - (boardCenter.top + boardCenter.height / 2);
      const team1X = holder1.left + holder1.width / 2 - (boardCenter.left + boardCenter.width / 2);
      const team1Y = holder1.top + holder1.height / 2 - (boardCenter.top + boardCenter.height / 2);
      
      setHolderPositions({
        team0: { x: team0X, y: team0Y },
        team1: { x: team1X, y: team1Y }
      });
    }
  }, [phase, tricksByTeam]);

  // Handle trick completion - animate cards to correct holder based on winning team
  // This is triggered 3 seconds after the 4th card is played (handled in App.jsx)
  useEffect(() => {
    if (trickComplete && !prevTrickCompleteRef.current && currentTrick.length === 4 && winningTeam !== null) {
      // Trick just completed (after 3 second delay), mark all cards to animate to the correct team's holder
      // Each card will animate independently
      const teamKey = winningTeam === 0 ? 'team0' : 'team1';
      setCardsMovingToHolder(prev => ({
        ...prev,
        [teamKey]: [...currentTrick]
      }));
      
      // After animation completes (0.8s), clear the moving cards but keep the trick count
      // The card backs in the holder are based on tricksByTeam, not cardsMovingToHolder
      setTimeout(() => {
        setCardsMovingToHolder(prev => {
          const newMap = { ...prev };
          newMap[teamKey] = [];
          return newMap;
        });
      }, 1000); // Match CSS animation duration
    } else if (!trickComplete && prevTrickCompleteRef.current) {
      // Trick display ended, clear moving cards
      setCardsMovingToHolder({ team0: [], team1: [] });
    }
    prevTrickCompleteRef.current = trickComplete;
  }, [trickComplete, currentTrick, winningTeam]);

  return (
    <div className="game-board">
      {languageSwitcher && (
        <div className="language-switcher-container">
          {languageSwitcher}
        </div>
      )}
      <div className="board-center" ref={boardCenterRef}>
        {biddingPanel && (
          <div className="bidding-panel-overlay">
            {biddingPanel}
          </div>
        )}
        {!biddingPanel && (showEmptyHand && tricks.length > 0 ? tricks[tricks.length - 1].cards : currentTrick).map(({ playerId, card }, index) => {
          const cardKey = `${playerId}-${card.id}`;
          const isAnimating = animatingCards.has(cardKey);
          const isMovingToHolderTeam0 = cardsMovingToHolder.team0.some(c => c.playerId === playerId && c.card.id === card.id);
          const isMovingToHolderTeam1 = cardsMovingToHolder.team1.some(c => c.playerId === playerId && c.card.id === card.id);
          const isMovingToHolder = isMovingToHolderTeam0 || isMovingToHolderTeam1;
          const targetTeam = isMovingToHolderTeam0 ? 0 : (isMovingToHolderTeam1 ? 1 : null);
          const position = getPlayerPosition(playerId);
          // Use stored position from cardPositions prop (captured in App.jsx)
          const sourcePos = cardPositions.get(cardKey);
          const targetPos = cardPositionInBoard[position];
          
          return (
            <div 
              key={cardKey} 
              className={`trick-card ${position} ${isAnimating ? 'animating-to-center' : ''} ${isMovingToHolder ? `moving-to-holder moving-to-team-${targetTeam}` : ''}`}
              style={{
                ...(isMovingToHolder ? { 
                  '--card-index': index,
                  '--holder-x': targetTeam === 0 ? `${holderPositions.team0.x}px` : `${holderPositions.team1.x}px`,
                  '--holder-y': targetTeam === 0 ? `${holderPositions.team0.y}px` : `${holderPositions.team1.y}px`
                } : {}),
                // ...(isAnimating ? {
                  '--card-source-x': sourcePos ? `${sourcePos.x}px` : '0px',
                  '--card-source-y': sourcePos ? `${sourcePos.y}px` : '0px',
                  '--card-target-x': targetPos ? `${targetPos.x}px` : '0px',
                  '--card-target-y': targetPos ? `${targetPos.y}px` : '0px'
                // } : {})
              }}
            >
              <Card card={card} />
            </div>
          );
        })}
      </div>
      
      {/* Card Holders - Team 0 (N/S) vertical, Team 1 (E/W) horizontal - show during playing phase */}
      {phase === GAME_PHASES.PLAYING && (
        <div className="card-holders-container">
          {/* Team 0 (N/S) - Vertical holder */}
          <div className="card-holder card-holder-team0" ref={holderTeam0Ref}>
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
                  style={{ '--index': index }}
                >
                  <Card showBack cardId={`team0-cardback-${index}`} />
                </div>
              );
            })}
          </div>
          
          {/* Team 1 (E/W) - Horizontal holder */}
          <div className="card-holder card-holder-team1" ref={holderTeam1Ref}>
            {/* Show contour only if no tricks won yet */}
            {tricksByTeam.team1 === 0 && (
              <div className="card-holder-contour card-holder-contour-horizontal"></div>
            )}
            {/* Show card backs if tricks have been won */}
            {tricksByTeam.team1 > 0 && Array.from({ length: tricksByTeam.team1 }).map((_, index) => (
              <div 
                key={`team1-cardback-${index}`}
                className="card-holder-card"
                style={{ '--index': index }}
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
          return (
            <div key={idx} className={`player-container ${position}`} data-player-id={idx}>
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
              {isSouth ? (
                <SouthPlayerHand
                  cards={player.hand}
                  onCardClick={onCardClick}
                  playableCards={playableCards}
                />
              ) : (
                <AIPlayerHand
                  cards={player.hand}
                  position={position}
                  playerIndex={idx}
                  showCards={showCards}
                  contract={contract}
                  trumpSuit={trumpSuit}
                />
              )}
            </div>
          );
        })}
      </div>
      
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
          lastRoundRoundedPoints={isRoundOver ? lastRoundRoundedPoints : null}
          hangingPoints={isRoundOver ? hangingPoints : 0}
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

