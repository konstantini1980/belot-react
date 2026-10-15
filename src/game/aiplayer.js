
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


// --- Card play ---

// Everything the play rules look at, worked out once per decision. Only public
// information is used: the AI's own hand, the cards played so far, and the set
// of cards still out (the deck minus every card played, never who holds which).
function playContext(game, playerId) {
    const hand = game.players[playerId].hand;
    const trickCards = game.currentTrick.cards.map(({ card }) => card);
    const stillOut = game.players.flatMap(player => player.hand);
    return {
        game,
        playerId,
        contract: game.contract,
        hand,
        playedCards: game.tricks.flatMap(trick => trick.cards.map(({ card }) => card)),
        trickCards,
        // Cards that could still beat a card of the same suit: still out, or on the table
        liveCards: [...stillOut, ...trickCards],
    };
}

// The first of the cards with the lowest (or highest) key; null for no cards
const minBy = (cards, key) => cards.reduce((best, card) => (best === null || key(card) < key(best) ? card : best), null);
const maxBy = (cards, key) => cards.reduce((best, card) => (best === null || key(card) > key(best) ? card : best), null);

// True if no live card of the card's suit is stronger: it is the top card of its suit now
function isTopCard(card, ctx) {
    const rank = card.getRanking(ctx.contract);
    return !ctx.liveCards.some(c => c.suit === card.suit && c.getRanking(ctx.contract) < rank);
}

// Rule 1.1: Rank Proximity Rule. 0 when the player hasn't enough cards in the suit
// to wait out the stronger cards still live; otherwise higher the closer the card
// is to the top of its suit and the more cards the player holds in it.
function evaluatePointsOnRemaining(card, ctx) {
    const maxCard = minBy(ctx.liveCards.filter(c => c.suit === card.suit), c => c.getRanking(ctx.contract));
    if (!maxCard) return 0;

    // Ranks between this card and the highest one still out in its suit
    const distance = card.getRanking(ctx.contract) - maxCard.getRanking(ctx.contract);
    const remainingCardsInSuit = ctx.hand.filter(c => c.suit === card.suit && c.id !== card.id).length;
    const passedCards = ctx.playedCards.filter(c => c.suit === card.suit).length;

    // If not enough cards to cover distance, return 0
    if (remainingCardsInSuit < distance) return 0;

    const baseScore = Math.max(10, card.getValue(ctx.contract) * 2); // At least 10, scales with card value
    const distancePenalty = distance === 0 ? 0 : Math.pow(2, distance - 1) * 5; // Closer is much better
    const proximityBonus = distance === 0 ? 50 : (distance === 1 ? 30 : 0); // Top or next to top
    const remainingBonus = Math.log(remainingCardsInSuit + 1) * 15; // More cards, more flexibility (diminishing)
    const passedPenalty = passedCards * 3; // The more of the suit is gone, the less it is worth

    return Math.max(0, baseScore + proximityBonus + remainingBonus - distancePenalty - passedPenalty);
}

// Rule 1.2: a suit the partner bid is worth playing (+10 per bid), a suit an
// opponent bid is not (-10 per bid)
function evaluatePointsOnBids(card, ctx) {
    const { game, playerId } = ctx;
    const team = game.players[playerId].team;
    return game.bids
        .filter(b => b.bid === card.suit && b.playerId !== playerId)
        .reduce((points, b) => points + (game.players[b.playerId].team === team ? 10 : -10), 0);
}

// Rule 1.2: the contract team draws out the opponents' trumps. A bonus for a trump
// while the opponents may still hold trumps, larger the more of them are unseen.
function evaluatePointsOnEliminatingOpponentTrumps(card, ctx) {
    const MAX_BONUS = 25; // Higher reward than regular trump color
    const { game, playerId } = ctx;
    const trumpSuit = isSuit(game.contract) ? game.contract : null;

    // Only applies to trump suit contracts (not 'all-trump' or 'no-trump')
    if (!trumpSuit || card.suit !== trumpSuit) return 0;

    // Only reward if our team called the contract
    const playerTeam = game.players[playerId].team;
    if (game.contractTeam() !== playerTeam) return 0;

    // Trumps not seen yet: 8 in the deck minus those played, on the table and in our hand
    const isTrump = c => c.suit === trumpSuit;
    const unseenTrumps = 8 - ctx.playedCards.filter(isTrump).length
        - ctx.trickCards.filter(isTrump).length - ctx.hand.filter(isTrump).length;
    if (unseenTrumps <= 0) return 0; // opponents cannot have any trumps left

    // An opponent who didn't follow a trump lead has no trumps left
    const opponentOutOfTrumps = new Set();
    for (const trickCards of [...game.tricks.map(trick => trick.cards), game.currentTrick.cards]) {
        if (trickCards.length === 0 || !isTrump(trickCards[0].card)) continue;
        for (const { playerId: pid, card: c } of trickCards) {
            if (game.players[pid].team !== playerTeam && !isTrump(c)) opponentOutOfTrumps.add(pid);
        }
    }
    const opponentsPossiblyHaveTrumps = game.players
        .filter(p => p.team !== playerTeam && !opponentOutOfTrumps.has(p.id)).length;
    if (opponentsPossiblyHaveTrumps === 0) return 0;

    // More unseen trumps, spread over fewer opponents, means they more likely still have some
    const likelihood = Math.max(0, Math.min(1, unseenTrumps / Math.max(1, opponentsPossiblyHaveTrumps * 3)));
    return Math.max(1, Math.round(MAX_BONUS * likelihood));
}

// Rules 1.1 and 1.2 together: how good a card is to lead
function evaluateCard(card, ctx) {
    return evaluatePointsOnRemaining(card, ctx) + evaluatePointsOnBids(card, ctx)
        + evaluatePointsOnEliminatingOpponentTrumps(card, ctx);
}

// The suit a card must beat to win the trick: trump once someone has trumped, else the lead suit
function getRequestedSuit(game) {
    const leadSuit = game.currentTrick.cards[0].card.suit;
    const trumped = game.trumpSuit && game.currentTrick.cards.some(({ card }) => card.suit === game.trumpSuit);
    return trumped ? game.trumpSuit : leadSuit;
}

// Helper: The card that costs least to give away. Keeps trumps over plain
// suits, then fewer card points, then the lower rank.
function getWeakestCard(cards, contract, trumpSuit) {
    const isTrump = card => contract === 'all-trump' || card.suit === trumpSuit;
    const cost = card => [
        isTrump(card) && contract !== 'all-trump' ? 1 : 0,
        card.getValue(contract),
        -card.getRanking(contract),
    ];
    return cards.reduce((weakest, card) => {
        const a = cost(card);
        const b = cost(weakest);
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return a[i] < b[i] ? card : weakest; // First criterion that differs decides
        }
        return weakest; // Same cost: keep the earlier card
    });
}

// Helper: Lead when no card is likely to win (rule 2.1.2). Play the weakest
// card of the longest plain suit: it keeps trumps and high cards for later and
// gives the partner a chance to take the trick with the top card of that suit.
function chooseFallbackLead(validCards, contract, trumpSuit) {
    const plainCards = validCards.filter(card => contract === 'all-trump' || card.suit !== trumpSuit);
    const pool = plainCards.length > 0 ? plainCards : validCards; // Lead a trump only when holding nothing else

    const bySuit = {};
    for (const card of pool) {
        (bySuit[card.suit] ??= []).push(card);
    }
    const suitPoints = cards => cards.reduce((sum, card) => sum + card.getValue(contract), 0);
    const longestSuit = Object.values(bySuit).reduce((best, cards) => {
        if (cards.length !== best.length) return cards.length > best.length ? cards : best; // Longer suit wins
        return suitPoints(cards) < suitPoints(best) ? cards : best; // Same length: risk fewer points
    });

    return getWeakestCard(longestSuit, contract, trumpSuit);
}

// 2.1: Leading the trick
function chooseLead(validCards, ctx) {
    const { game } = ctx;
    const best = maxBy(validCards.filter(card => evaluateCard(card, ctx) > 0), card => evaluateCard(card, ctx));
    if (!best) {
        return chooseFallbackLead(validCards, game.contract, game.trumpSuit); // 2.1.2
    }
    if (isTopCard(best, ctx)) {
        return best; // 2.1.1.1
    }
    return minBy(validCards.filter(card => card.suit === best.suit), card => card.getValue(game.contract)); // 2.1.1.2
}

// 2.2: Following a trick
function chooseFollow(validCards, ctx) {
    const { game, playerId } = ctx;
    const value = card => card.getValue(game.contract);
    const playingColor = getRequestedSuit(game);

    // 2.2.1
    const topCard = validCards.find(card => card.suit === playingColor && isTopCard(card, ctx));
    if (topCard) return topCard;

    // 2.2.2
    const winner = game.determineTrickWinner();
    const partnerWins = game.players[winner.playerId].team === game.players[playerId].team && isTopCard(winner.card, ctx);

    const zeroEvaluatedColors = SUITS.filter(suit => {
        const suitCards = validCards.filter(card => card.suit === suit);
        return suitCards.length > 0 && suitCards.every(card => evaluatePointsOnRemaining(card, ctx) === 0);
    });
    if (zeroEvaluatedColors.length > 0) {
        // 2.2.2.1
        const zeroCards = validCards.filter(card => zeroEvaluatedColors.includes(card.suit));
        return partnerWins
            ? maxBy(zeroCards, value)  // 2.2.2.1.1
            : minBy(zeroCards, value); // 2.2.2.1.2
    }

    // 2.2.2.2
    if (partnerWins) {
        // 2.2.2.2.1
        const positive = validCards.filter(card => evaluatePointsOnRemaining(card, ctx) > 0);
        return minBy(positive, card => evaluatePointsOnRemaining(card, ctx));
    }
    // 2.2.2.2.2: the cheapest card not worth keeping, or a trump while drawing out
    // the opponents' trumps; failing that, the cheapest card
    const expendable = validCards.filter(card =>
        evaluateCard(card, ctx) <= 0 || evaluatePointsOnEliminatingOpponentTrumps(card, ctx) > 0);
    return minBy(expendable, value) ?? minBy(validCards, value);
}

// Main function: Make AI play a card
export function makeAIPlayCard(game, playerId) {
    const player = game.players[playerId];
    const validCards = player.hand.filter(card => game.isValidCardPlay(player, card));
    if (validCards.length === 0) return null; // Should not happen, but safety check

    const ctx = playContext(game, playerId);
    const selected = game.currentTrick.cards.length === 0
        ? chooseLead(validCards, ctx)
        : chooseFollow(validCards, ctx);

    // Fallback: give away as little as possible
    return selected ?? getWeakestCard(validCards, game.contract, game.trumpSuit);
}
