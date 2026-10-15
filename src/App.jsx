import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BelotGame, GAME_PHASES } from './game/gameLogic';
import { makeAIBid, makeAIPlayCard } from './game/aiplayer';
import { saveGame, loadSavedGame } from './game/savedGame';
import GameBoard from './components/GameBoard';
import BiddingPanel from './components/BiddingPanel';
import DevPanel from './components/DevPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import FullscreenToggle from './components/FullscreenToggle';
import { useLanguage } from './contexts/LanguageContext';
import './App.css';

const PLAYER_ID = 0; // Human player is always player 0

// How long an announcement stays in a player's speech balloon
const BALLOON_MS = { belot: 4000, other: 3000 };

export default function App() {
  const { t } = useLanguage();
  // A game saved before a page reload carries on; otherwise a new one starts
  const [game, setGame] = useState(() => loadSavedGame() || new BelotGame());
  const [playableCards, setPlayableCards] = useState([]);
  const [trickComplete, setTrickComplete] = useState(false);
  const [playerCombinations, setPlayerCombinations] = useState({}); // { playerId: combinations[] }
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileGameStarted, setIsMobileGameStarted] = useState(false);
  // Dev panel state
  const [forceShowScorePanel, setForceShowScorePanel] = useState(false);
  const [showCombinationsBalloon, setShowCombinationsBalloon] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [forceShowBiddingPanel, setForceShowBiddingPanel] = useState(false);
  const [cardPositions, setCardPositions] = useState(new Map()); // Map of cardId -> { x, y }

  // One-off timers (animations, balloons). Kept so a new game or deal can cancel them.
  const timersRef = useRef(new Set());
  // Stable across renders (it only touches the ref), so effects can list it
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  };
  useEffect(() => clearTimers, []);

  // Animate cards to the holders for 1 second, then complete the trick.
  // Both updates work on the latest state, not the one this render saw.
  const animateToHolders = useCallback(() => {
    setTrickComplete(true);
    setGame(prev => {
      const g = prev.clone();
      g.currentPlayer = null; // nobody's turn while the trick is collected
      return g;
    });

    later(() => {
      setGame(prev => {
        const g = prev.clone();
        g.completeTrick();
        return g;
      });
      setTrickComplete(false);
    }, 1000);
  }, [later]);

  // Bids for the AI whose turn it is in the latest state, so the timer that
  // calls it never acts on a stale game
  const handleAIBid = useCallback(() => {
    setGame(prev => {
      if (prev.phase !== GAME_PHASES.BIDDING || prev.currentBidder === PLAYER_ID) return prev; // Not an AI's bid any more
      const newGame = prev.clone();
      const playerId = newGame.currentBidder;
      const bid = makeAIBid(newGame.players[playerId].hand, newGame.bids, newGame.players, playerId);
      if (!newGame.makeBid(playerId, bid)) {
        newGame.makeBid(playerId, 'pass'); // Invalid AI bid falls back to pass
      }
      return newGame;
    });
  }, []);

  // Save after every change, so a reload resumes where the game was
  useEffect(() => {
    saveGame(game);
  }, [game]);

  // On mobile nothing moves until the player taps the start button (also after a reload)
  const paused = isMobile && !isMobileGameStarted;

  useEffect(() => {
    // Detect "mobile" using the same breakpoint logic we use in CSS
    const mq = window.matchMedia('(max-width: 768px), ((max-width: 1024px) and (max-height: 768px))');
    const update = () => setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    // On mobile, don't auto-deal until the user taps the start button
    if (isMobile && !isMobileGameStarted) {
      return;
    }

    if (game.phase === GAME_PHASES.DEALING) {
      setGame(prev => {
        if (prev.phase !== GAME_PHASES.DEALING) return prev; // Already dealt
        const newGame = prev.clone();
        newGame.deal();
        return newGame;
      });
      setPlayableCards([]); // Clear playable cards when dealing
      setPlayerCombinations({});
    }
    
    // Clear playable cards in scoring phase
    if (game.phase === GAME_PHASES.SCORING) {
      setPlayableCards([]);
    }
  }, [game.phase, isMobile, isMobileGameStarted]);

  // Auto-play for AI players
  useEffect(() => {
    if (!paused && game.phase === GAME_PHASES.BIDDING && game.currentBidder !== PLAYER_ID) {
      const timer = setTimeout(handleAIBid, 1000);
      return () => clearTimeout(timer);
    }
  }, [paused, game.phase, game.currentBidder, game.bids.length, handleAIBid]);

  useEffect(() => {
    if (paused) return; // Waiting for the mobile start button
    if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer !== null && game.currentPlayer !== PLAYER_ID) {
      // Clear playable cards when it's not player's turn
      setPlayableCards([]);
      const timer = setTimeout(() => {
        handleAIPlay();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer === PLAYER_ID) {
      // Update playable cards only when it's player's turn
      updatePlayableCards();
    } else {
      // Clear playable cards in other phases, and while a finished trick is collected
      setPlayableCards([]);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, game.phase, game.currentPlayer]);

  // After the 4th card, wait 2 seconds, then animate the trick to the holders
  useEffect(() => {
    if (!paused && game.phase === GAME_PHASES.PLAYING && game.currentTrick.cards.length === 4) {
      const timer = setTimeout(animateToHolders, 2000);
      return () => clearTimeout(timer);
    }
    if (game.phase !== GAME_PHASES.PLAYING) {
      setTrickComplete(false);
    }
  }, [paused, game.phase, game.currentTrick.cards.length, animateToHolders]);

  const updatePlayableCards = () => {
    if (game.currentPlayer !== PLAYER_ID) return;
    const player = game.players[PLAYER_ID];
    const playable = player.hand.filter(card => game.isValidCardPlay(player, card));
    setPlayableCards(playable.map(c => c.id));
  };

  const handleBid = (bid) => {
    const newGame = game.clone();
    if (newGame.makeBid(PLAYER_ID, bid)) {
      setGame(newGame);
    }
  };

  const handleCardClick = (card, event) => {
    if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer === PLAYER_ID && game.currentTrick.cards.length < 4) {
      if (playableCards.includes(card.id)) {
        // Get the card's position before playing (relative to board center for animation)
        if (event && event.currentTarget) {
          const cardKey = `${PLAYER_ID}-${card.id}`;
          storeCardPosition(event.currentTarget, cardKey);         
        }

        handlePlayCard(PLAYER_ID, card);
      } 
    }
  };

  const storeCardPosition = (cardElement, cardKey) => {
    let cardPosition = null;
    // Find board center to calculate relative position
    const gameBoard = cardElement.closest('.game-board');
    if (gameBoard) {
      const boardCenter = gameBoard.querySelector('.board-center');
      if (boardCenter) {
        const boardCenterRect = boardCenter.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        cardPosition = {
          x: cardRect.left - boardCenterRect.left,
          y: cardRect.top - boardCenterRect.top
        };
      }
    }

    // Store card position for GameBoard animation (before card is removed from hand)
    // Use cardKey format: playerId-cardId
    if (cardPosition) {
      setCardPositions(prev => {
        const newMap = new Map(prev);
        newMap.set(cardKey, cardPosition);
        return newMap;
      });

      // Clean up card position after animation completes (1 second)
      later(() => {
        setCardPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(cardKey);
          return newMap;
        });
      }, 1000);
    }
  };

  // Show what a played card announced in the player's balloon, each for a few seconds.
  // Skipped while the dev panel is showing its own test combinations.
  const showAnnouncements = (playerId, announced) => {
    if (showCombinationsBalloon || announced.length === 0) return;
    setPlayerCombinations(prev => ({ ...prev, [playerId]: [...(prev[playerId] || []), ...announced] }));
    for (const combo of announced) {
      later(() => {
        setPlayerCombinations(prev => {
          const remaining = (prev[playerId] || []).filter(c => c !== combo);
          const updated = { ...prev, [playerId]: remaining };
          if (remaining.length === 0) delete updated[playerId];
          return updated;
        });
      }, combo.type === 'belot' ? BALLOON_MS.belot : BALLOON_MS.other);
    }
  };

  const handlePlayCard = (playerId, card) => {
    const newGame = game.clone();
    if (newGame.playCard(playerId, card.id)) {
      showAnnouncements(playerId, newGame.lastPlayAnnouncements);
      setGame(newGame);
      if (newGame.currentTrick.cards.length === 4) {
        setPlayableCards([]); // Nothing is playable until the full trick is collected
      }
    }
  };

  const handleAIPlay = () => {
    const playerId = game.currentPlayer;
    const cardToPlay = makeAIPlayCard(game, playerId);
    
    if (cardToPlay) {
      // Capture AI card position before playing (query DOM for card element)
      const cardKey = `${playerId}-${cardToPlay.id}`;
      const cardIndex = game.players[playerId].hand.indexOf(cardToPlay);
      
      // AI cards have data-card-id like "player-${playerId}-back-${cardIndex}"
      const gameBoard = document.querySelector('.game-board');
      const dataCardId = showCards ? cardToPlay.id : `player-${playerId}-back-${cardIndex}`;
      const cardElement = gameBoard?.querySelector(`[data-card-id="${dataCardId}"]`);
      
      if (cardElement) {
        storeCardPosition(cardElement, cardKey);
      }

      handlePlayCard(playerId, cardToPlay);
    }    
  };

  // A fresh deal or game drops anything still pending from the last one
  const resetBoard = () => {
    clearTimers();
    setPlayableCards([]);
    setPlayerCombinations({});
    setTrickComplete(false);
    setCardPositions(new Map());
  };

  const handleNewGame = () => {
    resetBoard();
    const newGame = new BelotGame();
    // On mobile, show the "Start belot game" screen first
    if (isMobile) {
      setIsMobileGameStarted(false);
    } else {
      newGame.deal();
    }
    setGame(newGame);
  };

  const handleNextDeal = () => {
    resetBoard();
    const newGame = game.clone();
    newGame.dealer = (newGame.dealer + 3) % 4;
    newGame.deal();
    setGame(newGame);
  };

  // Starts play on mobile; full screen is a separate, optional toggle on the table
  const handleStartMobileGame = () => {
    setIsMobileGameStarted(true);
  };

  // Dev panel handlers
  const handleShowCombinations = (show) => {
    if (show) {
      // Show a single test combination for all players
      const mockCombination1 = { type: 'tierce', points: 20, cards: [] };
      const mockCombination2 = { type: 'belot', points: 20, cards: [] };
      const mockCombination3 = { type: 'quarte', points: 50, cards: [] }; 
      const allPlayersCombinations = {};
      for (let i = 0; i < 4; i++) {
        allPlayersCombinations[i] = [mockCombination1, mockCombination2, mockCombination3 ];
      }
      setPlayerCombinations(allPlayersCombinations);
    } else {
      // Clear all combinations when unchecked
      setPlayerCombinations({});
    }
    setShowCombinationsBalloon(show);
  };

  const handleShowScorePanel = (show) => {
    setForceShowScorePanel(show);
  };

  const handleShowCards = (show) => {
    setShowCards(show);
  };

  const handleShowBiddingPanel = (show) => {
    setForceShowBiddingPanel(show);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-logo" title={t('appTitle')}>
          {t('logo')}
          <span className="app-logo-suits" aria-hidden="true">♣<span className="red">♦♥</span>♠</span>
        </h1>
        <LanguageSwitcher />
      </header>

      <div className="game-container">
        <GameBoard
          tableControls={<><FullscreenToggle /><LanguageSwitcher /></>}
          players={game.players}
          currentTrick={game.currentTrick}
          currentPlayer={game.currentPlayer}
          currentBidder={game.currentBidder}
          tricks={game.tricks}
          totalScores={game.totalScores}
          currentRoundScores={game.currentRoundScore}
          lastRoundRoundedPoints={game.lastRoundRoundedPoints}
          hangingPoints={game.hangingPoints}
          contract={game.contract}
          phase={game.phase}
          isDouble={game.double}
          isRedouble={game.redouble}
          onNextDeal={handleNextDeal}
          winner={game.winner}
          onNewGame={handleNewGame}
          playerCombinations={playerCombinations}
          announcedCombinations={game.announcedCombinations}
          dealHistory={game.dealHistory}
          roundBreakdown={game.lastRoundBreakdown}
          contractTeam={game.contractTeam()}
          trickComplete={trickComplete}
          forceShowScorePanel={forceShowScorePanel}
          onForceShowScorePanelChange={setForceShowScorePanel}
          showCards={showCards}
          isMobile={isMobile}
          isMobileGameStarted={isMobileGameStarted}
          onStartMobileGame={handleStartMobileGame}
          startButtonText={t('startBelotGame')}
          biddingPanel={(game.phase === GAME_PHASES.BIDDING || forceShowBiddingPanel) ? (
            <BiddingPanel
              currentBidder={game.currentBidder}
              playerId={PLAYER_ID}
              bids={game.bids}
              onBid={handleBid}
              canDouble={game.canDouble(PLAYER_ID)}
              canRedouble={game.canRedouble(PLAYER_ID)}
              allPassed={game.allPassed}
            />
          ) : null}
          playableCards={playableCards}
          onCardClick={handleCardClick}
          cardPositions={cardPositions}
        />
      </div>

      {import.meta.env.DEV ? (
        <DevPanel
          onShowCombinations={handleShowCombinations}
          onShowScorePanel={handleShowScorePanel}
          onShowCards={handleShowCards}
          onShowBiddingPanel={handleShowBiddingPanel}
          showCombinations={showCombinationsBalloon}
          showScorePanel={forceShowScorePanel}
          showCards={showCards}
          showBiddingPanel={forceShowBiddingPanel}
        />
      ) : null}
    </div>
  );
}

