import React, { useState } from 'react';
import './BiddingPanel.css';

const CONTRACTS = [
  { value: 'clubs', label: '♣ Clubs' },
  { value: 'diamonds', label: '♦ Diamonds' },
  { value: 'hearts', label: '♥ Hearts' },
  { value: 'spades', label: '♠ Spades' },
  { value: 'no-trump', label: 'No Trump' },
  { value: 'all-trump', label: 'All Trump' }
];

export default function BiddingPanel({ 
  currentBidder, 
  playerId, 
  bids, 
  onBid, 
  contract,
  players 
}) {

  const isMyTurn = currentBidder === playerId;
  // Find the last winning contract (not pass, double, or redouble)
  const lastWinningContract = bids
    .filter(b => b.bid !== 'pass' && b.bid !== 'double' && b.bid !== 'redouble')
    .pop();
  
  // Get teams
  const currentPlayerTeam = players && players[playerId] ? players[playerId].team : null;
  const lastContractTeam = lastWinningContract && players && players[lastWinningContract.playerId] 
    ? players[lastWinningContract.playerId].team 
    : null;
  
  // Can double if opponent (different team) has a winning contract
  // Cannot double if teammate has the winning bid
  const canDouble = lastWinningContract && 
    lastContractTeam !== null &&
    currentPlayerTeam !== null &&
    lastContractTeam !== currentPlayerTeam;
  
  // Can redouble only if game is already doubled by opponent (different team)
  // Cannot redouble if teammate doubled
  const lastBid = bids.length > 0 ? bids[bids.length - 1] : null;
  const lastBidderTeam = lastBid && players && players[lastBid.playerId] 
    ? players[lastBid.playerId].team 
    : null;
  const canRedouble = lastBid && 
    lastBid.bid === 'double' &&
    lastBidderTeam !== null &&
    currentPlayerTeam !== null &&
    lastBidderTeam !== currentPlayerTeam;

  const getAvailableContracts = () => {
    if (!lastWinningContract) return CONTRACTS;
    const lastRank = {
      'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4,
      'no-trump': 5, 'all-trump': 6
    }[lastWinningContract.bid];
    return CONTRACTS.filter(c => {
      const rank = {
        'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4,
        'no-trump': 5, 'all-trump': 6
      }[c.value];
      return rank > lastRank;
    });
  };

  const getContractDisplay = (contractValue) => {
    const contractMap = {
      'hearts': { icon: '♥', label: 'Hearts', iconColor: '#d32f2f', textColor: '#ffffff' },
      'diamonds': { icon: '♦', label: 'Diamonds', iconColor: '#d32f2f', textColor: '#ffffff' },
      'clubs': { icon: '♣', label: 'Clubs', iconColor: '#ffffff', textColor: '#ffffff' },
      'spades': { icon: '♠', label: 'Spades', iconColor: '#ffffff', textColor: '#ffffff' },
      'no-trump': { icon: 'NT', label: 'No Trumps', iconColor: '#2196F3', textColor: '#2196F3' },
      'all-trump': { icon: 'AT', label: 'All Trumps', iconColor: '#FFC107', textColor: '#FFC107' }
    };
    return contractMap[contractValue] || { icon: '', label: contractValue, iconColor: '#ffffff', textColor: '#ffffff' };
  };

  const availableContracts = getAvailableContracts();
  const isContractAvailable = (contractValue) => {
    return availableContracts.some(c => c.value === contractValue);
  };
  
  // Always show all contracts, maintain order: clubs, diamonds, hearts, spades
  const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];
  const suitContracts = suitOrder.map(suit => CONTRACTS.find(c => c.value === suit));
  const specialContracts = CONTRACTS.filter(c => ['no-trump', 'all-trump'].includes(c.value));

  const playerNames = ['You', 'West', 'Partner', 'East'];

  // Calculate initial bidding order (counter-clockwise starting from currentBidder)
  // When no bids exist, show all 4 players in turn order
  // When bids exist, show players in order: those who bid, then remaining in turn order
  const getBiddingOrder = () => {
    // Always show 4 players
    const order = [];
    
    // Start from the first bidder (currentBidder when no bids, or first bidder)
    const firstBidder = bids.length > 0 ? bids[0].playerId : currentBidder;
    
    // Add players in counter-clockwise order
    for (let i = 0; i < 4; i++) {
      order.push((firstBidder - i) % 4);
    }
    
    return order;
  };

  const biddingOrder = getBiddingOrder();
  const bidsByPlayer = {};
  bids.forEach(bid => {
    bidsByPlayer[bid.playerId] = bid;
  });

  return (
    <div className="bidding-panel">
      <h3 className="bidding-title">Select your bid</h3>
      
      <div className="bids-list">
        {biddingOrder.map((playerId, idx) => {
          const bid = bidsByPlayer[playerId];
          const isCurrentBidder = playerId === currentBidder;
          const display = bid ? getContractDisplay(bid.bid) : null;
          
          return (
            <div key={idx} className="bid-item-row">
              <span className="bid-player-name">{playerNames[playerId]}</span>
              <div className="bid-right-side">
                {bid ? (
                  <>
                    {bid.bid !== 'pass' && bid.bid !== 'double' && bid.bid !== 'redouble' && (
                      <span className="bid-suit-icon" style={{ color: display.iconColor }}>
                        {display.icon}
                      </span>
                    )}
                    {bid.bid === 'pass' && (
                      <span className="bid-text">Pass</span>
                    )}
                    {bid.bid === 'double' && (
                      <span className="bid-text">Double</span>
                    )}
                    {bid.bid === 'redouble' && (
                      <span className="bid-text">Redouble</span>
                    )}
                  </>
                ) : isCurrentBidder ? (
                  <span className="waiting-message-inline">
                    Waiting...
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
              const iconColor = isAvailable ? display.iconColor : 'rgba(255, 255, 255, 0.3)';
              const textColor = isAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
              return (
                <button
                  key={contract.value}
                  onClick={() => isAvailable && onBid(contract.value)}
                  disabled={!isAvailable}
                  className={`trump-button suit-button ${!isAvailable ? 'disabled' : ''}`}
                >
                  <span className="suit-icon" style={{ color: iconColor }}>{display.icon}</span>
                  <span className="suit-label" style={{ color: textColor }}>{display.label}</span>
                </button>
              );
            })}
            {specialContracts.map(contract => {
              const display = getContractDisplay(contract.value);
              const isAvailable = isContractAvailable(contract.value);
              const iconColor = isAvailable ? display.iconColor : 'rgba(255, 255, 255, 0.3)';
              const textColor = isAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
              return (
                <button
                  key={contract.value}
                  onClick={() => isAvailable && onBid(contract.value)}
                  disabled={!isAvailable}
                  className={`trump-button special-button ${!isAvailable ? 'disabled' : ''}`}
                >
                  <span className="special-icon" style={{ color: iconColor }}>{display.icon}</span>
                  <span className="special-label" style={{ color: textColor }}>{display.label}</span>
                </button>
              );
            })}
          </div>
          <div className="pass-double-container">
            <button
              onClick={() => onBid('pass')}
              className="pass-button-large"
            >
              Pass
            </button>
            <button
              onClick={() => canDouble && onBid('double')}
              disabled={!canDouble}
              className={`double-button-x2 ${!canDouble ? 'disabled' : ''}`}
            >
              x2
            </button>
            <button
              onClick={() => canRedouble && onBid('redouble')}
              disabled={!canRedouble}
              className={`double-button-x2 ${!canRedouble ? 'disabled' : ''}`}
            >
              x4
            </button>
          </div>
        </>
      )}
      
    </div>
  );
}

