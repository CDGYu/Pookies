import { HTMLAttributes } from 'react';

type Tone = 'matcha' | 'alert' | 'critical' | 'neutral';

const TONES: Record<Tone, string> = {
  matcha:   'bg-[var(--mint)] text-[var(--matcha-800)] border-[var(--mint-border)]',
  alert:    'bg-[var(--alert-bg)] text-[var(--alert)] border-[var(--alert)]/40',
  critical: 'bg-[var(--critical-bg)] text-[var(--critical)] border-[var(--critical)]/40',
  neutral:  'bg-stone-100 text-stone-700 border-stone-300',
};

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}
    />
  );
}
