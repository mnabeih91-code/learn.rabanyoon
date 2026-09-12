import type { DayOfWeek } from '../types';

export const DAYS_AR: Record<DayOfWeek, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
};

export const DAY_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const SUBSCRIPTION_LABELS = {
  paid: { label: 'مدفوع', color: 'emerald' },
  pending: { label: 'معلق', color: 'amber' },
  overdue: { label: 'متأخر', color: 'rose' },
} as const;

export const ATTENDANCE_OPTIONS = [
  { value: 'حاضر', label: 'حاضر' },
  { value: 'اعتذار المعلم', label: 'اعتذار المعلم' },
  { value: 'اعتذار الطالب بعذر', label: 'اعتذار الطالب بعذر' },
  { value: 'غائب بدون عذر', label: 'غائب بدون عذر' },
] as const;

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayDay(): DayOfWeek {
  const jsDay = new Date().getDay();
  const map: DayOfWeek[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  ];
  return map[jsDay];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

// Generate 48 half-hour time labels for the 24-hour grid (00:00 to 23:30)
export const TIME_SLOTS_24H: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

// Generate a full 24-hour availability grid (48 slots × 7 days = 336 slots)
// Default: 12:00 AM – 6:00 AM = 'closed' (red), 6:00 AM – 11:59 PM = 'available' (green)
import type { AvailabilitySlot } from '../types';

export function generate24HourGrid(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (const day of DAY_ORDER) {
    for (let i = 0; i < 48; i++) {
      const start = TIME_SLOTS_24H[i];
      const end = TIME_SLOTS_24H[i + 1] || '24:00';
      const hour = Math.floor(i / 2);
      const status = hour >= 6 ? 'available' : 'closed';
      slots.push({ day, start, end, status, student_name: null });
    }
  }
  return slots;
}

// Convert old-style availability_slots to 24-hour grid
export function migrateTo24HourGrid(oldSlots: AvailabilitySlot[]): AvailabilitySlot[] {
  const grid = generate24HourGrid();
  for (const old of oldSlots) {
    const idx = grid.findIndex(
      (s) => s.day === old.day && s.start === old.start
    );
    if (idx >= 0) {
      grid[idx] = { ...grid[idx], status: old.status, student_name: old.student_name };
    }
  }
  return grid;
}

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function getMonthName(month: number): string {
  return MONTHS_AR[month] || '';
}
