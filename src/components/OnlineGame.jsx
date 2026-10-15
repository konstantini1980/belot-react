import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { BelotGame, GAME_PHASES } from '../game/gameLogic';
import GameBoard from './GameBoard';
import BiddingPanel from './BiddingPanel';
import AppHeader, { TableControls } from './AppHeader';
import { OnlineLobby } from './OnlineScreens';
import { FriendSeatProvider } from '../contexts/PlayerNamesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBoardEffects } from '../hooks/useBoardEffects';
import { useOnlineTable } from '../online/useOnlineTable';
import './OnlineScreens.css';

// An online table: the game server holds the game and runs the AI players; this app
// shows the view the server sends (you are always player 0, south, as in a local game)
// and sends back your bids and cards.
export default function OnlineGame({ table, onLeave, onCodeTaken }) {
  const { t } = useLanguage();
  const [game, setGame] = useState(null); // The game as this player sees it
  const [room, setRoom] = useState(null); // Lobby and connection facts from the server
  const gameRef = useRef(null);
  const {
    cardPositions, storeCardPosition,
    playerCombinations, showAnnouncements,
    resetEffects,
  } = useBoardEffects();

  // Every change on the server arrives here. A card someone else played starts its
  // flight from their hand, which is still on screen until the new state renders.
  const onState = useCallback((message) => {
    const { game: text, event, ...roomInfo } = message;
    const next = BelotGame.deserialize(text);
    const previous = gameRef.current;
    if (event?.type === 'play' && previous) {
      const { playerId, card } = next.currentTrick.cards.at(-1) ?? {};
      if (playerId !== undefined && playerId !== 0) {
        const lastBack = previous.players[playerId].hand.length - 1;
        const element = document.querySelector(`.game-board [data-card-id="player-${playerId}-back-${lastBack}"]`);
        if (element) storeCardPosition(element, `${playerId}-${card.id}`);
      }
      if (playerId !== undefined) showAnnouncements(playerId, next.lastPlayAnnouncements);
    } else if (event?.type === 'deal' || event?.type === 'newGame') {
      resetEffects(); // Balloons and flights of the last deal are over
    }
    gameRef.current = next;
    setGame(next);
    setRoom(roomInfo);
  }, [storeCardPosition, showAnnouncements, resetEffects]);

  const { status, error, send } = useOnlineTable(table, onState);

  // The code belongs to someone else's table: start over with a new code
  useEffect(() => {
    if (error === 'taken' && table.create) onCodeTaken();
  }, [error, table.create, onCodeTaken]);

  // Your cards that may be played now
  const playableCards = useMemo(() => {
    if (!game || game.phase !== GAME_PHASES.PLAYING || game.currentPlayer !== 0
      || game.currentTrick.cards.length === 4) return [];
    const me = game.players[0];
    return me.hand.filter(card => game.isValidCardPlay(me, card)).map(card => card.id);
  }, [game]);

  const handleCardClick = (card, event) => {
    if (!playableCards.includes(card.id)) return;
    if (event?.currentTarget) storeCardPosition(event.currentTarget, `0-${card.id}`);
    send({ type: 'play', cardId: card.id });
  };

  if (error || !room || !room.started || !game) {
    return (
      <OnlineLobby
        code={table.code}
        status={status}
        error={error === 'taken' ? null : error}
        room={room}
        onStart={() => send({ type: 'start' })}
        onLeave={onLeave}
      />
    );
  }

  // The full trick stays on the table, then nobody has the turn while it is collected
  const trickComplete = game.phase === GAME_PHASES.PLAYING
    && game.currentTrick.cards.length === 4 && game.currentPlayer === null;

  // Connection trouble, or the friend dropped out (the game waits for them)
  const notice = status !== 'open' ? t('onlineReconnecting')
    : (!room.friendOnline ? t('onlineFriendOffline') : null);

  return (
    <FriendSeatProvider seat={room.friendAt}>
      <AppHeader onExitGame={onLeave} confirmText={t('confirmLeaveOnline')} />
      <div className="game-container online-game">
        {notice && <div className="online-notice" role="status">{notice}</div>}
        <GameBoard
          tableControls={<TableControls onExitGame={onLeave} confirmText={t('confirmLeaveOnline')} />}
          players={game.players}
          currentTrick={game.currentTrick}
          currentPlayer={game.currentPlayer}
          currentBidder={game.currentBidder}
          bids={game.bids}
          tricks={game.tricks}
          totalScores={game.totalScores}
          currentRoundScores={game.currentRoundScore}
          lastRoundRoundedPoints={game.lastRoundRoundedPoints}
          hangingPoints={game.hangingPoints}
          contract={game.contract}
          phase={game.phase}
          isDouble={game.double}
          isRedouble={game.redouble}
          onNextDeal={() => send({ type: 'nextDeal' })}
          winner={game.winner}
          onNewGame={() => send({ type: 'newGame' })}
          playerCombinations={playerCombinations}
          announcedCombinations={game.announcedCombinations}
          dealHistory={game.dealHistory}
          roundBreakdown={game.lastRoundBreakdown}
          contractTeam={game.contractTeam()}
          trickComplete={trickComplete}
          biddingPanel={game.phase === GAME_PHASES.BIDDING ? (
            <BiddingPanel
              currentBidder={game.currentBidder}
              playerId={0}
              bids={game.bids}
              onBid={bid => send({ type: 'bid', bid })}
              canDouble={game.canDouble(0)}
              canRedouble={game.canRedouble(0)}
              allPassed={game.allPassed}
            />
          ) : null}
          playableCards={playableCards}
          onCardClick={handleCardClick}
          cardPositions={cardPositions}
        />
      </div>
    </FriendSeatProvider>
  );
}
