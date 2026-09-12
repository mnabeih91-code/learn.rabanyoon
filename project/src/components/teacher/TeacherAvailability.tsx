import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  DAY_ORDER,
  DAYS_AR,
  TIME_SLOTS_24H,
  formatTime,
  generate24HourGrid,
} from '../../data/mockData';
import {
  CalendarClock,
  Lock,
  Check,
  Info,
  Users,
  Grid3x3,
  Save,
  RotateCcw,
} from 'lucide-react';
import type { AvailabilitySlot, DayOfWeek } from '../../types';

// 7 days (Saturday → Friday), 48 half-hour slots per day = 336 cells total
const GRID_DAYS = DAY_ORDER as DayOfWeek[];

export function TeacherAvailability() {
  const { teachers, setAvailabilitySlots, currentUser } = useStore();

  // SANDBOX INSULATION: find the logged-in teacher via currentUser.teacher_id
  // (NOT teachers[0]) so a teacher only ever sees their own data.
  const teacher = teachers.find((t) => t.id === currentUser?.teacher_id);

  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');

  // Build a normalized 288-slot grid from the teacher's stored slots.
  // If the teacher has no slots yet (or fewer than 288), seed from the default
  // closed grid so every cell is always renderable.
  const grid: AvailabilitySlot[] = useMemo(() => {
    if (!teacher) return generate24HourGrid();
    const stored = teacher.availability_slots || [];
    if (stored.length === 0) return generate24HourGrid();
    // Merge stored slots into the default grid by (day, start) key
    const base = generate24HourGrid();
    const storedMap = new Map<string, AvailabilitySlot>();
    for (const s of stored) storedMap.set(`${s.day}|${s.start}`, s);
    return base.map((b) => storedMap.get(`${b.day}|${b.start}`) ?? b);
  }, [teacher]);

  // Stats
  const availableCount = grid.filter((s) => s.status === 'available').length;
  const bookedCount = grid.filter((s) => s.status === 'booked').length;
  const closedCount = grid.filter((s) => s.status === 'closed').length;

  // Per-day booked counts (for the day selector badges)
  const bookedByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const day of GRID_DAYS) counts[day] = 0;
    for (const s of grid) if (s.status === 'booked') counts[s.day]++;
    return counts;
  }, [grid]);

  // Toggle a single slot between 'available' and 'closed'.
  // Booked slots are locked and cannot be toggled.
  const handleToggle = useCallback(
    async (day: DayOfWeek, start: string) => {
      if (!teacher) return;
      const idx = grid.findIndex((s) => s.day === day && s.start === start);
      if (idx < 0) return;
      const slot = grid[idx];
      if (slot.status === 'booked') return; // locked

      const nextStatus = slot.status === 'available' ? 'closed' : 'available';
      const updated = grid.slice();
      updated[idx] = { ...slot, status: nextStatus };

      setSaving(true);
      try {
        await setAvailabilitySlots(teacher.id, updated);
      } catch (err) {
        console.error('Failed to save availability grid:', err);
      } finally {
        setSaving(false);
      }
    },
    [teacher, grid, setAvailabilitySlots]
  );

  // Bulk actions for a single day: open all (set available) / close all (set closed)
  const handleBulkDay = useCallback(
    async (day: DayOfWeek, mode: 'open' | 'close') => {
      if (!teacher) return;
      const updated = grid.map((s) =>
        s.day === day && s.status !== 'booked'
          ? { ...s, status: (mode === 'open' ? 'available' : 'closed') as AvailabilitySlot['status'] }
          : s
      );
      setSaving(true);
      try {
        await setAvailabilitySlots(teacher.id, updated);
      } catch (err) {
        console.error('Failed to bulk update day:', err);
      } finally {
        setSaving(false);
      }
    },
    [teacher, grid, setAvailabilitySlots]
  );

  // Reset entire grid to all-closed
  const handleResetAll = useCallback(async () => {
    if (!teacher) return;
    const allClosed = generate24HourGrid().map((s) => ({ ...s, status: 'closed' as const }));
    setSaving(true);
    try {
      await setAvailabilitySlots(teacher.id, allClosed);
    } catch (err) {
      console.error('Failed to reset grid:', err);
    } finally {
      setSaving(false);
    }
  }, [teacher, setAvailabilitySlots]);

  if (!teacher) {
    return (
      <div className="card p-12 text-center">
        <CalendarClock size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا يوجد معلم مسجّل</p>
      </div>
    );
  }

  // Which days to render
  const daysToRender =
    selectedDay === 'all' ? GRID_DAYS : [selectedDay as DayOfWeek];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-l from-emerald-600 to-emerald-700 text-white border-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Grid3x3 size={26} />
              مصفوفة الـ 24 ساعة
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              تحكم في أوقات توفّرك — {teacher.name}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{availableCount}</p>
              <p className="text-xs text-emerald-100">متاح</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{bookedCount}</p>
              <p className="text-xs text-emerald-100">محجوز</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{closedCount}</p>
              <p className="text-xs text-emerald-100">مغلق</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend + instructions */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700 text-sm">دليل الألوان</h3>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-200 border border-slate-300" />
              <span className="text-slate-600">مغلق — اضغط للتوفير</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500 border border-emerald-600 flex items-center justify-center">
                <Check size={12} className="text-white" />
              </span>
              <span className="text-slate-600">متاح — اضغط للإغلاق</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-rose-500 border border-rose-600 flex items-center justify-center">
                <Lock size={10} className="text-white" />
              </span>
              <span className="text-slate-600">محجوز — مقفل</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          اضغط على أي خلية للتبديل بين «متاح» و«مغلق». الخلايا المحجوزة (التي
          حجزها الطلاب) مقفلة ولا يمكن تعديلها. يمكنك فتح/إغلاق يوم كامل دفعة
          واحدة باستخدام أزرار اليوم.
        </p>
      </div>

      {/* Day filter selector */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={18} className="text-emerald-600" />
          <h3 className="font-semibold text-slate-700 text-sm">عرض الأيام</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
              selectedDay === 'all'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            كل الأيام
          </button>
          {GRID_DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all flex items-center gap-1.5 ${
                selectedDay === day
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {DAYS_AR[day]}
              {bookedByDay[day] > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                  {bookedByDay[day]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* The 24-hour matrix grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Grid3x3 size={18} className="text-emerald-600" />
            شبكة الـ 30 دقيقة
          </h3>
          <button
            onClick={handleResetAll}
            disabled={saving}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
          >
            <RotateCcw size={14} />
            إغلاق الكل
          </button>
        </div>

        {/* Scrollable matrix: each day is a row, each 30-min slot is a column */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Time axis header (X axis) */}
            <div className="flex sticky top-0 z-10 mb-1">
              {/* Corner cell — day label column */}
              <div className="w-20 flex-shrink-0 sticky right-0 z-20 bg-white">
                <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  الوقت
                </div>
              </div>
              {/* 48 time columns */}
              <div className="flex">
                {TIME_SLOTS_24H.map((t) => {
                  // Only label every other slot to reduce clutter
                  const showLabel = t.endsWith(':00');
                  return (
                    <div
                      key={t}
                      className="w-7 flex-shrink-0 h-7 flex items-center justify-center"
                      title={formatTime(t)}
                    >
                      {showLabel && (
                        <span className="text-[9px] text-slate-400 ltr-nums -rotate-45 origin-center whitespace-nowrap">
                          {formatTime(t).replace(':00', '')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Trailing actions column */}
              <div className="w-24 flex-shrink-0 sticky left-0 z-20 bg-white">
                <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  إجراءات
                </div>
              </div>
            </div>

            {/* Day rows */}
            <div className="space-y-1.5">
              {daysToRender.map((day) => {
                const daySlots = grid.filter((s) => s.day === day);
                const dayAvailable = daySlots.filter(
                  (s) => s.status === 'available'
                ).length;
                const dayBooked = daySlots.filter(
                  (s) => s.status === 'booked'
                ).length;

                return (
                  <div key={day} className="flex items-center">
                    {/* Day label (Y axis) */}
                    <div className="w-20 flex-shrink-0 sticky right-0 z-10 bg-white">
                      <div className="h-7 flex flex-col items-center justify-center px-1">
                        <span className="text-xs font-bold text-slate-700 leading-tight">
                          {DAYS_AR[day]}
                        </span>
                      </div>
                    </div>

                    {/* 48 slot cells */}
                    <div className="flex gap-px">
                      {TIME_SLOTS_24H.map((t) => {
                        const slot = daySlots.find((s) => s.start === t);
                        const status = slot?.status || 'closed';
                        const isBooked = status === 'booked';
                        const isAvailable = status === 'available';
                        const cellKey = `${day}-${t}`;
                        const isHovered = hovered === cellKey;

                        return (
                          <button
                            key={t}
                            onClick={() => handleToggle(day, t)}
                            disabled={isBooked || saving}
                            onMouseEnter={() => setHovered(cellKey)}
                            onMouseLeave={() => setHovered(null)}
                            title={
                              isBooked
                                ? `${DAYS_AR[day]} ${formatTime(t)} — محجوز${
                                    slot?.student_name
                                      ? ` (${slot.student_name})`
                                      : ''
                                  }`
                                : `${DAYS_AR[day]} ${formatTime(t)} — ${
                                    isAvailable ? 'متاح' : 'مغلق'
                                  }`
                            }
                            className={`w-7 h-7 flex-shrink-0 rounded-md border transition-all duration-150 ${
                              isBooked
                                ? 'bg-rose-500 border-rose-600 cursor-not-allowed'
                                : isAvailable
                                ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 active:scale-90'
                                : 'bg-slate-200 border-slate-300 hover:bg-slate-300 active:scale-90'
                            } ${isHovered && !isBooked ? 'ring-2 ring-emerald-400 ring-offset-1' : ''} ${
                              saving ? 'opacity-70' : ''
                            }`}
                          >
                            {isBooked && (
                              <Lock
                                size={10}
                                className="text-white mx-auto"
                              />
                            )}
                            {isAvailable && (
                              <Check
                                size={12}
                                className="text-white mx-auto"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day actions column */}
                    <div className="w-24 flex-shrink-0 sticky left-0 z-10 bg-white flex items-center gap-1 px-1">
                      <button
                        onClick={() => handleBulkDay(day, 'open')}
                        disabled={saving}
                        title={`فتح كل ${DAYS_AR[day]}`}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                      >
                        فتح
                      </button>
                      <button
                        onClick={() => handleBulkDay(day, 'close')}
                        disabled={saving}
                        title={`إغلاق كل ${DAYS_AR[day]}`}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-60"
                      >
                        إغلاق
                      </button>
                    </div>

                    {/* Day mini-stats */}
                    <div className="flex-shrink-0 mr-2 flex items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                        <Check size={10} />
                        {dayAvailable}
                      </span>
                      {dayBooked > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold">
                          <Users size={10} />
                          {dayBooked}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-600">
            <Save size={14} className="animate-pulse" />
            جاري حفظ التغييرات...
          </div>
        )}
      </div>

      {/* Booked slots detail list */}
      {bookedCount > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-rose-500" />
            الحصص المحجوزة
            <span className="text-sm font-normal text-slate-400">
              ({bookedCount})
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {grid
              .filter((s) => s.status === 'booked')
              .sort((a, b) =>
                a.day === b.day
                  ? a.start.localeCompare(b.start)
                  : GRID_DAYS.indexOf(a.day) - GRID_DAYS.indexOf(b.day)
              )
              .map((s, i) => (
                <div
                  key={`${s.day}-${s.start}-${i}`}
                  className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <Lock size={14} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {s.student_name || 'محجوز'}
                    </p>
                    <p className="text-xs text-slate-400 ltr-nums">
                      {DAYS_AR[s.day]} — {formatTime(s.start)} إلى{' '}
                      {formatTime(s.end)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
