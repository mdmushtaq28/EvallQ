import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8052FF]/40 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] tracking-tight';

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#8052FF] hover:bg-[#6E3EF0] text-white shadow-sm shadow-[#8052FF]/20 focus:ring-[#8052FF]/50',
    secondary: 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9A9A9A] hover:text-white border border-white/[0.08] hover:border-white/[0.18]',
    outline: 'border border-white/[0.14] hover:border-white/[0.28] text-white hover:bg-white/[0.04]',
    ghost: 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.05]',
    danger: 'bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/30',
    accent: 'bg-[#8052FF] hover:bg-[#6E3EF0] text-white shadow-sm shadow-[#8052FF]/25 font-medium',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : (
        icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
};
