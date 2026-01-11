import { describe, it, expect, beforeEach } from 'vitest';
import { BelotGame } from '../gameLogic';
import { Card } from '../cards';

describe('Scoring', () => {
  let game;

  beforeEach(() => {
    game = new BelotGame();
    game.phase = 'playing';
    game.contract = 'hearts';
    game.trumpSuit = 'hearts';
    game.currentPlayer = 0;
    game.currentTrick = [];
    game.tricks = [];
    game.roundScore = [0, 0];
    game.scores = [0, 0];
    game.hangingPoints = 0;
    game.double = false;
    game.redouble = false;
  });

  describe('Round point calculation', () => {
    it('should round to 25 when cardPoints are 55, combinations are +200, and opponent points end in 6', () => {
      // Set up contract team (team 0) with 55 card points
      // The combination points (200) will be added during endRound
      game.roundScore[0] = 55; // Card points
      
      // Set up opponent team (team 1) with points ending in 6 (e.g., 106)
      game.roundScore[1] = 106; // Opponent points ending in 6
      
      // Set up contract and bids
      game.contract = 'hearts'; // Regular trump suit (not no-trump or all-trump)
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Add combination points (200) - these will be added to roundScore during endRound
      game.announcedCombinations[0] = [
        { type: 'equal', points: 200, cards: [] }
      ];
      
      // Complete all tricks (8 tricks total) - needed for endRound to work
      // Make sure not all tricks are won by same team to avoid valat
      for (let i = 0; i < 8; i++) {
        // Alternate teams to avoid valat (7 tricks for team 0, 1 trick for team 1)
        const team = i < 7 ? 0 : 1;
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('hearts', 'A') },
            { playerId: 1, card: new Card('spades', '7') },
            { playerId: 2, card: new Card('clubs', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: team
        });
      }
      
      // Ensure roundScore is set correctly after all setup
      // Card points: 55, will add 200 combination points in endRound = 255 total
      game.roundScore[0] = 55;
      game.roundScore[1] = 106;
      
      // End the round
      game.endRound();
      
      // Verify: 55 + 200 = 255, 255/10 = 25.5 rounds to 26
      // Team 0: 255 / 10 = 25.5 rounds to 26, but in trump suit when opponent points end in 6,
      // contract team gets rounded down: 26 - 1 = 25
      // Team 1: 106 / 10 = 10.6 rounds to 11 (rounded up)
      // Total: 25 + 11 = 36, which matches 361 / 10 = 36.1 → 36
      expect(game.lastRoundRoundedPoints[0]).toBe(25);
      expect(game.lastRoundRoundedPoints[1]).toBe(11); // 106 / 10 = 10.6 rounds to 11
      
      // Verify breakdown - cardPoints should be 55, combinationPoints should be 200
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(55);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(200);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(106);
      
      // Verify total scores were updated
      expect(game.scores[0]).toBe(25);
      expect(game.scores[1]).toBe(11);
    });

    it('should round up losing team points when they end in 6 in trump suit games', () => {
      // Set up contract team (team 0) with 86 card points
      game.roundScore[0] = 86; // Card points
      
      // Set up opponent team (team 1) with points ending in 6 (e.g., 76)
      // Total points: 86 + 76 = 162 (no combinations or premiums)
      // 76 / 10 = 7.6, which should round to 8 (rounded up)
      game.roundScore[1] = 76; // Opponent points ending in 6
      
      // Set up contract and bids - trump suit (not no-trump)
      game.contract = 'spades'; // Regular trump suit
      game.trumpSuit = 'spades';
      game.bids = [
        { playerId: 0, bid: 'spades' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // No combinations for this test
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [];
      
      // Complete all tricks (8 tricks total) - needed for endRound to work
      // Make sure not all tricks are won by same team to avoid valat
      for (let i = 0; i < 8; i++) {
        // Alternate teams to avoid valat (7 tricks for team 0, 1 trick for team 1)
        const team = i < 7 ? 0 : 1;
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('spades', 'A') },
            { playerId: 1, card: new Card('hearts', '7') },
            { playerId: 2, card: new Card('clubs', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: team
        });
      }
      
      // Ensure roundScore is set correctly - total should be 162
      game.roundScore[0] = 86;
      game.roundScore[1] = 76;
      
      // End the round
      game.endRound();
      
      // Verify total points in round: 86 + 76 = 162
      expect(game.lastRoundScore[0] + game.lastRoundScore[1]).toBe(162);
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      // Team 0: 86 / 10 = 8.6 rounds to 9, but in trump suit when opponent points end in 6,
      // contract team gets rounded down: 9 - 1 = 8
      // Team 1: 76 / 10 = 7.6 rounds to 8 (rounded up)
      // Total: 8 + 8 = 16, which matches 162 / 10 = 16.2 → 16
      expect(game.lastRoundRoundedPoints[0]).toBe(8);
      expect(game.lastRoundRoundedPoints[1]).toBe(8); // 76 / 10 = 7.6 rounds to 8
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(86);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(76);
      
      // Verify total scores were updated
      expect(game.scores[0]).toBe(8);
      expect(game.scores[1]).toBe(8);
      
      // Verify total rounded points match total round points / 10
      expect(game.lastRoundRoundedPoints[0] + game.lastRoundRoundedPoints[1]).toBe(16);
    });

    it('should round up losing team points ending in 6 for different trump suits', () => {
      // Test with clubs trump suit
      // Total points: 86 + 76 = 162 (no combinations or premiums)
      game.roundScore[0] = 86; // Contract team wins
      game.roundScore[1] = 76; // Opponent points ending in 6
      
      game.contract = 'clubs';
      game.trumpSuit = 'clubs';
      game.bids = [
        { playerId: 0, bid: 'clubs' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [];
      
      // Complete tricks
      for (let i = 0; i < 8; i++) {
        const team = i < 7 ? 0 : 1;
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('clubs', 'A') },
            { playerId: 1, card: new Card('hearts', '7') },
            { playerId: 2, card: new Card('spades', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: team
        });
      }
      
      // Ensure roundScore is set correctly - total should be 162
      game.roundScore[0] = 86;
      game.roundScore[1] = 76;
      
      game.endRound();
      
      // Verify total points in round: 86 + 76 = 162
      expect(game.lastRoundScore[0] + game.lastRoundScore[1]).toBe(162);
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify:
      // Team 0: 86 / 10 = 8.6 rounds to 9, but in trump suit when opponent points end in 6,
      // contract team gets rounded down: 9 - 1 = 8
      // Team 1: 76 / 10 = 7.6 rounds to 8 (rounded up)
      // Total: 8 + 8 = 16, which matches 162 / 10 = 16.2 → 16
      expect(game.lastRoundRoundedPoints[0]).toBe(8);
      expect(game.lastRoundRoundedPoints[1]).toBe(8); // 76 / 10 = 7.6 rounds to 8
      
      // Verify total rounded points match total round points / 10
      expect(game.lastRoundRoundedPoints[0] + game.lastRoundRoundedPoints[1]).toBe(16);
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(86);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(76);
    });

    it('should round up non-contract team points when they end in 4 in all-trump contract', () => {
      // Set up contract team (team 0) with 204 card points
      game.roundScore[0] = 204; // Card points
      
      // Set up non-contract team (team 1) with points ending in 4 (e.g., 54)
      // Total points: 204 + 54 = 258 (no combinations or premiums)
      // 54 / 10 = 5.4, which should round to 5 normally, but in all-trump when ending in 4, 
      // the contract team gets +1 point (effectively rounding up the opponent)
      game.roundScore[1] = 54; // Non-contract team points ending in 4
      
      // Set up contract and bids - all-trump
      game.contract = 'all-trump';
      game.trumpSuit = null; // all-trump has no specific trump suit
      game.bids = [
        { playerId: 0, bid: 'all-trump' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // No combinations for this test
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [];
      
      // Complete all tricks (8 tricks total) - needed for endRound to work
      // Make sure not all tricks are won by same team to avoid valat
      for (let i = 0; i < 8; i++) {
        // Alternate teams to avoid valat (7 tricks for team 0, 1 trick for team 1)
        const team = i < 7 ? 0 : 1;
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('hearts', 'A') },
            { playerId: 1, card: new Card('spades', '7') },
            { playerId: 2, card: new Card('clubs', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: team
        });
      }
      
      // Ensure roundScore is set correctly - total should be 258
      game.roundScore[0] = 204;
      game.roundScore[1] = 54;
      
      // End the round
      game.endRound();
      
      // Verify total points in round: 204 + 54 = 258
      expect(game.lastRoundScore[0] + game.lastRoundScore[1]).toBe(258);
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(258);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      // Team 0: 204 / 10 = 20.4 rounds to 20 (normal rounding)
      // Team 1: 54 / 10 = 5.4 rounds to 5, but in all-trump when points end in 4, 
      // the team with less points (non-contract team) gets +1: 5 + 1 = 6
      // Total: 20 + 6 = 26, which matches 258 / 10 = 25.8 → 26
      expect(game.lastRoundRoundedPoints[0]).toBe(20);
      expect(game.lastRoundRoundedPoints[1]).toBe(6); // 54 / 10 = 5.4 rounds to 5, then +1 = 6
      
      // Verify total rounded points match total round points / 10
      expect(game.lastRoundRoundedPoints[0] + game.lastRoundRoundedPoints[1]).toBe(26);
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(204);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(54);
      
      // Verify total scores were updated
      expect(game.scores[0]).toBe(20);
      expect(game.scores[1]).toBe(6);
    });
  });
});

