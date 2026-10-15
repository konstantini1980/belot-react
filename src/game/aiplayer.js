
/* 1. Card Evaluation Rules

    1.1. Rank Proximity Rule: Calculate the "distance" (the number of missing ranks) between the current highest-ranking card in the game and the card being evaluated (e.g., 10 to K = 1; 10 to Q = 2; K to 7 = 3).

        This distance must be greater than or equal to the number of remaining cards the player holds in that suit.

        A higher number of remaining cards leads to a higher positive score.

        If the number of remaining cards is less than the distance, the card receives a score of 0.

    1.2. Declarer/Opponent Rule: Points are added or subtracted if the card belongs to a suit declared by the partner or an opponent.

    1.3. Priority: Rule 1.1 carries more weight (priority) than Rule 1.2.

2. Card Selection

2.1. If leading the trick (playing the first card):

    2.1.1. If there is a card with a score > 0 (based on rules 1.1 and 1.2):

        2.1.1.1. If the highest-scoring card is also the current strongest card in the game, play it.

        2.1.1.2. If it is not the strongest card, play the weakest card of that same suit.

    2.1.2. If all cards have a score ≤ 0, play any card.

2.2. If following a trick (not the first card):

    2.2.1. If you hold the current strongest card in the requested suit, play it. (Note: If the suit has been trumped by an opponent, the "strongest card" is determined from the trump suit).

    2.2.2. If you do not hold the current strongest card in the requested suit:

        2.2.2.1. If you have a suit where all cards have 0 points per Rule 1.1:

            2.2.2.1.1. If the partner has played the winning card, play the card that has 0 points (Rule 1.1) and the highest game-point value (discarding points to your partner).

            2.2.2.1.2. If the partner has not played the winning card, play a card that has ≤ 0 points (Rules 1.1 and 1.2) and the lowest game-point value.

        2.2.2.2. If you do NOT have a suit where all cards have 0 points:

            2.2.2.2.1. If the partner has played the winning card, play the card with the lowest positive score (> 0) according to Rule 1.1.

            2.2.2.2.2. Same as Rule 2.2.2.1.2. */
            
import { rankingFor, SUITS } from './cards';
import { CONTRACT_RANK, lastContractBid } from './gameLogic';

// Hand strength needed to bid each kind of contract. Only the top 3 ranks count.
const MIN_FOR_TRUMP = 34;
const MIN_FOR_NOTRUMPS = 32;
const MIN_FOR_ALLTRUMPS = 60;
// How much stronger than a bid a hand must be to double or redouble
const DOUBLE_FACTOR = 1.25;

const isSuit = contract => SUITS.includes(contract);

function minToBid(contract) {
    if (contract === 'all-trump') return MIN_FOR_ALLTRUMPS;
    if (contract === 'no-trump') return MIN_FOR_NOTRUMPS;
    return MIN_FOR_TRUMP;
}

// Points of the hand's top-3-rank cards under a contract
function evaluateCardPoints(hand, contract) {
    return hand.reduce((total, card) => {
        const isTop3 = rankingFor(contract, card.suit).indexOf(card.rank) < 3;
        return isTop3 ? total + card.getValue(contract) : total;
    }, 0);
}

// Contracts this hand could play, preferred first: the strongest suit with
// at least three cards, then the other suits, then no-trump, then all-trump.
function playableContracts(hand) {
    const suits = SUITS
        .filter(suit => hand.filter(card => card.suit === suit).length > 2)
        .map(suit => ({ contract: suit, points: evaluateCardPoints(hand, suit) }))
        .filter(({ contract, points }) => points >= minToBid(contract))
        .sort((a, b) => b.points - a.points)
        .map(({ contract }) => contract);
    const others = ['no-trump', 'all-trump']
        .filter(contract => evaluateCardPoints(hand, contract) >= minToBid(contract));
    return [...suits, ...others];
}

// Make an AI bid: a contract, 'double', 'redouble' or 'pass'
export function makeAIBid(hand, bids = [], players = [], playerId = null) {
    const team = players[playerId]?.team;
    const last = lastContractBid(bids);
    const lastTeam = last ? players[last.playerId]?.team : null;
    const sinceLast = last ? bids.slice(bids.lastIndexOf(last) + 1) : [];
    const doubled = sinceLast.some(b => b.bid === 'double');
    const redoubled = sinceLast.some(b => b.bid === 'redouble');
    const outranks = contract => !last || CONTRACT_RANK[contract] > CONTRACT_RANK[last.bid];
    const strongIn = contract => evaluateCardPoints(hand, contract) >= minToBid(contract) * DOUBLE_FACTOR;

    if (last && lastTeam === team) {
        // Our team holds the contract: redouble a double we can beat
        if (doubled && !redoubled && strongIn(last.bid)) return 'redouble';
        // Raise a partner's suit to all-trump with a fair all-trump hand
        if (isSuit(last.bid) && last.playerId !== playerId &&
            evaluateCardPoints(hand, 'all-trump') >= MIN_FOR_ALLTRUMPS * 0.75) {
            return 'all-trump';
        }
        return 'pass';
    }

    // The opponents hold the contract: double it if we are strong in it
    if (last && !doubled && strongIn(last.bid)) return 'double';

    return playableContracts(hand).find(outranks) || 'pass';
}

// Helper: Get all cards that have been played (from tricks only, not current trick)
function getPlayedCards(game) {
    const played = [];
    // Add cards from completed tricks only
    game.tricks.forEach(trick => {
        trick.cards.forEach(({ card }) => played.push(card));
    });
    return played;
}

// Helper: Get all cards still in anyone's hand. Only the set is used, never who
// holds what, and the set is public: the deck minus every card already played.
function getRemainingCards(game) {
    const remaining = [];
    game.players.forEach(player => {
        player.hand.forEach(card => remaining.push(card));
    });
    return remaining;
}

// Helper: Get current hand (current trick cards)
function getCurrentHand(game) {
    return game.currentTrick.cards.map(({ card }) => card);
}

// Helper: Get the current max card in a color (from remaining cards and current hand)
function getCurrentMaxCardInColor(color, contract, trumpSuit, remainingCards, currentHand) {
    let maxCard = null;
    const rankingArray = rankingFor(contract, color);
    
    // Helper to compare cards
    const compareCards = (card1, card2) => {
        const rank1 = rankingArray.indexOf(card1.rank);
        const rank2 = rankingArray.indexOf(card2.rank);
        // Lower index = higher card
        return rank1 - rank2;
    };
    
    // Check remaining cards
    for (const card of remainingCards) {
        if (card.suit === color) {
            if (maxCard == null || compareCards(maxCard, card) > 0) {
                maxCard = card;
            }
        }
    }
    
    // Check current hand
    for (const card of currentHand) {
        if (card.suit === color) {
            if (maxCard == null || compareCards(maxCard, card) > 0) {
                maxCard = card;
            }
        }
    }
    
    return maxCard;
}

// Helper: Check if a card is the current max card in the playing color
function isCurrentMaxCardInPlayingColor(card, playingColor, contract, trumpSuit, remainingCards, currentHand) {
    if (card.suit !== playingColor) return false;
    
    const rankingArray = rankingFor(contract, playingColor);
    let foundBigger = false;
    
    // Helper to compare cards
    const compareCards = (card1, card2) => {
        const rank1 = rankingArray.indexOf(card1.rank);
        const rank2 = rankingArray.indexOf(card2.rank);
        // Lower index = higher card, so if card1 < card2 in ranking, card1 is bigger
        return rank1 - rank2;
    };
    
    // Check remaining cards
    for (const remCard of remainingCards) {
        if (remCard.suit === playingColor) {
            if (compareCards(card, remCard) > 0) {
                foundBigger = true;
                break;
            }
        }
    }
    
    if (!foundBigger) {
        // Check current hand
        for (const remCard of currentHand) {
            if (remCard.suit === playingColor) {
                if (compareCards(card, remCard) > 0) {
                    foundBigger = true;
                    break;
                }
            }
        }
    }
    
    return !foundBigger;
}

// Rule 1.1: Rank Proximity Rule (EvalutePointsOnRemaining) - Improved implementation
function evaluatePointsOnRemaining(card, contract, trumpSuit, remainingCards, currentHand, playerHand, playedCards) {
    // Get current max card in color
    const maxCard = getCurrentMaxCardInColor(card.suit, contract, trumpSuit, remainingCards, currentHand);
    if (!maxCard) return 0;
    
    // Calculate distance
    // Ranks between this card and the highest one still out in its suit
    const ranking = rankingFor(contract, card.suit);
    const distance = ranking.indexOf(card.rank) - ranking.indexOf(maxCard.rank);
    
    // Count remaining cards in suit (excluding target card)
    let remainingCardsInSuit = 0;
    for (const c of playerHand) {
        if (c.suit === card.suit && c.id !== card.id) {
            remainingCardsInSuit++;
        }
    }
    
    // Count passed cards (played cards in that suit)
    let passedCards = 0;
    for (const c of playedCards) {
        if (c.suit === card.suit) {
            passedCards++;
        }
    }
    
    // If not enough cards to cover distance, return 0
    if (remainingCardsInSuit < distance) {
        return 0;
    }
    
    // Base score incorporates card's intrinsic value
    const cardValue = card.getValue(contract);
    const baseScore = Math.max(10, cardValue * 2); // At least 10, scales with card value
    
    // Distance penalty: exponential decay (closer = much better)
    // distance 0 = no penalty, distance 1 = small penalty, distance 5+ = huge penalty
    const distancePenalty = distance === 0 ? 0 : Math.pow(2, distance - 1) * 5;
    
    // Bonus for being close to max (distance 0 or 1 gets big bonus)
    const proximityBonus = distance === 0 ? 50 : (distance === 1 ? 30 : 0);
    
    // Remaining cards bonus: more cards = more flexibility
    // But diminishing returns (logarithmic)
    const remainingBonus = Math.log(remainingCardsInSuit + 1) * 15;
    
    // Passed cards penalty: more passed = less chance, but not linear
    // Early passed cards matter less than recent ones
    const passedPenalty = passedCards * 3; // Reduced from linear 1:1
    
    // Calculate final score
    let points = baseScore + proximityBonus + remainingBonus - distancePenalty - passedPenalty;
    
    // Ensure non-negative (though 0 is already handled above)
    return Math.max(0, points);
}

// Rule 1.2 part 1: Partner Announce (EvalutePointsOnPartnerAnnounce)
function evaluatePointsOnPartnerAnnounce(card, bids, playerId, players) {
    const POINTS_TO_ADD = 10;
    let points = 0;
    
    const player = players[playerId];
    const partner = players.find(p => p.team === player.team && p.id !== playerId);
    
    if (!partner) return 0;
    
    // Check partner's bids during bidding phase
    if (bids && Array.isArray(bids)) {
        const partnerBids = bids.filter(b => b.playerId === partner.id && b.bid in CONTRACT_RANK);
        for (const bidObj of partnerBids) {
            const bidSuit = bidObj.bid;
            // Check if bid is a suit bid (clubs, diamonds, hearts, spades)
            if (isSuit(bidSuit)) {
                if (card.suit === bidSuit) {
                    points += POINTS_TO_ADD;
                }
            }
        }
        
        // Check opponent bids (punish playing cards in suits opponents bid)
        const opponentBids = bids.filter(b => {
            const bidder = players[b.playerId];
            return bidder && bidder.team !== player.team && b.bid in CONTRACT_RANK;
        });
        for (const bidObj of opponentBids) {
            const bidSuit = bidObj.bid;
            if (isSuit(bidSuit)) {
                if (card.suit === bidSuit) {
                    points -= POINTS_TO_ADD;
                }
            }
        }
    }
    
    return points;
}

// Rule 1.2 part 3: Eliminate Opponent Trumps (EvaluatePointsOnEliminatingOpponentTrumps)
function evaluatePointsOnEliminatingOpponentTrumps(card, game, playerId, playedCards, currentHand, playerHand) {
    const MAX_BONUS = 25; // Higher reward than regular trump color
    const trumpSuit = isSuit(game.contract) ? game.contract : null;
    
    // Only applies to trump suit contracts (not 'all-trump' or 'no-trump')
    if (!trumpSuit || card.suit !== trumpSuit) {
        return 0;
    }
    
    const contractTeam = game.contractTeam();
    const playerTeam = game.players[playerId].team;
    
    // Only reward if our team called the contract
    if (contractTeam !== playerTeam) return 0;
    
    // --- Inference (no peeking at opponent hands) ---
    // Total trumps in Belot deck (32 cards, 8 per suit)
    const TOTAL_TRUMPS = 8;
    
    // Visible trumps: already played tricks + cards in current trick (visible on table) + our own hand
    const playedTrumpCount = playedCards.filter(c => c.suit === trumpSuit).length;
    const currentTrickTrumpCount = currentHand.filter(c => c.suit === trumpSuit).length;
    const ourTrumpCount = playerHand.filter(c => c.suit === trumpSuit).length;
    
    const unseenTrumps = TOTAL_TRUMPS - playedTrumpCount - currentTrickTrumpCount - ourTrumpCount;
    if (unseenTrumps <= 0) return 0; // opponents cannot have any trumps left
    
    // Strong signal: if a player fails to follow on a trump-led trick, they have no trumps.
    // (We only use information from completed/current tricks, which is visible.)
    const opponents = game.players.filter(p => p.team !== playerTeam).map(p => p.id);
    const opponentOutOfTrumps = new Set();
    
    const considerTrick = (trickCards) => {
        if (!trickCards || trickCards.length === 0) return;
        const leadSuit = trickCards[0].card.suit;
        if (leadSuit !== trumpSuit) return;
        
        for (const { playerId: pid, card: c } of trickCards) {
            if (pid == null) continue;
            if (game.players[pid]?.team === playerTeam) continue;
            if (c.suit !== trumpSuit) opponentOutOfTrumps.add(pid);
        }
    };
    
    for (const trick of game.tricks) {
        considerTrick(trick.cards);
    }
    considerTrick(game.currentTrick.cards);
    
    const opponentsPossiblyHaveTrumps = opponents.filter(pid => !opponentOutOfTrumps.has(pid));
    if (opponentsPossiblyHaveTrumps.length === 0) return 0;
    
    // Likelihood heuristic:
    // - More unseen trumps => more likely opponents still have trumps
    // - Fewer opponents "possibly having" trumps => higher concentration => more likely they still have them
    // Clamp to [0, 1] and convert to a bonus.
    const denom = Math.max(1, opponentsPossiblyHaveTrumps.length * 3); // 3 is a soft scaling factor
    const likelihood = Math.max(0, Math.min(1, unseenTrumps / denom));
    
    return Math.max(1, Math.round(MAX_BONUS * likelihood));
}

// Helper: Get the biggest card in the current trick
function getBiggestCardInTrick(game) {
    if (game.currentTrick.cards.length === 0) return null;
    
    let biggest = game.currentTrick.cards[0];
    game.currentTrick.cards.forEach(({ playerId, card }) => {
        if (card.isHigherThan(biggest.card, game.contract, game.trumpSuit)) {
            biggest = { playerId, card };
        }
    });
    
    return biggest;
}

// Helper: Get partner player
function getPartner(game, playerId) {
    const playerTeam = game.players[playerId].team;
    return game.players.find(p => p.team === playerTeam && p.id !== playerId);
}

// Helper: Find zero-evaluated colors (suits where all cards have 0 points per Rule 1.1)
function findZeroEvaluatedColor(validCards, contract, trumpSuit, remainingCards, currentHand, playerHand, playedCards) {
    const zeroEvaluatedColors = [];
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    
    for (const suit of suits) {
        let suitCount = 0;
        let zeroEvaluatedSuitCount = 0;
        
        for (const card of validCards) {
            if (card.suit === suit) {
                suitCount++;
                const points = evaluatePointsOnRemaining(card, contract, trumpSuit, remainingCards, currentHand, playerHand, playedCards);
                if (points === 0) {
                    zeroEvaluatedSuitCount++;
                }
            }
        }
        
        if (zeroEvaluatedSuitCount === suitCount && suitCount !== 0) {
            zeroEvaluatedColors.push(suit);
        }
    }
    
    return zeroEvaluatedColors.length !== 0 ? zeroEvaluatedColors : null;
}

// Helper: Get the requested suit (lead suit or trump if trumped)
function getRequestedSuit(game) {
    if (game.currentTrick.cards.length === 0) return null;
    
    const leadCard = game.currentTrick.cards[0].card;
    const leadSuit = leadCard.suit;
    
    // Check if suit was trumped
    const hasTrump = game.currentTrick.cards.some(({ card }) => 
        card.suit === game.trumpSuit && card.suit !== leadSuit
    );
    
    if (hasTrump && game.trumpSuit) {
        return game.trumpSuit;
    }
    
    return leadSuit;
}

// Main function: Make AI play a card
export function makeAIPlayCard(game, playerId) {
    const player = game.players[playerId];
    const playerHand = player.hand;
    
    // Get valid cards (playable according to game rules)
    const validCards = playerHand.filter(card => {
        return game.isValidCardPlay(player, card);
    });
    
    if (validCards.length === 0) {
        return null; // Should not happen, but safety check
    }
    
    const playedCards = getPlayedCards(game);
    const remainingCards = getRemainingCards(game);
    const currentHand = getCurrentHand(game);
    const isLeading = game.currentTrick.cards.length === 0;
    
    let selectedCard = null;
    
    if (isLeading) {
        // 2.1: Leading the trick
        let maxEvaluated = 0;
        let maxEvaluatedCard = null;
        
        // Evaluate all valid cards
        for (const card of validCards) {
            const points = evaluatePointsOnRemaining(card, game.contract, game.trumpSuit, remainingCards, currentHand, playerHand, playedCards);
            const pointsOnPartnerAnnounce = evaluatePointsOnPartnerAnnounce(card, game.bids, playerId, game.players);
            const pointsOnEliminatingOpponentTrumps = evaluatePointsOnEliminatingOpponentTrumps(card, game, playerId, playedCards, currentHand, playerHand);
            const totalPoints = points + pointsOnPartnerAnnounce + pointsOnEliminatingOpponentTrumps;
            
            if (totalPoints > maxEvaluated) {
                maxEvaluated = totalPoints;
                maxEvaluatedCard = card;
            }
        }
        
        if (maxEvaluatedCard != null) {
            // 2.1.1
            if (isCurrentMaxCardInPlayingColor(maxEvaluatedCard, maxEvaluatedCard.suit, game.contract, game.trumpSuit, remainingCards, currentHand)) {
                // 2.1.1.1
                selectedCard = maxEvaluatedCard;
            } else {
                // 2.1.1.2
                let minPlayingPoints = 1000; // incorrect but big enough value
                let minPlayingPointsCard = null;
                
                for (const card of validCards) {
                    if (card.suit === maxEvaluatedCard.suit) {
                        const points = card.getValue(game.contract);
                        if (points < minPlayingPoints) {
                            minPlayingPoints = points;
                            minPlayingPointsCard = card;
                        }
                    }
                }
                
                selectedCard = minPlayingPointsCard;
            }
        } else {
            // 2.1.2
            // Play random card
            const randomIndex = Math.floor(Math.random() * validCards.length);
            selectedCard = validCards[randomIndex];
        }
    } else {
        // 2.2: Following a trick
        const playingColor = getRequestedSuit(game);
        
        // Find current max card in playing color
        let currentMaxCardInPlayingColor = null;
        for (const card of validCards) {
            if (card.suit === playingColor && isCurrentMaxCardInPlayingColor(card, playingColor, game.contract, game.trumpSuit, remainingCards, currentHand)) {
                currentMaxCardInPlayingColor = card;
                break;
            }
        }
        
        if (currentMaxCardInPlayingColor != null) {
            // 2.2.1
            selectedCard = currentMaxCardInPlayingColor;
        } else {
            // 2.2.2
            const zeroEvaluatedColors = findZeroEvaluatedColor(validCards, game.contract, game.trumpSuit, remainingCards, currentHand, playerHand, playedCards);
            
            if (zeroEvaluatedColors != null) {
                // 2.2.2.1
                const biggestCardInTrick = getBiggestCardInTrick(game);
                const partner = getPartner(game, playerId);
                const playerWhoPlayedBiggest = biggestCardInTrick?.playerId;
                
                if (biggestCardInTrick && 
                    isCurrentMaxCardInPlayingColor(biggestCardInTrick.card, playingColor, game.contract, game.trumpSuit, remainingCards, currentHand) &&
                    playerWhoPlayedBiggest === partner.id) {
                    // 2.2.2.1.1
                    let maxPlayingPoints = -100;
                    let maxPlayingPointsCard = null;
                    
                    for (const card of validCards) {
                        for (const color of zeroEvaluatedColors) {
                            if (card.suit === color) {
                                const points = card.getValue(game.contract);
                                if (points > maxPlayingPoints) {
                                    maxPlayingPoints = points;
                                    maxPlayingPointsCard = card;
                                }
                            }
                        }
                    }
                    
                    selectedCard = maxPlayingPointsCard;
                } else {
                    // 2.2.2.1.2
                    let minPlayingPoints = 1000; // incorrect but big enough value
                    let minPlayingPointsCard = null;
                    
                    for (const card of validCards) {
                        for (const color of zeroEvaluatedColors) {
                            if (card.suit === color) {
                                const points = card.getValue(game.contract);
                                if (points < minPlayingPoints) {
                                    minPlayingPoints = points;
                                    minPlayingPointsCard = card;
                                }
                            }
                        }
                    }
                    
                    selectedCard = minPlayingPointsCard;
                }
            } else {
                // 2.2.2.2
                const biggestCardInTrick = getBiggestCardInTrick(game);
                const partner = getPartner(game, playerId);
                const playerWhoPlayedBiggest = biggestCardInTrick?.playerId;
                
                if (biggestCardInTrick && 
                    isCurrentMaxCardInPlayingColor(biggestCardInTrick.card, playingColor, game.contract, game.trumpSuit, remainingCards, currentHand) &&
                    playerWhoPlayedBiggest === partner.id) {
                    // 2.2.2.2.1
                    let minEvaluated = 1000;
                    let minEvaluatedCard = null;
                    
                    for (const card of validCards) {
                        const pointsOnRemaining = evaluatePointsOnRemaining(card, game.contract, game.trumpSuit, remainingCards, currentHand, playerHand, playedCards);
                        // we are in case 2.2.2.2 so we know card evaluated >0 exists
                        if (pointsOnRemaining > 0 && pointsOnRemaining < minEvaluated) {
                            minEvaluated = pointsOnRemaining;
                            minEvaluatedCard = card;
                        }
                    }
                    
                    selectedCard = minEvaluatedCard;
                } else {
                    // 2.2.2.2.2
                    let minPlayingPoints = 1000; // incorrect but big enough value
                    let minOnRemainingPoints = 1000;
                    let minPlayingPointsCard = null;
                    let minOnRemainingCard = null;
                    
                    for (const card of validCards) {
                        const pointsOnRemaining = evaluatePointsOnRemaining(card, game.contract, game.trumpSuit, remainingCards, currentHand, playerHand, playedCards);
                        const pointsOnPartnerAnnounce = evaluatePointsOnPartnerAnnounce(card, game.bids, playerId, game.players);
                        const pointsOnEliminatingOpponentTrumps = evaluatePointsOnEliminatingOpponentTrumps(card, game, playerId, playedCards, currentHand, playerHand);
                        const totalOnRemaining = pointsOnRemaining + pointsOnPartnerAnnounce + pointsOnEliminatingOpponentTrumps;
                        
                        const points = card.getValue(game.contract);
                        if (points < minPlayingPoints) {
                            minPlayingPoints = points;
                            minPlayingPointsCard = card;
                        }
                        
                        // If we're trying to eliminate opponent trumps, prioritize trump cards even if they have slightly positive points
                        // Otherwise, prefer cards with totalOnRemaining <= 0
                        const isEliminatingTrump = pointsOnEliminatingOpponentTrumps > 0;
                        if ((totalOnRemaining <= 0 || isEliminatingTrump) && points < minOnRemainingPoints) {
                            minOnRemainingPoints = points;
                            minOnRemainingCard = card;
                        }
                    }
                    
                    if (minOnRemainingCard == null) {
                        selectedCard = minPlayingPointsCard;
                    } else {
                        selectedCard = minOnRemainingCard;
                    }
                }
            }
        }
    }
    
    // Debug assertion equivalent
    if (selectedCard == null) {
        // Fallback: play first valid card
        selectedCard = validCards[0];
    }
    
    return selectedCard;
}
