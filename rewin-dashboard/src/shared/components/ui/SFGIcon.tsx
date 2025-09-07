import React from 'react';

interface SFGIconProps {
  size?: number;
}

const SFGIcon: React.FC<SFGIconProps> = ({ size = 18 }) => {
  const id = 'sfgGrad_' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#667eea"/>
          <stop offset="100%" stopColor="#764ba2"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${id})`} stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      <text x="12" y="15" textAnchor="middle" fontSize="9" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fill="#fff">SFG</text>
    </svg>
  );
};

export default SFGIcon;
