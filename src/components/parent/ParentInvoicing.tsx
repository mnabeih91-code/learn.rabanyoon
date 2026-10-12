import { useState, useMemo } from 'react';
import { useStore } from '../../store/StoreContext';
import type { SubscriptionStatus, Student, MonthlySubscription } from '../../types';
import { formatCurrency, formatDate, SUBSCRIPTION_LABELS, MONTHS_AR } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
} from 'lucide-react';

function computeFinancialStatus(student: Student, monthlySubs: MonthlySubscription[]): SubscriptionStatus {
  if (student.is_paused) return 'pending';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const hasOlderUnpaid = monthlySubs.some(
    (ms) => ms.student_id === student.id &&
      (ms.billing_year < currentYear || (ms.billing_year === currentYear && ms.billing_month < currentMonth)) &&
      (ms.status === 'pending' || ms.status === 'overdue')
  );
  if (hasOlderUnpaid) return 'overdue';
  const currentSub = monthlySubs.find(
    (ms) => ms.student_id === student.id && ms.billing_year === currentYear && ms.billing_month === currentMonth
  );
  return currentSub?.status || student.subscription_status || 'pending';
}

export function ParentInvoicing() {
  const { students, monthlySubscriptions, setSubscriptionStatus } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [paying, setPaying] = useState(false);

  const student = students.find((s) => s.id === selectedStudentId) || students[0];

  const finStatus = useMemo(() => {
    if (!student) return 'pending' as SubscriptionStatus;
    return computeFinancialStatus(student, monthlySubscriptions);
  }, [student, monthlySubscriptions]);

  const studentMonthlySubs = useMemo(() => {
    if (!student) return [];
    return monthlySubscriptions
      .filter((ms) => ms.student_id === student.id)
      .sort((a, b) => b.billing_year - a.billing_year || b.billing_month - a.billing_month);
  }, [student, monthlySubscriptions]);

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا يوجد طلاب مسجلون بعد</p>
      </div>
    );
  }

  const sub = SUBSCRIPTION_LABELS[finStatus];
  const statusConfig: Record<
    SubscriptionStatus,
    { icon: React.ReactNode; bg: string; border: string; text: string; showPayBtn: boolean }
  > = {
    paid: {
      icon: <CheckCircle2 size={20} />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      showPayBtn: false,
    },
    pending: {
      icon: <Clock size={20} />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      showPayBtn: true,
    },
    overdue: {
      icon: <AlertCircle size={20} />,
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      showPayBtn: true,
    },
  };
  const sc = statusConfig[finStatus];

  const invoiceNumber = `INV-${student.id.slice(0, 8).toUpperCase()}-2026`;

  const daysUntilExpiry = student.expiry_date
    ? Math.ceil(
        (new Date(student.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handlePay = async () => {
    setPaying(true);
    try {
      await setSubscriptionStatus(student.id, 'paid');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">الفواتير والاشتراك</h2>
        <p className="text-slate-500 mt-1">إدارة مدفوعات الاشتراك الشهري</p>
      </div>

      {/* Student Selector */}
      {students.length > 1 && (
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="input-field max-w-xs"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {/* Invoice Card */}
      <div className="card overflow-hidden max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={24} className="text-emerald-400" />
              <h3 className="font-bold text-lg">فاتورة الاشتراك</h3>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400">رقم الفاتورة</p>
              <p className="text-sm font-mono ltr-nums">{invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={student.name} color="bg-emerald-500" size="md" />
            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-xs text-slate-300">{student.status}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          <div
            key={finStatus}
            className={`flex items-center gap-3 p-4 rounded-xl ${sc.bg} ${sc.border} border transition-all duration-500 animate-fade-in`}
          >
            <div className={sc.text}>{sc.icon}</div>
            <div className="flex-1">
              <p className={`font-bold ${sc.text}`}>{sub.label}</p>
              <p className="text-xs text-slate-500">
                {finStatus === 'paid'
                  ? 'تم دفع الرسوم الشهرية بنجاح'
                  : finStatus === 'pending'
                  ? 'بانتظار سداد الرسوم الشهرية'
                  : 'الرسوم متأخرة — يرجى السداد في أقرب وقت'}
              </p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign size={16} className="text-slate-400" />
                <span className="text-sm">الرسوم الشهرية</span>
              </div>
              <span className="font-bold text-slate-800">{formatCurrency(student.monthly_fee)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-sm">تاريخ التسجيل</span>
              </div>
              <span className="font-semibold text-slate-700">{formatDate(student.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-sm">تاريخ انتهاء الاشتراك</span>
              </div>
              <div className="text-left">
                <span className="font-semibold text-slate-700">
                  {student.expiry_date ? formatDate(student.expiry_date) : '—'}
                </span>
                {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 30 && finStatus !== 'paid' && (
                  <p className="text-xs text-amber-600 mt-0.5">يتبقى {daysUntilExpiry} يوم</p>
                )}
                {daysUntilExpiry !== null && daysUntilExpiry < 0 && finStatus !== 'paid' && (
                  <p className="text-xs text-rose-600 mt-0.5">تجاوز بـ {Math.abs(daysUntilExpiry)} يوم</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-slate-500">
                <CreditCard size={16} className="text-slate-400" />
                <span className="text-sm">طريقة الدفع</span>
              </div>
              <span className="font-semibold text-slate-700">تحويل / نقدي</span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <span className="font-bold text-slate-700">المبلغ المستحق</span>
            <span className="text-2xl font-bold text-emerald-600">
              {finStatus === 'paid'
                ? formatCurrency(0)
                : formatCurrency(student.monthly_fee)}
            </span>
          </div>

          {/* Pay Button / Active Message */}
          {sc.showPayBtn ? (
            <button
              onClick={handlePay}
              disabled={paying}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  سداد الرسوم الآن
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2 animate-fade-in">
              <CheckCircle2 size={20} />
              الاشتراك ساري — شكراً لسدادكم
            </div>
          )}
        </div>
      </div>

      {/* Monthly Subscription History */}
      {studentMonthlySubs.length > 0 && (
        <div className="card p-6 max-w-2xl mx-auto">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Receipt size={20} className="text-emerald-600" />
            سجل الاشتراكات الشهرية
          </h3>
          <div className="space-y-2">
            {studentMonthlySubs.map((ms) => {
              const msSub = SUBSCRIPTION_LABELS[ms.status];
              return (
                <div
                  key={ms.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Calendar size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {MONTHS_AR[ms.billing_month]} {ms.billing_year}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(ms.amount)}
                        {ms.payment_date && ` — ${formatDate(ms.payment_date)}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      ms.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ms.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {msSub.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
