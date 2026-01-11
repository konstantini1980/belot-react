import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './CombinationBalloon.css';

export default function CombinationBalloon({ combinations, playerName, onClose }) {
  const { t } = useLanguage();
  
  // Format combination type name
  const formatCombinationType = (type) => {
    const typeMap = {
      'tierce': t('tierce'),
      'quarte': t('quarte'),
      'quint': t('quint'),
      'equal': t('fourOfAKind'),
      'belot': t('belot')
    };
    return typeMap[type] || type;
  };

  // Format single combination text
  const formatCombinationText = (combination) => {
    if (!combination) return '';
    return formatCombinationType(combination.type);
  };
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

