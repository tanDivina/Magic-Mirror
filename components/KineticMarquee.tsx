import React from 'react';

const KineticMarquee: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 -z-10 opacity-10 pointer-events-none select-none overflow-hidden rotate-[-5deg] scale-110">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="text-[20vw] font-display font-black leading-none text-black mx-4">
          SHOOT • SWAP • SELL • CREATE • REMIX • MAGIC •
        </span>
        <span className="text-[20vw] font-display font-black leading-none text-black mx-4">
          SHOOT • SWAP • SELL • CREATE • REMIX • MAGIC •
        </span>
      </div>
    </div>
  );
};

export default KineticMarquee;
