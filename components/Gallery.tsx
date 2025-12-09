
import React, { useState, useEffect } from 'react';
import { Heart, Share2, FolderOpen, Lock } from 'lucide-react';
import { UserProfile } from '../App';

interface GalleryProps {
    currentUser: UserProfile | null;
    onLoginReq: () => void;
}

const communityItems = [
  { id: 1, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", user: "@JOHNDOE", prompt: "Neon Cyberpunk Sneakers" },
  { id: 2, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", user: "@STUDIO_A", prompt: "Minimalist Headphones" },
  { id: 3, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", user: "@WATCH_GUY", prompt: "Luxury Timepiece Swiss Alps" },
  { id: 4, image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80", user: "@CAMERA_NERD", prompt: "Vintage Film Camera Noir" },
  { id: 5, image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80", user: "@SKINCARE_LAB", prompt: "Botanical Serum Jungle" },
  { id: 6, image: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80", user: "@KICKS_4_U", prompt: "Floating Red Shoes Cloud" },
];

const Gallery: React.FC<GalleryProps> = ({ currentUser, onLoginReq }) => {
  const [activeTab, setActiveTab] = useState<'community' | 'personal'>('community');
  const [myCreations, setMyCreations] = useState<any[]>([]);

  const loadMyCreations = () => {
    try {
      const stored = localStorage.getItem('magic_mirror_my_creations');
      if (stored) {
        const allItems = JSON.parse(stored);
        // Filter: If user is logged in, show THEIR items. If guest, show "YOU" items.
        // For this demo, we assume "YOU" is the default guest handle.
        const userHandle = currentUser ? currentUser.handle : "YOU";
        
        // In a real app, this filtering happens on the backend.
        // Here we just filter by the user property we saved.
        const filtered = allItems.filter((item: any) => item.user === userHandle);
        setMyCreations(filtered);
      }
    } catch (e) {
      console.error("Failed to load creations", e);
    }
  };

  useEffect(() => {
    loadMyCreations();

    const handleUpdate = () => loadMyCreations();
    const handleNavigate = () => setActiveTab('community');

    window.addEventListener('gallery-update', handleUpdate);
    window.addEventListener('navigate-gallery', handleNavigate);
    
    return () => {
      window.removeEventListener('gallery-update', handleUpdate);
      window.removeEventListener('navigate-gallery', handleNavigate);
    };
  }, [currentUser]); // Reload when user changes

  const items = activeTab === 'community' ? communityItems : myCreations;

  const handleTabChange = (tab: 'community' | 'personal') => {
    if (tab === 'personal' && !currentUser) {
        onLoginReq();
        return;
    }
    setActiveTab(tab);
  };

  return (
    <section id="gallery" className="w-full bg-paper py-20 border-t-4 border-black relative overflow-hidden min-h-[500px]">
        {/* Background Patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="container mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col items-center mb-12 relative z-10">
                <div className="bg-hotpink text-white px-6 py-2 border-2 border-black rotate-[-2deg] sticker-shadow mb-4">
                    <span className="font-mono font-bold uppercase tracking-widest">Community Remixes</span>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 mb-4">
                    <button 
                        onClick={() => handleTabChange('community')}
                        className={`
                            font-display font-black text-3xl md:text-5xl uppercase tracking-tighter px-6 py-2 border-4 border-black transition-all sticker-shadow
                            ${activeTab === 'community' ? 'bg-electric text-white rotate-1 scale-105' : 'bg-white text-gray-300 hover:text-black hover:rotate-1'}
                        `}
                    >
                        The Drop
                    </button>
                    <button 
                        onClick={() => handleTabChange('personal')}
                        className={`
                            group relative font-display font-black text-3xl md:text-5xl uppercase tracking-tighter px-6 py-2 border-4 border-black transition-all sticker-shadow
                            ${activeTab === 'personal' ? 'bg-highlighter text-black -rotate-1 scale-105' : 'bg-white text-gray-300 hover:text-black hover:-rotate-1'}
                        `}
                    >
                        {/* Lock icon for logged out state hint */}
                        {!currentUser && (
                            <Lock className="w-4 h-4 absolute -top-2 -right-2 text-black bg-hotpink p-0.5 box-content border-2 border-black z-10" />
                        )}
                        My Stash
                    </button>
                </div>
            </div>

            {/* Grid */}
            {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                    {items.map((item, idx) => (
                        <div key={item.id} className={`group relative bg-white p-4 border-4 border-black sticker-shadow transition-transform hover:-translate-y-2 hover:rotate-1 ${idx % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}>
                            {/* Tape Effect */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-highlighter/80 border border-black/10 rotate-[-2deg] z-20"></div>

                            {/* Image Container */}
                            <div className="relative aspect-[3/4] border-2 border-black overflow-hidden mb-4 bg-gray-100">
                                <img src={item.image} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                
                                {/* Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button className="bg-white p-3 rounded-full border-2 border-black hover:bg-hotpink hover:text-white transition-colors">
                                        <Heart className="w-5 h-5" />
                                    </button>
                                    <button className="bg-white p-3 rounded-full border-2 border-black hover:bg-electric hover:text-white transition-colors">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-display font-bold text-xl uppercase leading-none truncate">{item.user}</h3>
                                    <p className="font-mono text-xs text-gray-500 mt-1 uppercase truncate">{item.prompt}</p>
                                </div>
                                <div className="bg-black text-white px-2 py-1 text-xs font-bold font-mono whitespace-nowrap">
                                    #{item.id.toString().slice(-4)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <FolderOpen className="w-20 h-20 mb-4" />
                    <h3 className="font-display text-2xl font-bold uppercase">Stash Empty</h3>
                    <p className="font-mono text-sm">
                        {currentUser ? `Go create something, ${currentUser.handle}!` : 'Login to see your saved items.'}
                    </p>
                </div>
            )}
        </div>
    </section>
  );
};

export default Gallery;
