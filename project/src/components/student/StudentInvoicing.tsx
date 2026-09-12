import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import type { SubscriptionStatus } from '../../types';
import { formatCurrency, formatDate, SUBSCRIPTION_LABELS } from '../../data/mockData';
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
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export function StudentInvoicing() {
  const { students, financials, currentUser, createStripeCheckout } = useStore();
  const [paying, setPaying] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // CRITICAL PRIVACY: A student only ever sees their own invoice.
  // No dropdown selector, no visibility into other students.
  const student = students.find((s) => s.id === currentUser?.student_id) || null;

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا توجد بيانات طالب مرتبطة بحسابك</p>
      </div>
    );
  }

  const sub = SUBSCRIPTION_LABELS[student.subscription_status];
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
  const sc = statusConfig[student.subscription_status];

  // Financial records for THIS student only
  const studentFinancials = financials.filter((f) => f.student_id === student.id);
  const invoiceNumber = `INV-${student.id.slice(0, 8).toUpperCase()}-2026`;

  const daysUntilExpiry = student.expiry_date
    ? Math.ceil(
        (new Date(student.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handlePay = async () => {
    setPaying(true);
    setStripeError(null);
    try {
      const result = await createStripeCheckout(student.id);
      if (result?.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        setStripeError('تعذر إنشاء جلسة الدفع. يرجى المحاولة مرة أخرى أو التواصل مع الإدارة.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setStripeError('حدث خطأ أثناء معالجة الدفع. حاول مرة أخرى.');
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
          {/* Status Banner — keyed for smooth animation on change */}
          <div
            key={student.subscription_status}
            className={`flex items-center gap-3 p-4 rounded-xl ${sc.bg} ${sc.border} border transition-all duration-500 animate-fade-in`}
          >
            <div className={sc.text}>{sc.icon}</div>
            <div className="flex-1">
              <p className={`font-bold ${sc.text}`}>{sub.label}</p>
              <p className="text-xs text-slate-500">
                {student.subscription_status === 'paid'
                  ? 'تم دفع الرسوم الشهرية بنجاح'
                  : student.subscription_status === 'pending'
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
                {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 30 && student.subscription_status !== 'paid' && (
                  <p className="text-xs text-amber-600 mt-0.5">يتبقى {daysUntilExpiry} يوم</p>
                )}
                {daysUntilExpiry !== null && daysUntilExpiry < 0 && student.subscription_status !== 'paid' && (
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
              {student.subscription_status === 'paid'
                ? formatCurrency(0)
                : formatCurrency(student.monthly_fee)}
            </span>
          </div>

          {/* Pay Button / Active Message */}
          {sc.showPayBtn ? (
            <>
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
                    الدفع عبر Stripe
                    <ExternalLink size={14} />
                  </>
                )}
              </button>
              <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                <ShieldCheck size={12} />
                سيتم تأكيد الدفع من قبل الإدارة بعد إتمام المعاملة
              </p>
              {stripeError && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg p-2.5 mt-2">
                  <AlertCircle size={16} />
                  {stripeError}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2 animate-fade-in">
              <CheckCircle2 size={20} />
              الاشتراك ساري — شكراً لسدادكم
            </div>
          )}
        </div>
      </div>

      {/* Financial Records — THIS student only */}
      {studentFinancials.length > 0 && (
        <div className="card p-6 max-w-2xl mx-auto">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Receipt size={20} className="text-emerald-600" />
            سجل المعاملات المالية
          </h3>
          <div className="space-y-2">
            {studentFinancials.map((f) => {
              const fSub = SUBSCRIPTION_LABELS[f.status];
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Receipt size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(f.amount)}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(f.created_at)}</p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      f.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : f.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {fSub.label}
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
