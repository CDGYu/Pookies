import { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`bg-white rounded-2xl border border-[var(--cookie-100)] shadow-sm ${className}`}
    />
  );
}
