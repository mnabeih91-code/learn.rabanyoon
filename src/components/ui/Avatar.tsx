import type { ReactNode } from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, color = 'bg-emerald-500', size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  return (
    <div
      className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-soft`}
    >
      {initials}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: 'emerald' | 'amber' | 'rose' | 'slate' | 'blue' | 'teal';
  icon?: ReactNode;
}

export function Badge({ children, color = 'slate', icon }: BadgeProps) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
  };

  return (
    <span className={`badge ${colors[color]}`}>
      {icon}
      {children}
    </span>
  );
}
