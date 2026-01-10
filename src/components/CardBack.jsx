import React from 'react';
import './CardBack.css';
import backImage from '../assets/back.bmp';

export default function CardBack({ size = 'normal' }) {
  return (
    <div className={`card-back ${size}`}>
      <img 
        src={backImage} 
        alt="Card back"
        className="card-back-image"
      />
    </div>
  );
}

