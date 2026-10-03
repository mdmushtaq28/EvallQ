import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantClasses = {
    default: 'bg-white/[0.04] text-[#BDBDBD] border border-white/[0.08]',
    success: 'bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30',
    warning: 'bg-[#FFB829]/15 text-[#FFB829] border border-[#FFB829]/30',
    danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    brand: 'bg-[#8052FF]/15 text-[#8052FF] border border-[#8052FF]/30',
    accent: 'bg-[#8052FF]/15 text-[#9A75FF] border border-[#8052FF]/30 font-medium',
    outline: 'border border-white/[0.12] text-[#9A9A9A]',
  };

  const dotClasses = {
    default: 'bg-[#9A9A9A]',
    success: 'bg-[#15846E] animate-pulse',
    warning: 'bg-[#FFB829]',
    danger: 'bg-rose-500',
    brand: 'bg-[#8052FF]',
    accent: 'bg-[#8052FF]',
    outline: 'bg-[#9A9A9A]',
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
};
