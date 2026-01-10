/* Примерен алгоритъм за игра
    * 
    * 1. Правила за оценяване на карта
    * 
    * 1.1. Разстоянието ( броя на картите по сила - 10 до К = 1, 10 до Q = 2, К до 7 = 3 ) от текущо 
    * най-силната карта до оценяваната карта трябва да е >= на броя на оставащите карти на играча
    * в боята. Повече оставащи карти водят до по-голяма положителна оценка. Ако броят на оставащите
    * карти е < от разстоянието, картата получава оценка 0.
    * 
    * 1.2. Точки се прибавят/махат ако оценяваната карта е в цвят обявен от партньора/противника.
    * 
    * 1.3. Правило '1.1' е с по-голяма тежест от правило '1.2'.
    * 
    * 
    * 
    * 
    * 2. Избор на карта. 
    * 
    * 2.1. Ако е първа карта от взятка:
    * 
    * 2.1.1 Ако има карта с оценка по правила '1.1' и '1.2' по-голяма от 0
    * 
    * 2.1.1.1 Ако картата с най-висока оценка по правила '1.1' и '1.2' (>0) е най-силната карта за момента играем нея.
    * 
    * 2.1.1.2 Ако не е най-силната играем най-слабата от нейната боя
    * 
    * 2.1.2 Ако всички оценки са <= 0, играем коя да е карта.
    * 
    * 2.2. Ако не е първа карта от взятка:
    * 
    * 2.2.1. Ако имаме текущо най-силната карта в исканата боя, играем нея. ( ако боята е цакана 
    * от противника най-силната карта вече се търси от козовата боя )
    * 
    * 2.2.2. Ако нямаме текущо най-силната карта в исканата боя:
    * 
    * 2.2.2.1. Ако имаме боя, в която всички карти са с 0 точки по правило '1.1':
    * 
    * 2.2.2.1.1. Ако партньорът е играл най-силната карта даваме карта, която има 0 точки по правило '1.1'
    * и има най-много игрови точки.
    * 
    * 2.2.2.1.2. Ако партньорът не е играл най-силната карта даваме карта, която има <= 0 точки 
    * по правила '1.1' и '1.2' и има най-малко игрови точки.
    * 
    * 2.2.2.2. Ако нямаме боя, в която всички карти са с 0 точки по правило '1.1':
    * 
    * 2.2.2.2.1. Ако партньорът е играл най-силната карта, даваме карта, която има най-малко ( >0 ) точки
    * по правило '1.1'.
    * 
    * 2.2.2.2.2. = '2.2.2.1.2.'
    * 
    **/
import { Card, SUITS } from './cards';

const MIN_FOR_TRUMP = 34;
const MIN_FOR_NOTRUMPS = 34;
const MIN_FOR_ALLTRUMPS = 60;

function evaluateCardPoints(hand, contract) {
    const cardPoints = hand.reduce((total, card) => {
        return total + card.getValue(contract);
    }, 0);
    return cardPoints;
}

  // Make an AI announcement based on card evaluation
export function makeAIBid(hand) {        
        
    if (evaluateCardPoints(hand, 'clubs') >= MIN_FOR_TRUMP && hand.filter(card => card.suit === 'clubs').length > 2) {
        return 'clubs';
    }
    else if (evaluateCardPoints(hand, 'diamonds') >= MIN_FOR_TRUMP && hand.filter(card => card.suit === 'diamonds').length > 2) {
        return 'diamonds';
    }
    else if (evaluateCardPoints(hand, 'hearts') >= MIN_FOR_TRUMP && hand.filter(card => card.suit === 'hearts').length > 2) {
        return 'hearts';
    }
    else if (evaluateCardPoints(hand, 'spades') >= MIN_FOR_TRUMP && hand.filter(card => card.suit === 'spades').length > 2) {
        return 'spades';
    }
    else if (evaluateCardPoints(hand, 'no-trump') >= MIN_FOR_NOTRUMPS) {
        return 'no-trump';
    }
    else if (evaluateCardPoints(hand, 'all-trump') >= MIN_FOR_ALLTRUMPS) {
        return 'all-trump';
    }
    else {
        return 'pass';
    }
}
