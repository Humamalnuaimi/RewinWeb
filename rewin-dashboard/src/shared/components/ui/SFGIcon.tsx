import React from 'react';

interface SFGIconProps {
  size?: number;
}

// SFG-style icon: gradient gem with spark (no text)
const SFGIcon: React.FC<SFGIconProps> = ({ size = 18 }) => {
  const gradId = 'sfgStyle_' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#667eea"/>
          <stop offset="100%" stopColor="#764ba2"/>
        </linearGradient>
        <filter id="sfgGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#sfgGlow)">
        <rect x="3" y="3" width="18" height="18" rx="5" fill={`url(#${gradId})`} stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        {/* Spark */}
        <path d="M12 6.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" fill="#fff" opacity="0.95"/>
        {/* Shine */}
        <path d="M7.2 7.2c0-.4.3-.7.7-.7h0c.4 0 .7.3.7.7v0c0 .4-.3.7-.7.7h0c-.4 0-.7-.3-.7-.7z" fill="#fff" opacity="0.55"/>
      </g>
    </svg>
  );
};

export default SFGIcon;
