import { useState, useMemo } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  formatCurrency,
  SUBSCRIPTION_LABELS,
  DAYS_AR,
  DAY_ORDER,
  formatTime,
} from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import type { Student, SubscriptionStatus, Teacher, DayOfWeek } from '../../types';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  User,
  KeyRound,
  Copy,
  Check,
  Calendar,
  Clock as ClockIcon,
  X,
  Search,
  Filter,
  GraduationCap,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';

const SUB_META: Record<
  SubscriptionStatus,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={12} /> },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={12} /> },
  overdue: { bg: 'bg-rose-100', text: 'text-rose-700', icon: <AlertCircle size={12} /> },
};

export function AdminStudents() {
  const { students, teachers, addStudent, updateStudent, deleteStudent, setAvailabilitySlots, toggleStudentPaused } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; phone: string; password: string; student_code?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  // Advanced filters
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'paused'>('all');

  const filteredStudents = students.filter((s) => {
    if (teacherFilter !== 'all' && s.teacher_id !== teacherFilter) return false;
    if (statusFilter === 'paused' && !s.is_paused) return false;
    if (statusFilter !== 'all' && statusFilter !== 'paused' && (s.is_paused || s.subscription_status !== statusFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !(s.phone || '').includes(q)) return false;
    }
    return true;
  });

  function buildCredentialsText(s: { name: string; email: string; phone: string; password: string; student_code?: string | null }): string {
    const identifier = s.email || s.phone;
    return `بيانات الدخول لأكاديمية ربانيون
الاسم: ${s.name}
البريد/الهاتف: ${identifier}
كلمة المرور: ${s.password}
كود الطالب: ${s.student_code || 'غير محدد'}
رابط الموقع: ${window.location.origin}`;
  }

  async function handleCopyCreds(s: { name: string; email: string; phone: string; password: string }) {
    const text = buildCredentialsText(s);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy credentials:', err);
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة الطلاب</h2>
          <p className="text-slate-500 mt-1">{students.length} طالب مسجل</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={18} />
          إضافة طالب
        </button>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        {/* Advanced Filter Bar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Teacher Filter */}
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-slate-400 flex-shrink-0" />
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="input-field py-2 text-sm w-full sm:w-48"
              >
                <option value="all">كل المعلمين</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Subscription Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending' | 'overdue')}
                className="input-field py-2 text-sm w-full sm:w-40"
              >
                <option value="all">كل الحالات</option>
                <option value="paid">مدفوع</option>
                <option value="pending">معلق</option>
                <option value="overdue">متأخر</option>
                <option value="paused">متوقف مؤقتاً</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs sm:mr-auto">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pr-9 py-2 text-sm"
                placeholder="بحث بالاسم أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-slate-400 mt-2">
            عرض {filteredStudents.length} من {students.length} طالب
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الطالب</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">المعلم</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الحالة</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الاشتراك</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الرسوم</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">الكود</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const teacher = teachers.find((t) => t.id === student.teacher_id);
                const sub = SUBSCRIPTION_LABELS[student.subscription_status];
                const c = SUB_META[student.subscription_status];
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{student.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={10} />
                            <span className="ltr-nums">{student.phone || '—'}</span>
                          </p>
                          {student.student_code && (
                            <p className="text-xs text-emerald-600 font-mono font-semibold flex items-center gap-1 mt-0.5">
                              <KeyRound size={10} />
                              <span className="ltr-nums">{student.student_code}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-600">{teacher?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{teacher?.subject || ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge bg-slate-100 text-slate-600">
                        <User size={12} />
                        {student.status || 'طالب جديد'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {student.is_paused ? (
                        <span className="badge bg-slate-200 text-slate-600">
                          <PauseCircle size={12} />
                          متوقف مؤقتاً
                        </span>
                      ) : (
                        <span className={`badge ${c.bg} ${c.text}`}>
                          {c.icon}
                          {sub.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(student.monthly_fee || 0)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {student.student_code ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-xs font-bold ltr-nums">
                          <KeyRound size={11} />
                          {student.student_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(student)}
                          className="btn-ghost text-sm"
                          title="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleStudentPaused(student.id)}
                          className={`btn-ghost text-sm ${student.is_paused ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                          title={student.is_paused ? 'إعادة تفعيل الطالب' : 'إيقاف الطالب مؤقتاً'}
                        >
                          {student.is_paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                        </button>
                        <button
                          onClick={() => setDeleting(student)}
                          className="btn-ghost text-sm text-rose-500 hover:bg-rose-50"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <User size={32} className="mx-auto mb-2 opacity-50" />
            <p>لا يوجد طلاب مسجلون</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editing) && (
        <StudentForm
          student={editing}
          teachers={teachers}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSave={async (data, newRegularSlots, prevRegularSlots) => {
            if (editing) {
              // Update student
              await updateStudent(editing.id, data);

              // If regular_slots changed, update teacher's availability
              if (newRegularSlots && prevRegularSlots && editing.teacher_id) {
                const teacher = teachers.find((t) => t.id === editing.teacher_id);
                if (teacher) {
                  await syncTeacherSlots(
                    teacher,
                    prevRegularSlots,
                    newRegularSlots,
                    editing.name,
                    setAvailabilitySlots
                  );
                }
              }
              setEditing(null);
            } else {
              const newId = await addStudent(data);
              setShowAdd(false);
              if (newId) {
                setCreatedCreds({
                  name: data.name || '',
                  email: '',
                  phone: data.phone || '',
                  password: data.password || '',
                  student_code: data.student_code || null,
                });
              }
            }
          }}
        />
      )}

      {/* Copy Credentials Modal (after creating a new student) */}
      {createdCreds && (
        <Modal
          open
          onClose={() => setCreatedCreds(null)}
          title="تم إنشاء الطالب — نسخ بيانات الدخول"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                تم إنشاء الطالب <span className="font-bold">{createdCreds.name}</span> بنجاح. يمكنك الآن نسخ بيانات الدخول ومشاركتها معه.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed" dir="rtl">
                {buildCredentialsText(createdCreds)}
              </pre>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleCopyCreds(createdCreds)}
                className="btn-primary flex-1"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    نسخ بيانات الدخول
                  </>
                )}
              </button>
              <button onClick={() => setCreatedCreds(null)} className="btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
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
                <p className="font-semibold text-slate-800">حذف الطالب</p>
                <p className="text-sm text-slate-500">
                  هل أنت متأكد من حذف «{deleting.name}»؟ سيتم إعادة الموعد المتاح للمعلم تلقائيًا.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  setDeletingInProgress(true);
                  try {
                    await deleteStudent(deleting.id);
                    setDeleting(null);
                  } catch (err) {
                    console.error('Failed to delete student:', err);
                  } finally {
                    setDeletingInProgress(false);
                  }
                }}
                disabled={deletingInProgress}
                className="btn-primary flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingInProgress ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="btn-secondary"
                disabled={deletingInProgress}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Sync teacher availability slots when a student's regular_slots change.
 * - Slots that are in prev but not in next: mark as 'available'
 * - Slots that are in next but not in prev: mark as 'booked' with student name
 */
async function syncTeacherSlots(
  teacher: Teacher,
  prevSlots: { day: DayOfWeek; start: string; end: string }[],
  nextSlots: { day: DayOfWeek; start: string; end: string }[],
  studentName: string,
  setAvailabilitySlots: (teacherId: string, slots: Teacher['availability_slots']) => Promise<void>
) {
  const newSlots = [...teacher.availability_slots];

  // Release previously booked slots
  for (const prev of prevSlots) {
    const stillBooked = nextSlots.some(
      (n) => n.day === prev.day && n.start === prev.start && n.end === prev.end
    );
    if (!stillBooked) {
      const idx = newSlots.findIndex(
        (s) => s.day === prev.day && s.start === prev.start && s.end === prev.end
      );
      if (idx >= 0) {
        newSlots[idx] = { ...newSlots[idx], status: 'available', student_name: null };
      }
    }
  }

  // Book newly added slots (only if currently available)
  for (const next of nextSlots) {
    const wasBooked = prevSlots.some(
      (p) => p.day === next.day && p.start === next.start && p.end === next.end
    );
    if (!wasBooked) {
      const idx = newSlots.findIndex(
        (s) =>
          s.day === next.day &&
          s.start === next.start &&
          s.end === next.end &&
          s.status === 'available'
      );
      if (idx >= 0) {
        newSlots[idx] = { ...newSlots[idx], status: 'booked', student_name: studentName };
      }
    }
  }

  await setAvailabilitySlots(teacher.id, newSlots);
}

function StudentForm({
  student,
  teachers,
  onClose,
  onSave,
}: {
  student: Student | null;
  teachers: Teacher[];
  onClose: () => void;
  onSave: (
    data: Partial<Student>,
    newRegularSlots?: { day: DayOfWeek; start: string; end: string }[],
    prevRegularSlots?: { day: DayOfWeek; start: string; end: string }[]
  ) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    teacher_id: student?.teacher_id || teachers[0]?.id || '',
    status: student?.status || 'طالب جديد',
    subscription_status: (student?.subscription_status || 'pending') as SubscriptionStatus,
    monthly_fee: student?.monthly_fee || 600,
    expiry_date: student?.expiry_date || '',
    password: student?.password || '',
    student_code: student?.student_code || '',
  });
  const [saving, setSaving] = useState(false);

  // Regular slots state — for editing, initialize from student; for new, empty
  const [regularSlots, setRegularSlots] = useState<{ day: DayOfWeek; start: string; end: string }[]>(
    student?.regular_slots || []
  );
  const prevRegularSlots = student?.regular_slots || [];

  // Get the assigned teacher
  const assignedTeacher = teachers.find((t) => t.id === form.teacher_id) || null;

  // Available slots from the teacher (status === 'available'), grouped by day
  // Also include slots that are already booked by THIS student (so they show as selected)
  const availableSlotsByDay = useMemo(() => {
    if (!assignedTeacher) return {} as Record<DayOfWeek, { start: string; end: string }[]>;
    const result: Record<DayOfWeek, { start: string; end: string }[]> = {
      saturday: [], sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
    };
    for (const slot of assignedTeacher.availability_slots || []) {
      // Show slot if it's available OR if it's already in this student's regular slots
      const isStudentSlot = regularSlots.some(
        (rs) => rs.day === slot.day && rs.start === slot.start && rs.end === slot.end
      );
      if (slot.status === 'available' || isStudentSlot) {
        result[slot.day].push({ start: slot.start, end: slot.end });
      }
    }
    // Sort each day's slots by start time
    for (const d of Object.keys(result) as DayOfWeek[]) {
      result[d].sort((a, b) => a.start.localeCompare(b.start));
    }
    return result;
  }, [assignedTeacher, regularSlots]);

  function toggleSlot(day: DayOfWeek, start: string, end: string) {
    const exists = regularSlots.some(
      (rs) => rs.day === day && rs.start === start && rs.end === end
    );
    if (exists) {
      setRegularSlots(regularSlots.filter(
        (rs) => !(rs.day === day && rs.start === start && rs.end === end)
      ));
    } else {
      setRegularSlots([...regularSlots, { day, start, end }]);
    }
  }

  function isSlotSelected(day: DayOfWeek, start: string, end: string): boolean {
    return regularSlots.some(
      (rs) => rs.day === day && rs.start === start && rs.end === end
    );
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pwd });
  }

  return (
    <Modal open onClose={onClose} title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">اسم الطالب</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: يوسف أحمد"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <KeyRound size={14} className="text-slate-400" />
            كود الطالب
          </label>
          <input
            className="input-field"
            value={form.student_code}
            onChange={(e) => setForm({ ...form, student_code: e.target.value })}
            placeholder="مثال: RAB-001"
            dir="ltr"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            كود فريد يستخدمه ولي الأمر للدخول لصفحة الدفع المباشر. يُترك فارغاً إن لم يُحدد.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">رقم الهاتف</label>
          <input
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="01012345678"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">المعلم</label>
          <select
            className="input-field"
            value={form.teacher_id}
            onChange={(e) => {
              setForm({ ...form, teacher_id: e.target.value });
              // Clear regular slots when teacher changes
              setRegularSlots([]);
            }}
          >
            <option value="">بدون معلم</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">حالة الطالب</label>
          <select
            className="input-field"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="طالب جديد">طالب جديد</option>
            <option value="طالب منتظم">طالب منتظم</option>
            <option value="طالب متوقف">طالب متوقف</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">الرسوم الشهرية</label>
            <input
              type="number"
              className="input-field"
              value={form.monthly_fee}
              onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">حالة الاشتراك</label>
            <select
              className="input-field"
              value={form.subscription_status}
              onChange={(e) => setForm({ ...form, subscription_status: e.target.value as SubscriptionStatus })}
            >
              <option value="paid">مدفوع</option>
              <option value="pending">معلق</option>
              <option value="overdue">متأخر</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">تاريخ انتهاء الاشتراك</label>
          <input
            type="date"
            className="input-field"
            value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <KeyRound size={14} className="text-slate-400" />
            كلمة المرور (للدخول)
          </label>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="اتركها فارغة لتوليد كلمة مرور"
              dir="ltr"
            />
            <button
              type="button"
              onClick={generatePassword}
              className="btn-secondary text-sm whitespace-nowrap"
              title="توليد كلمة مرور عشوائية"
            >
              توليد
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            سيستخدم الطالب الهاتف + كلمة المرور لتسجيل الدخول.
          </p>
        </div>

        {/* Interactive Schedule Selector (only in edit mode and when a teacher is assigned) */}
        {student && assignedTeacher && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-600" />
              المواعيد المنتظمة الأسبوعية
            </label>
            <p className="text-xs text-slate-400 mb-3">
              اختر المواعيد المتاحة من جدول المعلم <span className="font-semibold">{assignedTeacher.name}</span>. سيتم حجز هذه المواعيد للطالب.
            </p>

            {/* Selected slots summary */}
            {regularSlots.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                {regularSlots.map((slot, idx) => (
                  <span
                    key={idx}
                    className="badge bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200 transition-all"
                    onClick={() => toggleSlot(slot.day, slot.start, slot.end)}
                    title="إزالة"
                  >
                    {DAYS_AR[slot.day]} — {formatTime(slot.start)}
                    <X size={10} />
                  </span>
                ))}
              </div>
            )}

            {/* Available slots grouped by day */}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {DAY_ORDER.map((day) => {
                const daySlots = availableSlotsByDay[day] || [];
                if (daySlots.length === 0) return null;
                return (
                  <div key={day}>
                    <p className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      {DAYS_AR[day]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {daySlots.map((slot, idx) => {
                        const selected = isSlotSelected(day, slot.start, slot.end);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleSlot(day, slot.start, slot.end)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                              selected
                                ? 'bg-emerald-600 text-white shadow-soft'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                          >
                            <ClockIcon size={11} />
                            <span className="ltr-nums">{formatTime(slot.start)}</span>
                            {selected && <Check size={11} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {Object.values(availableSlotsByDay).every((arr) => arr.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">
                  لا توجد مواعيد متاحة لدى هذا المعلم. اطلب من المعلم تحديد مواعيد متاحة أولاً.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Show existing regular slots for new students (read-only display) */}
        {!student && regularSlots.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">المواعيد المنتظمة</label>
            <div className="flex flex-wrap gap-2">
              {regularSlots.map((slot, idx) => (
                <span key={idx} className="badge bg-emerald-100 text-emerald-700">
                  {DAYS_AR[slot.day]} — {formatTime(slot.start)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const data: Partial<Student> = {
                  name: form.name,
                  phone: form.phone,
                  teacher_id: form.teacher_id || null,
                  status: form.status,
                  subscription_status: form.subscription_status,
                  monthly_fee: form.monthly_fee,
                  expiry_date: form.expiry_date || null,
                  password: form.password,
                  regular_slots: student ? regularSlots : [],
                  student_code: form.student_code || null,
                };
                if (student) {
                  await onSave(data, regularSlots, prevRegularSlots);
                } else {
                  await onSave(data);
                }
              } catch (err) {
                console.error('Failed to save student:', err);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!form.name || saving}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : student ? 'حفظ التعديلات' : 'إضافة الطالب'}
          </button>
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
