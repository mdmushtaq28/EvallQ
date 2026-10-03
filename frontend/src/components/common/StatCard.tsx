import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  accentColor = 'indigo',
}) => {
  const colorMap = {
    indigo: 'bg-[#8052FF]/10 text-[#8052FF] border-[#8052FF]/20',
    emerald: 'bg-[#15846E]/15 text-[#34D399] border-[#15846E]/30',
    amber: 'bg-[#FFB829]/15 text-[#FFB829] border-[#FFB829]/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <Card className="relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wider">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-light tracking-tight text-white">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  trend.positive
                    ? 'bg-[#15846E]/20 text-[#34D399] border border-[#15846E]/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-[#9A9A9A] font-light">
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-2xl border ${colorMap[accentColor]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
