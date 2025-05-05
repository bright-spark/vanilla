import React from 'react';

interface StatusLEDProps {
  status: 'idle' | 'waiting' | 'error' | 'new-message' | 'recovered';
  theme: 'light' | 'dark';
}

const StatusLED: React.FC<StatusLEDProps> = ({ status, theme }) => {
  let baseColor, glowColor, gradientStyle;
  
  if (status === 'waiting') {
    // Shiny orange
    baseColor = '#f97316';
    glowColor = 'rgba(249,115,22,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #fb923c, #f97316, #ea580c)';
  } else if (status === 'error') {
    // Shiny red
    baseColor = '#dc2626';
    glowColor = 'rgba(220,38,38,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626, #b91c1c)';
  } else if (status === 'new-message') {
    // Shiny blue
    baseColor = '#3b82f6';
    glowColor = 'rgba(59,130,246,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #2563eb)';
  } else if (status === 'recovered') {
    // Shiny green
    baseColor = '#22c55e';
    glowColor = 'rgba(34,197,94,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #4ade80, #22c55e, #16a34a)';
  } else {
    // Idle: white in dark mode, off-white in light mode
    if (theme === 'dark') {
      baseColor = '#fff';
      glowColor = 'rgba(255,255,255,0.7)';
      gradientStyle = 'radial-gradient(circle at 30% 30%, #fff, #f3f4f6, #d1d5db)';
    } else {
      baseColor = '#d1d5db';
      glowColor = 'rgba(209,213,219,0.7)';
      gradientStyle = 'radial-gradient(circle at 30% 30%, #f3f4f6, #d1d5db, #9ca3af)';
    }
  }

  return (
    <div 
      className="relative w-3 h-3 rounded-full"
      style={{ 
        background: gradientStyle,
        boxShadow: `0 0 5px ${glowColor}, 0 0 10px ${glowColor}`
      }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-full rounded-full animate-pulse"
        style={{ 
          background: 'transparent',
          boxShadow: `0 0 5px ${baseColor}, 0 0 10px ${baseColor}, 0 0 15px ${baseColor}`,
          opacity: status === 'idle' ? 0 : 0.7,
          animationDuration: '1.5s'
        }}
      />
    </div>
  );
};

export default StatusLED;
