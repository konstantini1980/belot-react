import { describe, it, expect } from 'vitest';
import { BelotGame, GAME_PHASES } from '../gameLogic';
import { Card } from '../cards';

// A hearts deal bid by team 0. tricksWon[i] is the team that took trick i;
// the card points are set directly, so the tricks only matter for valat and last ten.
function finishDeal({ totalScores, roundScore, tricksWon }) {
  const game = new BelotGame();
  game.phase = GAME_PHASES.PLAYING;
  game.contract = 'hearts';
  game.trumpSuit = 'hearts';
  game.bids = [
    { playerId: 0, bid: 'hearts' },
    { playerId: 3, bid: 'pass' },
    { playerId: 2, bid: 'pass' },
    { playerId: 1, bid: 'pass' }
  ];
  game.totalScores = [...totalScores];
  game.currentRoundScore = [...roundScore];
  game.tricks = tricksWon.map(team => ({
    cards: [{ playerId: team, card: new Card('clubs', '7') }],
    winner: team,
    team
  }));
  game.endRound();
  return game;
}

const SPLIT_TRICKS = [0, 1, 0, 1, 0, 1, 0, 0];

describe('Game end', () => {
  it('ends when one team reaches 151', () => {
    // 92 + 10 last trick = 102 vs 60: 10 + 6 game points
    const game = finishDeal({ totalScores: [141, 100], roundScore: [92, 60], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([151, 106]);
    expect(game.winner).toBe(0);
    expect(game.phase).toBe(GAME_PHASES.FINISHED);
  });

  it('ends at exactly 151 even when the other team is close behind', () => {
    // 151 or more wins (>=, not >): 92 + 10 = 102 vs 60 gives 10 + 6
    const game = finishDeal({ totalScores: [141, 140], roundScore: [92, 60], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([151, 146]);
    expect(game.winner).toBe(0);
    expect(game.phase).toBe(GAME_PHASES.FINISHED);
  });

  it('keeps playing at 150', () => {
    const game = finishDeal({ totalScores: [140, 100], roundScore: [92, 60], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([150, 106]);
    expect(game.winner).toBe(null);
    expect(game.phase).toBe(GAME_PHASES.SCORING);
  });

  it('gives the win to the higher total when both teams pass 151', () => {
    // Team 0 bid and lost: 52 + 10 vs 100, all 16 go to team 1
    const game = finishDeal({ totalScores: [155, 140], roundScore: [52, 100], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([155, 156]);
    expect(game.winner).toBe(1);
    expect(game.phase).toBe(GAME_PHASES.FINISHED);
  });

  it('keeps playing when both teams pass 151 with equal totals', () => {
    // 92 + 10 = 102 vs 60: 10 + 6 game points
    const game = finishDeal({ totalScores: [150, 154], roundScore: [92, 60], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([160, 160]);
    expect(game.winner).toBe(null);
    expect(game.phase).toBe(GAME_PHASES.SCORING);
  });

  it('cannot be won with a valat', () => {
    // 152 + 10 + 90 valat = 252: 25 game points
    const game = finishDeal({ totalScores: [140, 100], roundScore: [152, 0], tricksWon: Array(8).fill(0) });
    expect(game.totalScores).toEqual([165, 100]);
    expect(game.winner).toBe(null);
    expect(game.phase).toBe(GAME_PHASES.SCORING);
  });

  it('ends on the next deal without a valat', () => {
    const game = finishDeal({ totalScores: [165, 100], roundScore: [92, 60], tricksWon: SPLIT_TRICKS });
    expect(game.totalScores).toEqual([175, 106]);
    expect(game.winner).toBe(0);
  });
});
