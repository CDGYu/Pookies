import { ReactNode } from 'react';

export function SectionHeader({ title, subtitle, action, className = '' }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[var(--cocoa)] text-xl">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-[var(--sand)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
