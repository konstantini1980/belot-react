const SUIT_SYMBOLS = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };

// "♥ Hearts", "No Trump" or "All Trump" in the current language
export function contractLabel(contract, t) {
  if (contract in SUIT_SYMBOLS) return `${SUIT_SYMBOLS[contract]} ${t(contract)}`;
  return contract === 'no-trump' ? t('noTrump') : t('allTrump');
}

// " x2" / " x4" after a doubled or redoubled contract
export function multiplierLabel(isDouble, isRedouble) {
  return isRedouble ? ' x4' : (isDouble ? ' x2' : '');
}
