import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import { formatCurrency } from '../../data/mockData';
import { Modal } from '../ui/Modal';
import type { Package } from '../../types';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Package as PackageIcon,
  Clock,
  ToggleLeft,
  ToggleRight,
  Save,
} from 'lucide-react';

export function AdminPackages() {
  const { packages, addPackage, updatePackage, deletePackage } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<Package | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Sort packages by sort_order then created_at
  const sorted = [...packages].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.created_at || '').localeCompare(b.created_at || '')
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة الأسعار والباقات</h2>
          <p className="text-slate-500 mt-1">{packages.length} باقة — الباقات النشطة تظهر في صفحة الحجز</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={18} />
          إضافة باقة
        </button>
      </div>

      {/* Packages Grid */}
      {sorted.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <PackageIcon size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold">لا توجد باقات بعد</p>
          <p className="text-sm mt-1">اضغط «إضافة باقة» لإنشاء أول باقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onUpdate={updatePackage}
              onDelete={() => setDeleting(pkg)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <PackageForm
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await addPackage(data);
            setShowAdd(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <Modal open onClose={() => setDeleting(null)} title="تأكيد الحذف" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-rose-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">حذف الباقة</p>
                <p className="text-sm text-slate-500">
                  هل أنت متأكد من حذف «{deleting.label || deleting.session_count + ' حصص'}»؟
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  setDeletingInProgress(true);
                  try {
                    await deletePackage(deleting.id);
                    setDeleting(null);
                  } catch (err) {
                    console.error('Failed to delete package:', err);
                  } finally {
                    setDeletingInProgress(false);
                  }
                }}
                disabled={deletingInProgress}
                className="btn-primary flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingInProgress ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button onClick={() => setDeleting(null)} className="btn-secondary" disabled={deletingInProgress}>
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  onUpdate,
  onDelete,
}: {
  pkg: Package;
  onUpdate: (id: string, updates: Partial<Package>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [form, setForm] = useState({
    label: pkg.label || '',
    description: pkg.description || '',
    price: pkg.price || 0,
    duration_minutes: pkg.duration_minutes || 30,
    session_count: pkg.session_count || 1,
  });

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(pkg.id, {
        label: form.label,
        description: form.description,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        session_count: Number(form.session_count),
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update package:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onUpdate(pkg.id, { is_active: !pkg.is_active });
    } catch (err) {
      console.error('Failed to toggle package:', err);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className={`card p-5 transition-all duration-300 hover:shadow-elevated ${
        pkg.is_active ? 'border-emerald-200/60' : 'border-slate-200/60 opacity-70'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              pkg.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <PackageIcon size={20} />
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center gap-1 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            title={pkg.is_active ? 'إيقاف الباقة' : 'تفعيل الباقة'}
          >
            {pkg.is_active ? (
              <ToggleRight size={28} className="text-emerald-600" />
            ) : (
              <ToggleLeft size={28} className="text-slate-400" />
            )}
            <span className={pkg.is_active ? 'text-emerald-600' : 'text-slate-400'}>
              {pkg.is_active ? 'نشطة' : 'متوقفة'}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing((v) => !v)} className="btn-ghost text-sm" title="تعديل">
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </button>
          <button onClick={onDelete} className="btn-ghost text-sm text-rose-500 hover:bg-rose-50" title="حذف">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">عنوان الباقة</label>
            <input
              className="input-field text-sm"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="مثال: باقة 8 حصص"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">الوصف</label>
            <textarea
              className="input-field text-sm resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصف مختصر للباقة"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">عدد الحصص</label>
              <input
                type="number"
                className="input-field text-sm"
                value={form.session_count}
                onChange={(e) => setForm({ ...form, session_count: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">السعر (ج.م)</label>
              <input
                type="number"
                className="input-field text-sm"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">المدة (د)</label>
              <input
                type="number"
                className="input-field text-sm"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      ) : (
        <>
          <h3 className="font-bold text-slate-800 text-lg">{pkg.label || `${pkg.session_count} حصص`}</h3>
          <p className="text-sm text-slate-500 mt-1 min-h-[2.5rem]">{pkg.description || '—'}</p>

          <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(pkg.price || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {pkg.session_count || 0} حصة •{' '}
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} />
                  {pkg.duration_minutes || 0} دقيقة
                </span>
              </p>
            </div>
            <span
              className={`badge ${pkg.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {pkg.is_active ? (
                <>
                  <Check size={12} />
                  نشطة
                </>
              ) : (
                <>
                  <X size={12} />
                  متوقفة
                </>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function PackageForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Partial<Package>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    label: '',
    description: '',
    price: 600,
    duration_minutes: 30,
    session_count: 8,
    is_active: true,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  return (
    <Modal open onClose={onClose} title="إضافة باقة جديدة">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">عنوان الباقة</label>
          <input
            className="input-field"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="مثال: باقة 8 حصص"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">الوصف</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="وصف مختصر للباقة"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">عدد الحصص</label>
            <input
              type="number"
              className="input-field"
              value={form.session_count}
              onChange={(e) => setForm({ ...form, session_count: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">السعر (ج.م)</label>
            <input
              type="number"
              className="input-field"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">المدة (دقيقة)</label>
            <input
              type="number"
              className="input-field"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
              } catch (err) {
                console.error('Failed to add package:', err);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!form.label || saving}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : 'إضافة الباقة'}
          </button>
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}
