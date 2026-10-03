import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  badge,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 lg:p-12 border border-white/[0.08] rounded-[24px] bg-[#0A0A0A]/60 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-[#8052FF]/10 text-[#8052FF] mb-4 border border-[#8052FF]/20">
        {icon}
      </div>

      {badge && (
        <span className="mb-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/[0.05] text-[#BDBDBD] border border-white/[0.08]">
          {badge}
        </span>
      )}

      <h3 className="text-lg font-normal tracking-tight text-white max-w-md">
        {title}
      </h3>

      <p className="mt-2 text-sm text-[#9A9A9A] font-light max-w-md leading-relaxed">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="mt-6 flex items-center gap-3">
          {actionText && onAction && (
            <Button variant="primary" onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
