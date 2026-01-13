
import React from 'react';

interface NeonButtonProps {
  label: string;
  onClick: () => void;
  color: string;
  glowColor: string;
  disabled?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({ 
  label, 
  onClick, 
  color, 
  glowColor, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-8 py-3 
        rounded-sm 
        border-2 
        font-['Orbitron'] 
        font-bold 
        uppercase 
        tracking-widest
        transition-all duration-150 active:scale-95
        hover:brightness-125
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        borderColor: color,
        color: color,
        textShadow: `0 0 5px ${glowColor}, 0 0 10px ${glowColor}`,
        boxShadow: `0 0 5px ${glowColor}, inset 0 0 5px ${glowColor}`,
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget;
        target.style.boxShadow = `0 0 20px ${glowColor}, inset 0 0 10px ${glowColor}`;
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget;
        target.style.boxShadow = `0 0 5px ${glowColor}, inset 0 0 5px ${glowColor}`;
      }}
    >
      {label}
    </button>
  );
};
