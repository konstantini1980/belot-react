import React, { useState } from 'react';
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
  const canJoin = code.length === CODE_LENGTH;

  return (
    <TablePanel onExit={onBack} confirmText={t('confirmExitGame')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      <p className="online-hint">{t('onlineSetupHint')}</p>
      <button className="start-button" onClick={onCreate}>{t('onlineCreateTable')}</button>

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

// Your name at the table: kept on this device and sent to the others when it changes
function NameField({ onRename }) {
  const { t } = useLanguage();
  const [name, setName] = useState(loadName);
  const commit = () => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH);
    setName(clean);
    saveName(clean);
    onRename(clean);
  };
  return (
    <form className="online-name" onSubmit={e => { e.preventDefault(); e.currentTarget.querySelector('input').blur(); }}>
      <label className="online-label" htmlFor="online-name">{t('onlineYourName')}</label>
      <input
        id="online-name"
        value={name}
        maxLength={NAME_LENGTH}
        onChange={e => setName(e.target.value)}
        onBlur={commit}
        placeholder={t('onlineNamePlaceholder')}
        autoComplete="nickname"
      />
    </form>
  );
}

// One invite link (partner or opponent): shares it, or copies it where sharing isn't offered
function InviteButton({ code, role }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const share = async () => {
    const link = shareLink(code, role);
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
  const label = role === 'partner' ? 'onlineInvitePartner' : 'onlineInviteOpponent';
  return (
    <button className="start-new-game-button" onClick={share}>
      {copied ? t('onlineLinkCopied') : t(label)}
    </button>
  );
}

// The four seats as this player sees them (you south), with who sits where.
// The host taps two seats to swap them before the start.
function SeatMap({ seats, canSwap, onSwap }) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState(null);
  const labels = [t('playerYou'), t('playerWest'), t('playerPartner'), t('playerEast')];
  const tap = (seat) => {
    if (!canSwap) return;
    if (picked === null) setPicked(seat);
    else {
      if (picked !== seat) onSwap(picked, seat);
      setPicked(null);
    }
  };
  return (
    <div className="online-seats">
      {[2, 1, 3, 0].map(seat => {
        const info = seats[seat];
        const taken = info.state !== 'empty';
        const name = seat === 0 ? labels[0] : (taken ? info.name || t('playerFriend') : labels[seat]);
        let note = seat === 2 ? t('onlineSeatPartner') : seat === 0 ? '' : t('onlineSeatOpponent');
        if (!taken) note = t('onlineSeatEmpty');
        else if (seat !== 0 && !info.online) note = t('onlineSeatOffline');
        if (info.host) note = note ? `${note} · ${t('onlineSeatHost')}` : t('onlineSeatHost');
        return (
          <button
            key={seat}
            className={`online-seat seat-${seat}${taken ? ' taken' : ''}${picked === seat ? ' picked' : ''}`}
            onClick={() => tap(seat)}
            disabled={!canSwap}
            aria-pressed={canSwap ? picked === seat : undefined}
          >
            <span className="online-seat-name">{name}</span>
            {note && <span className="online-seat-note">{note}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Before the game starts: invite links, who sits where, and the host's start button.
// Also shows connection problems (no such table, table full, server unreachable).
export function OnlineLobby({ code, status, error, room, onStart, onSwap, onRename, onLeave }) {
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

  const host = room.seats.find(seat => seat.host);
  return (
    <TablePanel onExit={onLeave} confirmText={t('confirmLeaveOnline')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      <NameField onRename={onRename} />
      <SeatMap seats={room.seats} canSwap={room.isHost} onSwap={onSwap} />
      {room.isHost ? (
        <>
          <p className="online-hint">{t('onlineSwapHint')}</p>
          <div className="online-label">{t('onlineTableCode')}</div>
          <div className="online-code" aria-label={t('onlineTableCode')}>{code}</div>
          <div className="online-invites">
            <InviteButton code={code} role="partner" />
            <InviteButton code={code} role="opponent" />
          </div>
          <p className="online-hint">{t('onlineShareHint')}</p>
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
