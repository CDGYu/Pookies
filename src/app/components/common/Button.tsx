import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]',
  secondary: 'bg-white text-[var(--matcha-800)] border border-[var(--cookie-100)] hover:bg-[var(--cream)]',
  ghost:     'bg-transparent text-[var(--taupe)] hover:bg-[var(--cream)]',
  danger:    'bg-[var(--critical)] text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}
