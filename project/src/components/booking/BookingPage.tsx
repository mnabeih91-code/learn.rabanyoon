import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import type { DayOfWeek, AvailabilitySlot, Package, CustomField } from '../../types';
import { DAYS_AR, DAY_ORDER, formatTime, formatCurrency } from '../../data/mockData';
import {
  BookOpen,
  X,
  Check,
  ChevronLeft,
  User,
  Phone,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface BookingPageProps {
  onClose: () => void;
}

interface SelectedSlot {
  day: DayOfWeek;
  start: string;
  end: string;
}

const STEPS = [
  { id: 1, label: 'البيانات', icon: <User size={18} /> },
  { id: 2, label: 'الباقة', icon: <Sparkles size={18} /> },
  { id: 3, label: 'المواعيد', icon: <Calendar size={18} /> },
  { id: 4, label: 'التأكيد', icon: <CheckCircle2 size={18} /> },
];

// Arabic pluralization helper for session counts
function sessionCountLabel(count: number): string {
  if (count === 1) return 'حصة واحدة';
  if (count === 2) return 'حصتان';
  if (count >= 3 && count <= 10) return `${count} حصص`;
  return `${count} حصة`;
}

export function BookingPage({ onClose }: BookingPageProps) {
  const { teachers, packages, settings, createBooking, pageConfig } = useStore();
  const cfg = pageConfig.booking;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const visibleCustomFields = cfg.customFields.filter((f) => f.visible);

  const teacher = teachers.find((t) => t.id === teacherId);
  const selectedPackage: Package | undefined = packages.find((p) => p.id === packageId);
  const requiredSlots = selectedPackage?.session_count ?? 0;

  // Only active packages should be shown
  const activePackages = packages.filter((p) => p.is_active);
  // Only active teachers should be shown (exclude archived/deactivated)
  const activeTeachers = teachers.filter((t) => t.is_active !== false);

  const canProceedStep1 =
    (!cfg.enabledFields.name || name.trim()) &&
    (!cfg.enabledFields.phone || phone.trim()) &&
    (!cfg.enabledFields.teacher || teacherId) &&
    visibleCustomFields.every((f) => !f.required || (customFieldValues[f.id] || '').trim());
  const canProceedStep2 = Boolean(packageId);
  const canProceedStep3 = requiredSlots > 0 && selectedSlots.length === requiredSlots;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleSlot = (slot: AvailabilitySlot) => {
    if (slot.status !== 'available') return;
    const key = `${slot.day}-${slot.start}-${slot.end}`;
    const exists = selectedSlots.some(
      (s) => `${s.day}-${s.start}-${s.end}` === key
    );
    if (exists) {
      setSelectedSlots(selectedSlots.filter((s) => `${s.day}-${s.start}-${s.end}` !== key));
    } else {
      if (selectedSlots.length >= requiredSlots) return;
      setSelectedSlots([
        ...selectedSlots,
        { day: slot.day, start: slot.start, end: slot.end },
      ]);
    }
  };

  const handleConfirm = async () => {
    if (!teacherId || !packageId) {
      setError('بيانات ناقصة. يرجى مراجعة الخطوات السابقة.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createBooking(name, phone, teacherId, packageId, selectedSlots);
      setConfirmed(true);
    } catch (err) {
      setError('حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp number: prefer settings.whatsapp_number, fall back to teacher's phone
  const getWhatsAppNumber = (): string => {
    const settingsNumber = settings?.whatsapp_number?.trim();
    if (settingsNumber) return settingsNumber.replace(/[^0-9]/g, '');
    if (teacher?.phone) return teacher.phone.replace(/[^0-9]/g, '');
    return '';
  };

  const buildWhatsAppLink = () => {
    const number = getWhatsAppNumber();
    if (!number) return '#';
    const slotsText = selectedSlots
      .map((s) => `${DAYS_AR[s.day]} ${formatTime(s.start)} - ${formatTime(s.end)}`)
      .join('\n');
    const academyName = settings?.academy_name || 'أكاديمية ربانيون';
    const packageLabel = selectedPackage?.label || sessionCountLabel(requiredSlots);
    const totalPrice = selectedPackage?.price ?? 0;
    const message = `السلام عليكم،
أرغب في تأكيد حجزي في ${academyName}.

الاسم: ${name}
رقم الهاتف: ${phone}
المعلم: ${teacher?.name || ''}
الباقة: ${packageLabel}
المواعيد المختارة:
${slotsText}

الإجمالي: ${formatCurrency(totalPrice)} / شهر

شكراً لكم.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  // Success screen
  if (confirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <BookingHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 max-w-lg w-full text-center animate-scale-in">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{cfg.successTitle}</h2>
            <p className="text-slate-500 mb-6">
              {cfg.successMessage}
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-right space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">الاسم:</span>
                <span className="font-semibold text-slate-800">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">المعلم:</span>
                <span className="font-semibold text-slate-800">{teacher?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">الباقة:</span>
                <span className="font-semibold text-slate-800">
                  {selectedPackage?.label || sessionCountLabel(requiredSlots)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">الرسوم الشهرية:</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(selectedPackage?.price ?? 0)}
                </span>
              </div>
            </div>
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full mb-3"
              style={{ background: '#25D366' }}
            >
              <MessageCircle size={18} />
              تواصل عبر الواتساب لتأكيد الحجز
            </a>
            <button onClick={onClose} className="btn-secondary w-full">
              العودة للوحة التحكم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BookingHeader onClose={onClose} />

      {/* Step Indicator */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step > s.id
                      ? 'bg-emerald-500 text-white'
                      : step === s.id
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.id ? <Check size={18} /> : s.icon}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:block ${
                    step >= s.id ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-all duration-300 ${
                    step > s.id ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-rose-50 text-rose-700 p-3 rounded-xl animate-fade-in">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="card p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-1">{cfg.title}</h2>
              <p className="text-slate-500 text-sm mb-6">{cfg.subtitle}</p>

              <div className="space-y-4">
                {cfg.enabledFields.name && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: محمد أحمد علي"
                      className="input-field pr-10"
                    />
                  </div>
                </div>
                )}

                {cfg.enabledFields.phone && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    رقم الهاتف
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="input-field pr-10 ltr-nums"
                      dir="ltr"
                    />
                  </div>
                </div>
                )}

                {cfg.enabledFields.teacher && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    المعلم
                  </label>
                  <div className="relative">
                    <GraduationCap size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="input-field pr-10"
                    >
                      <option value="">اختر المعلم...</option>
                      {activeTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                )}

                {visibleCustomFields.map((field) => (
                  <CustomFieldInput
                    key={field.id}
                    field={field}
                    value={customFieldValues[field.id] || ''}
                    onChange={(v) => setCustomFieldValues({ ...customFieldValues, [field.id]: v })}
                  />
                ))}
              </div>

              <div className="flex justify-start mt-6">
                <button
                  onClick={handleNext}
                  disabled={!canProceedStep1}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Package */}
          {step === 2 && (
            <div className="card p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-1">اختيار الباقة</h2>
              <p className="text-slate-500 text-sm mb-6">اختر الباقة المناسبة لك</p>

              {activePackages.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد باقات متاحة حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => {
                        setPackageId(pkg.id);
                        setSelectedSlots([]);
                      }}
                      className={`relative p-5 rounded-2xl border-2 text-center transition-all duration-200 ${
                        packageId === pkg.id
                          ? 'border-emerald-500 bg-emerald-50 shadow-soft'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      {packageId === pkg.id && (
                        <div className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                          packageId === pkg.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Calendar size={22} />
                      </div>
                      <p className="font-bold text-slate-800 text-lg">{pkg.label}</p>
                      {pkg.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1.5">
                        {sessionCountLabel(pkg.session_count)} أسبوعياً
                      </p>
                      <p className="text-sm font-semibold text-emerald-600 mt-2">
                        {formatCurrency(pkg.price)} / شهر
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={handleBack} className="btn-secondary">
                  السابق
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceedStep2}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Calendar */}
          {step === 3 && teacher && selectedPackage && (
            <div className="space-y-4 animate-fade-in">
              {/* Marketing Notice */}
              {cfg.showBanner && (
              <div className="card p-5 bg-gradient-to-l from-emerald-50 to-teal-50 border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800 mb-1">{cfg.bannerTitle}</h3>
                    <p className="text-sm text-emerald-700 leading-relaxed">
                      {cfg.bannerText}
                    </p>
                  </div>
                </div>
              </div>
              )}

              <div className="card p-6">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-slate-800">اختيار المواعيد</h2>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={14} />
                    جميع المواعيد بتوقيت مصر
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                  اختر {sessionCountLabel(requiredSlots)} من المواعيد المتاحة
                </p>

                {/* Counter */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">تم اختيار</span>
                    <span
                      className={`text-lg font-bold ltr-nums ${
                        selectedSlots.length === requiredSlots
                          ? 'text-emerald-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {selectedSlots.length}
                    </span>
                    <span className="text-sm text-slate-600">من</span>
                    <span className="text-lg font-bold text-slate-700 ltr-nums">{requiredSlots}</span>
                    <span className="text-sm text-slate-600">
                      {requiredSlots === 1 ? 'حصة' : 'حصص'}
                    </span>
                  </div>
                  {selectedSlots.length === requiredSlots && (
                    <span className="badge bg-emerald-100 text-emerald-700">
                      <Check size={12} />
                      اكتمل الاختيار
                    </span>
                  )}
                </div>

                {/* Weekly Grid — only show 'available' slots, grouped by day */}
                <div className="space-y-4">
                  {DAY_ORDER.map((day) => {
                    // Filter to only available slots for this day
                    const dayAvailableSlots = teacher.availability_slots.filter(
                      (s) => s.day === day && s.status === 'available'
                    );
                    // Skip days with no available slots
                    if (dayAvailableSlots.length === 0) return null;
                    return (
                      <div key={day}>
                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <Calendar size={14} className="text-emerald-500" />
                          {DAYS_AR[day]}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          {dayAvailableSlots.map((slot, i) => {
                            const isSelected = selectedSlots.some(
                              (s) =>
                                s.day === slot.day &&
                                s.start === slot.start &&
                                s.end === slot.end
                            );
                            return (
                              <button
                                key={i}
                                onClick={() => toggleSlot(slot)}
                                className={`p-2.5 rounded-xl border text-center transition-all duration-200 ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-soft'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
                                }`}
                              >
                                <p className="text-xs font-semibold ltr-nums">
                                  {formatTime(slot.start)}
                                </p>
                                <p className="text-[10px] opacity-70 ltr-nums">
                                  {formatTime(slot.end)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {teacher.availability_slots.filter((s) => s.status === 'available').length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد مواعيد متاحة لهذا المعلم حالياً</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={handleBack} className="btn-secondary">
                  السابق
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceedStep3}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && teacher && selectedPackage && (
            <div className="card p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-1">تأكيد الحجز</h2>
              <p className="text-slate-500 text-sm mb-6">راجع بياناتك قبل التأكيد</p>

              <div className="space-y-4">
                {/* Student Info */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <User size={16} className="text-emerald-600" />
                    بيانات الطالب
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">الاسم:</span>
                      <span className="font-semibold text-slate-800">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">الهاتف:</span>
                      <span className="font-semibold text-slate-800 ltr-nums" dir="ltr">{phone}</span>
                    </div>
                  </div>
                </div>

                {/* Teacher & Package */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <GraduationCap size={16} className="text-emerald-600" />
                    المعلم والباقة
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">المعلم:</span>
                      <span className="font-semibold text-slate-800">{teacher.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">المادة:</span>
                      <span className="font-semibold text-slate-800">{teacher.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">الباقة:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPackage.label}
                      </span>
                    </div>
                    {selectedPackage.description && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">الوصف:</span>
                        <span className="font-semibold text-slate-700 text-left max-w-[60%]">
                          {selectedPackage.description}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">عدد الحصص:</span>
                      <span className="font-semibold text-slate-800">
                        {sessionCountLabel(selectedPackage.session_count)} أسبوعياً
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">الرسوم الشهرية:</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(selectedPackage.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selected Slots */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-600" />
                    المواعيد المختارة
                  </h3>
                  <div className="space-y-2">
                    {selectedSlots.map((slot, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-100"
                      >
                        <span className="text-sm font-semibold text-slate-700">
                          {DAYS_AR[slot.day]}
                        </span>
                        <span className="text-sm text-slate-500 ltr-nums">
                          {formatTime(slot.start)} — {formatTime(slot.end)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notice */}
                <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    سيتم إنشاء حسابك بحالة "طالب جديد" وإنشاء فاتورة معلقة. ستبدأ حلقتك الأولى
                    بعد 24 ساعة من تأكيد الحجز.
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={handleBack} className="btn-secondary" disabled={submitting}>
                  السابق
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التأكيد...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      تأكيد الحجز
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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

function BookingHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-elevated">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">أكاديمية ربانيون</h1>
            <p className="text-xs text-slate-400">صفحة الحجز — تسجيل طالب جديد</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X size={18} />
          <span className="text-sm font-semibold hidden sm:inline">إغلاق</span>
        </button>
      </div>
    </header>
  );
}
