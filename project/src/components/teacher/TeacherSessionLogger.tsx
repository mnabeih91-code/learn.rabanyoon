import { useState, useEffect } from 'react';
import { useStore } from '../../store/StoreContext';
import {
  getTodayISO,
  getTodayDay,
  DAYS_AR,
  ATTENDANCE_OPTIONS,
} from '../../data/mockData';
import { Avatar, Badge } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import type {
  AttendanceStatus,
  SessionType,
  SessionLog,
} from '../../types';
import {
  ClipboardCheck,
  Check,
  X,
  Save,
  Star,
  BookOpen,
  Smile,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Pencil,
  AlertCircle,
} from 'lucide-react';

export function TeacherSessionLogger() {
  const { teachers, students, sessionLogs, logSession, updateSession, currentUser } =
    useStore();

  // SANDBOX INSULATION: find the logged-in teacher via currentUser.teacher_id
  // (NOT teachers[0]) so a teacher only ever sees their own data.
  const teacher = teachers.find((t) => t.id === currentUser?.teacher_id);

  const todayDay = getTodayDay();
  const today = getTodayISO();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionLog | null>(null);

  // Students assigned to THIS teacher only
  const myStudents = teacher
    ? students.filter((s) => s.teacher_id === teacher.id)
    : [];

  // Today's logged sessions for THIS teacher only
  const todayLogs = sessionLogs
    .filter((l) => l.teacher_id === teacher?.id && l.date.startsWith(today))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const openNew = () => {
    setEditingSession(null);
    setModalOpen(true);
  };

  const openEdit = (session: SessionLog) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingSession(null);
  };

  if (!teacher) {
    return (
      <div className="card p-12 text-center">
        <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا يوجد معلم مسجّل</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">تسجيل الحصص</h2>
          <p className="text-slate-500 mt-1">
            {DAYS_AR[todayDay]} — سجل الحضور والتقييم لكل حلقة
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={18} />
          إضافة حلقة
        </button>
      </div>

      {/* Today's logged sessions */}
      <div>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          حصص اليوم المسجّلة
          <span className="text-sm font-normal text-slate-400">
            ({todayLogs.length})
          </span>
        </h3>

        {todayLogs.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">لا توجد حصص مسجّلة اليوم</p>
            <button onClick={openNew} className="btn-primary mt-4 mx-auto">
              <Plus size={18} />
              إضافة أول حلقة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayLogs.map((log) => {
              const student = students.find((s) => s.id === log.student_id);
              const isPresent = log.attendance_status === 'حاضر';
              const isTeacherExcuse = log.attendance_status === 'اعتذار المعلم';
              const isStudentExcuse = log.attendance_status === 'اعتذار الطالب بعذر';
              const cardBorder = isPresent
                ? 'border-emerald-200'
                : isTeacherExcuse
                ? 'border-amber-200'
                : isStudentExcuse
                ? 'border-blue-200'
                : 'border-rose-200';
              return (
                <div
                  key={log.id}
                  className={`card p-5 transition-all duration-300 hover:shadow-elevated ${cardBorder}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={student?.name || '؟'} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">
                        {student?.name || 'طالب محذوف'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {log.type} — {log.duration_minutes} دقيقة
                      </p>
                    </div>
                    {isPresent ? (
                      <Badge color="emerald" icon={<Check size={12} />}>
                        حاضر
                      </Badge>
                    ) : isTeacherExcuse ? (
                      <Badge color="amber" icon={<X size={12} />}>
                        اعتذار المعلم
                      </Badge>
                    ) : isStudentExcuse ? (
                      <Badge color="blue" icon={<X size={12} />}>
                        اعتذار الطالب
                      </Badge>
                    ) : (
                      <Badge color="rose" icon={<X size={12} />}>
                        غائب
                      </Badge>
                    )}
                  </div>

                  {isPresent && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {log.type === 'قرآن' ? (
                        <>
                          <ScoreBox label="الحفظ" value={log.hifz_score} />
                          <ScoreBox label="التجويد" value={log.tajweed_score} />
                          <ScoreBox label="المراجعة" value={log.review_score} />
                        </>
                      ) : (
                        <>
                          <ScoreBox label="تفاعل سابق" value={log.interaction_old} />
                          <ScoreBox label="تفاعل جديد" value={log.interaction_new} />
                          <ScoreBox label="السلوك" value={log.behavior_score} />
                        </>
                      )}
                    </div>
                  )}

                  {log.material_covered && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mb-2">
                      <span className="font-semibold">المادة: </span>
                      {log.material_covered}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mb-3">
                      {log.notes}
                    </p>
                  )}

                  <button
                    onClick={() => openEdit(log)}
                    className="btn-secondary w-full text-sm"
                  >
                    <Pencil size={16} />
                    تعديل التقييم
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Logger Modal */}
      <SessionLoggerModal
        open={modalOpen}
        onClose={handleClose}
        students={myStudents}
        editingSession={editingSession}
        onSubmit={async (data) => {
          if (editingSession) {
            await updateSession(editingSession.id, data);
          } else {
            await logSession({
              ...data,
              teacher_id: teacher.id,
            });
          }
          handleClose();
        }}
      />
    </div>
  );
}

function ScoreBox({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-700">
        {value !== null && value !== undefined ? `${value}/10` : '—'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session Logger Modal
// ---------------------------------------------------------------------------
interface SessionLoggerData {
  student_id: string;
  date: string;
  attendance_status: AttendanceStatus;
  type: SessionType;
  subject_name: string;
  material_covered: string;
  hifz_score: number | null;
  tajweed_score: number | null;
  review_score: number | null;
  interaction_old: number | null;
  interaction_new: number | null;
  behavior_score: number | null;
  student_alerts: string;
  notes: string;
  duration_minutes: number;
}

function SessionLoggerModal({
  open,
  onClose,
  students,
  editingSession,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  students: { id: string; name: string }[];
  editingSession: SessionLog | null;
  onSubmit: (data: SessionLoggerData) => Promise<void>;
}) {
  const today = getTodayISO();
  const isEditing = !!editingSession;

  // --- Form state ---
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(today);
  const [attendance, setAttendance] = useState<AttendanceStatus>('حاضر');
  const [sessionType, setSessionType] = useState<SessionType>('قرآن');
  const [materialCovered, setMaterialCovered] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [hifzScore, setHifzScore] = useState<number | null>(8);
  const [tajweedScore, setTajweedScore] = useState<number | null>(8);
  const [reviewScore, setReviewScore] = useState<number | null>(8);
  const [interactionOld, setInteractionOld] = useState<number | null>(8);
  const [interactionNew, setInteractionNew] = useState<number | null>(8);
  const [behaviorScore, setBehaviorScore] = useState<number | null>(9);
  const [studentAlerts, setStudentAlerts] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset / pre-fill form when modal opens or editingSession changes
  useEffect(() => {
    if (!open) return;
    if (editingSession) {
      setStudentId(editingSession.student_id);
      setDate(editingSession.date.split('T')[0]);
      setAttendance(editingSession.attendance_status);
      setSessionType(editingSession.type);
      setMaterialCovered(editingSession.material_covered || '');
      setSubjectName(editingSession.subject_name || '');
      setHifzScore(editingSession.hifz_score ?? 8);
      setTajweedScore(editingSession.tajweed_score ?? 8);
      setReviewScore(editingSession.review_score ?? 8);
      setInteractionOld(editingSession.interaction_old ?? 8);
      setInteractionNew(editingSession.interaction_new ?? 8);
      setBehaviorScore(editingSession.behavior_score ?? 9);
      setStudentAlerts(editingSession.student_alerts || '');
      setNotes(editingSession.notes || '');
      setDuration(editingSession.duration_minutes || 30);
    } else {
      setStudentId(students[0]?.id || '');
      setDate(today);
      setAttendance('حاضر');
      setSessionType('قرآن');
      setMaterialCovered('');
      setSubjectName('');
      setHifzScore(8);
      setTajweedScore(8);
      setReviewScore(8);
      setInteractionOld(8);
      setInteractionNew(8);
      setBehaviorScore(9);
      setStudentAlerts('');
      setNotes('');
      setDuration(30);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingSession]);

  const isPresent = attendance === 'حاضر';
  const isQuran = sessionType === 'قرآن';

  const handleSave = async () => {
    setError(null);
    if (!studentId) {
      setError('الرجاء اختيار الطالب');
      return;
    }
    setSaving(true);
    try {
      const data: SessionLoggerData = {
        student_id: studentId,
        date,
        attendance_status: attendance,
        type: sessionType,
        subject_name: isPresent ? subjectName : '',
        material_covered: isPresent ? materialCovered : '',
        hifz_score: isPresent && isQuran ? hifzScore : null,
        tajweed_score: isPresent && isQuran ? tajweedScore : null,
        review_score: isPresent && isQuran ? reviewScore : null,
        interaction_old: isPresent && !isQuran ? interactionOld : null,
        interaction_new: isPresent && !isQuran ? interactionNew : null,
        behavior_score: isPresent && isQuran ? behaviorScore : null,
        student_alerts: isPresent && !isQuran ? studentAlerts : '',
        notes,
        duration_minutes: duration,
      };
      await onSubmit(data);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'تعديل التقييم' : 'إضافة حلقة'}
      maxWidth="max-w-2xl"
    >
      {/* Student + Date selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            الطالب
          </label>
          <select
            className="input-field"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isEditing}
          >
            <option value="" disabled>
              اختر الطالب
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            التاريخ
          </label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance status selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          حالة الحضور
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ATTENDANCE_OPTIONS.map((opt) => {
            const selected = attendance === opt.value;
            const isAbs = opt.value !== 'حاضر';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAttendance(opt.value)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  selected
                    ? isAbs
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {opt.value === 'حاضر' ? (
                  <Check size={16} />
                ) : (
                  <X size={16} />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Evaluation form — only when present */}
      {isPresent && (
        <div className="space-y-4 animate-fade-in">
          {/* Session type selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              توصيف الحلقة
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSessionType('قرآن')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  isQuran
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <BookOpen size={16} />
                قرآن
              </button>
              <button
                type="button"
                onClick={() => setSessionType('علوم شرعية')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  !isQuran
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <BookOpen size={16} />
                علوم شرعية
              </button>
            </div>
          </div>

          {/* Quran fields */}
          {isQuran && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="مقدار الحفظ"
                  icon={<BookOpen size={16} className="text-emerald-600" />}
                >
                  <input
                    type="text"
                    className="input-field"
                    value={materialCovered}
                    onChange={(e) => setMaterialCovered(e.target.value)}
                    placeholder="مثال: من آية ١ إلى آية ٢٠"
                  />
                </Field>
                <Field
                  label="مقدار المراجعة"
                  icon={<Star size={16} className="text-amber-500" />}
                >
                  <input
                    type="text"
                    className="input-field"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="مثال: مراجعة سورة البقرة"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ScoreInput
                  label="الحفظ"
                  value={hifzScore}
                  onChange={setHifzScore}
                  icon={<BookOpen size={16} className="text-emerald-600" />}
                />
                <ScoreInput
                  label="التجويد"
                  value={tajweedScore}
                  onChange={setTajweedScore}
                  icon={<Star size={16} className="text-amber-500" />}
                />
                <ScoreInput
                  label="المراجعة"
                  value={reviewScore}
                  onChange={setReviewScore}
                  icon={<Star size={16} className="text-blue-500" />}
                />
                <ScoreInput
                  label="السلوك"
                  value={behaviorScore}
                  onChange={setBehaviorScore}
                  icon={<Smile size={16} className="text-teal-500" />}
                />
              </div>
            </div>
          )}

          {/* Islamic studies fields — NO behavior field */}
          {!isQuran && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="المادة"
                  icon={<BookOpen size={16} className="text-emerald-600" />}
                >
                  <input
                    type="text"
                    className="input-field"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="مثال: الفقه — كتاب الطهارة"
                  />
                </Field>
                <Field
                  label="مقدار الجديد"
                  icon={<Star size={16} className="text-amber-500" />}
                >
                  <input
                    type="text"
                    className="input-field"
                    value={materialCovered}
                    onChange={(e) => setMaterialCovered(e.target.value)}
                    placeholder="مثال: صفحات ١٠-١٥"
                  />
                </Field>
              </div>
              <Field
                label="تنبيهات للطالب"
                icon={<AlertCircle size={16} className="text-rose-500" />}
              >
                <input
                  type="text"
                  className="input-field"
                  value={studentAlerts}
                  onChange={(e) => setStudentAlerts(e.target.value)}
                  placeholder="مثال: مراجعة الواجب قبل الحصة القادمة"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ScoreInput
                  label="التفاعل فيما سبق"
                  value={interactionOld}
                  onChange={setInteractionOld}
                  icon={<Smile size={16} className="text-blue-500" />}
                />
                <ScoreInput
                  label="التفاعل في الجديد"
                  value={interactionNew}
                  onChange={setInteractionNew}
                  icon={<Smile size={16} className="text-emerald-500" />}
                />
              </div>
            </div>
          )}

          {/* Duration — always shown, editable, defaults to 30 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="مدة الحصة (دقيقة)"
              icon={<Clock size={16} className="text-slate-500" />}
            >
              <input
                type="number"
                min={1}
                className="input-field"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Notes — always shown */}
      <div className="mt-4">
        <Field
          label="ملاحظات"
          icon={<FileText size={16} className="text-slate-500" />}
        >
          <textarea
            className="input-field min-h-[80px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isPresent
                ? 'اكتب ملاحظاتك حول أداء الطالب...'
                : 'سبب الغياب / ملاحظات...'
            }
          />
        </Field>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg p-2.5">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ الحلقة'}
        </button>
        <button onClick={onClose} className="btn-secondary">
          إلغاء
        </button>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600 justify-center">
          <CheckCircle2 size={14} />
          سيتم تحديث التسجيل السابق
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  const v = value ?? 0;
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
        {icon}
        {label} (من 10)
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-emerald-600"
        />
        <input
          type="number"
          min={0}
          max={10}
          value={v}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Math.max(0, Math.min(10, isNaN(n) ? 0 : n)));
          }}
          className="input-field w-20 text-center font-bold"
        />
      </div>
    </div>
  );
}
