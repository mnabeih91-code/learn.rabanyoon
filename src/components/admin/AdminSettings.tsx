import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import { Check, MessageCircle, Save, Phone, Building2, ExternalLink, Settings2 } from 'lucide-react';
import { ExternalPagesSettings } from './ExternalPagesSettings';

type SettingsTab = 'general' | 'external-pages';

export function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [whatsapp, setWhatsatsapp] = useState(settings?.whatsapp_number || '');
  const [academyName, setAcademyName] = useState(settings?.academy_name || '');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savedWhatsapp, setSavedWhatsapp] = useState(false);
  const [savedName, setSavedName] = useState(false);

  async function handleSaveWhatsapp() {
    setSavingWhatsapp(true);
    try {
      await updateSettings({ whatsapp_number: whatsapp });
      setSavedWhatsapp(true);
      setTimeout(() => setSavedWhatsapp(false), 2000);
    } catch (err) {
      console.error('Failed to save whatsapp number:', err);
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      await updateSettings({ academy_name: academyName });
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    } catch (err) {
      console.error('Failed to save academy name:', err);
    } finally {
      setSavingName(false);
    }
  }

  // Build a preview of the WhatsApp confirmation message
  const bookingUrl = settings?.booking_url || (typeof window !== 'undefined' ? window.location.origin : '');
  const previewName = academyName || settings?.academy_name || 'أكاديمية ربانيون';
  const previewMessage = `السلام عليكم ورحمة الله وبركاته

مرحباً بك في ${previewName} 🌙

تم تأكيد حجزك بنجاح ✅

📌 تفاصيل الحجز:
• الاسم: [اسم الطالب]
• المعلم: [اسم المعلم]
• الباقة: [عنوان الباقة]
• المواعيد: [الأيام والتوقيتات]

💰 رسوم الاشتراك: [السعر] ج.م

للاستفسار، يرجى التواصل عبر واتساب: ${whatsapp || settings?.whatsapp_number || '[رقم الواتساب]'}

رابط الحجز: ${bookingUrl}

بارك الله فيكم ونفع بكم 🤲`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">إعدادات الأكاديمية</h2>
        <p className="text-slate-500 mt-1">إدارة بيانات التواصل وتخصيص الصفحات الخارجية</p>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('general')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'general'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 size={16} />
          إعدادات عامة
        </button>
        <button
          onClick={() => setTab('external-pages')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'external-pages'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings2 size={16} />
          الصفحات الخارجية
        </button>
      </div>

      {tab === 'general' ? (
        <>
          {/* Settings Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Number */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">رقم الواتساب الرسمي</h3>
                  <p className="text-xs text-slate-500">يُستخدم في رسائل تأكيد الحجز</p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-600 mb-1.5">رقم الواتساب الرسمي للأكاديمية</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="input-field pr-10 ltr-nums"
                    value={whatsapp}
                    onChange={(e) => setWhatsatsapp(e.target.value)}
                    placeholder="201012345678"
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={handleSaveWhatsapp}
                  disabled={savingWhatsapp || whatsapp === (settings?.whatsapp_number || '')}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savedWhatsapp ? (
                    <>
                      <Check size={18} />
                      تم
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {savingWhatsapp ? 'جارٍ الحفظ...' : 'حفظ'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                أدخل الرقم بصيغة دولية (مثال: 201012345678) بدون رمز + أو مسافات.
              </p>
            </div>

            {/* Academy Name */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">اسم الأكاديمية</h3>
                  <p className="text-xs text-slate-500">يظهر في رسائل التأكيد والواجهات</p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم الأكاديمية</label>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  placeholder="أكاديمية ربانيون"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || academyName === (settings?.academy_name || '')}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savedName ? (
                    <>
                      <Check size={18} />
                      تم
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {savingName ? 'جارٍ الحفظ...' : 'حفظ'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                الاسم الحالي: <span className="font-semibold text-slate-600">{settings?.academy_name || '—'}</span>
              </p>
            </div>
          </div>

          {/* WhatsApp Message Preview */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <MessageCircle size={20} className="text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">معاينة رسالة تأكيد الحجز</h3>
                <p className="text-xs text-slate-500">نص الرسالة التي تُرسل للطالب عند تأكيد الحجز عبر واتساب</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
              {/* Fake WhatsApp bubble */}
              <div className="bg-[#e7f5e0] rounded-xl p-4 max-w-2xl mx-auto shadow-sm border border-emerald-100/50">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-emerald-100/60">
                  <MessageCircle size={14} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">رسالة واتساب — معاينة</span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-cairo leading-relaxed" dir="rtl">
                  {previewMessage}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <ExternalLink size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                القيم بين الأقواس المربعة [ ] يتم استبدالها تلقائياً ببيانات الطالب والمعلم والباقة عند إرسال الرسالة الفعلية.
              </p>
            </div>
          </div>
        </>
      ) : (
        <ExternalPagesSettings />
      )}
    </div>
  );
}
