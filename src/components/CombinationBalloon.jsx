import React, { useEffect, useState } from 'react';
import './CombinationBalloon.css';

// Format combination type name
function formatCombinationType(type) {
  const typeMap = {
    'tierce': 'Tierce',
    'quarte': 'Quarte',
    'quint': 'Quint',
    'equal': '4 of a kind',
    'belot': 'Belot'
  };
  return typeMap[type] || type;
}

// Format combinations text
function formatCombinationsText(combinations) {
  if (!combinations || combinations.length === 0) return '';
  
  // Count each type
  const counts = {};
  combinations.forEach(combo => {
    const type = combo.type;
    counts[type] = (counts[type] || 0) + 1;
  });
  
  // Build text
  const parts = [];
  Object.keys(counts).forEach(type => {
    const count = counts[type];
    const typeName = formatCombinationType(type);
    if (count === 1) {
      parts.push(typeName);
    } else {
      // Special handling for "4 of a kind" - plural is "4 of a kinds"
      if (typeName === '4 of a kind') {
        parts.push(`${count} 4 of a kinds`);
      } else {
        parts.push(`${count} ${typeName}s`);
      }
    }
  });
  
  return parts.join(', ');
}

export default function CombinationBalloon({ combinations, playerName, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // Wait for fade-out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible || !combinations || combinations.length === 0) {
    return null;
  }

  const text = formatCombinationsText(combinations);

  return (
    <div className={`combination-balloon ${visible ? 'visible' : ''}`}>
      {text}
    </div>
  );
}

