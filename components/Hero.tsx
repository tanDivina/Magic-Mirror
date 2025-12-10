
import React, { useState, useEffect } from 'react';
import KineticMarquee from './KineticMarquee';
import MagicLens from './MagicLens';
import { Star } from 'lucide-react';
import { UserProfile } from '../App';

interface HeroProps {
  currentUser: UserProfile | null;
}

const ROTATING_TEXTS = [
  "VIRAL IN SECONDS",
  "INSTANT PRO SHOOT",
  "FROM BEDROOM TO BILLBOARD",
  "YOUR CAM • PRO AD",
  "AGENCY IN A POCKET"
];

const KineticText = ({ text }: { text: string }) => {
  return (
    <span 
      className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-electric via-hotpink to-highlighter drop-shadow-sm cursor-default"
      style={{ WebkitTextStroke: '2px black' }}
    >
      {text.split('').map((char, i) => (
        <span
          key={i}
          className={`
            inline-block transition-transform duration-200 cubic-bezier(0.175, 0.885, 0.32, 1.275)
            hover:scale-[1.2] hover:-translate-y-4 hover:skew-x-3
            ${i % 2 === 0 ? 'hover:rotate-6' : 'hover:-rotate-6'}
          `}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

const Hero: React.FC<HeroProps> = ({ currentUser }) => {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full min-h-[90vh] overflow-hidden flex flex-col pt-24 pb-20">
      <KineticMarquee />
      
      {/* Social Proof Bubble */}
      <div className="absolute top-24 right-[10%] md:right-[20%] animate-float z-40 hidden md:block">
        <div className="relative bg-white border-4 border-black px-6 py-4 rounded-[50%] rounded-bl-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-6">
          <div className="flex items-center gap-2">
             <Star className="fill-highlighter text-black w-5 h-5" />
             <span key={textIndex} className="font-display font-bold text-xl animate-pop-in whitespace-nowrap">
               {ROTATING_TEXTS[textIndex]}
             </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 z-10 flex flex-col items-center">
        <div className="text-center mb-8 max-w-4xl relative">
          {/* Tape Label */}
          <div className="inline-block bg-electric/90 backdrop-blur-sm text-white px-6 py-1 font-mono text-xs font-bold mb-4 rotate-[-2deg] shadow-sm border border-white/20">
            POWERED BY GEMINI 3 PRO
          </div>
          <h1 className="font-display font-bold text-6xl md:text-8xl leading-none tracking-tighter uppercase mb-2">
            Instant <br/>
            <KineticText text="Ad Campaign" />
          </h1>
          <p className="font-serif italic text-2xl md:text-3xl mt-4 max-w-2xl mx-auto bg-white/80 inline-block px-4 backdrop-blur-sm">
            Hold up your product. Tell the AI the vibe. Get a pro shoot instantly.
          </p>
        </div>

        {/* The Magic Lens Interaction */}
        <MagicLens currentUser={currentUser} />
        
      </div>
    </section>
  );
};

export default Hero;
