import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BelotGame, GAME_PHASES } from './game/gameLogic';
import { getAllCombinations } from './game/combinations';
import { makeAIBid } from './game/aiplayer';
import GameBoard from './components/GameBoard';
import PlayerHand from './components/PlayerHand';
import BiddingPanel from './components/BiddingPanel';
import CombinationPanel from './components/CombinationPanel'; 
import './App.css';

const PLAYER_ID = 0; // Human player is always player 0

export default function App() {
  const [game, setGame] = useState(new BelotGame());
  const [selectedCard, setSelectedCard] = useState(null);
  const [playableCards, setPlayableCards] = useState([]);
  const [showEmptyHand, setShowEmptyHand] = useState(false);
  const [displayTrick, setDisplayTrick] = useState([]);
  const [trickComplete, setTrickComplete] = useState(false);
  const [combinations, setCombinations] = useState(null);
  const prevTricksLengthRef = useRef(0);
  const trickTimeoutRef = useRef(null);

  useEffect(() => {
    if (game.phase === GAME_PHASES.DEALING) {
      game.deal();
      setGame({ ...game });
      setPlayableCards([]); // Clear playable cards when dealing
    }
    
    // // Clear playable cards in scoring phase
    // if (game.phase === GAME_PHASES.SCORING) {
    //   setPlayableCards([]);
    // }
  }, [game.phase]);

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
    
    // Reset showEmptyHand when phase changes
    if (game.phase !== GAME_PHASES.PLAYING) {
      setShowEmptyHand(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.currentPlayer, game.currentTrick, game.contract]);

  // Handle trick completion delay - keep trick visible for 2 seconds
  useEffect(() => {
    // Clear any existing timeout
    if (trickTimeoutRef.current) {
      clearTimeout(trickTimeoutRef.current);
      trickTimeoutRef.current = null;
    }

    if (game.phase === GAME_PHASES.PLAYING) {
      const prevTricksLength = prevTricksLengthRef.current;
      const currentTricksLength = game.tricks.length;
      const currentTrickLength = game.currentTrick.length;

      // Check if a trick was just completed (tricks array increased)
      if (currentTricksLength > prevTricksLength) {
        // A trick was just completed, get it from the tricks array
        const completedTrick = game.tricks[currentTricksLength - 1];
        if (completedTrick && completedTrick.cards) {
          // The cards are already in the correct format: [{ playerId, card }, ...]
          setDisplayTrick([...completedTrick.cards]);
          setTrickComplete(true);
          prevTricksLengthRef.current = currentTricksLength;
          
          // Keep showing for 2 seconds, then clear
          trickTimeoutRef.current = setTimeout(() => {
            setTrickComplete(false);
            setDisplayTrick([]);
            trickTimeoutRef.current = null;
          }, 2000);
        }
      } 
      // Normal trick in progress - show current trick
      else if (currentTrickLength > 0 && currentTrickLength < 4) {
        if (!trickComplete) {
          setDisplayTrick([...game.currentTrick]);
        }
        prevTricksLengthRef.current = currentTricksLength;
      }
      // No trick in progress - clear display if not showing completed trick
      else if (currentTrickLength === 0 && !trickComplete) {
        setDisplayTrick([]);
        prevTricksLengthRef.current = currentTricksLength;
      }
    } else {
      // Clear timeout and reset state when phase changes
      if (trickTimeoutRef.current) {
        clearTimeout(trickTimeoutRef.current);
        trickTimeoutRef.current = null;
      }
      setDisplayTrick([]);
      setTrickComplete(false);
      prevTricksLengthRef.current = 0;
    }

    // Cleanup function
    return () => {
      if (trickTimeoutRef.current) {
        clearTimeout(trickTimeoutRef.current);
        trickTimeoutRef.current = null;
      }
    };
  }, [game.phase, game.currentTrick, game.tricks.length]);

  const updatePlayableCards = () => {
    if (game.currentPlayer !== PLAYER_ID) return;
    
    const player = game.players[PLAYER_ID];
    // Create a copy of the game state for testing
    const testGame = new BelotGame();
    Object.assign(testGame, game);
    // Copy currentTrick array (shallow copy is fine since we're not modifying cards)
    testGame.currentTrick = [...game.currentTrick];
    
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
    const bid = makeAIBid(newGame.players[playerId].hand);
    
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

  const handleCardClick = (card) => {
    if (game.phase === GAME_PHASES.PLAYING && game.currentPlayer === PLAYER_ID) {
      if (playableCards.includes(card.id)) {
        handlePlayCard(card);
      } else {
        setSelectedCard(card);
      }
    } else {
      setSelectedCard(card);
    }
  };

  const handlePlayCard = (card) => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    const player = newGame.players[PLAYER_ID];
    const wasLastCardInTrick = newGame.currentTrick.length === 3;

    if (newGame.playCard(PLAYER_ID, card.id)) {
      setGame(newGame);
      setSelectedCard(null);

      // If this was the last card in the trick, show empty hand for 2 seconds
      if (wasLastCardInTrick) {
        setShowEmptyHand(true);
        setTimeout(() => {
          setShowEmptyHand(false);
        }, 2000);
      }
    }

    // On first card play, show combinations
    if (game.tricks.length === 0) {
      setCombinations(game.contract && game.contract !== 'no-trump' 
        ? getAllCombinations(player.hand, game.trumpSuit)
        : []);
    }
  };

  const handleAIPlay = () => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    const playerId = newGame.currentPlayer;
    const player = newGame.players[playerId];
    
    // Find playable cards
    const playable = player.hand.filter(card => {
      return newGame.isValidCardPlay(player, card);
    });
    
    if (playable.length > 0) {
      const cardToPlay = playable[Math.floor(Math.random() * playable.length)];
      newGame.playCard(playerId, cardToPlay.id);
      setGame(newGame);
    }
  };

  const handleAnnounceCombination = (combination) => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    if (newGame.announceCombination(PLAYER_ID, combination)) {
      setGame(newGame);
    }
  };

  const handleNewGame = () => {
    const newGame = new BelotGame();
    newGame.deal();
    setGame(newGame);
    setSelectedCard(null);
    setPlayableCards([]);
  };

  const handleNextDeal = () => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    newGame.dealer = (newGame.dealer + 1) % 4;
    newGame.deal();
    setGame(newGame);
    setSelectedCard(null);
    setPlayableCards([]);
  };

  const player = game.players[PLAYER_ID];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Belot Card Game</h1>
        {game.phase === GAME_PHASES.FINISHED && (
          <div className="winner-announcement">
            <h2>Team {game.winner + 1} Wins!</h2>
            <button onClick={handleNewGame} className="new-game-button">
              New Game
            </button>
          </div>
        )}
      </header>

      <div className="game-container">
        <GameBoard
          players={game.players}
          currentTrick={trickComplete ? displayTrick : game.currentTrick}
          currentPlayer={game.currentPlayer}
          tricks={game.tricks}
          scores={game.scores}
          roundScores={game.roundScore}
          lastRoundScore={game.lastRoundScore}
          contract={game.contract}
          trumpSuit={game.trumpSuit}
          phase={game.phase}
          isDouble={game.double}
          isRedouble={game.redouble}
          onNextDeal={handleNextDeal}
          biddingPanel={game.phase === GAME_PHASES.BIDDING ? (
            <BiddingPanel
              currentBidder={game.currentBidder}
              playerId={PLAYER_ID}
              bids={game.bids}
              onBid={handleBid}
              contract={game.contract}
              players={game.players}
            />
          ) : null}
          playerHand={(game.phase === GAME_PHASES.PLAYING || game.phase === GAME_PHASES.BIDDING || showEmptyHand) ? (
            <PlayerHand
              cards={player.hand}
              onCardClick={handleCardClick}
              selectedCard={selectedCard}
              playableCards={playableCards}
              trumpSuit={game.trumpSuit}
              contract={game.contract}
            />
          ) : null}
        />

        {game.phase === GAME_PHASES.PLAYING && (
           combinations && combinations.length > 0 /*&& game.currentPlayer === PLAYER_ID && game.tricks.length === 0*/ && 
          (
            <CombinationPanel
              combinations={combinations}
              onAnnounce={handleAnnounceCombination}
              playerId={PLAYER_ID}
              currentPlayer={game.currentPlayer}
            />
          )
        )}
      </div>
    </div>
  );
}

