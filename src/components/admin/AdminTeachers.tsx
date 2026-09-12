import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  DAYS_AR,
  DAY_ORDER,
  formatTime,
  formatCurrency,
  MONTHS_AR,
  getMonthName,
} from '../../data/mockData';
import { Avatar, Badge } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import type { Teacher } from '../../types';
import {
  Plus,
  Pencil,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  Mail,
  Phone,
  DollarSign,
  Users,
  Copy,
  Check,
  BarChart3,
  KeyRound,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export function AdminTeachers() {
  const { teachers, students, sessionLogs, addTeacher, updateTeacher, archiveTeacher, reactivateTeacher, deleteTeacher } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [scheduleTeacher, setScheduleTeacher] = useState<Teacher | null>(null);
  const [perfTeacher, setPerfTeacher] = useState<Teacher | null>(null);
  const [createdCreds, setCreatedCreds] = useState<Teacher | null>(null);
  const [copied, setCopied] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const activeTeachers = teachers.filter((t) => t.is_active !== false);
  const archivedTeachers = teachers.filter((t) => t.is_active === false);
  const displayedTeachers = showArchived ? archivedTeachers : activeTeachers;

  // Calculate monthly salary for a teacher based on completed sessions this month
  function getTeacherSalary(teacherId: string): { completed: number; amount: number } {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const completed = sessionLogs.filter((l) => {
      if (l.teacher_id !== teacherId || l.attendance_status !== 'حاضر') return false;
      const d = new Date(l.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((sum, l) => sum + (l.session_count || 1), 0);
    const teacher = teachers.find((t) => t.id === teacherId);
    return { completed, amount: completed * (teacher?.salary_per_session || 0) };
  }

  function buildCredentialsText(teacher: Teacher): string {
    const identifier = teacher.email || teacher.phone;
    return `بيانات الدخول لأكاديمية ربانيون
الاسم: ${teacher.name}
البريد/الهاتف: ${identifier}
كلمة المرور: ${teacher.password}
رابط الموقع: ${window.location.origin}`;
  }

  async function handleCopyCreds(teacher: Teacher) {
    const text = buildCredentialsText(teacher);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy credentials:', err);
      // Fallback for older browsers
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
          <h2 className="text-2xl font-bold text-slate-800">إدارة المعلمين</h2>
          <p className="text-slate-500 mt-1">{activeTeachers.length} معلم نشط في الأكاديمية</p>
        </div>
        <div className="flex items-center gap-2">
          {archivedTeachers.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`btn-secondary text-sm ${showArchived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}`}
            >
              <Archive size={16} />
              {showArchived ? 'عرض النشطين' : `المؤرشفون (${archivedTeachers.length})`}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={18} />
            إضافة معلم
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedTeachers.map((teacher) => {
          const teacherStudents = students.filter((s) => s.teacher_id === teacher.id);
          const salary = getTeacherSalary(teacher.id);
          return (
            <div key={teacher.id} className="card p-5 hover:shadow-elevated transition-all duration-300">
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={teacher.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{teacher.name}</h3>
                  <p className="text-sm text-slate-500">{teacher.subject}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge color="emerald" icon={<Users size={12} />}>
                      {teacherStudents.length} طالب
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{teacher.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone size={14} className="text-slate-400" />
                  <span className="ltr-nums">{teacher.phone || '—'}</span>
                </div>
              </div>

              {/* Salary */}
              <div className="bg-slate-50 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <span className="text-xs text-slate-500">راتب هذا الشهر</span>
                  </div>
                  <span className="font-bold text-slate-800">{formatCurrency(salary.amount)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {salary.completed} حصة مكتملة × {formatCurrency(teacher.salary_per_session || 0)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleTeacher(teacher)}
                  className="btn-secondary flex-1 text-sm"
                >
                  <Calendar size={16} />
                  الجدول
                </button>
                <button
                  onClick={() => setPerfTeacher(teacher)}
                  className="btn-secondary flex-1 text-sm"
                  title="تقرير الأداء الشهري"
                >
                  <BarChart3 size={16} />
                  الأداء
                </button>
                <button
                  onClick={() => setEditing(teacher)}
                  className="btn-ghost text-sm"
                  title="تعديل"
                >
                  <Pencil size={16} />
                </button>
                {teacher.is_active !== false ? (
                  <button
                    onClick={async () => {
                      setArchiving(true);
                      try {
                        await archiveTeacher(teacher.id);
                      } catch (err) {
                        console.error('Failed to archive teacher:', err);
                      } finally {
                        setArchiving(false);
                      }
                    }}
                    disabled={archiving}
                    className="btn-ghost text-sm text-amber-600 hover:bg-amber-50"
                    title="أرشفة / إيقاف"
                  >
                    <Archive size={16} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setArchiving(true);
                        try {
                          await reactivateTeacher(teacher.id);
                        } catch (err) {
                          console.error('Failed to reactivate teacher:', err);
                        } finally {
                          setArchiving(false);
                        }
                      }}
                      disabled={archiving}
                      className="btn-ghost text-sm text-emerald-600 hover:bg-emerald-50"
                      title="إعادة تفعيل"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`هل أنت متأكد من الحذف النهائي للمعلم "${teacher.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
                        setArchiving(true);
                        try {
                          await deleteTeacher(teacher.id);
                        } catch (err) {
                          console.error('Failed to delete teacher:', err);
                        } finally {
                          setArchiving(false);
                        }
                      }}
                      disabled={archiving}
                      className="btn-ghost text-sm text-rose-600 hover:bg-rose-50"
                      title="حذف نهائي"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>

              {teacher.is_active === false && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                  <Archive size={12} />
                  معلم مؤرشف — غير متاح للحجز
                </div>
              )}
            </div>
          );
        })}
        {displayedTeachers.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>{showArchived ? 'لا يوجد معلمون مؤرشفون' : 'لا يوجد معلمون مسجلون'}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editing) && (
        <TeacherForm
          teacher={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSave={async (data) => {
            if (editing) {
              await updateTeacher(editing.id, data);
              setEditing(null);
            } else {
              const created = await addTeacher(data);
              setShowAdd(false);
              if (created) {
                setCreatedCreds(created);
              }
            }
          }}
        />
      )}

      {/* Copy Credentials Modal (after creating a new teacher) */}
      {createdCreds && (
        <Modal
          open
          onClose={() => setCreatedCreds(null)}
          title="تم إنشاء المعلم — نسخ بيانات الدخول"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                تم إنشاء المعلم <span className="font-bold">{createdCreds.name}</span> بنجاح. يمكنك الآن نسخ بيانات الدخول ومشاركتها معه.
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

      {/* Schedule Modal */}
      {scheduleTeacher && (
        <TeacherSchedule teacher={scheduleTeacher} onClose={() => setScheduleTeacher(null)} />
      )}

      {/* Performance Report Modal */}
      {perfTeacher && (
        <TeacherPerformance
          teacher={perfTeacher}
          sessionLogs={sessionLogs}
          onClose={() => setPerfTeacher(null)}
        />
      )}
    </div>
  );
}

function TeacherForm({
  teacher,
  onClose,
  onSave,
}: {
  teacher: Teacher | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    phone: string;
    email: string;
    subject: string;
    salary_per_session: number;
    password: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: teacher?.name || '',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    subject: teacher?.subject || '',
    salary_per_session: teacher?.salary_per_session || 100,
    password: teacher?.password || '',
  });
  const [saving, setSaving] = useState(false);

  // Auto-generate a password suggestion for new teachers
  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pwd });
  }

  return (
    <Modal open onClose={onClose} title={teacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">الاسم الكامل</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: أحمد عبد الله"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">البريد الإلكتروني</label>
          <input
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="teacher@academy.edu"
            dir="ltr"
          />
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
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">المادة</label>
          <input
            className="input-field"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="مثال: القرآن الكريم"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">الأجر لكل حصة ($)</label>
          <input
            type="number"
            className="input-field"
            value={form.salary_per_session}
            onChange={(e) => setForm({ ...form, salary_per_session: Number(e.target.value) })}
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
            سيستخدم المعلم البريد أو الهاتف + كلمة المرور لتسجيل الدخول.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
              } catch (err) {
                console.error('Failed to save teacher:', err);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!form.name || !form.subject || saving}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : teacher ? 'حفظ التعديلات' : 'إضافة المعلم'}
          </button>
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function TeacherSchedule({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const { setAvailabilitySlots } = useStore();
  const [slots, setSlots] = useState(teacher.availability_slots || []);
  const [saving, setSaving] = useState(false);

  const handleToggleSlot = async (idx: number) => {
    const current = slots[idx];
    if (!current || current.status === 'booked') return; // Can't toggle booked slots
    const newStatus = current.status === 'available' ? 'closed' : 'available';
    const updated = [...slots];
    updated[idx] = { ...current, status: newStatus };
    setSlots(updated);
    setSaving(true);
    try {
      await setAvailabilitySlots(teacher.id, updated);
    } catch (err) {
      console.error('Failed to toggle slot:', err);
      // Revert on failure
      setSlots(slots);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`الجدول الأسبوعي — ${teacher.name}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 pb-2 border-b border-slate-100">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            محجوز
          </span>
          <span className="flex items-center gap-1.5">
            <Circle size={14} className="text-emerald-400" />
            متاح
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-400" />
            مغلق
          </span>
          <span className="text-amber-600 font-semibold mr-auto">
            صلاحيات Super-Admin: انقر لتبديل حالة أي خانة
          </span>
        </div>

        {DAY_ORDER.map((day) => {
          const daySlots = slots
            .filter((s) => s.day === day)
            .sort((a, b) => a.start.localeCompare(b.start));

          if (daySlots.length === 0) return null;

          return (
            <div key={day}>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-600" />
                {DAYS_AR[day]}
              </h4>
              <div className="space-y-2">
                {daySlots.map((slot, dIdx) => {
                  const globalIdx = slots.indexOf(slot);
                  const isBooked = slot.status === 'booked';
                  const isClosed = slot.status === 'closed';
                  return (
                    <button
                      key={dIdx}
                      onClick={() => !isBooked && handleToggleSlot(globalIdx)}
                      disabled={isBooked || saving}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isBooked
                          ? 'bg-emerald-50 border-emerald-200 cursor-not-allowed'
                          : isClosed
                            ? 'bg-rose-50 border-rose-200 hover:border-rose-400 cursor-pointer'
                            : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400 cursor-pointer'
                      } ${saving ? 'opacity-60' : ''}`}
                    >
                      {isBooked ? (
                        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                      ) : isClosed ? (
                        <XCircle size={18} className="text-rose-400 flex-shrink-0" />
                      ) : (
                        <Circle size={18} className="text-emerald-500 flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock size={14} />
                        <span className="ltr-nums">{formatTime(slot.start)}</span>
                        <span>—</span>
                        <span className="ltr-nums">{formatTime(slot.end)}</span>
                      </div>
                      <div className="flex-1 text-right">
                        {isBooked ? (
                          <p className="text-sm font-semibold text-slate-700">
                            {slot.student_name || 'طالب'}
                          </p>
                        ) : isClosed ? (
                          <Badge color="rose">مغلق — انقر للفتح</Badge>
                        ) : (
                          <Badge color="emerald">متاح — انقر للإغلاق</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function TeacherPerformance({
  teacher,
  sessionLogs,
  onClose,
}: {
  teacher: Teacher;
  sessionLogs: { teacher_id: string; date: string; attendance_status: string }[];
  onClose: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  // Filter session logs for this teacher in the selected month/year
  const monthLogs = sessionLogs.filter((l) => {
    if (l.teacher_id !== teacher.id) return false;
    const d = new Date(l.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const attendedCount = monthLogs.filter((l) => l.attendance_status === 'حاضر').length;
  const teacherCanceledCount = monthLogs.filter((l) => l.attendance_status === 'اعتذار المعلم').length;
  const studentExcusedCount = monthLogs.filter((l) => l.attendance_status === 'اعتذار الطالب بعذر').length;
  const studentAbsentCount = monthLogs.filter((l) => l.attendance_status === 'غائب بدون عذر').length;
  const totalSessions = monthLogs.length;

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <Modal
      open
      onClose={onClose}
      title={`تقرير الأداء الشهري — ${teacher.name}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Month/Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <select
            className="input-field py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS_AR.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="input-field py-2 text-sm w-auto"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-slate-500">
          تقرير شهر <span className="font-bold text-slate-700">{getMonthName(month)}</span> {year}
        </p>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 gap-3">
          {/* Attended */}
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600">عدد حلقات الحضور</p>
              <p className="text-xs text-slate-400">الحصص التي حضرها الطلاب مع هذا المعلم</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{attendedCount}</p>
          </div>

          {/* Teacher-Canceled */}
          <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600">اعتذار المعلم</p>
              <p className="text-xs text-slate-400">الحصص التي ألغاها المعلم بعذر</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{teacherCanceledCount}</p>
          </div>

          {/* Student Excused */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Circle size={24} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600">اعتذار الطالب بعذر</p>
              <p className="text-xs text-slate-400">الحصص التي اعتذر عنها الطالب بعذر مقبول</p>
            </div>
            <p className="text-2xl font-bold text-blue-500">{studentExcusedCount}</p>
          </div>

          {/* Student Absent */}
          <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Circle size={24} className="text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600">غائب بدون عذر</p>
              <p className="text-xs text-slate-400">الحصص التي غاب عنها الطالب بدون إشعار</p>
            </div>
            <p className="text-2xl font-bold text-rose-500">{studentAbsentCount}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-sm font-semibold text-slate-600">إجمالي الحصص المسجلة</span>
          <span className="text-xl font-bold text-slate-800">{totalSessions}</span>
        </div>
      </div>
    </Modal>
  );
}
