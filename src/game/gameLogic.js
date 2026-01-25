import { createDeck } from './cards';
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
    this.dealer = 0;
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
    this.lastRoundScore = [0, 0]; // Points from last completed round (for display)
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
    this.currentBidder = (this.dealer + 3) % 4; // Counter-clockwise
    // Clear round variables for next round
    this.bids = [];
    this.tricks = [];
    this.currentTrick = { cards: [], winner: null, team: null };
    this.currentBidder = 0;
    this.contract = null;
    this.trumpSuit = null;
    this.double = false;
    this.redouble = false;
    this.announcedCombinations = [[], []];
    this.winner = null;
    // Reset round scores for new round
    this.currentRoundScore = [0, 0];
    // Clear last round scores when starting new deal
    this.lastRoundScore = [0, 0];
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
    this.currentBidder = (this.currentBidder + 3) % 4; // Counter-clockwise
    return true;
  }
  

  checkIsBiddingOver() {
    // Check if bidding is over (3 consecutive passes after valid bid)
    const validBid = [...this.bids].reverse().find(b => b.bid !== 'pass' && b.bid !== 'double' && b.bid !== 'redouble');
    if (validBid) {
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
        this.currentPlayer = (this.dealer + 3) % 4; // Counter-clockwise
      } 
    } else {
      const lastFour = this.bids.slice(-4);
      if (lastFour.length === 4 && lastFour.every(b => b.bid === 'pass')) {
        // All passed - redeal
        this.dealer = (this.dealer + 3) % 4;
        this.deal();   
      }     
    }
  }

  playCard(playerId, cardId) {
    if (playerId !== this.currentPlayer) return false;
    if (this.phase !== GAME_PHASES.PLAYING) return false;
    
    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = player.hand[cardIndex];
    
    // Validate card play
    if (!this.isValidCardPlay(player, card)) return false;
    
    // Check for belot when Q or K is played (before removing card from hand)
    if (this.contract && (card.rank === 'Q' || card.rank === 'K')) {
      const belot = findBelotOnPlay(this.contract, card, player.hand);
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
      const allCombos = getAllCombinations(player.hand, this.trumpSuit);
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
      // If trick is complete, determine winner
      const winner = this.determineTrickWinner();
      this.currentTrick.winner = winner.playerId;
      this.currentTrick.team = this.players[winner.playerId].team;
    }
    return true;
  }

  // Should be called from the app after the animation to holders is complete
  completeTrick() {
    // Winner was already determined in playCard() and stored in currentTrick
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
    const opponentHasHighest = this.opponentHasHighestCard();
    
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
    
    // If opponents have the highest card and player has trump, must play trump
    if (opponentHasHighest) {
      const hasTrump = player.hand.some(c => c.suit === this.trumpSuit);
      if (hasTrump) {
        return card.suit === this.trumpSuit;
      }
    }
    
    // Otherwise, can play any card
    return true;
  }

  opponentHasHighestCard() {
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
    
    return this.players[highestPlayer].team !== this.players[this.currentPlayer].team;
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
    // Add last 10 points - get winner from the last trick
    const lastTrick = this.tricks[this.tricks.length - 1];
    if (lastTrick && lastTrick.winner !== null && lastTrick.winner !== undefined) {
      this.currentRoundScore[this.players[lastTrick.winner].team] += 10;
    }

    // Calculate breakdown - card points are already in roundScore
    const breakdown = [
      { cardPoints: this.currentRoundScore[0], combinationPoints: 0, valatPoints: 0 },
      { cardPoints: this.currentRoundScore[1], combinationPoints: 0, valatPoints: 0 }
    ];
        
    if (this.contract === 'no-trump') {
      // Double points in no-trump
      this.currentRoundScore[0] *= 2;
      this.currentRoundScore[1] *= 2;
      breakdown[0].cardPoints *= 2;
      breakdown[1].cardPoints *= 2;
    }
        
    let isValat = false;
    // Check for valat (winning all tricks)
    if (this.tricks.every(t => {return t.team === 0; })) {
      this.currentRoundScore[0] += 90;
      breakdown[0].valatPoints = 90;
      isValat = true;
    } else if (this.tricks.every(t => {return t.team === 1; })) {
      this.currentRoundScore[1] += 90;
      breakdown[1].valatPoints = 90;
      isValat = true;
    }
    
    // Add combination points
    this.announcedCombinations.forEach((combos, team) => {
      let comboPoints = 0;
      combos.forEach(combo => {
        comboPoints += combo.points;
        this.currentRoundScore[team] += combo.points;
      });
      breakdown[team].combinationPoints = comboPoints;
    });
    
    // Store original round scores and breakdown for display
    this.lastRoundScore = [...this.currentRoundScore];
    this.lastRoundBreakdown = breakdown;
    
    // Calculate rounded points for this round
    const contractTeam = this.players[this.bids.find(b => b.bid === this.contract).playerId].team;
    const contractPoints = this.currentRoundScore[contractTeam];
    const opponentPoints = this.currentRoundScore[1 - contractTeam];

    // Check if it's a hanging situation (equal points)
    const isHanging = contractPoints === opponentPoints;

    // Multiplier is only applied if game is doubled/redoubled AND not valat AND not hanging
    let multiplier = 1;
    if (this.redouble && !isValat && !isHanging) multiplier = 4;
    else if (this.double && !isValat && !isHanging) multiplier = 2;

    // Initialize rounded points array
    this.lastRoundRoundedPoints = [0, 0];

    if (contractPoints > opponentPoints) {
      if (!this.double && !this.redouble) {
        // Outside - both teams get their points
        this.lastRoundRoundedPoints[0] = Math.round(this.currentRoundScore[0] / 10);
        this.lastRoundRoundedPoints[1] = Math.round(this.currentRoundScore[1] / 10);

        // Round to the smaller
        if (this.contract === 'all-trump' && opponentPoints%10 === 4) {
          // The team with less points (opponent) gets an additional point
          this.lastRoundRoundedPoints[1 - contractTeam] += 1;
        } else if (this.contract !== 'no-trump' && opponentPoints%10 === 6) {
          // Contract team gets rounded down, opponent gets rounded up
          // This ensures total rounded points match total round points / 10
          this.lastRoundRoundedPoints[contractTeam] -= 1;
        }
      } else {
        // Doubled or redoubled - winner takes it all
        const totalPoints = contractPoints + opponentPoints;            
        this.lastRoundRoundedPoints[contractTeam] = Math.round(totalPoints * multiplier / 10);
      }

      // Add previously hanging points
      if (this.hangingPoints > 0) { 
        this.lastRoundRoundedPoints[0] += this.hangingPoints;
        this.hangingPoints = 0;
      }      
    } else if (contractPoints < opponentPoints) {
      // Opponent takes it all
      const totalPoints = this.currentRoundScore[0] + this.currentRoundScore[1];            
      this.lastRoundRoundedPoints[1-contractTeam] = Math.round(totalPoints * multiplier / 10);

      // Add previously hanging points
      if (this.hangingPoints > 0) { 
        this.lastRoundRoundedPoints[1 - contractTeam] += this.hangingPoints;
        this.hangingPoints = 0;
      }      
    } else {
      // Add previously hanging points
      if (this.hangingPoints > 0) { 
        this.lastRoundRoundedPoints[1 - contractTeam] += this.hangingPoints;
        this.hangingPoints = 0;
      }

      // Equal points - Hanging situation
      // Contract team does not receive any points (their rounded points become hanging)
      // Opponent team gets their points as usual
      // Calculate rounded points for both teams (normal rounding)
      this.lastRoundRoundedPoints[0] = Math.round(this.currentRoundScore[0] / 10);
      this.lastRoundRoundedPoints[1] = Math.round(this.currentRoundScore[1] / 10);

      // Apply rounding adjustments if needed (same as outside case)
      if (this.contract === 'all-trump' && opponentPoints%10 === 4) {
        // The team with less points (opponent) gets an additional point
        this.lastRoundRoundedPoints[1 - contractTeam] += 1;
      } else if (this.contract !== 'no-trump' && opponentPoints%10 === 6) {
        // Contract team gets rounded down, opponent gets rounded up
        this.lastRoundRoundedPoints[contractTeam] -= 1;
      }

      // Contract team's rounded points become hanging (they don't get added to totalScores)
      // Store the contract team's rounded points as hanging points
      this.hangingPoints = this.lastRoundRoundedPoints[contractTeam];
      
      // Contract team gets 0 points this round (their points are hanging)
      this.lastRoundRoundedPoints[contractTeam] = 0;
      
      // Opponent team keeps their rounded points (already calculated above)
    }

    // Add rounded points to total scores
    this.totalScores[0] += this.lastRoundRoundedPoints[0];
    this.totalScores[1] += this.lastRoundRoundedPoints[1];
    
    // Set phase to SCORING to show full score panel
    this.phase = GAME_PHASES.SCORING;
    
    // Check for game end
    if (this.totalScores[0] >= 151 || this.totalScores[1] >= 151) {
      this.winner = this.totalScores[0] >= 151 ? 0 : 1;
      this.phase = GAME_PHASES.FINISHED;
    }
    // Note: New round will start when user clicks or after delay
  }
}

