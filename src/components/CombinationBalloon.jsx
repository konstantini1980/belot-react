import React from 'react';
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

// Format single combination text
function formatCombinationText(combination) {
  if (!combination) return '';
  return formatCombinationType(combination.type);
}

export default function CombinationBalloon({ combinations, playerName, onClose }) {
  // Show only the first combination
  const combination = combinations && combinations.length > 0 ? combinations[0] : null;

  if (!combination) {
    return null;
  }

  const text = formatCombinationText(combination);

  return (
    <div className="combination-balloon visible">
      {text}
    </div>
  );
}

