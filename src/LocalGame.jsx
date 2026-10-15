import React, { useState, useEffect, useCallback } from 'react';
import { BelotGame, GAME_PHASES } from './game/gameLogic';
import { makeAIBid, makeAIPlayCard } from './game/aiplayer';
import { saveGame, loadSavedGame } from './game/savedGame';
import GameBoard from './components/GameBoard';
import BiddingPanel from './components/BiddingPanel';
import DevPanel from './components/DevPanel';
import AppHeader, { TableControls } from './components/AppHeader';
import { useBoardEffects } from './hooks/useBoardEffects';
import { useLanguage } from './contexts/LanguageContext';

const PLAYER_ID = 0; // Human player is always player 0

// You and three AI players on this device. onPlayOnline (if set) switches to online play.
export default function LocalGame({ onPlayOnline }) {
  const { t } = useLanguage();
  // A game saved before a page reload carries on; otherwise a new one starts
  const [game, setGame] = useState(() => loadSavedGame() || new BelotGame());
  const [playableCards, setPlayableCards] = useState([]);
  const [trickComplete, setTrickComplete] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  // Dev panel state
  const [forceShowScorePanel, setForceShowScorePanel] = useState(false);
  const [showCombinationsBalloon, setShowCombinationsBalloon] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [forceShowBiddingPanel, setForceShowBiddingPanel] = useState(false);
  const {
    cardPositions, storeCardPosition,
    playerCombinations, setPlayerCombinations, showAnnouncements: showBalloons,
    later, resetEffects,
  } = useBoardEffects();

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

  // Nothing moves until the player taps the start button (also after a reload)
  const paused = !isGameStarted;

  useEffect(() => {
    // Don't auto-deal until the user taps the start button
    if (paused) {
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
  }, [game.phase, paused, setPlayerCombinations]);

  // Auto-play for AI players
  useEffect(() => {
    if (!paused && game.phase === GAME_PHASES.BIDDING && game.currentBidder !== PLAYER_ID) {
      const timer = setTimeout(handleAIBid, 1000);
      return () => clearTimeout(timer);
    }
  }, [paused, game.phase, game.currentBidder, game.bids.length, handleAIBid]);

  useEffect(() => {
    if (paused) return; // Waiting for the start button
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

  // Skipped while the dev panel is showing its own test combinations
  const showAnnouncements = (playerId, announced) => {
    if (!showCombinationsBalloon) showBalloons(playerId, announced);
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
    resetEffects();
    setPlayableCards([]);
    setTrickComplete(false);
  };

  // Ends the game in progress and goes back to the start screen. The fresh,
  // undealt game replaces the save, which removes it.
  const handleExitGame = () => {
    resetBoard();
    setGame(new BelotGame());
    setIsGameStarted(false);
  };

  // A fresh game; the dealing effect deals it once play has started
  const handleNewGame = () => {
    resetBoard();
    setGame(new BelotGame());
    setIsGameStarted(true);
  };

  const handleNextDeal = () => {
    resetBoard();
    const newGame = game.clone();
    newGame.dealer = (newGame.dealer + 3) % 4;
    newGame.deal();
    setGame(newGame);
  };

  // Starts play, or continues the saved game after a reload
  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  // A saved game that was already under way when the page loaded
  const hasGameInProgress = game.phase !== GAME_PHASES.DEALING || game.dealHistory.length > 0;

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
    <>
      <AppHeader onExitGame={handleExitGame} />

      <div className="game-container">
        <GameBoard
          tableControls={<TableControls onExitGame={handleExitGame} />}
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
          isGameStarted={isGameStarted}
          onStartGame={handleStartGame}
          startButtonText={hasGameInProgress ? t('continueGame') : t('startBelotGame')}
          onStartNewGame={hasGameInProgress ? handleNewGame : null}
          onPlayOnline={onPlayOnline}
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
    </>
  );
}

