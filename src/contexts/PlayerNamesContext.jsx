import React, { createContext, useContext } from 'react';
import { useLanguage } from './LanguageContext';

// Seat labels as drawn on the table: 0 = you (south), 1 = west, 2 = partner, 3 = east.
// An online game renames the seat where the friend sits.
const FriendSeatContext = createContext(null);

export function FriendSeatProvider({ seat, children }) {
  return <FriendSeatContext.Provider value={seat}>{children}</FriendSeatContext.Provider>;
}

export function usePlayerNames() {
  const { t } = useLanguage();
  const friendSeat = useContext(FriendSeatContext);
  const names = [t('playerYou'), t('playerWest'), t('playerPartner'), t('playerEast')];
  if (friendSeat !== null) names[friendSeat] = t('playerFriend');
  return names;
}
