import React from 'react';
import './CardBack.css';

export default function CardBack({ size = 'normal' }) {
  return (
    <div className={`card-back ${size}`}>
      <div className="card-back-pattern"></div>
    </div>
  );
}

