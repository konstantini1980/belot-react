import { describe, it, expect } from 'vitest';
import { BelotGame } from '../gameLogic';

// Ends a deal with the given raw points, as if all eight tricks were played
function endDeal(game, bids, roundScore, { double = false } = {}) {
  game.phase = 'playing';
  game.bids = bids;
  game.contract = bids.findLast(b => !['pass', 'double', 'redouble'].includes(b.bid)).bid;
  game.trumpSuit = ['no-trump', 'all-trump'].includes(game.contract) ? null : game.contract;
  game.double = double;
  game.redouble = false;
  game.tricks = Array.from({ length: 8 }, (_, i) => ({ cards: [], team: i % 2 }));
  game.announcedCombinations = [[], []];
  game.currentRoundScore = [...roundScore];
  game.endRound();
}

describe('Score sheet (deal history)', () => {
  it('Records one line per deal with the points and running totals', () => {
    const game = new BelotGame();

    endDeal(game, [{ playerId: 0, bid: 'hearts' }], [100, 62]);
    endDeal(game, [{ playerId: 3, bid: 'all-trump' }, { playerId: 0, bid: 'double' }], [74, 184], { double: true });

    expect(game.dealHistory).toEqual([
      // 162 -> 16: opponents 62 -> 6, contract team 10
      { contract: 'hearts', bidder: 0, double: false, redouble: false, points: [10, 6], hanging: 0, totals: [10, 6] },
      // Doubled, team 1 wins: 258 -> 26, x2 = 52 to team 1
      { contract: 'all-trump', bidder: 3, double: true, redouble: false, points: [0, 52], hanging: 0, totals: [10, 58] }
    ]);
  });

  it('A tied deal records the points left hanging', () => {
    const game = new BelotGame();

    endDeal(game, [{ playerId: 1, bid: 'spades' }], [81, 81]);

    // 162 -> 16: team 0 (opponents) take 8, 8 hang
    expect(game.dealHistory[0]).toMatchObject({ points: [8, 0], hanging: 8, totals: [8, 0] });
  });

  it('A clone gets its own list, and a new game starts empty', () => {
    const game = new BelotGame();
    endDeal(game, [{ playerId: 0, bid: 'hearts' }], [100, 62]);

    const copy = game.clone();
    endDeal(copy, [{ playerId: 0, bid: 'hearts' }], [100, 62]);

    expect(game.dealHistory).toHaveLength(1);
    expect(copy.dealHistory).toHaveLength(2);
    expect(new BelotGame().dealHistory).toEqual([]);
  });

  it('Survives saving and resuming', () => {
    const game = new BelotGame();
    endDeal(game, [{ playerId: 0, bid: 'hearts' }], [100, 62]);

    const restored = BelotGame.deserialize(game.serialize());

    expect(restored.dealHistory).toEqual(game.dealHistory);
  });
});
