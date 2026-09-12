import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../data/mockData';
import type { Student, Teacher, Package, CustomField } from '../../types';
import { useStore } from '../../store/StoreContext';
import {
  Search,
  User,
  GraduationCap,
  Package as PackageIcon,
  DollarSign,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

type PaymentOption = 'current' | 'custom' | 'package';

export function PaymentPage({ onClose }: { onClose: () => void }) {
  const { pageConfig } = useStore();
  const cfg = pageConfig.payment;
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);

  const [option, setOption] = useState<PaymentOption>('current');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const visibleCustomFields = cfg.customFields.filter((f) => f.visible);

  const currentPackage = packages.find(
    (p) => p.price === student?.monthly_fee
  ) || null;

  const selectedAltPackage = packages.find((p) => p.id === selectedPackageId) || null;

  const availableOptions: PaymentOption[] = [];
  if (cfg.enableCurrentPackage) availableOptions.push('current');
  if (cfg.enableCustomAmount) availableOptions.push('custom');
  if (cfg.enableAltPackages) availableOptions.push('package');
  const effectiveOption = availableOptions.includes(option) ? option : (availableOptions[0] || 'current');

  const paymentAmount =
    effectiveOption === 'current'
      ? student?.monthly_fee || 0
      : effectiveOption === 'custom'
      ? customAmount
      : selectedAltPackage?.price || 0;

  async function handleSearch() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('الرجاء إدخال كود الطالب');
      return;
    }
    setSearching(true);
    setError('');
    setStudent(null);
    setTeacher(null);
    setPackages([]);
    try {
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('student_code', trimmed)
        .maybeSingle();

      if (studentErr) throw studentErr;
      if (!studentData) {
        setError('لم يتم العثور على طالب بهذا الكود. تأكد من الكود وحاول مرة أخرى.');
        return;
      }

      const s = studentData as Student;
      setStudent(s);

      if (s.teacher_id) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', s.teacher_id)
          .maybeSingle();
        if (teacherData) setTeacher(teacherData as Teacher);
      }

      const { data: pkgData } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (pkgData) setPackages(pkgData as Package[]);

      setCustomAmount(s.monthly_fee || 0);
    } catch (err) {
      console.error('Lookup failed:', err);
      setError('حدث خطأ أثناء البحث. حاول مرة أخرى.');
    } finally {
      setSearching(false);
    }
  }

  async function handlePay() {
    if (!student) return;
    if (paymentAmount <= 0) {
      setPayError('الرجاء اختيار مبلغ صحيح للدفع');
      return;
    }
    setPaying(true);
    setPayError('');
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          studentId: student.id,
          amount: paymentAmount,
          studentName: student.name,
        }),
      });
      if (!response.ok) throw new Error(`Stripe checkout failed (${response.status})`);
      const data = await response.json();
      if (!data.url) throw new Error('No checkout URL returned');

      await supabase.from('financials').insert({
        student_id: student.id,
        amount: paymentAmount,
        status: 'pending',
        stripe_checkout_session_id: data.sessionId || null,
        admin_confirmed: false,
      });

      window.location.href = data.url;
    } catch (err) {
      console.error('Payment error:', err);
      setPayError('تعذر بدء عملية الدفع. حاول مرة أخرى لاحقاً.');
    } finally {
      setPaying(false);
    }
  }

  function reset() {
    setCode('');
    setStudent(null);
    setTeacher(null);
    setPackages([]);
    setError('');
    setOption('current');
    setCustomAmount(0);
    setSelectedPackageId('');
    setPayError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">أكاديمية ربانيون</h1>
              <p className="text-xs text-slate-400">الدفع المباشر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Step 1: Code lookup */}
        <section className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">{cfg.title}</h2>
          <p className="text-sm text-slate-400 mb-5">
            {cfg.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pr-10 text-base"
                placeholder="مثال: RAB-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                dir="ltr"
                disabled={!!student}
              />
            </div>
            {!student ? (
              <button
                onClick={handleSearch}
                disabled={searching || !code.trim()}
                className="btn-primary sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    جارٍ البحث...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    بحث
                  </>
                )}
              </button>
            ) : (
              <button onClick={reset} className="btn-secondary sm:px-6">
                تغيير الكود
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}
        </section>

        {/* Step 2: Student info + payment options */}
        {student && (
          <div className="mt-6 space-y-6">
            {/* Banner */}
            {cfg.showBanner && (
              <div className="bg-gradient-to-l from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800 mb-1">{cfg.bannerTitle}</h3>
                    <p className="text-sm text-emerald-700 leading-relaxed">{cfg.bannerText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Student info card */}
            <section className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 size={20} />
                  <p className="font-semibold">تم العثور على الطالب</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">اسم الطالب</p>
                    <p className="text-sm font-bold text-slate-800">{student.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">الشيخ / المعلم</p>
                    <p className="text-sm font-bold text-slate-800">
                      {teacher?.name || 'غير محدد'}
                    </p>
                    {teacher?.subject && (
                      <p className="text-xs text-slate-400">{teacher.subject}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PackageIcon size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">الباقة الحالية</p>
                    <p className="text-sm font-bold text-slate-800">
                      {currentPackage?.label || 'باقة مخصصة'}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold">
                      {formatCurrency(student.monthly_fee || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Payment options */}
            <section className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1">اختر طريقة الدفع</h2>
              <p className="text-sm text-slate-400 mb-5">
                يمكنك دفع قيمة الباقة الحالية، أو مبلغ مخصص، أو اختيار باقة أخرى.
              </p>

              <div className="space-y-3">
                {/* Option 1: Current package */}
                <button
                  onClick={() => setOption('current')}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    option === 'current'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      option === 'current' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                    }`}>
                      {option === 'current' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">دفع قيمة الباقة الحالية</p>
                      <p className="text-xs text-slate-400">
                        {currentPackage?.label || 'باقة مخصصة'} — {formatCurrency(student.monthly_fee || 0)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(student.monthly_fee || 0)}
                  </span>
                </button>

                {/* Option 2: Custom amount */}
                <button
                  onClick={() => setOption('custom')}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    option === 'custom'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        option === 'custom' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                      }`}>
                        {option === 'custom' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">دفع مبلغ مخصص</p>
                        <p className="text-xs text-slate-400">اكتب المبلغ الذي تريد دفعه</p>
                      </div>
                    </div>
                  </div>
                  {option === 'custom' && (
                    <div className="mt-2 mr-8">
                      <div className="relative">
                        <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          className="input-field pr-9"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(Number(e.target.value))}
                          min={1}
                          placeholder="0"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </button>

                {/* Option 3: Another package */}
                {packages.length > 0 && (
                  <button
                    onClick={() => setOption('package')}
                    className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                      option === 'package'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          option === 'package' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                        }`}>
                          {option === 'package' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">اختيار باقة أخرى</p>
                          <p className="text-xs text-slate-400">تصفح الباقات المتاحة واختر ما يناسبك</p>
                        </div>
                      </div>
                    </div>
                    {option === 'package' && (
                      <div className="mt-2 mr-8 space-y-2">
                        {packages.map((pkg) => (
                          <button
                            key={pkg.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPackageId(pkg.id);
                            }}
                            className={`w-full text-right p-3 rounded-lg border transition-all flex items-center justify-between ${
                              selectedPackageId === pkg.id
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{pkg.label}</p>
                              <p className="text-xs text-slate-400">
                                {pkg.session_count} حصة{pkg.duration_minutes ? ` · ${pkg.duration_minutes} دقيقة` : ''}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-slate-700">
                              {formatCurrency(pkg.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                )}
              </div>

              {/* Pay button */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                {payError && (
                  <div className="mb-3 flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-600">{payError}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">المبلغ المختار للدفع</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(paymentAmount)}
                  </span>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying || paymentAmount <= 0}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paying ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      جارٍ التحويل لبوابة الدفع...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      ادفع الآن {formatCurrency(paymentAmount)}
                      <ArrowRight size={18} className="mr-1" />
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400 text-center mt-3">
                  {cfg.successMessage}
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1.5">
        {field.label}
        {field.required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {field.type === 'dropdown' ? (
        <select
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">اختر...</option>
          {field.options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          dir={field.type === 'number' ? 'ltr' : undefined}
        />
      )}
    </div>
  );
}
