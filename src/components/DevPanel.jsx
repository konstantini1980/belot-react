import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './DevPanel.css';

export default function DevPanel({ 
  onShowCombinations,
  onShowScorePanel,
  onShowCards,
  showCombinations,
  showScorePanel,
  showCards,
  isVisible: externalIsVisible = null
}) {
  const { t } = useLanguage();
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

  const handleShowCardsToggle = (checked) => {
    if (onShowCards) {
      onShowCards(checked);
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
        <h3>{t('devPanel')}</h3>
        <button 
          className="dev-panel-close"
          onClick={() => setIsVisible(false)}
          title={t('close')}
        >
          ×
        </button>
      </div>
      <div className="dev-panel-content">
        <div className="dev-panel-section">
          <h4>{t('panelControls')}</h4>
          <div className="dev-panel-controls">
            <label className="dev-checkbox-label">
              <input
                type="checkbox"
                checked={showCombinations || false}
                onChange={(e) => handleCombinationsToggle(e.target.checked)}
                className="dev-checkbox"
              />
              <span>{t('showCombinationsBalloon')}</span>
            </label>
            <label className="dev-checkbox-label">
              <input
                type="checkbox"
                checked={showScorePanel || false}
                onChange={(e) => handleScorePanelToggle(e.target.checked)}
                className="dev-checkbox"
              />
              <span>{t('showScorePanel')}</span>
            </label>
            <label className="dev-checkbox-label">
              <input
                type="checkbox"
                checked={showCards || false}
                onChange={(e) => handleShowCardsToggle(e.target.checked)}
                className="dev-checkbox"
              />
              <span>{t('showCards')}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

