import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlayerNames } from '../contexts/PlayerNamesContext';
import { CONTRACT_RANK, lastContractBid } from '../game/gameLogic';
import './BiddingPanel.css';

export default function BiddingPanel({ 
  currentBidder, 
  playerId, 
  bids, 
  onBid, 
  canDouble = false,
  canRedouble = false,
  allPassed = false
}) {
  const { t } = useLanguage();
  
  const CONTRACTS = [
    { value: 'clubs', label: `♣ ${t('clubs')}` },
    { value: 'diamonds', label: `♦ ${t('diamonds')}` },
    { value: 'hearts', label: `♥ ${t('hearts')}` },
    { value: 'spades', label: `♠ ${t('spades')}` },
    { value: 'no-trump', label: t('noTrump') },
    { value: 'all-trump', label: t('allTrump') }
  ];

  const isMyTurn = currentBidder === playerId;
  const lastContract = lastContractBid(bids);

  // Only contracts that outrank the current one can be bid
  const getAvailableContracts = () => {
    if (!lastContract) return CONTRACTS;
    return CONTRACTS.filter(c => CONTRACT_RANK[c.value] > CONTRACT_RANK[lastContract.bid]);
  };

  // No trump shows the four suits struck through, all trump shows them in gold
  const getContractDisplay = (contractValue) => {
    const contractMap = {
      'hearts': { icon: '♥', label: t('hearts'), tone: 'red' },
      'diamonds': { icon: '♦', label: t('diamonds'), tone: 'red' },
      'clubs': { icon: '♣', label: t('clubs'), tone: 'black' },
      'spades': { icon: '♠', label: t('spades'), tone: 'black' },
      'no-trump': { icon: '♣♦♥♠', label: t('noTrump'), tone: 'no-trump' },
      'all-trump': { icon: '♣♦♥♠', label: t('allTrump'), tone: 'all-trump' }
    };
    return contractMap[contractValue] || { icon: '', label: contractValue, tone: 'black' };
  };

  const availableContracts = getAvailableContracts();
  const isContractAvailable = (contractValue) => {
    return availableContracts.some(c => c.value === contractValue);
  };
  
  // Always show all contracts, maintain order: clubs, diamonds, hearts, spades
  const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];
  const suitContracts = suitOrder.map(suit => CONTRACTS.find(c => c.value === suit));
  const specialContracts = CONTRACTS.filter(c => ['no-trump', 'all-trump'].includes(c.value));

  const playerNames = usePlayerNames();

  // Calculate initial bidding order (counter-clockwise starting from currentBidder)
  // When no bids exist, show all 4 players in turn order
  // When bids exist, show players in order: those who bid, then remaining in turn order
  const getBiddingOrder = () => {
    // Always show 4 players
    const order = [];
    
    // Start from the first bidder (currentBidder when no bids, or first bidder)
    const firstBidder = bids.length > 0 ? bids[0].playerId : currentBidder;
    
    // Add players in counter-clockwise order
    // Use (firstBidder - i + 4) % 4 to handle negative modulo correctly
    for (let i = 0; i < 4; i++) {
      order.push((firstBidder - i + 4) % 4);
    }
    
    return order;
  };

  const biddingOrder = getBiddingOrder();
  // Array of all bids in chronological order
  const bidsByPlayer = bids;

  return (
    <div className="bidding-panel">
      {/* Until the first bid of a deal that was thrown in because all four passed,
          that news takes the title's place (the panel has a fixed height) */}
      {allPassed && bids.length === 0 ? (
        <p className="bidding-notice">{t('allPassedRedeal')}</p>
      ) : (
        <h3 className="bidding-title">{t('selectYourBid')}</h3>
      )}
      
      <div className="bids-list">
        {biddingOrder.map((playerId, idx) => {
          // Find all bids for this player in chronological order
          const playerBids = bidsByPlayer.filter(bid => bid.playerId === playerId);
          const isCurrentBidder = playerId === currentBidder;
          
          return (
            <div key={idx} className={`bid-item-row ${isCurrentBidder ? 'current' : ''}`}>
              <span className="bid-player-name">{playerNames[playerId]}</span>
              <div className="bid-right-side">
                {playerBids.length > 0 ? (
                  <>
                    {playerBids.reverse().map((bid, bidIdx) => {
                      const display = getContractDisplay(bid.bid);
                      // Last bid in the array is active, previous ones are historical
                      const isHistorical = bidIdx !== 0;
                      
                      return (
                        <span key={bidIdx} className={`bid-display ${isHistorical ? 'historical' : 'active'}`}>
                          {bid.bid in CONTRACT_RANK && (
                            <span className={`bid-suit-icon tone-${display.tone}`}>
                              {isHistorical ? '(' + display.icon + ')' : display.icon}
                            </span>
                          )}
                          {bid.bid === 'pass' && (
                            <span className="bid-text">{isHistorical ? '(' + t('pass') + ')' : t('pass')}</span>
                          )}
                          {bid.bid === 'double' && (
                            <span className="bid-text">{isHistorical ? '(' + t('double') + ')' : t('double')}</span>
                          )}
                          {bid.bid === 'redouble' && (
                            <span className="bid-text">{isHistorical ? '(' + t('redouble') + ')' : t('redouble')}</span>
                          )}
                        </span>
                      );
                    })}
                  </>
                ) : isCurrentBidder ? (
                  <span className="waiting-message-inline">
                    {t('waiting')}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      
      {isMyTurn && (
        <>
          <div className="bidding-grid">
            {suitContracts.map(contract => {
              const display = getContractDisplay(contract.value);
              const isAvailable = isContractAvailable(contract.value);
              return (
                <button
                  key={contract.value}
                  onClick={() => isAvailable && onBid(contract.value)}
                  disabled={!isAvailable}
                  className={`trump-button suit-button tone-${display.tone} ${!isAvailable ? 'disabled' : ''}`}
                >
                  <span className="suit-icon">{display.icon}</span>
                  <span className="suit-label">{display.label}</span>
                </button>
              );
            })}
            {specialContracts.map(contract => {
              const display = getContractDisplay(contract.value);
              const isAvailable = isContractAvailable(contract.value);
              return (
                <button
                  key={contract.value}
                  onClick={() => isAvailable && onBid(contract.value)}
                  disabled={!isAvailable}
                  className={`trump-button special-button tone-${display.tone} ${!isAvailable ? 'disabled' : ''}`}
                >
                  <span className="special-icon">{display.icon}</span>
                  <span className="special-label">{display.label}</span>
                </button>
              );
            })}
          </div>
          <div className="pass-double-container">
            <button
              onClick={() => onBid('pass')}
              className="pass-button-large"
            >
              {t('pass')}
            </button>
            <button
              onClick={() => canDouble && onBid('double')}
              disabled={!canDouble}
              className={`double-button-x2 ${!canDouble ? 'disabled' : ''}`}
            >
              ×2
            </button>
            <button
              onClick={() => canRedouble && onBid('redouble')}
              disabled={!canRedouble}
              className={`double-button-x2 ${!canRedouble ? 'disabled' : ''}`}
            >
              ×4
            </button>
          </div>
        </>
      )}
      
    </div>
  );
}

