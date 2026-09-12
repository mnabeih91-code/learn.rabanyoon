import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  formatCurrency,
  formatDate,
  SUBSCRIPTION_LABELS,
  MONTHS_AR,
  getMonthName,
} from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import type { SubscriptionStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Search,
  ChevronDown,
  Check,
  Wallet,
  Calendar,
  Save,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

const STATUS_ORDER: SubscriptionStatus[] = ['paid', 'pending', 'overdue'];

const statusConfig: Record<
  SubscriptionStatus,
  { icon: React.ReactNode; bg: string; text: string; label: string; dot: string; border: string }
> = {
  paid: {
    icon: <CheckCircle2 size={14} />,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'مدفوع',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  pending: {
    icon: <Clock size={14} />,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'معلق',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  overdue: {
    icon: <AlertCircle size={14} />,
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: 'متأخر',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
  },
};

function StatusDropdown({
  current,
  onChange,
}: {
  current: SubscriptionStatus;
  onChange: (status: SubscriptionStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sc = statusConfig[current];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`badge ${sc.bg} ${sc.text} cursor-pointer hover:opacity-80 transition-all pr-2 pl-3`}
      >
        {sc.icon}
        {sc.label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-36 bg-white rounded-xl shadow-elevated border border-slate-200 py-1 z-30 animate-scale-in origin-top-left">
          {STATUS_ORDER.map((status) => {
            const opt = statusConfig[status];
            const isActive = status === current;
            return (
              <button
                key={status}
                onClick={() => {
                  onChange(status);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                <span className={opt.text}>{opt.label}</span>
                {isActive && <Check size={14} className="mr-auto text-slate-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminFinance() {
  const {
    students,
    teachers,
    sessionLogs,
    payroll,
    setSubscriptionStatus,
    updatePayroll,
    financials,
    confirmStripePayment,
    runAutoBilling,
  } = useStore();
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  // Subscription month/year filter (same logic as payroll)
  const now = new Date();
  const [subMonth, setSubMonth] = useState(now.getMonth());
  const [subYear, setSubYear] = useState(now.getFullYear());
  const subYears = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  // Payroll month/year filter
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth());
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());

  // Filter students by subscription status, search, AND selected month/year
  // EXCLUDE paused students from the financial ledger
  // A student is "relevant" to a month/year if their created_at or expiry_date falls in that period
  const filtered = students.filter((s) => {
    if (s.is_paused) return false; // Paused students excluded from financial ledger
    if (filter !== 'all' && s.subscription_status !== filter) return false;
    if (search && !s.name.includes(search)) return false;

    // Month/Year filter: show students whose created_at month/year matches,
    // or whose expiry_date month/year matches, or who have a financial record in that period
    const createdDate = new Date(s.created_at);
    const createdMatch = createdDate.getMonth() === subMonth && createdDate.getFullYear() === subYear;

    let expiryMatch = false;
    if (s.expiry_date) {
      const expDate = new Date(s.expiry_date);
      expiryMatch = expDate.getMonth() === subMonth && expDate.getFullYear() === subYear;
    }

    return createdMatch || expiryMatch;
  });

  // Summary cards also exclude paused students
  const activeStudents = students.filter((s) => !s.is_paused);
  const totalPaid = activeStudents
    .filter((s) => s.subscription_status === 'paid')
    .reduce((sum, s) => sum + s.monthly_fee, 0);
  const totalPending = activeStudents
    .filter((s) => s.subscription_status === 'pending')
    .reduce((sum, s) => sum + s.monthly_fee, 0);
  const totalOverdue = activeStudents
    .filter((s) => s.subscription_status === 'overdue')
    .reduce((sum, s) => sum + s.monthly_fee, 0);

  const paidCount = activeStudents.filter((s) => s.subscription_status === 'paid').length;
  const pendingCount = activeStudents.filter((s) => s.subscription_status === 'pending').length;
  const overdueCount = activeStudents.filter((s) => s.subscription_status === 'overdue').length;

  // Pending Stripe payments awaiting admin confirmation
  const pendingStripePayments = financials.filter(
    (f) => f.stripe_checkout_session_id && !f.admin_confirmed && f.status === 'pending'
  );

  // Only active teachers appear in payroll calculations
  const payrollRows = teachers.filter((t) => t.is_active !== false).map((teacher) => {
    const monthLogs = sessionLogs.filter((l) => {
      if (l.teacher_id !== teacher.id) return false;
      const d = new Date(l.date);
      return d.getMonth() === payrollMonth && d.getFullYear() === payrollYear;
    });
    const attended = monthLogs.filter((l) => l.attendance_status === 'حاضر').reduce((sum, l) => sum + (l.session_count || 1), 0);
    const teacherCanceled = monthLogs.filter((l) => l.attendance_status === 'اعتذار المعلم').reduce((sum, l) => sum + (l.session_count || 1), 0);
    const studentExcused = monthLogs.filter((l) => l.attendance_status === 'اعتذار الطالب بعذر').reduce((sum, l) => sum + (l.session_count || 1), 0);
    const studentAbsent = monthLogs.filter((l) => l.attendance_status === 'غائب بدون عذر').reduce((sum, l) => sum + (l.session_count || 1), 0);
    // Teacher is owed for every session EXCEPT the ones they themselves canceled.
    const payableSessions = monthLogs.reduce((sum, l) => l.attendance_status === 'اعتذار المعلم' ? sum : sum + (l.session_count || 1), 0);
    const netEarned = payableSessions * (teacher.salary_per_session || 0);

    // Get payroll entry for this teacher/month/year
    const entry = payroll.find(
      (p) => p.teacher_id === teacher.id && p.month === payrollMonth && p.year === payrollYear
    );
    const bonuses = entry?.bonuses || 0;
    const deductions = entry?.deductions || 0;
    const netTotal = netEarned + bonuses - deductions;

    return {
      teacher,
      totalSessions: monthLogs.length,
      attended,
      teacherCanceled,
      studentExcused,
      studentAbsent,
      payableSessions,
      netEarned,
      bonuses,
      deductions,
      netTotal,
    };
  });

  const totalPayroll = payrollRows.reduce((sum, r) => sum + r.netTotal, 0);
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">المعاملات المالية</h2>
        <p className="text-slate-500 mt-1">إدارة اشتراكات الطلاب ورواتب المعلمين</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-emerald-200/50 transition-all duration-300 hover:shadow-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">المحصل</p>
              <p className="text-lg font-bold text-emerald-600 transition-all duration-300">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{paidCount} طالب مدفوع</p>
        </div>
        <div className="card p-5 border-amber-200/50 transition-all duration-300 hover:shadow-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">معلق</p>
              <p className="text-lg font-bold text-amber-600 transition-all duration-300">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{pendingCount} طالب بانتظار الدفع</p>
        </div>
        <div className="card p-5 border-rose-200/50 transition-all duration-300 hover:shadow-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">متأخر</p>
              <p className="text-lg font-bold text-rose-600 transition-all duration-300">
                {formatCurrency(totalOverdue)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{overdueCount} طالب متأخر السداد</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'الكل' : SUBSCRIPTION_LABELS[f].label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pr-10 w-full sm:w-64"
            placeholder="بحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stripe Payment Confirmation Section */}
      {pendingStripePayments.length > 0 && (
        <div className="card overflow-hidden border-amber-200">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-600" />
            <h3 className="font-bold text-amber-800">
              مدفوعات Stripe بانتظار التأكيد ({pendingStripePayments.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingStripePayments.map((f) => {
              const student = students.find((s) => s.id === f.student_id);
              return (
                <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CreditCard size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{student?.name || 'طالب محذوف'}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(f.amount)} — بانتظار تأكيد المسؤول</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await confirmStripePayment(f.id);
                      } catch (err) {
                        console.error('Failed to confirm payment:', err);
                      }
                    }}
                    className="btn-primary text-sm"
                  >
                    <CheckCircle2 size={16} />
                    تأكيد الدفع
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-billing trigger */}
      <div className="flex justify-end">
        <button
          onClick={async () => {
            try {
              await runAutoBilling();
            } catch (err) {
              console.error('Auto-billing failed:', err);
            }
          }}
          className="btn-secondary text-sm"
          title="إنشاء فواتير معلقة للطلاب الذين يقترب موعد انتهاء اشتراكهم"
        >
          <Calendar size={16} />
          تشغيل الفوترة التلقائية
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-700">اشتراكات الطلاب</h3>
          {/* Month/Year Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              value={subMonth}
              onChange={(e) => setSubMonth(Number(e.target.value))}
              className="input-field py-1.5 text-sm w-32"
            >
              {MONTHS_AR.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={subYear}
              onChange={(e) => setSubYear(Number(e.target.value))}
              className="input-field py-1.5 text-sm w-24"
            >
              {subYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الطالب</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">المعلم</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الرسوم</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الحالة</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">ينتهي في</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">تغيير الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student) => {
                const teacher = teachers.find((t) => t.id === student.teacher_id);
                const sc = statusConfig[student.subscription_status];
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{student.name}</p>
                          <p className="text-xs text-slate-400">{student.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-600">{teacher?.name || '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(student.monthly_fee)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${sc.bg} ${sc.text} transition-all duration-300`}>
                        {sc.icon}
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-500">
                        {student.expiry_date ? formatDate(student.expiry_date) : '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusDropdown
                        current={student.subscription_status}
                        onChange={(status) => setSubscriptionStatus(student.id, status)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
            <p>لا توجد نتائج</p>
          </div>
        )}
      </div>

      {/* ===== Teacher Payroll Ledger ===== */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-700">جدول رواتب المعلمين</h3>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              className="input-field py-2 text-sm w-auto"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(Number(e.target.value))}
            >
              {MONTHS_AR.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="input-field py-2 text-sm w-auto"
              value={payrollYear}
              onChange={(e) => setPayrollYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">اسم المعلم</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase">إجمالي الحلقات</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase">اعتذار المعلم</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase">الحلقات المحتسبة</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">المستحق</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase">مكافآت</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase">خصومات</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <Wallet size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا يوجد معلمون مسجلون</p>
                  </td>
                </tr>
              ) : (
                payrollRows.map((row) => (
                  <PayrollRow
                    key={row.teacher.id}
                    row={row}
                    month={payrollMonth}
                    year={payrollYear}
                    onSave={updatePayroll}
                  />
                ))
              )}
            </tbody>
            {payrollRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-3 text-sm font-bold text-slate-600" colSpan={7}>
                    إجمالي رواتب {getMonthName(payrollMonth)} {payrollYear}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(totalPayroll)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function PayrollRow({
  row,
  month,
  year,
  onSave,
}: {
  row: {
    teacher: { id: string; name: string; subject: string; salary_per_session: number };
    totalSessions: number;
    attended: number;
    teacherCanceled: number;
    studentExcused: number;
    studentAbsent: number;
    payableSessions: number;
    netEarned: number;
    bonuses: number;
    deductions: number;
    netTotal: number;
  };
  month: number;
  year: number;
  onSave: (teacherId: string, month: number, year: number, updates: { bonuses?: number; deductions?: number }) => Promise<void>;
}) {
  const [bonuses, setBonuses] = useState(row.bonuses);
  const [deductions, setDeductions] = useState(row.deductions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync local state when the row data changes (e.g., month/year filter change)
  useEffect(() => {
    setBonuses(row.bonuses);
    setDeductions(row.deductions);
  }, [row.bonuses, row.deductions]);

  const hasChanges = bonuses !== row.bonuses || deductions !== row.deductions;
  const computedTotal = row.netEarned + (bonuses || 0) - (deductions || 0);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(row.teacher.id, month, year, {
        bonuses: Number(bonuses) || 0,
        deductions: Number(deductions) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save payroll:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.teacher.name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-700">{row.teacher.name}</p>
            <p className="text-xs text-slate-400">
              {formatCurrency(row.teacher.salary_per_session || 0)} / حصة
            </p>
          </div>
        </div>
      </td>
      {/* Total sessions */}
      <td className="px-5 py-3 text-center">
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
          {row.totalSessions}
        </span>
      </td>
      {/* Teacher canceled (deducted) */}
      <td className="px-5 py-3 text-center">
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
          {row.teacherCanceled}
        </span>
      </td>
      {/* الحلقات المحتسبة — count only */}
      <td className="px-5 py-3 text-center">
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {row.payableSessions}
        </span>
      </td>
      {/* المستحق — monetary value with formula hint */}
      <td className="px-5 py-3">
        <p className="text-sm font-semibold text-slate-700">{formatCurrency(row.netEarned)}</p>
        <p className="text-xs text-slate-400">
          ({row.totalSessions} - {row.teacherCanceled}) × {formatCurrency(row.teacher.salary_per_session || 0)}
        </p>
      </td>
      {/* مكافآت */}
      <td className="px-5 py-3 text-center">
        <input
          type="number"
          className="input-field py-1.5 text-sm text-center w-20 mx-auto"
          value={bonuses}
          onChange={(e) => setBonuses(Number(e.target.value))}
          min={0}
        />
      </td>
      {/* خصومات */}
      <td className="px-5 py-3 text-center">
        <input
          type="number"
          className="input-field py-1.5 text-sm text-center w-20 mx-auto"
          value={deductions}
          onChange={(e) => setDeductions(Number(e.target.value))}
          min={0}
        />
      </td>
      {/* الإجمالي */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(computedTotal)}</p>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-ghost text-xs text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              title="حفظ"
            >
              {saved ? (
                <Check size={14} />
              ) : saving ? (
                <span className="text-xs">...</span>
              ) : (
                <Save size={14} />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
