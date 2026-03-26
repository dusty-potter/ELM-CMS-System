import React from 'react';

export const Logo: React.FC<{ className?: string; showText?: boolean }> = ({ className = "w-8 h-8", showText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ear Shape */}
        <path 
          d="M50 10C30 10 15 25 15 45C15 65 30 80 50 80C55 80 60 78 65 75" 
          stroke="#00AEEF" 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        <path 
          d="M50 25C40 25 32 33 32 45C32 57 40 65 50 65" 
          stroke="#00AEEF" 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        {/* Sound Waves */}
        <line x1="75" y1="35" x2="75" y2="55" stroke="#00AEEF" strokeWidth="6" strokeLinecap="round" />
        <line x1="85" y1="40" x2="85" y2="50" stroke="#00AEEF" strokeWidth="6" strokeLinecap="round" />
        <line x1="65" y1="30" x2="65" y2="60" stroke="#00AEEF" strokeWidth="6" strokeLinecap="round" />
        {/* Orange Dot */}
        <circle cx="50" cy="45" r="6" fill="#FF8C00" />
      </svg>
      {showText && (
        <span className="font-bold text-xl tracking-tight text-white">
          Ear Level <span className="text-brand-blue">CMS</span>
        </span>
      )}
    </div>
  );
};
