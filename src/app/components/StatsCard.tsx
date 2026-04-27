import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  variant: 'matcha' | 'alert' | 'cream' | 'specialty' | 'critical';
}

// Theme map — all cards use the Pookies matcha/cream palette
const variantClasses = {
  matcha:   { icon: 'bg-[#4A7C59] text-white',       card: 'border-[#B8D9C2]', value: 'text-[#2D5A3D]' },
  alert:    { icon: 'bg-[#D97706] text-white',       card: 'border-[#FDE68A]', value: 'text-[#92400E]' },
  critical: { icon: 'bg-[#C0392B] text-white',       card: 'border-[#FECACA]', value: 'text-[#7F1D1D]' },
  cream:    { icon: 'bg-[#E8B97A] text-white',       card: 'border-[#F0DCC0]', value: 'text-[#7A4F1E]' },
  specialty:{ icon: 'bg-[#5B4E8C] text-white',       card: 'border-[#D3CCEE]', value: 'text-[#3E3268]' },
};

export function StatsCard({ icon, label, value, variant }: StatsCardProps) {
  const cls = variantClasses[variant];
  return (
    <div className={`bg-white rounded-2xl border ${cls.card} p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`${cls.icon} rounded-xl p-3 shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[#9A8F86] text-xs">{label}</p>
        <p
          className={`${cls.value} mt-0.5 truncate`}
          style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
