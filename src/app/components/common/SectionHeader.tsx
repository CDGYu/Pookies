import { ReactNode } from 'react';

export function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
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
