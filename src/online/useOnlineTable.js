import { useState, useEffect, useRef, useCallback } from 'react';
import { SERVER_URL, saveSession, loadName, newToken } from './session';

const MAX_RETRY_MS = 10000;
const GIVE_UP_AFTER = 4; // Failed attempts before a first connection counts as "server unreachable"

// The connection to one table on the game server. Says hello with our token and name
// (creating the table, or taking or getting back our seat), passes every state message to onState, and
// reconnects by itself when the connection drops (a locked phone, a network change).
// With `choose`, it first only looks: freeSeats lists the seats, and sit(seat) sits down.
// status: 'connecting' | 'open' | 'reconnecting' | 'closed'; error: why it closed
// (or 'seatTaken': someone sat in the chosen seat first; pick another).
export function useOnlineTable({ code, token, create = null, choose = false }, onState) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [freeSeats, setFreeSeats] = useState(null);
  const socketRef = useRef(null);
  const sitRef = useRef(choose ? null : {}); // { seat } once we sit down; null while still choosing
  const tokenRef = useRef(token); // Replaced if another tab of this browser holds our old seat
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
        const token = tokenRef.current;
        if (sitRef.current) ws.send(JSON.stringify({ type: 'hello', token, name: loadName(), seat: sitRef.current.seat, create }));
        else ws.send(JSON.stringify({ type: 'look', token })); // Seats us back if this token has a seat nobody uses
      };
      ws.onmessage = (e) => {
        const message = JSON.parse(e.data);
        if (message.type === 'joined') {
          joined = true;
          failures = 0;
          sitRef.current ??= {}; // Seated (also when the server put us back in our seat)
          saveSession(code, tokenRef.current); // A reload comes back to this seat
          setStatus('open');
        } else if (message.type === 'seats') {
          if (message.tokenInUse) tokenRef.current = newToken(); // Our old seat is in use here: join as someone new
          setFreeSeats(message);
        } else if (message.type === 'error' && message.error === 'seatTaken') {
          sitRef.current = null; // Back to choosing
          setError('seatTaken');
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

  // Sit down in the chosen seat (a real seat number from freeSeats)
  const sit = useCallback((seat) => {
    sitRef.current = { seat };
    setError(null);
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hello', token: tokenRef.current, name: loadName(), seat }));
  }, []);

  const currentToken = useCallback(() => tokenRef.current, []);

  return { status, error, send, freeSeats, sit, currentToken };
}
