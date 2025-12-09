import React from 'react';
import { User, Heart, Zap, Camera, Star, TrendingUp } from 'lucide-react';

const activities = [
  { name: "SARAH K.", action: "Just remixed", item: "VINTAGE NIKES", icon: <Zap size={14} />, color: "bg-electric" },
  { name: "STUDIO 54", action: "Generated ad for", item: "HOT SAUCE", icon: <Camera size={14} />, color: "bg-hotpink" },
  { name: "MIKE D.", action: "Created campaign", item: "NEON SIGN", icon: <Star size={14} />, color: "bg-highlighter" },
  { name: "LARA C.", action: "Captured", item: "ANCIENT RELIC", icon: <TrendingUp size={14} />, color: "bg-black text-white" },
  { name: "TECHBRO", action: "Styled", item: "CYBER TRUCK", icon: <Heart size={14} />, color: "bg-electric" },
  { name: "JESS M.", action: "Posted", item: "ORGANIC SOAP", icon: <User size={14} />, color: "bg-hotpink" },
];

interface SocialCardProps {
  data: typeof activities[0];
  rotate: string;
}

const SocialCard: React.FC<SocialCardProps> = ({ data, rotate }) => (
  <div className={`
    flex items-center gap-3 
    bg-white border-2 border-black 
    px-4 py-3 mx-4 
    sticker-shadow shrink-0 min-w-[260px]
    ${rotate} hover:rotate-0 transition-transform cursor-default
  `}>
    <div className={`w-10 h-10 rounded-full ${data.color} border-2 border-black flex items-center justify-center ${data.color.includes('text-white') ? 'text-white' : 'text-black'}`}>
        {data.icon}
    </div>
    <div className="flex flex-col">
        <span className="font-display font-bold text-sm uppercase leading-none tracking-wide">{data.name}</span>
        <span className="text-xs font-mono text-gray-600 mt-1 uppercase">
          {data.action} <span className="bg-highlighter px-1 border border-black text-[10px] font-bold">{data.item}</span>
        </span>
    </div>
  </div>
);

const SocialProofMarquee: React.FC = () => {
  return (
    <div className="w-full z-40 bg-paper border-y-4 border-black relative">
        <div className="flex overflow-hidden py-4 bg-paper relative z-10">
            {/* 
              We render two identical sets of cards.
              The 'animate-marquee' class moves each set to the left by 100% of its width.
              Because there are two identical sets, when the first one exits, the second one is exactly in place.
            */}
            <div className="flex shrink-0 animate-marquee items-center">
                {activities.map((item, i) => (
                    <SocialCard key={`a-${i}`} data={item} rotate={i % 2 === 0 ? 'rotate-1' : '-rotate-1'} />
                ))}
            </div>
            <div className="flex shrink-0 animate-marquee items-center">
                {activities.map((item, i) => (
                    <SocialCard key={`b-${i}`} data={item} rotate={i % 2 === 0 ? 'rotate-1' : '-rotate-1'} />
                ))}
            </div>
        </div>
        
        {/* Rainbow Floor Strip */}
        <div className="h-3 w-full bg-gradient-to-r from-electric via-hotpink to-highlighter border-t-2 border-black"></div>
    </div>
  );
};

export default SocialProofMarquee;