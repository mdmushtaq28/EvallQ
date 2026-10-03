import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0A0A0A] border border-white/[0.08] rounded-[24px] p-6 lg:p-7 transition-all duration-200 ${
        hoverable ? 'hover:border-white/[0.18] hover:bg-[#0E0E0E] cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className = '' }) => {
  return (
    <div className={`flex items-start justify-between mb-5 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-[#8052FF]/10 border border-[#8052FF]/20 text-[#8052FF]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-normal tracking-tight text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[#9A9A9A] font-light mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
