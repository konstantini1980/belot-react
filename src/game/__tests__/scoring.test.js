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
    game.currentTrick = { cards: [] };
    game.tricks = [];
    game.currentRoundScore = [0, 0];
    game.totalScores = [0, 0];
    game.hangingPoints = 0;
    game.isDouble = false;
    game.isRedouble = false;
  });

  describe('Round point calculation', () => {
    it('Trump game - losing contract gives all points to opponent', () => {
                
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
      
      game.currentRoundScore[0] = 55; 
      game.currentRoundScore[1] = 107; 
      
      game.endRound();
      
      
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify:       
      expect(game.lastRoundRoundedPoints[0]).toBe(0); 
      expect(game.lastRoundRoundedPoints[1]).toBe(16);       
    });

    it('Trump game - should do rounding at 6', () => {
      // Test with clubs trump suit
      // Total points: 85 + 77 = 162 (no combinations or premiums)
      game.currentRoundScore[0] = 85; // Contract team wins
      game.currentRoundScore[1] = 77; // Opponent points ending in 6
      
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
      
      // Ensure currentRoundScore is set correctly - total should be 162
      game.currentRoundScore[0] = 85;
      game.currentRoundScore[1] = 77;
      
      game.endRound();
      
      // Verify total points in round: 85 + 77 = 162
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      // Rounding happens at 6 on trump suit game
      expect(game.lastRoundRoundedPoints[0]).toBe(8); // 85 / 10 = 8.5 rounds to 8
      expect(game.lastRoundRoundedPoints[1]).toBe(8); // 77 / 10 = 7.6 rounds to 8
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(85);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(77);
    });
  
    it('Trump game - should round up losing team points when both team points end in 6', () => {
      // Set up contract team (team 0) with 86 card points
      game.currentRoundScore[0] = 86; // Card points
      
      // Set up opponent team (team 1) with points ending in 6 (e.g., 76)
      // Total points: 86 + 76 = 162 (no combinations or premiums)
      // 76 / 10 = 7.6, which should round to 8 (rounded up)
      game.currentRoundScore[1] = 76; // Opponent points ending in 6
      
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
      
      // Ensure currentRoundScore is set correctly - total should be 162
      game.currentRoundScore[0] = 86;
      game.currentRoundScore[1] = 76;
      
      // End the round
      game.endRound();
      
      // Verify total points in round: 86 + 76 = 162
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      // Points for both teams end up in 6 and it is a trump suit game, so the team with less points 
      // gets rounded up and the other team gets rounded down
      // Team 1: 76 / 10 = 7.6 rounds to 8 (rounded up)
      // Total: 8 + 8 = 16, which matches 162 / 10 = 16.2 → 16
      expect(game.lastRoundRoundedPoints[0]).toBe(8);
      expect(game.lastRoundRoundedPoints[1]).toBe(8); // 76 / 10 = 7.6 rounds to 8
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(86);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(76);
      
      // Verify total scores were updated
      expect(game.totalScores[0]).toBe(8);
      expect(game.totalScores[1]).toBe(8);
    });

    it('All trumps - should round up losing team points when both team points end in 4', () => {
      // Set up contract team (team 0) with 204 card points
      game.currentRoundScore[0] = 204; // Card points
      
      // Set up non-contract team (team 1) with points ending in 4 (e.g., 54)
      // Total points: 204 + 54 = 258 (no combinations or premiums)
      // 54 / 10 = 5.4, which should round to 5 normally, but in all-trump when ending in 4, 
      // the contract team gets +1 point (effectively rounding up the opponent)
      game.currentRoundScore[1] = 54; // Non-contract team points ending in 4
      
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
      
      // Ensure currentRoundScore is set correctly - total should be 258
      game.currentRoundScore[0] = 204;
      game.currentRoundScore[1] = 54;
      
      // End the round
      game.endRound();
      
      // Verify total points in round: 204 + 54 = 258
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(258);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      // Points for both teams end up in 4 and it is a all-trump game, so the team with less points 
      // gets rounded up and the other team gets rounded down
      expect(game.lastRoundRoundedPoints[0]).toBe(20);
      expect(game.lastRoundRoundedPoints[1]).toBe(6);
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(204);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(54);
      
      // Verify total scores were updated
      expect(game.totalScores[0]).toBe(20);
      expect(game.totalScores[1]).toBe(6);
    });

    it('Trump game - should not lose game with fewer points but with a large premium', () => {
      // The combination points (200) will be added during endRound
      game.currentRoundScore[0] = 55; // Card points
      game.currentRoundScore[1] = 107; // Opponent points
      
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
      
      // Ensure currentRoundScore is set correctly after all setup
      // Card points: 55, will add 200 combination points in endRound = 255 total
      game.currentRoundScore[0] = 55;
      game.currentRoundScore[1] = 107;
      
      // End the round
      game.endRound();
      
      expect(game.lastRoundRoundedPoints[0]).toBe(25);
      expect(game.lastRoundRoundedPoints[1]).toBe(11);
      
      // Verify breakdown - cardPoints should be 55, combinationPoints should be 200
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(55);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(200);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(107);
      
      // Verify total scores were updated
      expect(game.totalScores[0]).toBe(25);
      expect(game.totalScores[1]).toBe(11);
    });

    it('Trump game - should not count sequences of losing team when both teams have sequences and one has bigger sequence', () => {
      // Set up card points
      game.currentRoundScore[0] = 100; // Contract team
      game.currentRoundScore[1] = 58; // Opponent team
      
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Team 0 has AKQ tierce (20 points) and 987 tierce (20 points)
      // AKQ is bigger than Team 1's KQJ, so Team 0 wins and keeps ALL sequences
      game.announcedCombinations[0] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'A'), new Card('hearts', 'K'), new Card('hearts', 'Q')] },
        { type: 'tierce', points: 20, cards: [new Card('hearts', '9'), new Card('hearts', '8'), new Card('hearts', '7')] }
      ];
      
      // Team 1 has KQJ tierce (20 points) - smaller than Team 0's AKQ, should not count
      game.announcedCombinations[1] = [
        { type: 'tierce', points: 20, cards: [new Card('spades', 'K'), new Card('spades', 'Q'), new Card('spades', 'J')] }
      ];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {
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
      
      // End the round
      game.endRound();
      
      // Verify: Team 0's sequences should ALL count (20 + 20 = 40 points)
      // because Team 0's AKQ beats Team 1's KQJ
      // Team 1's sequence should NOT count (0 points) because they lost the comparison
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(40); // Both tierces count
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0); // KQJ doesn't count
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(100);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(58);

      // Verify total points: 100 (card) + 40 (both sequences) = 140 => 14 for team 0
      // 58 (card) + 0 (no combinations) = 58 => 6 for team 1
      expect(game.lastRoundRoundedPoints[0]).toBe(14);
      expect(game.lastRoundRoundedPoints[1]).toBe(6);
      
    });

    it('Trump game - should drop all sequences from both teams when they have the same highest sequence', () => {
      // Set up card points
      game.currentRoundScore[0] = 100; // Contract team
      game.currentRoundScore[1] = 58; // Opponent team
      
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Team 0 has KQJ tierce (20 points) and 987 tierce (20 points)
      // KQJ is the highest sequence for Team 0
      game.announcedCombinations[0] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] },
        { type: 'tierce', points: 20, cards: [new Card('hearts', '9'), new Card('hearts', '8'), new Card('hearts', '7')] }
      ];
      
      // Team 1 has KQJ tierce (20 points) - same highest sequence as Team 0
      // Since both teams have the same highest sequence, ALL sequences are dropped
      game.announcedCombinations[1] = [
        { type: 'tierce', points: 20, cards: [new Card('spades', 'K'), new Card('spades', 'Q'), new Card('spades', 'J')] }
      ];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {
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
      
      // End the round
      game.endRound();
      
      // Verify: Since both teams have the same highest sequence (KQJ), ALL sequences are dropped
      // Team 0's sequences (KQJ + 987) don't count
      // Team 1's sequence (KQJ) doesn't count
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0); // All sequences dropped
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0); // All sequences dropped

      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(100);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(58);
      
      // Verify total points: 100 (card) + 0 (no combinations) = 100 => 10 for team 0
      // 58 (card) + 0 (no combinations) = 58 => 6 for team 1
      expect(game.lastRoundRoundedPoints[0]).toBe(10);
      expect(game.lastRoundRoundedPoints[1]).toBe(6);
      
    });

    it('Trump game - should not count lower order sequences when opponent has higher order sequence', () => {
      // Set up card points
      game.currentRoundScore[0] = 100; // Contract team
      game.currentRoundScore[1] = 58; // Opponent team
      
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Team 0 has quint (higher order sequence - 5+ cards, 100 points)
      // This should "beat" any lower order sequences from Team 1
      game.announcedCombinations[0] = [
        { type: 'quint', points: 100, cards: [
          new Card('hearts', 'A'), new Card('hearts', 'K'), new Card('hearts', 'Q'),
          new Card('hearts', 'J'), new Card('hearts', '10')
        ]}
      ];
      
      // Team 1 has tierce (lower order sequence - 3 cards, 20 points)
      // This should NOT count because Team 0 has a higher order sequence (quint)
      game.announcedCombinations[1] = [
        { type: 'tierce', points: 20, cards: [new Card('spades', 'K'), new Card('spades', 'Q'), new Card('spades', 'J')] }
      ];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {
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
      
      // End the round
      game.endRound();
      
      // Verify: Team 0's quint should count (100 points)
      // Team 1's tierce should NOT count (0 points) because quint > tierce
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(100);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);

      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(100);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(58);
      
      // Verify total points: 100 (card) + 100 (quint) = 200 => 20 for team 0
      // 58 (card) + 0 (no combinations) = 58 => 6 for team 1
      expect(game.lastRoundRoundedPoints[0]).toBe(20);
      expect(game.lastRoundRoundedPoints[1]).toBe(6);     
    });

    it('Trump game - another test for rounding at 6', () => {
      
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
      
      // Ensure currentRoundScore is set correctly - total should be 162
      game.currentRoundScore[0] = 87;
      game.currentRoundScore[1] = 75;
      
      game.endRound();
      
      // Verify total points in round: 85 + 77 = 162
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      
      // Verify: 
      expect(game.lastRoundRoundedPoints[0]).toBe(9); // 87 / 10 = 8.7 rounds to 9
      expect(game.lastRoundRoundedPoints[1]).toBe(7); // 75 / 10 = 7.5 rounds to 8
      
      // Verify total rounded points match total round points / 10
      expect(game.lastRoundRoundedPoints[0] + game.lastRoundRoundedPoints[1]).toBe(16);
      
    });

    it('Trump game - should create hanging points when both teams have equal round points including premiums', () => {
            
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Contract team has a tierce (20 points) - will make total equal to opponent
      game.announcedCombinations[0] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] }
      ];
      
      // Opponent team has no combinations
      game.announcedCombinations[1] = [];
      
      // Complete all tricks (8 tricks total) - needed for endRound to work
      // Make sure not all tricks are won by same team to avoid valat
      for (let i = 0; i < 8; i++) {
        // Alternate teams to avoid valat (4 tricks each)
        const team = i < 4 ? 0 : 1;
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
      
      // Set up equal points scenario: contract team has card points + combinations = opponent card points
      // Contract team: 71 card points + 20 combination points = 91 total
      // Opponent team: 91 card points + 0 combination points = 91 total
      game.currentRoundScore[0] = 71; // Contract team card points
      game.currentRoundScore[1] = 91; // Opponent team card points
      
      // Set initial total scores
      game.totalScores[0] = 50;
      game.totalScores[1] = 30;
      
      // End the round
      game.endRound();
      
      // Verify breakdown
      expect(game.lastRoundBreakdown[0].cardPoints).toBe(71);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(20);
      expect(game.lastRoundBreakdown[1].cardPoints).toBe(91);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      
      // Verify hanging points: contract team's rounded points should become hanging
      // Contract team is team 0 (player 0 bid hearts)
      // After equal points, contract team's rounded points become hanging and are set to 0
      expect(game.hangingPoints).toBe(9);
      
      // Verify that contract team's points are NOT added to totalScores (they're hanging)
      // Opponent team's points ARE added to totalScores
      expect(game.lastRoundRoundedPoints[0]).toBe(0); // Contract team gets 0 (points are hanging)
      expect(game.lastRoundRoundedPoints[1]).toBe(9); // Opponent team gets their points
      
      // Verify total scores: only opponent team's points were added
      expect(game.totalScores[0]).toBe(50); // Contract team: no change (points hanging)
      expect(game.totalScores[1]).toBe(39); // Opponent team: 30 + 9 = 39
    });

    it('Trump game - winner of next round should receive hanging points from previous round', () => {
      // First, set up a round with equal points to create hanging points
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Contract team has a tierce (20 points) - will make total equal to opponent
      game.announcedCombinations[0] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] }
      ];
      game.announcedCombinations[1] = [];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {
        const team = i < 4 ? 0 : 1;
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
      
      // Set up equal points to create hanging points
      game.currentRoundScore[0] = 71; // Contract team card points
      game.currentRoundScore[1] = 91; // Opponent team card points
      game.totalScores[0] = 50;
      game.totalScores[1] = 30;
      
      // End first round - creates hanging points
      game.endRound();
      
      // Verify hanging points were created
      expect(game.hangingPoints).toBe(9);
      expect(game.totalScores[0]).toBe(50); // Contract team: no change (points hanging)
      expect(game.totalScores[1]).toBe(39); // Opponent team: 30 + 9 = 39
      
      // Now set up a second round where contract team wins
      // Reset round state for new round
      game.phase = 'playing';
      game.contract = 'spades';
      game.trumpSuit = 'spades';
      game.bids = [
        { playerId: 0, bid: 'spades' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [];
      game.tricks = [];
      
      // Complete all tricks - contract team wins 7 tricks
      for (let i = 0; i < 8; i++) {
        const team = i < 7 ? 0 : 1; // Contract team wins 7 tricks
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
      
      // Set up scores for second round - contract team wins
      game.currentRoundScore[0] = 100; // Contract team wins
      game.currentRoundScore[1] = 62; // Opponent team
      
      // End second round
      game.endRound();
      
      // Verify hanging points were added to the winner (contract team)
      // Contract team should get: their rounded points (10) + hanging points (9) = 19
      expect(game.hangingPoints).toBe(0); // Hanging points should be cleared
      expect(game.lastRoundRoundedPoints[0]).toBe(19); // Contract team: 10 (this round) + 9 (hanging) = 19
      expect(game.lastRoundRoundedPoints[1]).toBe(6); // Opponent team: 6 rounded points
 
      // Verify total scores were updated correctly
      expect(game.totalScores[0]).toBe(69); // Contract team: 50 + 19 = 69
      expect(game.totalScores[1]).toBe(45); // Opponent team: 39 + 6 = 45
    });

    it('Trump game - valat game receives bonus points', () => {
      // First, set up a round with equal points to create hanging points
      game.contract = 'hearts';
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Oppenonent team has a tierce (20 points) - receives it normally although it is valat game
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] }
      ];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {        
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('hearts', 'A') },
            { playerId: 1, card: new Card('spades', '7') },
            { playerId: 2, card: new Card('clubs', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: 0
        });
      }
      
      // Set up equal points to create hanging points
      game.currentRoundScore[0] = 162; // Contract team card points
      game.currentRoundScore[1] = 0; // Opponent team card points
      game.totalScores[0] = 30;
      game.totalScores[1] = 30;
      
      game.endRound();
      
      expect(game.hangingPoints).toBe(0);
      expect(game.totalScores[0]).toBe(55); // Contract team - add valat points
      expect(game.totalScores[1]).toBe(32); // Opponent team - add tierce points
      
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(20);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(90);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify:       
      expect(game.lastRoundRoundedPoints[0]).toBe(25); 
      expect(game.lastRoundRoundedPoints[1]).toBe(2); 
    });

    it('Trump game - valat game cancels doubling', () => {
      // First, set up a round with equal points to create hanging points
      game.contract = 'hearts';
      game.double = true;
      game.redouble = false;
      game.trumpSuit = 'hearts';
      game.bids = [
        { playerId: 0, bid: 'hearts' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      // Oppenonent team has a tierce (20 points) - receives it normally although it is valat game
      game.announcedCombinations[0] = [];
      game.announcedCombinations[1] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] }
      ];
      
      // Complete all tricks (8 tricks total)
      for (let i = 0; i < 8; i++) {        
        game.tricks.push({
          cards: [
            { playerId: 0, card: new Card('hearts', 'A') },
            { playerId: 1, card: new Card('spades', '7') },
            { playerId: 2, card: new Card('clubs', '7') },
            { playerId: 3, card: new Card('diamonds', '7') }
          ],
          team: 0
        });
      }
      
      // Set up equal points to create hanging points
      game.currentRoundScore[0] = 162; // Contract team card points
      game.currentRoundScore[1] = 0; // Opponent team card points
      game.totalScores[0] = 30;
      game.totalScores[1] = 30;
      
      game.endRound();
      
      expect(game.hangingPoints).toBe(0);
      expect(game.totalScores[0]).toBe(55); // Contract team - add valat points
      expect(game.totalScores[1]).toBe(32); // Opponent team - add tierce points
      
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(20);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(90);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify:       
      expect(game.lastRoundRoundedPoints[0]).toBe(25); 
      expect(game.lastRoundRoundedPoints[1]).toBe(2); 
    });
    
    it('Trump game - doubling and redoubling points', () => {
      
      game.contract = 'clubs';
      game.trumpSuit = 'clubs';
      game.double = true;
      game.redouble = false;
      game.bids = [
        { playerId: 0, bid: 'clubs' },
        { playerId: 1, bid: 'pass' },
        { playerId: 2, bid: 'pass' },
        { playerId: 3, bid: 'pass' }
      ];
      
      game.announcedCombinations[0] = [
        { type: 'tierce', points: 20, cards: [new Card('hearts', 'K'), new Card('hearts', 'Q'), new Card('hearts', 'J')] }
      ];
      game.announcedCombinations[1] = [];
      
      // Complete tricks
      for (let i = 0; i < 8; i++) {
        const team = i < 4 ? 0 : 1;
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
      
      // Ensure currentRoundScore is set correctly - total should be 162
      game.currentRoundScore[0] = 101;
      game.currentRoundScore[1] = 61;
      
      game.endRound();
      
      expect(game.lastRoundBreakdown[0].cardPoints + game.lastRoundBreakdown[1].cardPoints).toBe(162);
      expect(game.lastRoundBreakdown[0].combinationPoints).toBe(20);
      expect(game.lastRoundBreakdown[1].combinationPoints).toBe(0);
      expect(game.lastRoundBreakdown[0].valatPoints).toBe(0);
      expect(game.lastRoundBreakdown[1].valatPoints).toBe(0);
      
      // Verify: 
      expect(game.lastRoundRoundedPoints[0]).toBe(36);
      expect(game.lastRoundRoundedPoints[1]).toBe(0); 
      
    });
  });
});

