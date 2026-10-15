import { createDeck, SEQUENCE_ORDER } from './cards';
import { getAllCombinations, findBelotOnPlay } from './combinations';

export const CONTRACTS = ['clubs', 'diamonds', 'hearts', 'spades', 'no-trump', 'all-trump'];
export const CONTRACT_RANK = {
  'clubs': 1,
  'diamonds': 2,
  'hearts': 3,
  'spades': 4,
  'no-trump': 5,
  'all-trump': 6
};

const VALAT_BONUS = 90;
const WINNING_SCORE = 151;

export const GAME_PHASES = {
  DEALING: 'dealing',
  BIDDING: 'bidding',
  PLAYING: 'playing',
  SCORING: 'scoring',
  FINISHED: 'finished'
};

export class BelotGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = GAME_PHASES.DEALING;
    this.deck = [];
    this.players = [
      { id: 0, name: 'You', hand: [], team: 0 },
      { id: 1, name: 'West', hand: [], team: 1 },
      { id: 2, name: 'Partner', hand: [], team: 0 },
      { id: 3, name: 'East', hand: [], team: 1 }
    ];
    this.dealer = Math.floor(Math.random() * 4); // First dealer is picked at random
    this.currentBidder = 0;
    this.bids = [];
    this.contract = null;
    this.trumpSuit = null;
    this.double = false;
    this.redouble = false;
    this.currentPlayer = 0;
    this.currentTrick = { cards: [], winner: null, team: null };
    this.tricks = [];
    this.totalScores = [0, 0]; // Team scores
    this.currentRoundScore = [0, 0]; // Points from current round
    this.lastRoundBreakdown = [{ cardPoints: 0, combinationPoints: 0, valatPoints: 0 }, { cardPoints: 0, combinationPoints: 0, valatPoints: 0 }]; // Breakdown of last round points
    this.lastRoundRoundedPoints = [0, 0]; // Rounded points added to scores from last round
    this.hangingPoints = 0; // Points hanging from last round
    this.announcedCombinations = [[], []]; // Team combinations
    this.winner = null;
  }

  deal() {
    this.deck = createDeck();
    this.players.forEach(player => player.hand = []);
    
    // Deal 3 cards to each player
    for (let i = 0; i < 3; i++) {
      for (let player of this.players) {
        if (this.deck.length > 0) {
          player.hand.push(this.deck.pop());
        }
      }
    }
    
    // Deal 2 more cards to each player
    for (let i = 0; i < 2; i++) {
      for (let player of this.players) {
        if (this.deck.length > 0) {
          player.hand.push(this.deck.pop());
        }
      }
    }
    
    this.phase = GAME_PHASES.BIDDING;
    // First bidder is next from dealer
    this.currentBidder = (this.dealer + 3) % 4;
    // Clear round variables for next round
    this.bids = [];
    this.tricks = [];
    this.currentTrick = { cards: [], winner: null, team: null };
    this.contract = null;
    this.trumpSuit = null;
    this.double = false;
    this.redouble = false;
    this.announcedCombinations = [[], []];
    this.winner = null;
    // Reset round scores for new round
    this.currentRoundScore = [0, 0];
    // Clear last round breakdown when starting new deal
    this.lastRoundBreakdown = [{ cardPoints: 0, combinationPoints: 0, valatPoints: 0 }, { cardPoints: 0, combinationPoints: 0, valatPoints: 0 }];
    // Clear last round rounded points when starting new deal
    this.lastRoundRoundedPoints = [0, 0];
  }


  makeBid(playerId, bid) {
    if (playerId !== this.currentBidder) return false;
    if (bid === 'pass') {
      this.bids.push({ playerId, bid: 'pass' });
    } else if (bid === 'double') {
      // Find the last winning contract (not pass, double, or redouble)
      const lastWinningContract = this.bids
        .filter(b => b.bid !== 'pass' && b.bid !== 'double' && b.bid !== 'redouble')
        .pop();
      
      if (lastWinningContract) {
        const lastContractTeam = this.players[lastWinningContract.playerId].team;
        const currentPlayerTeam = this.players[playerId].team;
        // Can only double if opponent (different team) has the winning contract
        // Cannot double if teammate has the winning bid
        if (lastContractTeam !== currentPlayerTeam) {
          this.double = true;
          this.bids.push({ playerId, bid: 'double' });
        } else {
          return false; // Cannot double teammate's bid
        }
      } else {
        return false; // No winning contract to double
      }
    } else if (bid === 'redouble') {          
      const lastWinningContract = this.bids
      .filter(b => b.bid !== 'pass' && b.bid !== 'double' && b.bid !== 'redouble')
      .pop();

      // Can redouble only if valid bid exists by same team and game is already doubled
      if (lastWinningContract && this.double) {
        const lastContractTeam = this.players[lastWinningContract.playerId].team;
        const currentPlayerTeam = this.players[playerId].team;
        // Game already doubled by opponent
        // Can redouble if current team has the winning bid
        if (lastContractTeam === currentPlayerTeam) {
          this.redouble = true;
          this.bids.push({ playerId, bid: 'redouble' });
        } else {
          return false; // This team doesn't have the winning bid
        }      
      } else {
        return false; // No double to redouble
      }
    } else {
      // Contract bid
      const lastValidBid = this.bids.filter(b => b.bid !== 'pass').pop();
      if (lastValidBid) {
        const lastRank = CONTRACT_RANK[lastValidBid.bid];
        const newRank = CONTRACT_RANK[bid];
        if (newRank <= lastRank) return false;
      }
      this.bids.push({ playerId, bid });
      this.double = false;
      this.redouble = false;
    }  

    this.checkIsBiddingOver();    
    return true;
  }
  

  checkIsBiddingOver() {
    const validBid = [...this.bids].reverse().find(b => b.bid !== 'pass' && b.bid !== 'double' && b.bid !== 'redouble');
    if (validBid) {
      // If valid bid, check if bidding is over (3 consecutive passes after valid bid)
      const lastThree = this.bids.slice(-3);
      if (lastThree.length === 3 && lastThree.every(b => b.bid === 'pass')) {
        this.contract = validBid.bid;
        if (this.contract !== 'no-trump' && this.contract !== 'all-trump') {
          this.trumpSuit = this.contract;
        }
        // Deal remaining 3 cards
        for (let i = 0; i < 3; i++) {
          for (let player of this.players) {
            if (this.deck.length > 0) {
              player.hand.push(this.deck.pop());
            }
          }
        }
        this.phase = GAME_PHASES.PLAYING;
        this.currentPlayer = (this.dealer + 3) % 4; // Next from dealer starts playing
      } 

      this.currentBidder = (this.currentBidder + 3) % 4; // Counter-clockwise
    } else {
      const lastFour = this.bids.slice(-4);
      if (lastFour.length === 4 && lastFour.every(b => b.bid === 'pass')) {
        // All passed - redeal
        // Next dealer is counter clockwise from current dealer
        this.dealer = (this.dealer + 3) % 4;
        this.deal();   
      } else {
        // Bidding is not over - update current bidder
        this.currentBidder = (this.currentBidder + 3) % 4; // Counter-clockwise
      }
    }
  }

  playCard(playerId, cardId) {
    if (playerId !== this.currentPlayer) return false;
    if (this.phase !== GAME_PHASES.PLAYING) return false;
    if (this.currentTrick.cards.length >= 4) return false; // Trick is full, waiting for completeTrick()
    
    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = player.hand[cardIndex];
    
    // Validate card play
    if (!this.isValidCardPlay(player, card)) return false;
    
    // Check for belot when Q or K is played (before removing card from hand)
    if (this.contract && (card.rank === 'Q' || card.rank === 'K')) {
      const leadSuit = this.currentTrick.cards.length > 0 ? this.currentTrick.cards[0].card.suit : card.suit;
      const belot = findBelotOnPlay(this.contract, card, player.hand, leadSuit);
      if (belot) {
        const team = player.team;
        this.announcedCombinations[team].push({
          ...belot,
          playerId
        });
      }
    }
    
    // Auto-announce other combinations (sequences, equals) on first card play in first trick
    const isFirstTrick = this.tricks.length === 0;
    if (isFirstTrick && this.contract && this.contract !== 'no-trump') {
      const allCombos = getAllCombinations(player.hand);
      if (allCombos.length > 0) {
        const team = player.team;
        const opponentTeam = 1 - team;
        
        // Filter combinations based on opponent's announcements
        const opponentCombos = this.announcedCombinations[opponentTeam];
        const opponentHasQuint = opponentCombos.some(c => c.type === 'quint');
        const opponentHasQuarte = opponentCombos.some(c => c.type === 'quarte');
        
        allCombos.forEach(combo => {
          // If it's "equals" - add it
          if (combo.type === 'equal') {
            this.announcedCombinations[team].push({
              ...combo,
              playerId
            });
          }
          // If sequential and is a quint - add it
          else if (combo.type === 'quint') {
            this.announcedCombinations[team].push({
              ...combo,
              playerId
            });
          }
          // If sequential and is a quarte - check that opponent does not have quints
          else if (combo.type === 'quarte') {
            if (!opponentHasQuint) {
              this.announcedCombinations[team].push({
                ...combo,
                playerId
              });
            }
          }
          // If sequential and is a tierce - check that opponent does not have quints or quartes
          else if (combo.type === 'tierce') {
            if (!opponentHasQuint && !opponentHasQuarte) {
              this.announcedCombinations[team].push({
                ...combo,
                playerId
              });
            }
          }
        });
      }
    }
    
    // Remove card from hand
    player.hand.splice(cardIndex, 1);
    this.currentTrick.cards.push({ playerId, card });

    if (this.currentTrick.cards.length < 4) {
      // Move to next player (counter-clockwise)
      this.currentPlayer = (this.currentPlayer + 3) % 4;
    } else {
      // If trick is complete, determine winner and store it
      const winner = this.determineTrickWinner();
      this.currentTrick.winner = winner.playerId;
      this.currentTrick.team = this.players[winner.playerId].team;
    }
    return true;
  }

  // Should be called from the app after the animation to holders is complete
  completeTrick() {
    let winnerPlayerId = this.currentTrick.winner;
    
    this.tricks.push({ ...this.currentTrick });
    
    // Add points
    this.currentTrick.cards.forEach(({ card }) => {
      const value = card.getValue(this.contract);
      this.currentRoundScore[this.players[winnerPlayerId].team] += value;
    });

    this.currentPlayer = winnerPlayerId;
    this.currentTrick = { cards: [], winner: null, team: null };

    // Check if round is over
    if (this.tricks.length === 8) {    
      this.endRound();
    }
  }

  isValidCardPlay(player, card) {
    if (this.currentTrick.cards.length === 0) {
      return true; // Can play any card when leading
    }
    
    const leadCard = this.currentTrick.cards[0].card;
    const leadSuit = leadCard.suit;
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    
    if (this.contract === 'all-trump') {
      // All-trump: all colors are trump colors
      // If player doesn't have the lead suit, they can play any card
      if (!hasLeadSuit) {
        return true;
      }
      
      // Must follow suit (playing cards of the same color is mandatory)
      if (card.suit !== leadSuit) return false;
      
      // Find the highest card played so far in the trick (of the lead suit)
      // In all-trump, all cards are trumps, so we compare by all-trump ranking
      let highestCard = leadCard;
      let highestRanking = highestCard.getRanking(this.contract, this.trumpSuit);
      
      this.currentTrick.cards.forEach(({ card: trickCard }) => {
        // Only consider cards of the lead suit
        if (trickCard.suit === leadSuit) {
          const trickRanking = trickCard.getRanking(this.contract, this.trumpSuit);
          // Lower ranking number means higher card (J=0, 9=1, A=2, etc.)
          if (trickRanking < highestRanking) {
            highestCard = trickCard;
            highestRanking = trickRanking;
          }
        }
      });
      
      // Raising is mandatory: must play a higher card if available
      // This applies regardless of which team has the highest card
      const higherCards = player.hand.filter(c => 
        c.suit === leadSuit && 
        c.getRanking(this.contract, this.trumpSuit) < highestRanking
      );
      
      if (higherCards.length > 0 && !higherCards.includes(card)) {
        return false; // Must play a higher card if available
      }
      
      return true;
    }
    
    if (this.contract === 'no-trump') {
      // No-trump: played like a trump game but no trump color
      // The only mandatory rule is to respond to (follow) the played color
      // If player has the lead suit, must follow suit; otherwise can play any card
      return hasLeadSuit ? card.suit === leadSuit : true;
    }
    
    // Trump color game
    if (hasLeadSuit) {
      // Must follow suit (same color)
      if (card.suit !== leadSuit) return false;
      
      // If trump suit is led, must raise (play higher trump if available)
      if (leadSuit === this.trumpSuit) {
        // Find the currently winning trump card in the trick
        let winningCard = leadCard;
        let winningRanking = winningCard.getRanking(this.contract, this.trumpSuit);
        
        this.currentTrick.cards.forEach(({ card: trickCard }) => {
          // Only consider trump cards
          if (trickCard.suit === this.trumpSuit) {
            const trickRanking = trickCard.getRanking(this.contract, this.trumpSuit);
            // Lower ranking number means higher card
            if (trickRanking < winningRanking) {
              winningCard = trickCard;
              winningRanking = trickRanking;
            }
          }
        });
        
        // If player has a higher trump than the winning card, they must play it
        const higherTrumps = player.hand.filter(c => 
          c.suit === this.trumpSuit && 
          c.getRanking(this.contract, this.trumpSuit) < winningRanking
        );
        
        if (higherTrumps.length > 0 && !higherTrumps.includes(card)) {
          return false; // Must play a higher trump if available
        }
      }
      
      return true;
    }
    
    // Don't have lead suit
    const opponentHasHighest = this.opponentHasHighestCard(player);
    
    // Partner holds the trick: no obligation to trump or overtrump
    if (!opponentHasHighest) return true;
    
    // Check if opponents played a trump card
    let highestOpponentTrump = null;
    let highestOpponentTrumpRanking = Infinity;
    this.currentTrick.cards.forEach(({ playerId, card: trickCard }) => {
      if (this.players[playerId].team !== player.team && 
          trickCard.suit === this.trumpSuit) {
        const trickRanking = trickCard.getRanking(this.contract, this.trumpSuit);
        if (trickRanking < highestOpponentTrumpRanking) {
          highestOpponentTrump = trickCard;
          highestOpponentTrumpRanking = trickRanking;
        }
      }
    });
    
    // If opponents played a trump card, must play a higher trump if available
    if (highestOpponentTrump !== null) {
      const higherTrumps = player.hand.filter(c => 
        c.suit === this.trumpSuit && 
        c.getRanking(this.contract, this.trumpSuit) < highestOpponentTrumpRanking
      );
      
      if (higherTrumps.length > 0) {
        // Must play a higher trump
        return higherTrumps.includes(card);
      } else {
        // Don't have a higher trump, can play any card
        return true;
      }
    }
    
    // Opponents have the highest card: if player has trump, must play trump
    const hasTrump = player.hand.some(c => c.suit === this.trumpSuit);
    if (hasTrump) {
      return card.suit === this.trumpSuit;
    }
    
    // Otherwise, can play any card
    return true;
  }

  opponentHasHighestCard(player = this.players[this.currentPlayer]) {
    if (this.currentTrick.cards.length === 0) return false;
    
    const leadCard = this.currentTrick.cards[0].card;
    const leadPlayer = this.currentTrick.cards[0].playerId;
    
    let highestCard = leadCard;
    let highestPlayer = leadPlayer;
    
    this.currentTrick.cards.forEach(({ playerId, card }) => {
      if (card.isHigherThan(highestCard, this.contract, this.trumpSuit, leadCard.suit)) {
        highestCard = card;
        highestPlayer = playerId;
      }
    });
    
    return this.players[highestPlayer].team !== player.team;
  }

  determineTrickWinner() {
    if (this.currentTrick.cards.length === 0) return null;
    
    let winner = this.currentTrick.cards[0];
    this.currentTrick.cards.forEach(p => {
      if (p.card.isHigherThan(winner.card, this.contract, this.trumpSuit)) {
        winner = p;
      }
    });
    
    return winner;
  }

  endRound() {
    // Last trick is worth 10 points
    const lastTrick = this.tricks[this.tricks.length - 1];
    if (lastTrick && lastTrick.winner !== null && lastTrick.winner !== undefined) {
      this.currentRoundScore[this.players[lastTrick.winner].team] += 10;
    }

    // Card points (including the last 10) are already in currentRoundScore
    const breakdown = this.currentRoundScore.map(cardPoints => (
      { cardPoints, combinationPoints: 0, valatPoints: 0, hangingPoints: 0 }
    ));

    if (this.contract === 'no-trump') {
      // Card points count double in no-trump
      for (const team of [0, 1]) {
        this.currentRoundScore[team] *= 2;
        breakdown[team].cardPoints *= 2;
      }
    }

    // Valat: one team won every trick
    const valatTeam = [0, 1].find(team => this.tricks.every(t => t.team === team));
    if (valatTeam !== undefined) {
      this.currentRoundScore[valatTeam] += VALAT_BONUS;
      breakdown[valatTeam].valatPoints = VALAT_BONUS;
    }

    const combinationPoints = scoreCombinations(this.announcedCombinations);
    for (const team of [0, 1]) {
      this.currentRoundScore[team] += combinationPoints[team];
      breakdown[team].combinationPoints = combinationPoints[team];
    }

    this.lastRoundRoundedPoints = this.calculateRoundedPoints(breakdown);
    this.lastRoundBreakdown = breakdown;

    this.totalScores[0] += this.lastRoundRoundedPoints[0];
    this.totalScores[1] += this.lastRoundRoundedPoints[1];

    // Show the full score panel; the next deal starts when the user continues
    this.phase = GAME_PHASES.SCORING;

    if (this.totalScores[0] >= WINNING_SCORE || this.totalScores[1] >= WINNING_SCORE) {
      this.winner = this.totalScores[0] >= WINNING_SCORE ? 0 : 1;
      this.phase = GAME_PHASES.FINISHED;
    }
  }

  // Turns this round's raw points into game points (tens), applying doubling,
  // hanging points and rounding. Updates hangingPoints and breakdown[*].hangingPoints.
  calculateRoundedPoints(breakdown) {
    const contractTeam = this.players[this.bids.find(b => b.bid === this.contract).playerId].team;
    const opponentTeam = 1 - contractTeam;
    const contractPoints = this.currentRoundScore[contractTeam];
    const opponentPoints = this.currentRoundScore[opponentTeam];
    const previousHangingPoints = this.hangingPoints;
    const isHanging = contractPoints === opponentPoints;
    const totalRounded = Math.round((contractPoints + opponentPoints) / 10);

    // In a hanging round the opponents still take their half now
    const roundWinner = contractPoints > opponentPoints ? contractTeam : opponentTeam;
    // Hanging cancels doubling; otherwise double/redouble apply (valat included, per belot.bg)
    const multiplier = isHanging ? 1 : (this.redouble ? 4 : (this.double ? 2 : 1));
    const winnerTakesAll = this.double || this.redouble || contractPoints < opponentPoints;

    const rounded = [0, 0];
    if (winnerTakesAll) {
      rounded[roundWinner] = totalRounded * multiplier;
      this.hangingPoints = 0;
    } else if (isHanging) {
      // Contract team's half hangs until the next round; opponents take their half now
      this.hangingPoints = totalRounded / 2;
      rounded[opponentTeam] = this.hangingPoints;
    } else {
      roundSplitPoints(rounded, this.contract, contractTeam, this.currentRoundScore, totalRounded);
      this.hangingPoints = 0;
    }

    // Points left hanging from the previous round go to this round's winner
    rounded[roundWinner] += previousHangingPoints;
    breakdown[roundWinner].hangingPoints = previousHangingPoints * 10;

    return rounded;
  }
}

// Splits a normal (not doubled, not lost, not hanging) round into game points.
// The opponents' points are rounded and the contract team gets the rest, so the
// two always add up to the rounded total, e.g. 85 + 77 = 162 gives 8 + 8 = 16.
// The opponents' rounding threshold differs by contract: in a suit contract their
// 5 rounds down and 6 rounds up (75 -> 7, 76 -> 8); in all-trump their 4 already
// rounds up (74 -> 8). No-trump rounds each team's points on their own.
function roundSplitPoints(rounded, contract, contractTeam, roundScore, totalRounded) {
  const opponentTeam = 1 - contractTeam;
  if (contract === 'no-trump') {
    rounded[0] = Math.round(roundScore[0] / 10);
    rounded[1] = Math.round(roundScore[1] / 10);
    return;
  }
  const offset = contract === 'all-trump' ? 1 : -1;
  rounded[opponentTeam] = Math.round((roundScore[opponentTeam] + offset) / 10);
  rounded[contractTeam] = totalRounded - rounded[opponentTeam];
}

const SEQUENCE_TYPE_ORDER = { tierce: 1, quarte: 2, quint: 3 };
const isSequence = combo => combo.type in SEQUENCE_TYPE_ORDER;

// Highest card of a sequence, as an index into SEQUENCE_ORDER (7 = 0 ... A = 7)
function highestSequenceRank(cards) {
  return Math.max(-1, ...(cards || []).map(card => SEQUENCE_ORDER.indexOf(card.rank)));
}

// Positive if sequence a beats b: longer type wins, then higher top card
function compareSequences(a, b) {
  return (SEQUENCE_TYPE_ORDER[a.type] - SEQUENCE_TYPE_ORDER[b.type])
    || (highestSequenceRank(a.cards) - highestSequenceRank(b.cards));
}

// Which team's announcements of one kind count: the team holding the single best one.
// Returns null when neither team has one, or when the two best are equal (both drop).
function winningTeam(combinations, isKind, compare) {
  const best = combinations.map(combos => combos.filter(isKind)
    .reduce((top, c) => (top === null || compare(c, top) > 0 ? c : top), null));
  if (!best[0] || !best[1]) {
    return best[0] ? 0 : (best[1] ? 1 : null);
  }
  const result = compare(best[0], best[1]);
  return result > 0 ? 0 : (result < 0 ? 1 : null);
}

// Marks each announced combination valid or canceled and returns the points per team.
// Belot always counts. Sequences and four-of-a-kinds are compared separately: only the
// team with the best one of each kind scores that kind (all of its announcements of it).
function scoreCombinations(announcedCombinations) {
  const sequenceWinner = winningTeam(announcedCombinations, isSequence, compareSequences);
  const equalWinner = winningTeam(announcedCombinations, c => c.type === 'equal', (a, b) => a.points - b.points);

  return announcedCombinations.map((combos, team) => {
    let points = 0;
    for (const combo of combos) {
      if (isSequence(combo)) {
        combo.valid = sequenceWinner === team;
      } else if (combo.type === 'equal') {
        combo.valid = equalWinner === team;
      } else {
        combo.valid = true;
      }
      if (combo.valid) points += combo.points;
    }
    return points;
  });
}
