import { useState, useCallback } from 'react';
import { useStore } from '../../store/StoreContext';
import { DEFAULT_BOOKING_CONFIG, DEFAULT_PAYMENT_CONFIG } from '../../data/pageConfigDefaults';
import type { PageConfig, BookingPageConfig, PaymentPageConfig, CustomField, CustomFieldType } from '../../types';
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  Check,
  RotateCcw,
  ListPlus,
  Type,
  Hash,
  ChevronDown,
  Settings2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Calendar,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

type PageTab = 'booking' | 'payment';

export function ExternalPagesSettings() {
  const { pageConfig, updatePageConfig } = useStore();
  const [tab, setTab] = useState<PageTab>('booking');
  const [draft, setDraft] = useState<PageConfig>(pageConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateBooking = useCallback((updates: Partial<BookingPageConfig>) => {
    setDraft((prev) => ({ ...prev, booking: { ...prev.booking, ...updates } }));
  }, []);

  const updatePayment = useCallback((updates: Partial<PaymentPageConfig>) => {
    setDraft((prev) => ({ ...prev, payment: { ...prev.payment, ...updates } }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePageConfig(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save page config:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft({
      booking: { ...DEFAULT_BOOKING_CONFIG },
      payment: { ...DEFAULT_PAYMENT_CONFIG },
    });
  }

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/booking` : '';
  const paymentUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay` : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings2 size={20} className="text-emerald-600" />
            إدارة وتخصيص الصفحات الخارجية
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            تحكم في خانات ومحتوى صفحتي الحجز والدفع المباشر — التغييرات تنعكس فوراً على الصفحات العامة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn-secondary text-sm" title="استعادة الإعدادات الافتراضية">
            <RotateCcw size={16} />
            استعادة الافتراضي
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <Check size={16} />
                تم الحفظ
              </>
            ) : (
              <>
                <Save size={16} />
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Page selector tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('booking')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'booking'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar size={16} />
          صفحة الحجز الخارجي
        </button>
        <button
          onClick={() => setTab('payment')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'payment'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCard size={16} />
          صفحة الدفع المباشر
        </button>
      </div>

      {/* Content */}
      {tab === 'booking' ? (
        <BookingConfigEditor config={draft.booking} onChange={updateBooking} url={bookingUrl} />
      ) : (
        <PaymentConfigEditor config={draft.payment} onChange={updatePayment} url={paymentUrl} />
      )}
    </div>
  );
}

// ============ BOOKING CONFIG EDITOR ============

function BookingConfigEditor({
  config,
  onChange,
  url,
}: {
  config: BookingPageConfig;
  onChange: (updates: Partial<BookingPageConfig>) => void;
  url: string;
}) {
  return (
    <div className="space-y-5">
      {/* Public link */}
      <PublicLinkBar url={url} label="رابط صفحة الحجز" />

      {/* Text customization */}
      <ConfigCard title="المحتوى والنصوص" icon={<Type size={18} />}>
        <TextField label="عنوان الصفحة" value={config.title} onChange={(v) => onChange({ title: v })} />
        <TextField label="التعليمات" value={config.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <TextField label="عنوان رسالة النجاح" value={config.successTitle} onChange={(v) => onChange({ successTitle: v })} />
        <TextAreaField label="نص رسالة النجاح" value={config.successMessage} onChange={(v) => onChange({ successMessage: v })} />
      </ConfigCard>

      {/* Banner */}
      <ConfigCard title="البانر الترحيبي" icon={<AlertCircle size={18} />}>
        <ToggleField label="إظهار البانر الترحيبي" checked={config.showBanner} onChange={(v) => onChange({ showBanner: v })} />
        {config.showBanner && (
          <>
            <TextField label="عنوان البانر" value={config.bannerTitle} onChange={(v) => onChange({ bannerTitle: v })} />
            <TextAreaField label="نص البانر" value={config.bannerText} onChange={(v) => onChange({ bannerText: v })} />
          </>
        )}
      </ConfigCard>

      {/* Built-in field toggles */}
      <ConfigCard title="الخانات الأساسية" icon={<ToggleLeft size={18} />}>
        <ToggleField
          label="حقل الاسم"
          checked={config.enabledFields.name}
          onChange={(v) => onChange({ enabledFields: { ...config.enabledFields, name: v } })}
        />
        <ToggleField
          label="حقل رقم الهاتف"
          checked={config.enabledFields.phone}
          onChange={(v) => onChange({ enabledFields: { ...config.enabledFields, phone: v } })}
        />
        <ToggleField
          label="حقل اختيار المعلم"
          checked={config.enabledFields.teacher}
          onChange={(v) => onChange({ enabledFields: { ...config.enabledFields, teacher: v } })}
        />
      </ConfigCard>

      {/* Custom fields */}
      <CustomFieldManager
        fields={config.customFields}
        onChange={(customFields) => onChange({ customFields })}
      />
    </div>
  );
}

// ============ PAYMENT CONFIG EDITOR ============

function PaymentConfigEditor({
  config,
  onChange,
  url,
}: {
  config: PaymentPageConfig;
  onChange: (updates: Partial<PaymentPageConfig>) => void;
  url: string;
}) {
  return (
    <div className="space-y-5">
      {/* Public link */}
      <PublicLinkBar url={url} label="رابط صفحة الدفع" />

      {/* Text customization */}
      <ConfigCard title="المحتوى والنصوص" icon={<Type size={18} />}>
        <TextField label="عنوان الصفحة" value={config.title} onChange={(v) => onChange({ title: v })} />
        <TextField label="التعليمات" value={config.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <TextAreaField label="رسالة التأكيد" value={config.successMessage} onChange={(v) => onChange({ successMessage: v })} />
      </ConfigCard>

      {/* Banner */}
      <ConfigCard title="البانر" icon={<AlertCircle size={18} />}>
        <ToggleField label="إظهار البانر" checked={config.showBanner} onChange={(v) => onChange({ showBanner: v })} />
        {config.showBanner && (
          <>
            <TextField label="عنوان البانر" value={config.bannerTitle} onChange={(v) => onChange({ bannerTitle: v })} />
            <TextAreaField label="نص البانر" value={config.bannerText} onChange={(v) => onChange({ bannerText: v })} />
          </>
        )}
      </ConfigCard>

      {/* Payment option toggles */}
      <ConfigCard title="خيارات الدفع" icon={<ToggleLeft size={18} />}>
        <ToggleField
          label="خيار دفع قيمة الباقة الحالية"
          checked={config.enableCurrentPackage}
          onChange={(v) => onChange({ enableCurrentPackage: v })}
        />
        <ToggleField
          label="خيار المبلغ المخصص"
          checked={config.enableCustomAmount}
          onChange={(v) => onChange({ enableCustomAmount: v })}
        />
        <ToggleField
          label="خيار اختيار باقة بديلة"
          checked={config.enableAltPackages}
          onChange={(v) => onChange({ enableAltPackages: v })}
        />
      </ConfigCard>

      {/* Custom fields */}
      <CustomFieldManager
        fields={config.customFields}
        onChange={(customFields) => onChange({ customFields })}
      />
    </div>
  );
}

// ============ CUSTOM FIELD MANAGER ============

function CustomFieldManager({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}) {
  function addField(type: CustomFieldType) {
    const newField: CustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      label: type === 'dropdown' ? 'قائمة منسدلة جديدة' : type === 'number' ? 'حقل رقمي جديد' : 'حقل نصي جديد',
      placeholder: '',
      options: type === 'dropdown' ? ['الخيار الأول', 'الخيار الثاني'] : [],
      required: false,
      visible: true,
    };
    onChange([...fields, newField]);
  }

  function updateField(id: string, updates: Partial<CustomField>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function deleteField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  return (
    <ConfigCard title="مدير الخانات المخصصة" icon={<ListPlus size={18} />}>
      <p className="text-xs text-slate-400 mb-4">
        أضف خانات جديدة (نص، رقم، قائمة منسدلة) لتظهر في نموذج الصفحة. يمكنك تعديل الأسماء، إخفاء، أو حذف أي خانة.
      </p>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => addField('text')} className="btn-secondary text-xs py-2 px-3">
          <Type size={14} />
          حقل نصي
        </button>
        <button onClick={() => addField('number')} className="btn-secondary text-xs py-2 px-3">
          <Hash size={14} />
          حقل رقمي
        </button>
        <button onClick={() => addField('dropdown')} className="btn-secondary text-xs py-2 px-3">
          <ChevronDown size={14} />
          قائمة منسدلة
        </button>
      </div>

      {/* Field list */}
      {fields.length === 0 ? (
        <div className="text-center py-6 text-slate-300">
          <ListPlus size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد خانات مخصصة بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className={`rounded-xl border-2 p-4 transition-all ${
                field.visible ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <GripVertical size={16} className="text-slate-300 mt-2 flex-shrink-0" />

                <div className="flex-1 space-y-3">
                  {/* Label + type badge */}
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field flex-1 text-sm"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="اسم الخانة"
                    />
                    <span className="badge bg-slate-100 text-slate-500 text-xs whitespace-nowrap">
                      {field.type === 'text' && <Type size={11} />}
                      {field.type === 'number' && <Hash size={11} />}
                      {field.type === 'dropdown' && <ChevronDown size={11} />}
                      {field.type === 'text' ? 'نص' : field.type === 'number' ? 'رقم' : 'قائمة'}
                    </span>
                  </div>

                  {/* Placeholder (for text/number) */}
                  {field.type !== 'dropdown' && (
                    <input
                      className="input-field text-sm"
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="النص التوضيحي (Placeholder)"
                    />
                  )}

                  {/* Options (for dropdown) */}
                  {field.type === 'dropdown' && (
                    <div className="space-y-2">
                      {field.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            className="input-field flex-1 text-sm"
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...field.options];
                              newOptions[idx] = e.target.value;
                              updateField(field.id, { options: newOptions });
                            }}
                            placeholder={`الخيار ${idx + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newOptions = field.options.filter((_, i) => i !== idx);
                              updateField(field.id, { options: newOptions });
                            }}
                            className="btn-ghost text-rose-400 hover:bg-rose-50"
                            title="حذف الخيار"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateField(field.id, { options: [...field.options, 'خيار جديد'] })}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <Plus size={12} />
                        إضافة خيار
                      </button>
                    </div>
                  )}

                  {/* Required toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-500">حقل مطلوب</span>
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => updateField(field.id, { visible: !field.visible })}
                    className="btn-ghost text-sm"
                    title={field.visible ? 'إخفاء' : 'إظهار'}
                  >
                    {field.visible ? <Eye size={16} className="text-slate-500" /> : <EyeOff size={16} className="text-slate-400" />}
                  </button>
                  <button
                    onClick={() => deleteField(field.id)}
                    className="btn-ghost text-sm text-rose-500 hover:bg-rose-50"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ConfigCard>
  );
}

// ============ SHARED UI HELPERS ============

function ConfigCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <span className="text-emerald-600">{icon}</span>
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input className="input-field text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <textarea
        className="input-field text-sm min-h-[70px] resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="flex items-center gap-1 transition-colors"
        title={checked ? 'مفعّل' : 'معطّل'}
      >
        {checked ? (
          <ToggleRight size={36} className="text-emerald-500" />
        ) : (
          <ToggleLeft size={36} className="text-slate-300" />
        )}
      </button>
    </div>
  );
}

function PublicLinkBar({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
      <ExternalLink size={16} className="text-emerald-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-emerald-700 font-semibold">{label}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline truncate block ltr-nums" dir="ltr">
          {url}
        </a>
      </div>
    </div>
  );
}
