import { useState, useEffect, useRef, useCallback } from 'react';

// How long an announcement stays in a player's speech balloon
const BALLOON_MS = { belot: 4000, other: 3000 };

// The table's short-lived effects, shared by the local and the online game:
// where a played card flies from, and announcement balloons over the players.
export function useBoardEffects() {
  const [cardPositions, setCardPositions] = useState(new Map()); // Map of `${playerId}-${cardId}` -> { x, y }
  const [playerCombinations, setPlayerCombinations] = useState({}); // { playerId: combinations[] }

  // One-off timers (animations, balloons). Kept so a new game or deal can cancel them.
  const timersRef = useRef(new Set());
  // Stable across renders (it only touches the ref), so effects can list it
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // Remembers where a card is on screen (relative to the board center) before it is
  // played, so GameBoard can animate it from there to the trick
  const storeCardPosition = useCallback((cardElement, cardKey) => {
    const boardCenter = cardElement.closest('.game-board')?.querySelector('.board-center');
    if (!boardCenter) return;
    const boardCenterRect = boardCenter.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();
    const cardPosition = { x: cardRect.left - boardCenterRect.left, y: cardRect.top - boardCenterRect.top };

    setCardPositions(prev => new Map(prev).set(cardKey, cardPosition));
    // Clean up the card position after the animation completes (1 second)
    later(() => {
      setCardPositions(prev => {
        const newMap = new Map(prev);
        newMap.delete(cardKey);
        return newMap;
      });
    }, 1000);
  }, [later]);

  // Show what a played card announced in the player's balloon, each for a few seconds
  const showAnnouncements = useCallback((playerId, announced) => {
    if (announced.length === 0) return;
    setPlayerCombinations(prev => ({ ...prev, [playerId]: [...(prev[playerId] || []), ...announced] }));
    for (const combo of announced) {
      later(() => {
        setPlayerCombinations(prev => {
          const remaining = (prev[playerId] || []).filter(c => c !== combo);
          const updated = { ...prev, [playerId]: remaining };
          if (remaining.length === 0) delete updated[playerId];
          return updated;
        });
      }, combo.type === 'belot' ? BALLOON_MS.belot : BALLOON_MS.other);
    }
  }, [later]);

  // A fresh deal or game drops anything still pending from the last one
  const resetEffects = useCallback(() => {
    clearTimers();
    setPlayerCombinations({});
    setCardPositions(new Map());
  }, [clearTimers]);

  return {
    cardPositions, storeCardPosition,
    playerCombinations, setPlayerCombinations, showAnnouncements,
    later, resetEffects,
  };
}
