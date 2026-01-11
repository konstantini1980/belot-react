import React, { useState } from 'react';
import './DevPanel.css';

export default function DevPanel({ 
  onShowCombinations,
  onShowScorePanel,
  showCombinations,
  showScorePanel,
  isVisible: externalIsVisible = null
}) {
  const [isVisible, setIsVisible] = useState(false);

  // Use external visibility control if provided, otherwise use internal state
  const panelVisible = externalIsVisible !== null ? externalIsVisible : isVisible;

  const handleCombinationsToggle = (checked) => {
    if (onShowCombinations) {
      onShowCombinations(checked);
    }
  };

  const handleScorePanelToggle = (checked) => {
    if (onShowScorePanel) {
      onShowScorePanel(checked);
    }
  };

  if (!panelVisible) {
    return (
      <button 
        className="dev-panel-toggle"
        onClick={() => setIsVisible(true)}
        title="Toggle Dev Panel"
      >
        🛠️
      </button>
    );
  }

  return (
    <div className="dev-panel">
      <div className="dev-panel-header">
        <h3>Dev Panel</h3>
        <button 
          className="dev-panel-close"
          onClick={() => setIsVisible(false)}
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="dev-panel-content">
        <div className="dev-panel-section">
          <h4>Panel Controls</h4>
          <div className="dev-panel-controls">
            <label className="dev-checkbox-label">
              <input
                type="checkbox"
                checked={showCombinations || false}
                onChange={(e) => handleCombinationsToggle(e.target.checked)}
                className="dev-checkbox"
              />
              <span>Show Combinations Balloon</span>
            </label>
            <label className="dev-checkbox-label">
              <input
                type="checkbox"
                checked={showScorePanel || false}
                onChange={(e) => handleScorePanelToggle(e.target.checked)}
                className="dev-checkbox"
              />
              <span>Show Score Panel</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

