import React, { useState, useEffect } from 'react';
import AppHeader, { TableControls } from './AppHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { CODE_LENGTH, normalizeCode, shareLink, loadName, saveName } from '../online/session';
import { NAME_LENGTH } from '../game/onlineTable';
import './OnlineScreens.css';

// An empty table with a panel in the middle, for the online screens before play
function TablePanel({ onExit, confirmText, children }) {
  return (
    <>
      <AppHeader onExitGame={onExit} confirmText={confirmText} />
      <div className="game-container">
        <div className="game-board show-start-button-only">
          <div className="table-controls"><TableControls onExitGame={onExit} confirmText={confirmText} /></div>
          <div className="start-button-overlay">
            <div className="online-panel">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Create a table or join one with a code
export function OnlineSetup({ onCreate, onJoin, onBack }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [name, setName] = useState(loadName);
  const canJoin = code.length === CODE_LENGTH && Boolean(name);

  return (
    <TablePanel onExit={onBack} confirmText={t('confirmExitGame')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      <p className="online-hint">{t('onlineSetupHint')}</p>
      <NameField onChange={setName} />
      <button className="start-button" onClick={onCreate} disabled={!name}>{t('onlineCreateTable')}</button>

      <div className="online-divider">{t('onlineOrJoin')}</div>
      <form className="online-join" onSubmit={e => { e.preventDefault(); if (canJoin) onJoin(code); }}>
        <input
          value={code}
          onChange={e => setCode(normalizeCode(e.target.value))}
          placeholder={t('onlineCodePlaceholder')}
          aria-label={t('onlineCodePlaceholder')}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit" className="start-new-game-button" disabled={!canJoin}>{t('onlineJoin')}</button>
      </form>
      <button className="online-link-button" onClick={onBack}>{t('onlineBack')}</button>
    </TablePanel>
  );
}

// Your name, asked before you create or join a table (kept on this device for next time)
function NameField({ onChange, onSubmit }) {
  const { t } = useLanguage();
  const [name, setName] = useState(loadName);
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH);
  useEffect(() => {
    saveName(clean);
    onChange?.(clean);
  }, [clean, onChange]);
  return (
    <form className="online-name" onSubmit={e => { e.preventDefault(); onSubmit?.(); }}>
      <label className="online-label" htmlFor="online-name">{t('onlineYourName')}</label>
      <input
        id="online-name"
        value={name}
        maxLength={NAME_LENGTH}
        onChange={e => setName(e.target.value)}
        placeholder={t('onlineNamePlaceholder')}
        autoComplete="nickname"
      />
    </form>
  );
}

// Opening an invite link (or a code): say who you are, pick a free seat, then Join.
// `free` is the server's seat list, turned so the host sits at the bottom.
export function OnlineJoin({ free, error, onSit, onBack }) {
  const { t } = useLanguage();
  const [name, setName] = useState(loadName);
  const [picked, setPicked] = useState(null);
  const seats = free?.seats ?? [];
  const host = seats.find(seat => seat.host);
  const hostName = host?.name || t('playerFriend');
  // A seat someone else just took can't stay picked
  const pickedSeat = seats.find(seat => seat.seat === picked && seat.state === 'empty') ? picked : null;
  const anyFree = seats.some(seat => seat.state === 'empty');
  const join = () => { if (name && pickedSeat !== null) onSit(pickedSeat); };

  if (!free) {
    return (
      <TablePanel onExit={onBack} confirmText={t('confirmExitGame')}>
        <p className="online-message">{t('onlineConnecting')}</p>
      </TablePanel>
    );
  }

  const view = seats.map((seat, position) => {
    const relation = position === 2 ? t('onlineSeatPartner') : t('onlineSeatOpponent');
    if (seat.state === 'empty') {
      return {
        name: t('onlineSeatFree'),
        note: free.started ? t('onlineSeatComputerNow') : t('onlineSeatOf', { relation, name: hostName }),
        taken: false,
        onPick: () => setPicked(seat.seat),
        picked: seat.seat === pickedSeat,
      };
    }
    return { name: seat.name || t('playerFriend'), note: seat.host ? t('onlineSeatHost') : relation, taken: true };
  });

  return (
    <TablePanel onExit={onBack} confirmText={t('confirmExitGame')}>
      <h2 className="online-title">{t('onlineJoinTitle', { name: hostName })}</h2>
      <NameField onChange={setName} onSubmit={join} />
      {anyFree ? (
        <>
          <div className="online-label">{t('onlinePickSeat')}</div>
          <SeatMap seats={view} />
        </>
      ) : (
        <p className="online-message">{t('onlineError_full')}</p>
      )}
      {error === 'seatTaken' && <p className="online-message" role="status">{t('onlineError_seatTaken')}</p>}
      <button className="start-button" onClick={join} disabled={!name || pickedSeat === null}>{t('onlineJoin')}</button>
      <button className="online-link-button" onClick={onBack}>{t('onlineBack')}</button>
    </TablePanel>
  );
}

// The invite link: shares it, or copies it where sharing isn't offered
function InviteButton({ code }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const share = async () => {
    const link = shareLink(code);
    try {
      if (canShare) {
        await navigator.share({ title: t('onlineShareText'), text: t('onlineShareText'), url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet closed or clipboard blocked: the code is on screen anyway
    }
  };
  return (
    <button className="start-new-game-button" onClick={share}>
      {copied ? t('onlineLinkCopied') : t(canShare ? 'onlineShareLink' : 'onlineCopyLink')}
    </button>
  );
}

// Four seats around a small table, in table order: bottom, left, top, right.
// Each is { name, note, taken, onPick?, picked? }; a seat with onPick can be tapped.
function SeatMap({ seats }) {
  return (
    <div className="online-seats">
      {seats.map((seat, position) => {
        const classes = `online-seat seat-${position}${seat.taken ? ' taken' : ''}${seat.picked ? ' picked' : ''}`;
        const content = (
          <>
            <span className="online-seat-name">{seat.name}</span>
            {seat.note && <span className="online-seat-note">{seat.note}</span>}
          </>
        );
        return seat.onPick ? (
          <button key={position} className={classes} onClick={seat.onPick} aria-pressed={Boolean(seat.picked)}>{content}</button>
        ) : (
          <div key={position} className={classes}>{content}</div>
        );
      })}
    </div>
  );
}

// Before the game starts: the invite link, who sits where, and the host's start button.
// Also shows connection problems (no such table, table full, server unreachable).
export function OnlineLobby({ code, status, error, room, onStart, onLeave }) {
  const { t } = useLanguage();

  if (error) {
    return (
      <TablePanel onExit={onLeave} confirmText={t('confirmExitGame')}>
        <p className="online-message">{t(`onlineError_${error}`)}</p>
        <button className="start-new-game-button" onClick={onLeave}>{t('onlineBack')}</button>
      </TablePanel>
    );
  }

  if (!room) {
    return (
      <TablePanel onExit={onLeave} confirmText={t('confirmLeaveOnline')}>
        <p className="online-message">{t(status === 'reconnecting' ? 'onlineReconnecting' : 'onlineConnecting')}</p>
      </TablePanel>
    );
  }

  const labels = [t('playerYou'), t('playerWest'), t('playerPartner'), t('playerEast')];
  const view = room.seats.map((info, seat) => {
    const taken = info.state !== 'empty';
    let note = seat === 2 ? t('onlineSeatPartner') : seat === 0 ? '' : t('onlineSeatOpponent');
    if (!taken) note = t('onlineSeatEmpty');
    else if (seat !== 0 && !info.online) note = t('onlineSeatOffline');
    if (info.host) note = note ? `${note} · ${t('onlineSeatHost')}` : t('onlineSeatHost');
    const name = taken ? info.name || (seat === 0 ? labels[0] : t('playerFriend')) : labels[seat]; // Your own name at the bottom too
    return { name, note, taken };
  });
  const host = room.seats.find(seat => seat.host);
  const friends = room.seats.slice(1).filter(seat => seat.state !== 'empty').map(seat => seat.name || t('playerFriend'));
  return (
    <TablePanel onExit={onLeave} confirmText={t('confirmLeaveOnline')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      <SeatMap seats={view} />
      {room.isHost ? (
        <>
          <div className="online-label">{t('onlineTableCode')}</div>
          <div className="online-code" aria-label={t('onlineTableCode')}>{code}</div>
          <InviteButton code={code} />
          <p className="online-hint">{t('onlineShareHint')}</p>
          <p className="online-message" role="status">
            {friends.length === 0 ? t('onlineWaitingForFriends') : t('onlineFriendsHere', { names: friends.join(', ') })}
          </p>
          <button className="start-button" onClick={onStart} disabled={!room.canStart}>
            {t('startBelotGame')}
          </button>
        </>
      ) : (
        <p className="online-message">
          {t('onlineWaitingForHost', { name: host?.name || t('playerFriend') })}
        </p>
      )}
    </TablePanel>
  );
}
