import React from 'react';

interface SFGIconProps { size?: number; }

// SFG-style gradient checkmark icon
const SFGIcon: React.FC<SFGIconProps> = ({ size = 18 }) => {
  const gradId = 'sfgChk_' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e"/>
          <stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
      </defs>
      <g>
        <rect x="3" y="3" width="18" height="18" rx="6" fill={`url(#${gradId})`} stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        <path d="M8.2 12.2l2.3 2.3 5.3-5.3" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
};

export default SFGIcon;
