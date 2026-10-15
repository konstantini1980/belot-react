import React, { createContext, useContext } from 'react';
import { useLanguage } from './LanguageContext';

// Seat labels as drawn on the table: 0 = you (south), 1 = west, 2 = partner, 3 = east.
// An online game passes the names of the people at the table (null keeps the usual label).
const SeatNamesContext = createContext(null);

export function SeatNamesProvider({ names, children }) {
  return <SeatNamesContext.Provider value={names}>{children}</SeatNamesContext.Provider>;
}

export function usePlayerNames() {
  const { t } = useLanguage();
  const seatNames = useContext(SeatNamesContext);
  const names = [t('playerYou'), t('playerWest'), t('playerPartner'), t('playerEast')];
  seatNames?.forEach((name, seat) => { if (seat !== 0 && name) names[seat] = name; });
  return names;
}
