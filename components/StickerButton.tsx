import React from 'react';

interface StickerButtonProps {
  onClick: () => void;
  text: string;
  subtext?: string;
  color?: 'pink' | 'blue' | 'yellow';
  disabled?: boolean;
  className?: string;
}

const StickerButton: React.FC<StickerButtonProps> = ({ 
  onClick, 
  text, 
  subtext, 
  color = 'pink', 
  disabled = false,
  className = ''
}) => {
  const colorClasses = {
    pink: 'bg-hotpink text-white hover:bg-[#D90082]',
    blue: 'bg-electric text-white hover:bg-[#0022CC]',
    yellow: 'bg-highlighter text-black hover:bg-[#E6E600]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative 
        px-6 py-3 md:px-8 md:py-4
        transform transition-all duration-200 
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:rotate-1 active:scale-95 cursor-pointer'}
        ${className}
      `}
    >
      {/* Background with jagged effect via css clip-path or simple border logic */}
      <div className={`
        absolute inset-0 
        ${colorClasses[color]} 
        sticker-border sticker-shadow
        rotate-1 group-hover:rotate-0 transition-transform
      `}></div>

      {/* Peel Effect Corner */}
      <div className={`
        absolute bottom-0 right-0 w-5 h-5 md:w-6 md:h-6 
        bg-black/20 
        transition-all duration-300 origin-bottom-right
        scale-0 group-hover:scale-100
        rounded-tl-lg
      `}></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-display font-bold text-lg md:text-2xl uppercase tracking-widest whitespace-nowrap">{text}</span>
        {subtext && (
          <span className={`font-serif italic text-xs md:text-sm ${color === 'yellow' ? 'text-black' : 'text-white/90'}`}>
            {subtext}
          </span>
        )}
      </div>
      
      {/* Hidden 'Go!' text revealed on hover/peel implied by design */}
    </button>
  );
};

export default StickerButton;