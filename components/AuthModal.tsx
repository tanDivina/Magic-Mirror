
import React, { useState } from 'react';
import { X, ArrowRight, Zap } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (handle: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
  const [handle, setHandle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handle.trim().length > 1) {
      // Add @ if missing
      const finalHandle = handle.startsWith('@') ? handle : `@${handle}`;
      onLogin(finalHandle.toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-white border-4 border-black p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(255,0,153,1)] rotate-1">
        
        {/* Decorative Tape */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-highlighter/90 border border-black rotate-[-2deg] z-10"></div>

        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-2 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-block bg-black text-white px-3 py-1 font-mono text-xs font-bold mb-2">
            MEMBER ACCESS
          </div>
          <h2 className="font-display font-black text-4xl uppercase leading-none">
            Join The <span className="text-electric">Collective</span>
          </h2>
          <p className="font-serif italic mt-2 text-gray-600">
            Save your remixes to the cloud.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <label className="block font-mono text-xs font-bold uppercase mb-1 ml-1">Choose Handle</label>
            <div className="relative flex items-center">
                <span className="absolute left-3 font-display font-bold text-xl text-gray-400">@</span>
                <input 
                    type="text" 
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="FUTURE_ARTIST"
                    className="w-full bg-paper border-2 border-black p-3 pl-8 font-display font-bold text-xl focus:outline-none focus:ring-2 focus:ring-hotpink transition-all uppercase placeholder-gray-300"
                    autoFocus
                />
            </div>
          </div>

          <button 
            type="button" // Mocking Google/Auth provider
            className="w-full bg-white border-2 border-black py-3 flex items-center justify-center gap-2 font-mono text-sm font-bold hover:bg-gray-50 transition-colors opacity-60 cursor-not-allowed"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            CONTINUE WITH GOOGLE (SOON)
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t-2 border-black/10"></div>
            <span className="flex-shrink mx-4 text-gray-400 font-mono text-xs">OR USE HANDLE</span>
            <div className="flex-grow border-t-2 border-black/10"></div>
          </div>

          <button 
            type="submit"
            className="w-full bg-electric text-white border-2 border-black py-4 font-display font-bold text-xl uppercase tracking-widest hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 group"
          >
            Enter Studio <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="font-mono text-[10px] text-gray-400">
                BY ENTERING YOU AGREE TO REMIX REALITY.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
