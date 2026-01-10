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
      <div className="combinations-list">
        {combinations.map((combo, idx) => (
          <div
            key={idx}
            className="combination-item"
            onClick={() => onAnnounce(combo)}
          >
            {combo.type.toUpperCase()}: {combo.points} points
          </div>
        ))}
      </div>
    </div>
  );
}

