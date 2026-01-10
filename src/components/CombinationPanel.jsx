import React from 'react';
import './CombinationPanel.css';

export default function CombinationPanel({ 
  combinations, 
  onAnnounce, 
  playerId,
  currentPlayer 
}) {
  if (currentPlayer !== playerId || combinations.length === 0) {
    return null;
  }

  return (
    <div className="combination-panel">
      <h4>Available Combinations</h4>
      <div className="combinations-list">
        {combinations.map((combo, idx) => (
          <button
            key={idx}
            className="combination-button"
            onClick={() => onAnnounce(combo)}
          >
            {combo.type.toUpperCase()}: {combo.points} points
          </button>
        ))}
      </div>
    </div>
  );
}

