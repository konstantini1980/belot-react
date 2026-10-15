import { useState, useEffect, useRef, useCallback } from 'react';
import { SERVER_URL, saveSession, loadName } from './session';

const MAX_RETRY_MS = 10000;
const GIVE_UP_AFTER = 4; // Failed attempts before a first connection counts as "server unreachable"

// The connection to one table on the game server. Says hello with our token, name and
// invite role (creating the table, or taking or getting back our seat), passes every state message to onState, and
// reconnects by itself when the connection drops (a locked phone, a network change).
// status: 'connecting' | 'open' | 'reconnecting' | 'closed'; error: why it closed.
export function useOnlineTable({ code, token, as = null, create = null }, onState) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    let stopped = false;
    let joined = false; // Sat down at least once
    let failures = 0;
    let retryTimer = null;

    const connect = () => {
      clearTimeout(retryTimer);
      retryTimer = null;
      const ws = new WebSocket(`${SERVER_URL}/rooms/${code}`);
      socketRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'hello', token, name: loadName(), as, create }));
      };
      ws.onmessage = (e) => {
        const message = JSON.parse(e.data);
        if (message.type === 'joined') {
          joined = true;
          failures = 0;
          saveSession(code, token); // A reload comes back to this seat
          setStatus('open');
        } else if (message.type === 'error') {
          stopped = true; // No table, table full or code taken: retrying won't help
          setError(message.error);
          setStatus('closed');
        } else if (message.type === 'state') {
          onStateRef.current(message);
        }
      };
      ws.onclose = () => {
        if (stopped || socketRef.current !== ws) return;
        failures++;
        if (!joined && failures >= GIVE_UP_AFTER) {
          stopped = true;
          setError('unavailable');
          setStatus('closed');
          return;
        }
        setStatus(joined ? 'reconnecting' : 'connecting');
        retryTimer = setTimeout(connect, Math.min(500 * 2 ** failures, MAX_RETRY_MS));
      };
    };

    // Back on the page (phone unlocked): reconnect now instead of waiting for the retry
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !stopped && retryTimer) connect();
    };

    connect();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', onVisible);
      socketRef.current?.close();
      socketRef.current = null;
    };
    // One table per mount (App keys OnlineGame by code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const send = useCallback((action) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(action));
  }, []);

  return { status, error, send };
}
