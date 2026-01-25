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

  if (!combinations || combinations.length === 0) {
    return null;
  }

  // Format all combinations separated by commas
  const text = combinations.map(formatCombinationText).filter(Boolean).join(', ');

  return (
    <div className="combination-balloon visible">
      {text}
    </div>
  );
}

