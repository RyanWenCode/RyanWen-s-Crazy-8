
import React from 'react';
import { Card as CardType, Suit } from '../types';
import { motion } from 'motion/react';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface CardProps {
  card: CardType;
  isFaceUp?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  isPlayable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  className = '', 
  disabled,
  isPlayable = false
}) => {
  const getSuitIcon = (suit: Suit) => {
    const props = { size: 24, className: suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-stone-900' };
    switch (suit) {
      case 'hearts': return <Heart {...props} fill="currentColor" />;
      case 'diamonds': return <Diamond {...props} fill="currentColor" />;
      case 'clubs': return <Club {...props} fill="currentColor" />;
      case 'spades': return <Spade {...props} fill="currentColor" />;
    }
  };

  const getSuitColor = (suit: Suit) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-stone-900';
  };

  if (!isFaceUp) {
    return (
      <motion.div
        layoutId={card.id}
        className={`w-24 h-36 sm:w-28 sm:h-40 bg-indigo-800 rounded-xl border-4 border-white/20 flex items-center justify-center card-shadow relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/10" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={card.id}
      whileHover={disabled ? {} : { y: -20, scale: 1.05, transition: { type: 'spring', stiffness: 300 } }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={disabled ? undefined : onClick}
      className={`w-24 h-36 sm:w-28 sm:h-40 bg-white rounded-xl border-2 flex flex-col p-2 justify-between card-shadow cursor-pointer relative transition-all duration-300 ${className} 
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''} 
        ${isPlayable ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] -translate-y-2' : 'border-stone-200'}
      `}
    >
      <div className={`flex flex-col items-start leading-none ${getSuitColor(card.suit)}`}>
        <span className="text-xl font-bold font-display">{card.rank}</span>
        {getSuitIcon(card.suit)}
      </div>
      
      <div className="flex justify-center items-center opacity-10">
        {React.cloneElement(getSuitIcon(card.suit) as React.ReactElement, { size: 48 })}
      </div>

      <div className={`flex flex-col items-end leading-none rotate-180 ${getSuitColor(card.suit)}`}>
        <span className="text-xl font-bold font-display">{card.rank}</span>
        {getSuitIcon(card.suit)}
      </div>
    </motion.div>
  );
};
