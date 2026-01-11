import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BelotGame, GAME_PHASES } from './game/gameLogic';
import { getAllCombinations, findBelotOnPlay } from './game/combinations';
import { makeAIBid, makeAIPlayCard } from './game/aiplayer';
import GameBoard from './components/GameBoard';
import PlayerHand from './components/PlayerHand';
import BiddingPanel from './components/BiddingPanel';
import './App.css';

const PLAYER_ID = 0; // Human player is always player 0

export default function App() {
  const [game, setGame] = useState(new BelotGame());
  const [selectedCard, setSelectedCard] = useState(null);
  const [playableCards, setPlayableCards] = useState([]);
  const [showEmptyHand, setShowEmptyHand] = useState(false);
  const [displayTrick, setDisplayTrick] = useState([]);
  const [trickComplete, setTrickComplete] = useState(false);
  const [playerCombinations, setPlayerCombinations] = useState({}); // { playerId: combinations[] }
  const prevTricksLengthRef = useRef(0);
  const trickTimeoutRef = useRef(null);

  useEffect(() => {
    if (game.phase === GAME_PHASES.DEALING) {
      game.deal();
      setGame({ ...game });
      setPlayableCards([]); // Clear playable cards when dealing
      setPlayerCombinations({});
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
    const isFirstTrick = game.tricks.length === 0;

    // Check combinations before playing (on full hand) - for sequences and equals
    let combos = [];
    if (isFirstTrick && game.contract && game.contract !== 'no-trump') {
      combos = getAllCombinations(player.hand, game.trumpSuit);
    }

    // Check for belot when Q or K is played (before playing the card)
    let belotCombo = null;
    if (game.contract && (card.rank === 'Q' || card.rank === 'K')) {
      belotCombo = findBelotOnPlay(game.contract, card, player.hand);
    }

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

      // On first card play in first trick, show combinations (sequences, equals)
      if (isFirstTrick && combos.length > 0) {
        setPlayerCombinations(prev => ({ ...prev, [PLAYER_ID]: combos }));
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setPlayerCombinations(prev => {
            const updated = { ...prev };
            delete updated[PLAYER_ID];
            return updated;
          });
        }, 4000);
      }

      // Show belot when announced (when Q or K is played)
      if (belotCombo) {
        setPlayerCombinations(prev => ({ 
          ...prev, 
          [PLAYER_ID]: [...(prev[PLAYER_ID] || []), belotCombo]
        }));
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setPlayerCombinations(prev => {
            const updated = { ...prev };
            if (updated[PLAYER_ID]) {
              updated[PLAYER_ID] = updated[PLAYER_ID].filter(c => c.type !== 'belot');
              if (updated[PLAYER_ID].length === 0) {
                delete updated[PLAYER_ID];
              }
            }
            return updated;
          });
        }, 4000);
      }
    }
  };

  const handleAIPlay = () => {
    const newGame = new BelotGame();
    Object.assign(newGame, game);
    const playerId = newGame.currentPlayer;
    const isFirstTrick = game.tricks.length === 0;
    const player = newGame.players[playerId];
    
    // Check combinations before playing (on full hand) - for sequences and equals
    let combos = [];
    if (isFirstTrick && game.contract && game.contract !== 'no-trump') {
      combos = getAllCombinations(player.hand, game.trumpSuit);
    }
    
    // Use AI to select card
    const cardToPlay = makeAIPlayCard(newGame, playerId);
    
    // Check for belot when Q or K is played (before playing the card)
    let belotCombo = null;
    if (cardToPlay && game.contract && (cardToPlay.rank === 'Q' || cardToPlay.rank === 'K')) {
      belotCombo = findBelotOnPlay(game.contract, cardToPlay, player.hand);
    }
    
    if (cardToPlay) {
      newGame.playCard(playerId, cardToPlay.id);
      setGame(newGame);

      // On first card play in first trick, show combinations (sequences, equals) for AI players
      if (isFirstTrick && combos.length > 0) {
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

      // Show belot when announced (when Q or K is played) for AI players
      if (belotCombo) {
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
    setPlayerCombinations({});
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
          playerCombinations={playerCombinations}
          announcedCombinations={game.announcedCombinations}
          roundBreakdown={game.lastRoundBreakdown}
          bids={game.bids}
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
      </div>
    </div>
  );
}

