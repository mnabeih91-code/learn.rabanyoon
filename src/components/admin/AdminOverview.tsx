import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  formatCurrency,
  getTodayDay,
  getTodayISO,
  DAYS_AR,
  DAY_ORDER,
  SUBSCRIPTION_LABELS,
} from '../../data/mockData';
import type { SubscriptionStatus, DayOfWeek } from '../../types';
import {
  Users,
  GraduationCap,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ClipboardList,
} from 'lucide-react';
import type { ReactNode } from 'react';

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend?: { value: string; up: boolean };
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-soft`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold ${
              trend.up ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {trend.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

const SUB_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; color: string; text: string; icon: ReactNode }
> = {
  paid: {
    label: SUBSCRIPTION_LABELS.paid.label,
    color: 'bg-emerald-500',
    text: 'text-emerald-600',
    icon: <CheckCircle2 size={14} />,
  },
  pending: {
    label: SUBSCRIPTION_LABELS.pending.label,
    color: 'bg-amber-500',
    text: 'text-amber-600',
    icon: <Clock size={14} />,
  },
  overdue: {
    label: SUBSCRIPTION_LABELS.overdue.label,
    color: 'bg-rose-500',
    text: 'text-rose-600',
    icon: <AlertCircle size={14} />,
  },
};

export function AdminOverview() {
  const { teachers, students, sessionLogs, loading } = useStore();
  const todayDay = getTodayDay();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);

  const activeStudents = students.filter((s) => !s.is_paused).length;
  const activeTeachers = teachers.filter((t) => t.is_active !== false).length;

  // Revenue: sum of monthly fees for paid students (exclude paused)
  const totalRevenue = students
    .filter((s) => s.subscription_status === 'paid' && !s.is_paused)
    .reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

  // Attendance rate today
  const todayISO = getTodayISO();
  const loggedToday = sessionLogs.filter((l) => l.date?.split('T')[0] === todayISO);
  const presentToday = loggedToday.filter((l) => l.attendance_status === 'حاضر').length;
  const totalLogged = loggedToday.length;
  const attendanceRate = totalLogged > 0 ? Math.round((presentToday / totalLogged) * 100) : 0;

  // Subscription status breakdown
  const subCounts: Record<SubscriptionStatus, number> = {
    paid: students.filter((s) => s.subscription_status === 'paid' && !s.is_paused).length,
    pending: students.filter((s) => s.subscription_status === 'pending' && !s.is_paused).length,
    overdue: students.filter((s) => s.subscription_status === 'overdue' && !s.is_paused).length,
  };

  // ===== Daily Supervision Grid =====
  // For the selected day, count each teacher's booked slots (active sessions today)
  const supervisionRows = teachers
    .map((teacher) => {
      const bookedSlots = (teacher.availability_slots || []).filter(
        (slot) => slot.day === selectedDay && slot.status === 'booked'
      );
      return {
        teacher,
        sessionCount: bookedSlots.length,
      };
    })
    .filter((row) => row.sessionCount > 0) // hide teachers with 0 sessions
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const totalSessionsToday = supervisionRows.reduce((sum, r) => sum + r.sessionCount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">لوحة التحليلات</h2>
          <p className="text-slate-500 mt-1">جارٍ التحميل...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4" />
              <div className="h-4 bg-slate-200 rounded mb-2 w-2/3" />
              <div className="h-7 bg-slate-200 rounded mb-1 w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">لوحة التحليلات</h2>
        <p className="text-slate-500 mt-1">نظرة عامة على أداء الأكاديمية — {DAYS_AR[todayDay]}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الطلاب"
          value={activeStudents.toString()}
          subtitle="طالب نشط"
          icon={<Users size={24} />}
          color="bg-emerald-500"
          trend={{ value: `${activeStudents} طالب`, up: true }}
        />
        <StatCard
          title="المعلمون النشطون"
          value={activeTeachers.toString()}
          subtitle="معلم معتمد"
          icon={<GraduationCap size={24} />}
          color="bg-slate-600"
          trend={{ value: `${activeTeachers} معلم`, up: true }}
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(totalRevenue)}
          subtitle="من الطلاب المدفوعين"
          icon={<DollarSign size={24} />}
          color="bg-teal-500"
          trend={{ value: `${subCounts.paid} مدفوع`, up: true }}
        />
        <StatCard
          title="معدل الحضور"
          value={`${attendanceRate}%`}
          subtitle={`${totalLogged} حصة مسجلة اليوم`}
          icon={<CalendarCheck size={24} />}
          color="bg-blue-500"
          trend={{ value: `${presentToday} حاضر`, up: true }}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Supervision Grid */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800">جدول الإشراف والرقابة اليومي الصارم</h3>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <select
                className="input-field py-2 text-sm w-auto"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
              >
                {DAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAYS_AR[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                    اسم المعلم
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                    عدد الحلقات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisionRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-slate-400">
                      <ClipboardList size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        لا توجد حلقات نشطة في {DAYS_AR[selectedDay]}
                      </p>
                    </td>
                  </tr>
                ) : (
                  supervisionRows.map(({ teacher, sessionCount }) => (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                            {teacher.name
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{teacher.name}</p>
                            <p className="text-xs text-slate-400">{teacher.subject || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                          {sessionCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {supervisionRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-5 py-3 text-sm font-bold text-slate-600">الإجمالي</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full bg-slate-800 text-white font-bold text-sm">
                        {totalSessionsToday}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4">حالة الاشتراكات</h3>
          <div className="space-y-4">
            {(['paid', 'pending', 'overdue'] as const).map((status) => {
              const count = subCounts[status];
              const meta = SUB_STATUS_META[status];
              const pct = activeStudents > 0 ? (count / activeStudents) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className={`text-sm font-bold ${meta.text}`}>{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${meta.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">إجمالي الطلاب</span>
              <span className="text-lg font-bold text-slate-800">{activeStudents}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-500">إجمالي الحصص المسجلة</span>
              <span className="text-lg font-bold text-slate-800">{sessionLogs.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
