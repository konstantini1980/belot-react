import { describe, it, expect } from 'vitest';
import { BelotGame, GAME_PHASES } from '../gameLogic';
import { saveGame, loadSavedGame } from '../savedGame';

// A Map-backed stand-in for localStorage
function fakeStorage() {
  const items = new Map();
  return {
    getItem: key => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: key => items.delete(key)
  };
}

// A game in the middle of the first trick: hearts bid, two cards played
function gameInPlay() {
  const game = new BelotGame();
  game.deal();
  const bidder = game.currentBidder;
  game.makeBid(bidder, 'hearts');
  for (let i = 0; i < 3; i++) game.makeBid(game.currentBidder, 'pass');
  for (let i = 0; i < 2; i++) {
    const player = game.players[game.currentPlayer];
    const card = player.hand.find(c => game.isValidCardPlay(player, c));
    game.playCard(player.id, card.id);
  }
  game.totalScores = [42, 57];
  game.hangingPoints = 8;
  return game;
}

describe('Saving and resuming a game', () => {
  it('Restores the same state, with working cards', () => {
    const game = gameInPlay();
    const restored = BelotGame.deserialize(game.serialize());

    expect(restored).toBeInstanceOf(BelotGame);
    expect(restored.phase).toBe(GAME_PHASES.PLAYING);
    expect(restored.contract).toBe('hearts');
    expect(restored.dealer).toBe(game.dealer);
    expect(restored.currentPlayer).toBe(game.currentPlayer);
    expect(restored.totalScores).toEqual([42, 57]);
    expect(restored.hangingPoints).toBe(8);
    expect(restored.players.map(p => p.hand.map(c => c.id))).toEqual(game.players.map(p => p.hand.map(c => c.id)));
    expect(restored.currentTrick.cards.map(c => c.card.id)).toEqual(game.currentTrick.cards.map(c => c.card.id));
    // Cards are real Card objects again
    expect(restored.players[0].hand[0].getValue('hearts')).toBe(game.players[0].hand[0].getValue('hearts'));
  });

  it('The restored game plays on: the same cards are playable', () => {
    const game = gameInPlay();
    const restored = BelotGame.deserialize(game.serialize());
    const player = game.players[game.currentPlayer];
    const restoredPlayer = restored.players[restored.currentPlayer];

    const playable = player.hand.filter(c => game.isValidCardPlay(player, c)).map(c => c.id);
    const restoredPlayable = restoredPlayer.hand.filter(c => restored.isValidCardPlay(restoredPlayer, c)).map(c => c.id);
    expect(restoredPlayable).toEqual(playable);
    expect(restored.playCard(restoredPlayer.id, restoredPlayable[0])).toBe(true);
  });

  it('A card in an announcement is the same object as in the hand', () => {
    const game = gameInPlay();
    const card = game.players[0].hand[0];
    game.announcedCombinations[0].push({ type: 'tierce', points: 20, cards: [card], playerId: 0 });

    const restored = BelotGame.deserialize(game.serialize());

    // The last one: playing the first cards may have announced real combinations before it
    expect(restored.announcedCombinations[0].at(-1).cards[0]).toBe(restored.players[0].hand[0]);
  });

  it('saveGame and loadSavedGame round-trip through storage', () => {
    const store = fakeStorage();
    saveGame(gameInPlay(), store);

    const loaded = loadSavedGame(store);

    expect(loaded.totalScores).toEqual([42, 57]);
  });

  // A reload must not be a way to get new cards: the five dealt cards and the
  // three still in the deck come back the same, so the full hands match too
  it('Reloading during bidding keeps every dealt card and the rest of the deck', () => {
    const store = fakeStorage();
    const game = new BelotGame();
    game.deal();
    saveGame(game, store);

    const restored = loadSavedGame(store);
    expect(restored.phase).toBe(GAME_PHASES.BIDDING);
    expect(restored.players.map(p => p.hand.map(c => c.id))).toEqual(game.players.map(p => p.hand.map(c => c.id)));
    expect(restored.deck.map(c => c.id)).toEqual(game.deck.map(c => c.id));

    // Both games finish bidding the same way and deal the same last three cards
    for (const g of [game, restored]) {
      g.makeBid(g.currentBidder, 'hearts');
      for (let i = 0; i < 3; i++) g.makeBid(g.currentBidder, 'pass');
    }
    expect(restored.phase).toBe(GAME_PHASES.PLAYING);
    expect(restored.players.map(p => p.hand.map(c => c.id))).toEqual(game.players.map(p => p.hand.map(c => c.id)));
    expect(restored.players.every(p => p.hand.length === 8)).toBe(true);
  });

  it('A finished game removes the save', () => {
    const store = fakeStorage();
    const game = gameInPlay();
    saveGame(game, store);
    game.phase = GAME_PHASES.FINISHED;

    saveGame(game, store);

    expect(loadSavedGame(store)).toBeNull();
  });

  it('An undealt new game removes the save (exiting a game clears it)', () => {
    const store = fakeStorage();
    saveGame(gameInPlay(), store);

    saveGame(new BelotGame(), store);

    expect(store.getItem('belot-saved-game')).toBeNull();
    expect(loadSavedGame(store)).toBeNull();
  });

  it('Nothing saved, a broken save or an old version gives null', () => {
    const store = fakeStorage();
    expect(loadSavedGame(store)).toBeNull();

    store.setItem('belot-saved-game', '{not json');
    expect(loadSavedGame(store)).toBeNull();

    store.setItem('belot-saved-game', JSON.stringify({ version: 0, game: {} }));
    expect(loadSavedGame(store)).toBeNull();
  });

  it('Missing or failing storage is ignored', () => {
    const failing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(() => saveGame(gameInPlay(), failing)).not.toThrow();
    expect(loadSavedGame(failing)).toBeNull();
    expect(loadSavedGame(null)).toBeNull();
  });
});
