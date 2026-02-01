import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BelotGame, GAME_PHASES } from './game/gameLogic';
import { getAllCombinations, findBelotOnPlay } from './game/combinations';
import { makeAIBid, makeAIPlayCard } from './game/aiplayer';
import GameBoard from './components/GameBoard';
import BiddingPanel from './components/BiddingPanel';
import DevPanel from './components/DevPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './contexts/LanguageContext';
import './App.css';

const PLAYER_ID = 0; // Human player is always player 0

export default function App() {
  const { t, language } = useLanguage();
  const [game, setGame] = useState(new BelotGame());
  const [playableCards, setPlayableCards] = useState([]);
  const [trickComplete, setTrickComplete] = useState(false);
  const [winningTeam, setWinningTeam] = useState(null); // Track which team won the trick
  const [playerCombinations, setPlayerCombinations] = useState({}); // { playerId: combinations[] }
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileGameStarted, setIsMobileGameStarted] = useState(false);
  // Dev panel state
  const [forceShowScorePanel, setForceShowScorePanel] = useState(false);
  const [showCombinationsBalloon, setShowCombinationsBalloon] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [forceShowBiddingPanel, setForceShowBiddingPanel] = useState(false);
  const [cardPositions, setCardPositions] = useState(new Map()); // Map of cardId -> { x, y }

  useEffect(() => {
    // Detect "mobile" using the same breakpoint logic we use in CSS
    const mq = window.matchMedia('(max-width: 768px), ((max-width: 1024px) and (max-height: 768px))');
    const update = () => setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    // On mobile, don't auto-deal until the user enters immersive mode via the start button
    if (isMobile && !isMobileGameStarted) {
      return;
    }

    if (game.phase === GAME_PHASES.DEALING) {
      game.deal();
      setGame({ ...game });
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
    if (game.phase === GAME_PHASES.BIDDING && game.currentBidder !== PLAYER_ID) {
      const timer = setTimeout(() => {
        handleAIBid();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game.phase, game.currentBidder, game.bids.length]);

  useEffect(() => {
    if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer !== PLAYER_ID) {
      // Clear playable cards when it's not player's turn
      setPlayableCards([]);
      const timer = setTimeout(() => {
        handleAIPlay();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer === PLAYER_ID) {
      // Update playable cards only when it's player's turn
      updatePlayableCards();
    } else {
      // Clear playable cards in other phases
      setPlayableCards([]);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.currentPlayer]);

  // Handle trick completion - wait 3 seconds after 4th card, then trigger animation to holders
  useEffect(() => {
    if (game.phase === GAME_PHASES.PLAYING) {
      if (game.currentTrick.cards.length === 4) {
          //Wait 3 seconds, then mark trick as complete (triggers animation to holders)
          const timer = setTimeout(() => {
            setWinningTeam(game.players[game.currentPlayer].team);
            animateToHolders();
          }, 3000);
          return () => clearTimeout(timer);
        }
      } 
      else {
        setTrickComplete(false);
        setWinningTeam(null);
      }      
  }, [game.phase, game.currentTrick.cards.length]);

  //Animate cards to holders for 1 second then complete trick
  const animateToHolders = () => {
    setTrickComplete(true);

    game.currentPlayer = null;
    
    const timer = setTimeout(() => {
      const newGame = new BelotGame();
      Object.assign(newGame, game);

      newGame.completeTrick();

      setTrickComplete(false);
      setGame(newGame);
    }, 1000);
    return () => clearTimeout(timer);
  };

  const updatePlayableCards = () => {
    if (game.currentPlayer !== PLAYER_ID) return;
    
    const player = game.players[PLAYER_ID];
    // Create a copy of the game state for testing
    const testGame = new BelotGame();
    Object.assign(testGame, game);
    // Copy currentTrick array (shallow copy is fine since we're not modifying cards)
    testGame.currentTrick = { ...game.currentTrick, cards: [...game.currentTrick.cards] };
    
    const playable = player.hand.filter(card => {
      return testGame.isValidCardPlay(player, card);
    });
    
    setPlayableCards(playable.map(c => c.id));
  };

  const handleBid = (bid) => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    if (newGame.makeBid(PLAYER_ID, bid)) {
      setGame(newGame);
    }
  };

  const handleAIBid = () => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    const playerId = newGame.currentBidder;
    const bid = makeAIBid(newGame.players[playerId].hand, newGame.bids, newGame.players, playerId);
    
    const lastBid = newGame.bids.filter(b => b.bid !== 'pass').pop();
    if (lastBid) {      
      const lastBidRank = {
        'pass': 0, 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4, 'no-trump': 5, 'all-trump': 6
      }[lastBid.bid];
      const bidRank = {
        'pass': 0, 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4, 'no-trump': 5, 'all-trump': 6
      }[bid];
      
      if (bidRank > lastBidRank) {
        newGame.makeBid(playerId, bid);
      } else {
        newGame.makeBid(playerId, 'pass');
      }
    } else {
      newGame.makeBid(playerId, bid);
    }
    
    setGame(newGame);
  };

  const handleCardClick = (card, event) => {
    if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer === PLAYER_ID) {
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
      setTimeout(() => {
        setCardPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(cardKey);
          return newMap;
        });
      }, 1000);
    }
  };

  const handleCombinations = (newGame, playerId, card) => {
    const isFirstTrick = newGame.tricks.length === 0;
    const player = newGame.players[playerId];

    // Check combinations before playing (on full hand) - for sequences and equals
    let combos = [];
    if (isFirstTrick && newGame.contract && newGame.contract !== 'no-trump') {
      combos = getAllCombinations(player.hand, newGame.trumpSuit);
    }

    // Check for belot when Q or K is played (before playing the card)
    let belotCombo = null;
    if (newGame.contract && (card.rank === 'Q' || card.rank === 'K')) {
      const leadSuit = newGame.currentTrick.cards.length > 0 ? newGame.currentTrick.cards[0].card.suit : card.suit;
      belotCombo = findBelotOnPlay(newGame.contract, card, player.hand, leadSuit);
    }

    // On first card play in first trick, show combinations (sequences, equals)
      // Skip if dev panel is controlling combinations
      if (!showCombinationsBalloon && isFirstTrick && combos.length > 0) {
        setPlayerCombinations(prev => ({ ...prev, [playerId]: combos }));
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setPlayerCombinations(prev => {
            const updated = { ...prev };
            delete updated[playerId];
            return updated;
          });
        }, 4000);
      }

      // Show belot when announced (when Q or K is played)
      // Skip if dev panel is controlling combinations
      if (!showCombinationsBalloon && belotCombo) {
        setPlayerCombinations(prev => ({ 
          ...prev, 
          [playerId]: [...(prev[playerId] || []), belotCombo]
        }));
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setPlayerCombinations(prev => {
            const updated = { ...prev };
            if (updated[playerId]) {
              updated[playerId] = updated[playerId].filter(c => c.type !== 'belot');
              if (updated[playerId].length === 0) {
                delete updated[playerId];
              }
            }
            return updated;
          });
        }, 4000);
      }
  }

  const handlePlayCard = (playerId, card) => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);

    handleCombinations(newGame, playerId, card);
    
    newGame.playCard(playerId, card.id);

    setGame(newGame);
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

      handlePlayCard(playerId,cardToPlay);
    }    
  };


  const handleNewGame = () => {
    const newGame = new BelotGame();
    // On mobile, show the "Start belot game" screen first
    if (isMobile) {
      setIsMobileGameStarted(false);
      setGame(newGame);
    } else {
      newGame.deal();
      setGame(newGame);
    }
    setPlayableCards([]);
  };

  const handleNextDeal = () => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    newGame.dealer = (newGame.dealer + 1) % 4;
    newGame.deal();
    setGame(newGame);
    setPlayableCards([]);
    setPlayerCombinations({});
  };

  const handleStartMobileGame = async () => {
    // Must be called from a user gesture
    try {
      if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Some browsers/devices (notably iOS Safari) may not support fullscreen;
      // still proceed to start the game.
    }
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

  // Update player names when language changes
  useEffect(() => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    newGame.players[0].name = t('playerYou');
    newGame.players[1].name = t('playerWest');
    newGame.players[2].name = t('playerPartner');
    newGame.players[3].name = t('playerEast');
    // Only update if names actually changed to avoid unnecessary re-renders
    if (newGame.players[0].name !== game.players[0].name ||
        newGame.players[1].name !== game.players[1].name ||
        newGame.players[2].name !== game.players[2].name ||
        newGame.players[3].name !== game.players[3].name) {
      setGame(newGame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        {game.phase === GAME_PHASES.FINISHED && (
          <div className="winner-announcement">
            <h2>{t('teamWins', { team: game.winner + 1 })}</h2>
            <button onClick={handleNewGame} className="new-game-button">
              {t('newGame')}
            </button>
          </div>
        )}
      </header>

      <div className="game-container">
        <GameBoard
          languageSwitcher={<LanguageSwitcher />}
          players={game.players}
          currentTrick={game.currentTrick}
          currentPlayer={game.currentPlayer}
          tricks={game.tricks}
          totalScores={game.totalScores}
          currentRoundScores={game.currentRoundScore}
          lastRoundRoundedPoints={game.lastRoundRoundedPoints}
          hangingPoints={game.hangingPoints}
          contract={game.contract}
          trumpSuit={game.trumpSuit}
          phase={game.phase}
          isDouble={game.double}
          isRedouble={game.redouble}
          onNextDeal={handleNextDeal}
          playerCombinations={playerCombinations}
          announcedCombinations={game.announcedCombinations}
          roundBreakdown={game.lastRoundBreakdown}
          bids={game.bids}
          trickComplete={trickComplete}
          winningTeam={winningTeam}
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
              contract={game.contract}
              players={game.players}
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

