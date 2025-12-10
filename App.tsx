
import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import SocialProofMarquee from './components/SocialProofMarquee';
import Gallery from './components/Gallery';
import AuthModal from './components/AuthModal';
import { Aperture, User as UserIcon, LogOut } from 'lucide-react';

// Simple user type
export interface UserProfile {
  handle: string;
  isGuest: boolean;
}

const App: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Load user from session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('magic_mirror_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (handle: string) => {
    const user = { handle, isGuest: false };
    setCurrentUser(user);
    localStorage.setItem('magic_mirror_user', JSON.stringify(user));
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('magic_mirror_user');
  };

  const handleGalleryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event('navigate-gallery'));
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="w-full min-h-screen bg-paper relative">
      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={handleLogin} 
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-4 pointer-events-none">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 pointer-events-auto bg-white/80 backdrop-blur-md p-1 pr-3 rounded-full border border-black/10 shadow-sm">
            <div className="bg-black text-white p-2 border-2 border-transparent hover:border-hotpink hover:bg-white hover:text-black transition-colors rounded-full cursor-pointer animate-spin-slow">
              <Aperture className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter uppercase hidden md:block">Magic Mirror</span>
          </div>
          
          {/* Nav */}
          <nav className="pointer-events-auto flex gap-4 items-center bg-white/90 backdrop-blur-md px-6 py-3 border-2 border-black sticker-shadow rounded-full">
            <a 
              href="#gallery" 
              onClick={handleGalleryClick}
              className="font-bold font-mono text-sm underline decoration-wavy decoration-hotpink decoration-2 hover:text-electric transition-colors"
            >
              GALLERY
            </a>
            
            <div className="w-px h-4 bg-gray-300"></div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-hotpink rounded-full border border-black"></div>
                    <span className="font-display font-bold uppercase">{currentUser.handle}</span>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="text-gray-400 hover:text-red-500 transition-colors"
                   title="Logout"
                 >
                   <LogOut className="w-4 h-4" />
                 </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="font-bold font-mono text-sm hover:text-hotpink transition-colors flex items-center gap-2"
              >
                LOGIN <UserIcon className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Pass currentUser to children via props or just rely on localStorage inside them for this demo level */}
      <Hero currentUser={currentUser} />
      <SocialProofMarquee />
      <Gallery currentUser={currentUser} onLoginReq={() => setIsAuthModalOpen(true)} />
    </main>
  );
};

export default App;
