import React, { useState } from 'react';
import AppHeader, { TableControls } from './AppHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { CODE_LENGTH, normalizeCode, shareLink } from '../online/session';
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

// Create a table (choosing where the friend sits) or join one with a code
export function OnlineSetup({ onCreate, onJoin, onBack }) {
  const { t } = useLanguage();
  const [friend, setFriend] = useState('partner');
  const [code, setCode] = useState('');
  const canJoin = code.length === CODE_LENGTH;

  return (
    <TablePanel onExit={onBack} confirmText={t('confirmExitGame')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      <div className="online-label">{t('onlineFriendPlaysAs')}</div>
      <div className="online-choice" role="radiogroup">
        {['partner', 'opponent'].map(option => (
          <button
            key={option}
            role="radio"
            aria-checked={friend === option}
            className={friend === option ? 'selected' : ''}
            onClick={() => setFriend(option)}
          >
            {t(option === 'partner' ? 'onlineAsPartner' : 'onlineAsOpponent')}
          </button>
        ))}
      </div>
      <button className="start-button" onClick={() => onCreate(friend)}>{t('onlineCreateTable')}</button>

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

// Before the game starts: the code to share, who is here, and the host's start button.
// Also shows connection problems (no such table, table full, server unreachable).
export function OnlineLobby({ code, status, error, room, onStart, onLeave }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const link = shareLink(code);
  const canShare = typeof navigator.share === 'function';

  const share = async () => {
    try {
      if (canShare) {
        await navigator.share({ title: t('onlineShareText'), text: t('onlineShareText'), url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Share sheet closed or clipboard blocked: the code is on screen anyway
    }
  };

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

  return (
    <TablePanel onExit={onLeave} confirmText={t('confirmLeaveOnline')}>
      <h2 className="online-title">{t('playOnline')}</h2>
      {room.isHost ? (
        <>
          <div className="online-label">{t('onlineTableCode')}</div>
          <div className="online-code" aria-label={t('onlineTableCode')}>{code}</div>
          <p className="online-hint">{t('onlineShareHint')}</p>
          <button className="start-new-game-button" onClick={share}>
            {copied ? t('onlineLinkCopied') : t(canShare ? 'onlineShareLink' : 'onlineCopyLink')}
          </button>
          <p className="online-message">
            {room.friendJoined ? t('onlineFriendHere') : t('onlineWaitingForFriend')}
          </p>
          <button className="start-button" onClick={onStart} disabled={!room.friendJoined}>
            {t('startBelotGame')}
          </button>
        </>
      ) : (
        <p className="online-message">{t('onlineWaitingForHost')}</p>
      )}
    </TablePanel>
  );
}
