import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { BelotGame, GAME_PHASES } from '../game/gameLogic';
import GameBoard from './GameBoard';
import BiddingPanel from './BiddingPanel';
import AppHeader, { TableControls } from './AppHeader';
import { OnlineLobby, OnlineJoin } from './OnlineScreens';
import { SeatNamesProvider } from '../contexts/PlayerNamesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBoardEffects } from '../hooks/useBoardEffects';
import { useOnlineTable } from '../online/useOnlineTable';
import './OnlineScreens.css';

// An online table: the game server holds the game and runs the AI players; this app
// shows the view the server sends (you are always player 0, south, as in a local game)
// and sends back your bids and cards.
export default function OnlineGame({ table, onLeave, onCancel, onCodeTaken }) {
  const { t } = useLanguage();
  const [game, setGame] = useState(null); // The game as this player sees it
  const [room, setRoom] = useState(null); // Lobby and connection facts from the server
  const [now, setNow] = useState(() => Date.now());
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
    // When each offline player may be handed to the AI, on this device's clock
    const receivedAt = Date.now();
    roomInfo.seats = roomInfo.seats.map(seat => ({
      ...seat,
      handOverAt: seat.offlineFor === null ? null : receivedAt + roomInfo.handOverAfter - seat.offlineFor,
    }));
    setRoom(roomInfo);
    setNow(receivedAt);
  }, [storeCardPosition, showAnnouncements, resetEffects]);

  const { status, error, send, freeSeats, sit, currentToken } = useOnlineTable({ ...table, choose: Boolean(table.confirm) }, onState);

  // Leaving on purpose frees the seat (the AI plays it if the game is running)
  const leave = () => {
    send({ type: 'leave' });
    onLeave(currentToken());
  };

  // Tick while someone is offline, so "Let the computer play" shows up when the wait is over
  const someoneOffline = room?.seats.some(seat => seat.handOverAt !== null);
  useEffect(() => {
    if (!someoneOffline) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [someoneOffline]);

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

  // Joining by link or code: pick a seat first (until the server has seated us)
  if (table.confirm && !room && (!error || error === 'seatTaken')) {
    return <OnlineJoin free={freeSeats} error={error} onSit={sit} onBack={onCancel} />; // Not seated: nothing to leave
  }

  if (error || !room || !room.started || !game) {
    return (
      <OnlineLobby
        code={table.code}
        status={status}
        error={error === 'taken' ? null : error}
        room={room}
        onStart={() => send({ type: 'start' })}
        onLeave={leave}
      />
    );
  }

  // The full trick stays on the table, then nobody has the turn while it is collected
  const trickComplete = game.phase === GAME_PHASES.PLAYING
    && game.currentTrick.cards.length === 4 && game.currentPlayer === null;

  // Names at the table: people by their name, AI seats by the usual labels
  const names = room.seats.map(seat => (seat.state === 'empty' ? null : seat.name || t('playerFriend')));
  const withAI = seat => (room.seats[seat].state === 'away' ? t('onlineAIPlaysFor', { name: names[seat] }) : names[seat]);
  const seatNames = room.seats.map((_, seat) => withAI(seat));

  // Connection trouble, or someone dropped out (the game waits for them)
  const offline = room.seats.map((seat, i) => i).filter(i => i !== 0 && room.seats[i].handOverAt !== null);
  const notice = status !== 'open' ? t('onlineReconnecting')
    : offline.length > 0 ? t('onlinePlayerOffline', { name: offline.map(i => names[i]).join(', ') }) : null;
  // Only the host lets the computer play for someone (anyone, if the host is the one away)
  const awayLongEnough = i => room.seats[i].handOverAt !== null && now >= room.seats[i].handOverAt;
  const hostAway = room.seats.some((seat, i) => seat.host && awayLongEnough(i));
  const canHandOver = room.isHost || hostAway ? offline.filter(awayLongEnough) : [];

  return (
    <SeatNamesProvider names={seatNames}>
      <AppHeader onExitGame={leave} confirmText={t('confirmLeaveOnline')} />
      <div className="game-container online-game">
        {notice && (
          <div className="online-notice" role="status">
            {notice}
            {status === 'open' && canHandOver.map(seat => (
              <button key={seat} className="online-notice-button" onClick={() => send({ type: 'handOver', seat })}>
                {t('onlineHandOver', { name: names[seat] })}
              </button>
            ))}
          </div>
        )}
        <GameBoard
          tableControls={<TableControls onExitGame={leave} confirmText={t('confirmLeaveOnline')} />}
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
          nextDealWaiting={room.waitingForNextDeal}
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
    </SeatNamesProvider>
  );
}
