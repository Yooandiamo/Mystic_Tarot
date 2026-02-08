import React from 'react';
import { DrawnCard } from '../types';

interface CardProps {
  card?: DrawnCard; // If undefined, it's just a card back
  isRevealed: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const Card: React.FC<CardProps> = ({ card, isRevealed, onClick, size = 'md', className = '', showLabel = true }) => {
  const sizeClasses = {
    xs: 'w-10 h-16',
    sm: 'w-16 h-24',
    md: 'w-24 h-36 md:w-28 md:h-44', // Adjusted for better mobile fit
    lg: 'w-48 h-72 md:w-64 md:h-96'
  };

  return (
    <div 
      className={`relative group perspective-1000 ${sizeClasses[size]} ${className} cursor-pointer select-none`}
      onClick={onClick}
    >
      <div className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${isRevealed ? 'rotate-y-180' : ''}`}>
        
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden rounded-lg shadow-xl overflow-hidden border border-amber-500/20 bg-[#1a1638]">
           {/* Decorative Back Pattern - simulating the dark starry back in screenshots */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
           <div className="absolute inset-1 border border-amber-500/10 rounded flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border border-amber-500/30 flex items-center justify-center">
                 <div className="w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_5px_rgba(251,191,36,0.8)]"></div>
              </div>
           </div>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-lg shadow-2xl overflow-hidden border border-amber-500/40 bg-slate-900">
          {card && (
            <div className={`w-full h-full flex flex-col ${card.isReversed ? 'rotate-180' : ''}`}>
              {/* Image Placeholder */}
              <div className="h-full w-full bg-slate-800 relative overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${card.imageSeed}/300/450`} 
                  alt={card.name}
                  className="w-full h-full object-cover opacity-90"
                />
                {/* Gradient overlay for text legibility if we put text on top */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              </div>
              
              {/* Integrated Label (optional, based on props) */}
              {showLabel && (
                <div className="absolute bottom-0 left-0 right-0 p-1 text-center bg-black/60 backdrop-blur-[2px]">
                  <span className="text-amber-100 font-serif text-[10px] md:text-xs font-bold tracking-wider drop-shadow-md">
                    {card.name} {card.isReversed && '(逆)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card;