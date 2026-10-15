import { Card, createDeck, SEQUENCE_ORDER } from './cards';
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

// A score breakdown with nothing in it, one per team
const emptyBreakdown = () => [0, 1].map(() => ({ cardPoints: 0, combinationPoints: 0, valatPoints: 0 }));

// The last real contract bid (not pass, double or redouble), or undefined
export function lastContractBid(bids) {
  return bids.findLast(b => b.bid in CONTRACT_RANK);
}
const WINNING_SCORE = 151;
const SAVE_VERSION = 1; // Bump when the saved game's shape changes, so old saves are ignored

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
      { id: 0, hand: [], team: 0 },
      { id: 1, hand: [], team: 1 },
      { id: 2, hand: [], team: 0 },
      { id: 3, hand: [], team: 1 }
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
    this.lastRoundBreakdown = emptyBreakdown(); // Breakdown of last round points
    this.lastRoundRoundedPoints = [0, 0]; // Rounded points added to scores from last round
    this.hangingPoints = 0; // Points hanging from last round
    this.announcedCombinations = [[], []]; // Team combinations
    this.lastPlayAnnouncements = []; // What the last played card announced
    this.dealHistory = []; // One entry per finished deal, for the score sheet
    this.allPassed = false; // The last deal was thrown in because all four passed
    this.winner = null;
  }

  // A copy for the next React state. Everything that gets mutated (players, hands,
  // tricks, scores, announcements) is copied, so the old state is never changed.
  // Cards and bids are never mutated, so they stay shared.
  clone() {
    const copy = Object.assign(new BelotGame(), this);
    copy.deck = [...this.deck];
    copy.players = this.players.map(player => ({ ...player, hand: [...player.hand] }));
    copy.bids = [...this.bids];
    copy.currentTrick = { ...this.currentTrick, cards: [...this.currentTrick.cards] };
    copy.tricks = this.tricks.map(trick => ({ ...trick, cards: [...trick.cards] }));
    copy.totalScores = [...this.totalScores];
    copy.currentRoundScore = [...this.currentRoundScore];
    copy.lastRoundBreakdown = this.lastRoundBreakdown.map(team => ({ ...team }));
    copy.lastRoundRoundedPoints = [...this.lastRoundRoundedPoints];
    copy.announcedCombinations = this.announcedCombinations.map(combos => combos.map(c => ({ ...c })));
    copy.dealHistory = [...this.dealHistory]; // Entries are never changed once added
    return copy;
  }

  // The whole game as JSON, to save it and pick it up again after a page reload
  serialize() {
    return JSON.stringify({ version: SAVE_VERSION, game: this });
  }

  // A game from serialize(), or null if the text isn't a saved game of this version.
  // Each card comes back as one Card per id, so a card in a hand, a trick and an
  // announcement is still the same object, as in the original game.
  static deserialize(text) {
    const cards = new Map();
    const data = JSON.parse(text, (key, value) => {
      if (value && typeof value === 'object' && 'suit' in value && 'rank' in value && 'id' in value) {
        if (!cards.has(value.id)) cards.set(value.id, new Card(value.suit, value.rank));
        return cards.get(value.id);
      }
      return value;
    });
    if (!data || data.version !== SAVE_VERSION || !data.game) return null; // Not a save we can read
    return Object.assign(new BelotGame(), data.game);
  }

  deal() {
    this.deck = createDeck();
    this.players.forEach(player => player.hand = []);
    
    this.dealCards(3); // Deal 3 cards to each player
    this.dealCards(2); // Deal 2 more cards to each player
    this.allPassed = false;
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
    this.lastPlayAnnouncements = [];
    this.winner = null;
    // Reset round scores for new round
    this.currentRoundScore = [0, 0];
    // Clear last round breakdown when starting new deal
    this.lastRoundBreakdown = emptyBreakdown();
    // Clear last round rounded points when starting new deal
    this.lastRoundRoundedPoints = [0, 0];
  }

  // Deals `count` more cards to each player, one at a time
  dealCards(count) {
    for (let i = 0; i < count * this.players.length && this.deck.length > 0; i++) {
      this.players[i % this.players.length].hand.push(this.deck.pop());
    }
  }

  makeBid(playerId, bid) {
    if (playerId !== this.currentBidder) return false; // Not this player's turn to bid

    if (bid === 'double') {
      // Only an opponent of the contract team can double, and only once
      if (!this.canDouble(playerId)) return false;
      this.double = true;
    } else if (bid === 'redouble') {
      // Only the doubled contract team can redouble, and only once
      if (!this.canRedouble(playerId)) return false;
      this.redouble = true;
    } else if (bid !== 'pass') {
      if (!(bid in CONTRACT_RANK)) return false; // Not a known contract
      const last = lastContractBid(this.bids);
      if (last && CONTRACT_RANK[bid] <= CONTRACT_RANK[last.bid]) {
        return false; // A new contract must outrank the last one (a double doesn't change that)
      }
      // A new contract starts fresh: any double or redouble is wiped out
      this.double = false;
      this.redouble = false;
    }
    // A pass is always allowed

    this.bids.push({ playerId, bid });
    this.checkIsBiddingOver();
    return true;
  }

  // Team holding the current (or final) contract, or null before anyone bids
  contractTeam() {
    const last = lastContractBid(this.bids);
    return last ? this.players[last.playerId].team : null;
  }

  canDouble(playerId) {
    const team = this.contractTeam();
    if (team === null) return false; // No contract to double yet
    if (team === this.players[playerId].team) return false; // Cannot double your own team's contract
    if (this.double) return false; // Already doubled (a redouble is the contract team's answer)
    return true; // An opponent may double
  }

  canRedouble(playerId) {
    if (!this.double) return false; // Nothing to redouble until the contract is doubled
    if (this.redouble) return false; // Already redoubled
    if (this.contractTeam() !== this.players[playerId].team) return false; // Only the contract team can redouble
    return true; // The doubled contract team may redouble, at any later turn in the bidding
  }

  checkIsBiddingOver() {
    const validBid = lastContractBid(this.bids);
    if (validBid) {
      // If valid bid, check if bidding is over (3 consecutive passes after valid bid)
      const lastThree = this.bids.slice(-3);
      if (lastThree.length === 3 && lastThree.every(b => b.bid === 'pass')) {
        this.contract = validBid.bid;
        if (this.contract !== 'no-trump' && this.contract !== 'all-trump') {
          this.trumpSuit = this.contract;
        }
        this.dealCards(3); // Deal remaining 3 cards
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
        this.allPassed = true; // So the table can say why the cards were dealt again
      } else {
        // Bidding is not over - update current bidder
        this.currentBidder = (this.currentBidder + 3) % 4; // Counter-clockwise
      }
    }
  }

  playCard(playerId, cardId) {
    if (playerId !== this.currentPlayer) return false;
    if (this.phase !== GAME_PHASES.PLAYING) return false;
    if (this.currentTrick.cards.length === 4) return false; // Trick is full until completeTrick() collects it
    
    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = player.hand[cardIndex];
    
    // Validate card play
    if (!this.isValidCardPlay(player, card)) return false;
    
    // What this card announces, for the scoring and for the UI's speech balloon
    const team = player.team;
    const announced = [];

    // Sequences and four of a kind are announced with the first card of the first trick.
    // A sequence already beaten by the opponents' announced longer one isn't declared.
    if (this.tricks.length === 0 && this.contract && this.contract !== 'no-trump') {
      const opponentCombos = this.announcedCombinations[1 - team];
      const opponentBest = Math.max(0, ...opponentCombos.filter(isSequence).map(c => SEQUENCE_TYPE_ORDER[c.type]));
      for (const combo of getAllCombinations(player.hand)) {
        if (!isSequence(combo) || SEQUENCE_TYPE_ORDER[combo.type] >= opponentBest) {
          announced.push({ ...combo, playerId });
        }
      }
    }

    // Belot is announced when its Q or K is played (checked before the card leaves the hand)
    if (this.contract && (card.rank === 'Q' || card.rank === 'K')) {
      const leadSuit = this.currentTrick.cards.length > 0 ? this.currentTrick.cards[0].card.suit : card.suit;
      const belot = findBelotOnPlay(this.contract, card, player.hand, leadSuit);
      if (belot) {
        announced.push({ ...belot, playerId });
      }
    }

    this.announcedCombinations[team].push(...announced);
    this.lastPlayAnnouncements = announced;

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
    
    const leadSuit = this.currentTrick.cards[0].card.suit;
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    
    if (this.contract === 'all-trump') {
      // All-trump: all colors are trump colors
      // If player doesn't have the lead suit, they can play any card
      if (!hasLeadSuit) {
        return true;
      }
      
      // Must follow suit (playing cards of the same color is mandatory)
      if (card.suit !== leadSuit) return false;
      
      // Raising is mandatory: must play a higher card of the lead suit if available.
      // This applies regardless of which team has the highest card
      const higherCards = this.higherCardsInHand(player, leadSuit);
      return higherCards.length === 0 || higherCards.includes(card);
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
        const higherTrumps = this.higherCardsInHand(player, this.trumpSuit);
        return higherTrumps.length === 0 || higherTrumps.includes(card); // Must play a higher trump if available
      }
      
      return true; // Following a non-trump suit: any card of it
    }
    
    // Don't have lead suit
    // Partner holds the trick: no obligation to trump or overtrump
    if (!this.opponentHasHighestCard(player)) return true;
    
    // If opponents played a trump card, must play a higher trump if available;
    // without a higher trump, can play any card
    const isOpponent = playerId => this.players[playerId].team !== player.team;
    if (this.highestRankInTrick(this.trumpSuit, isOpponent) !== Infinity) {
      const higherTrumps = this.higherCardsInHand(player, this.trumpSuit, isOpponent);
      return higherTrumps.length === 0 || higherTrumps.includes(card);
    }
    
    // Opponents have the highest card: if player has trump, must play trump
    const hasTrump = player.hand.some(c => c.suit === this.trumpSuit);
    if (hasTrump) {
      return card.suit === this.trumpSuit;
    }
    
    // Otherwise, can play any card
    return true;
  }

  // Rank (lower is stronger, as in getRanking) of the strongest card of `suit` in the
  // current trick among the players picked by `include`, or Infinity if there is none
  highestRankInTrick(suit, include = () => true) {
    return Math.min(Infinity, ...this.currentTrick.cards
      .filter(({ playerId, card }) => card.suit === suit && include(playerId))
      .map(({ card }) => card.getRanking(this.contract)));
  }

  // The player's cards of `suit` that beat the strongest card of `suit` played so far
  // (by the players picked by `include`)
  higherCardsInHand(player, suit, include = () => true) {
    const highest = this.highestRankInTrick(suit, include);
    return player.hand.filter(c => c.suit === suit && c.getRanking(this.contract) < highest);
  }

  opponentHasHighestCard(player = this.players[this.currentPlayer]) {
    const winner = this.determineTrickWinner();
    if (!winner) return false; // Nobody has played yet
    return this.players[winner.playerId].team !== player.team;
  }

  determineTrickWinner() {
    if (this.currentTrick.cards.length === 0) return null;
    
    let winner = this.currentTrick.cards[0];
    this.currentTrick.cards.forEach(p => {
      if (p.card.isHigherThan(winner.card, this.contract)) {
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

    // A line on the score sheet: who played what, and what each team got
    this.dealHistory.push({
      contract: this.contract,
      bidder: lastContractBid(this.bids)?.playerId ?? null,
      double: this.double,
      redouble: this.redouble,
      points: [...this.lastRoundRoundedPoints],
      hanging: this.hangingPoints, // Left hanging after this deal (0 if none)
      totals: [...this.totalScores]
    });

    // Show the full score panel; the next deal starts when the user continues
    this.phase = GAME_PHASES.SCORING;

    this.winner = this.gameWinner(valatTeam !== undefined);
    if (this.winner !== null) {
      this.phase = GAME_PHASES.FINISHED;
    }
  }

  // The game ends when a team has 151 or more after a deal (per belot.bg):
  // if both pass 151 the higher total wins, and an equal total keeps playing.
  // A game can't be won with a valat, so a valat deal never ends it.
  gameWinner(wasValat) {
    const [score0, score1] = this.totalScores;
    if (wasValat || Math.max(score0, score1) < WINNING_SCORE || score0 === score1) {
      return null;
    }
    return score0 > score1 ? 0 : 1;
  }

  // Turns this round's raw points into game points (tens), applying doubling,
  // hanging points and rounding. Updates hangingPoints and breakdown[*].hangingPoints.
  calculateRoundedPoints(breakdown) {
    const contractTeam = this.contractTeam();
    const opponentTeam = 1 - contractTeam;
    const contractPoints = this.currentRoundScore[contractTeam];
    const opponentPoints = this.currentRoundScore[opponentTeam];
    const previousHangingPoints = this.hangingPoints;
    const isHanging = contractPoints === opponentPoints;
    const totalRounded = Math.round((contractPoints + opponentPoints) / 10);
    // Double/redouble apply to everything, valat included (per belot.bg)
    const multiplier = this.redouble ? 4 : (this.double ? 2 : 1);

    const rounded = [0, 0];
    if (isHanging && multiplier > 1) {
      // Doubled tie: all points, doubled or quadrupled, hang for the next deal's winner
      this.hangingPoints = previousHangingPoints + totalRounded * multiplier;
      return rounded;
    }
    if (isHanging) {
      // Tie: the contract team's half hangs, the opponents take their half now.
      // The halves add up to the deal's total, with the odd point going to the
      // opponents (106 : 106 is 21 in all, so 11 now and 10 hanging).
      const hanging = Math.floor(totalRounded / 2);
      rounded[opponentTeam] = totalRounded - hanging;
      this.hangingPoints = previousHangingPoints + hanging; // Hanging points stack up over tied deals
      return rounded;
    }

    const roundWinner = contractPoints > opponentPoints ? contractTeam : opponentTeam;
    if (multiplier > 1 || contractPoints < opponentPoints) {
      // Doubled, or the contract team is "inside": the winner takes all the points
      rounded[roundWinner] = totalRounded * multiplier;
    } else {
      roundSplitPoints(rounded, this.contract, contractTeam, this.currentRoundScore, totalRounded);
    }

    // Points left hanging from earlier deals go to this deal's winner
    this.hangingPoints = 0;
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

// Positive if four of a kind a beats b: more points wins (J, then 9, then the 100s),
// and between two 100s the higher rank wins (A, K, Q, 10), per the owner's rule
function compareEquals(a, b) {
  return (a.points - b.points)
    || (SEQUENCE_ORDER.indexOf(a.cards[0].rank) - SEQUENCE_ORDER.indexOf(b.cards[0].rank));
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
  const equalWinner = winningTeam(announcedCombinations, c => c.type === 'equal', compareEquals);

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
