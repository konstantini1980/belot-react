import React, { useState, useEffect } from 'react';
import './DevPanel.css';

export default function DevPanel({ 
  onShowCombinations,
  onShowScorePanel,
  isVisible: externalIsVisible = null
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [showCombinations, setShowCombinations] = useState(false);
  const [showScorePanel, setShowScorePanel] = useState(false);

  // Use external visibility control if provided, otherwise use internal state
  const panelVisible = externalIsVisible !== null ? externalIsVisible : isVisible;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+Shift+D toggles dev panel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
      // Ctrl+Shift+C shows combinations balloon
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (onShowCombinations) {
          onShowCombinations();
        }
      }
      // Ctrl+Shift+S shows score panel
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (onShowScorePanel) {
          onShowScorePanel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onShowCombinations, onShowScorePanel]);

  if (!panelVisible) {
    return (
      <button 
        className="dev-panel-toggle"
        onClick={() => setIsVisible(true)}
        title="Toggle Dev Panel (Ctrl+Shift+D)"
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
          title="Close (Ctrl+Shift+D)"
        >
          ×
        </button>
      </div>
      <div className="dev-panel-content">
        <div className="dev-panel-section">
          <h4>Panel Controls</h4>
          <div className="dev-panel-buttons">
            <button 
              onClick={() => {
                if (onShowCombinations) onShowCombinations();
                setShowCombinations(true);
                setTimeout(() => setShowCombinations(false), 100);
              }}
              className="dev-button"
            >
              Show Combinations Balloon
              <span className="dev-shortcut">Ctrl+Shift+C</span>
            </button>
            <button 
              onClick={() => {
                if (onShowScorePanel) onShowScorePanel();
                setShowScorePanel(true);
                setTimeout(() => setShowScorePanel(false), 100);
              }}
              className="dev-button"
            >
              Show Score Panel
              <span className="dev-shortcut">Ctrl+Shift+S</span>
            </button>
          </div>
        </div>
        <div className="dev-panel-section">
          <h4>Keyboard Shortcuts</h4>
          <div className="dev-shortcuts-list">
            <div className="dev-shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>
              <span>Toggle Dev Panel</span>
            </div>
            <div className="dev-shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
              <span>Show Combinations</span>
            </div>
            <div className="dev-shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
              <span>Show Score Panel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

