import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import type { SessionLog } from '../../types';
import { DAYS_AR, DAY_ORDER, formatDate, formatTime, getMonthName } from '../../data/mockData';
import { Avatar, Badge } from '../ui/Avatar';
import {
  TrendingUp,
  BookOpen,
  Star,
  Smile,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Award,
  MessageSquare,
  GraduationCap,
  Percent,
  Clock,
  Filter,
} from 'lucide-react';

export function StudentProgress() {
  const { students, teachers, sessionLogs, currentUser } = useStore();

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  // CRITICAL PRIVACY: A student only ever sees their own data.
  const student = students.find((s) => s.id === currentUser?.student_id) || null;
  const teacher = student ? teachers.find((t) => t.id === student.teacher_id) : null;

  const allStudentLogs: SessionLog[] = student
    ? sessionLogs
        .filter((l) => l.student_id === student.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  // Filter by month/year when selected
  const studentLogs: SessionLog[] =
    filterMonth !== null && filterYear !== null
      ? allStudentLogs.filter((l) => {
          const d = new Date(l.date);
          return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
        })
      : allStudentLogs;

  // Derive available years from the logs
  const availableYears = [...new Set(allStudentLogs.map((l) => new Date(l.date).getFullYear()))].sort((a, b) => b - a);

  // ---- Stats (all scoped to the filtered logs) ----
  const presentLogs = studentLogs.filter((l) => l.attendance_status === 'حاضر');
  const presentCount = presentLogs.length;
  const attendanceRate =
    studentLogs.length > 0 ? Math.round((presentCount / studentLogs.length) * 100) : 0;

  const hifzLogs = presentLogs.filter((l) => l.type === 'قرآن' && l.hifz_score !== null);
  const avgHifz =
    hifzLogs.length > 0
      ? hifzLogs.reduce((sum, l) => sum + (l.hifz_score || 0), 0) / hifzLogs.length
      : 0;

  const behaviorLogs = presentLogs.filter((l) => l.behavior_score !== null);
  const avgBehavior =
    behaviorLogs.length > 0
      ? behaviorLogs.reduce((sum, l) => sum + (l.behavior_score || 0), 0) / behaviorLogs.length
      : 0;

  const totalSessions = studentLogs.length;

  const allScores: number[] = [];
  for (const l of presentLogs) {
    if (l.hifz_score !== null) allScores.push(l.hifz_score);
    if (l.tajweed_score !== null) allScores.push(l.tajweed_score);
    if (l.review_score !== null) allScores.push(l.review_score);
    if (l.behavior_score !== null) allScores.push(l.behavior_score);
    if (l.interaction_old !== null) allScores.push(l.interaction_old);
    if (l.interaction_new !== null) allScores.push(l.interaction_new);
  }
  const overallPercentage =
    allScores.length > 0
      ? Math.round((allScores.reduce((sum, v) => sum + v, 0) / allScores.length / 10) * 100)
      : 0;

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <GraduationCap size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا توجد بيانات طالب مرتبطة بحسابك</p>
      </div>
    );
  }

  const isFiltered = filterMonth !== null && filterYear !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-l from-slate-800 to-slate-900 text-white border-0">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} color="bg-emerald-500" size="lg" />
          <div>
            <h2 className="text-2xl font-bold">{student.name}</h2>
            <p className="text-slate-300 text-sm mt-1">{student.status}</p>
          </div>
        </div>
      </div>

      {/* Month/Year Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter size={16} className="text-emerald-600" />
            تصفية التقرير
          </div>
          <select
            value={filterMonth ?? ''}
            onChange={(e) => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
            className="input text-sm py-1.5 min-w-[130px]"
          >
            <option value="">كل الأشهر</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{getMonthName(i)}</option>
            ))}
          </select>
          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value === '' ? null : Number(e.target.value))}
            className="input text-sm py-1.5 min-w-[100px]"
          >
            <option value="">كل السنوات</option>
            {(availableYears.length > 0 ? availableYears : [now.getFullYear()]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isFiltered && (
            <button
              onClick={() => { setFilterMonth(null); setFilterYear(null); }}
              className="text-xs text-rose-500 hover:text-rose-700 underline"
            >
              إلغاء التصفية
            </button>
          )}
          {isFiltered && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
              يعرض: {getMonthName(filterMonth!)} {filterYear}
            </span>
          )}
        </div>
      </div>

      {/* Stats — 5 cells */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatBox label="معدل الحضور" value={`${attendanceRate}%`} icon={<Calendar size={20} />} color="bg-emerald-500" />
        <StatBox label="متوسط الحفظ" value={`${avgHifz.toFixed(1)}/10`} icon={<BookOpen size={20} />} color="bg-blue-500" />
        <StatBox label="متوسط السلوك" value={`${avgBehavior.toFixed(1)}/10`} icon={<Smile size={20} />} color="bg-teal-500" />
        <StatBox label="إجمالي الحصص" value={totalSessions.toString()} icon={<TrendingUp size={20} />} color="bg-slate-600" />
        <StatBox label="النسبة العامة" value={`${overallPercentage}%`} icon={<Percent size={20} />} color="bg-amber-500" />
      </div>

      {/* Weekly Schedule */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          مواعيد الحصص الأسبوعية
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {student.regular_slots
            .slice()
            .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
            .map((slot, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{DAYS_AR[slot.day]}</p>
                  <p className="text-xs text-slate-400 ltr-nums">
                    {formatTime(slot.start)} — {formatTime(slot.end)}
                  </p>
                </div>
              </div>
            ))}
          {student.regular_slots.length === 0 && (
            <p className="text-slate-400 text-sm col-span-full text-center py-4">لا توجد مواعيد مجدولة</p>
          )}
        </div>
      </div>

      {/* Progress History */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Award size={20} className="text-emerald-600" />
          {isFiltered ? `سجل الحضور — ${getMonthName(filterMonth!)} ${filterYear}` : 'سجل التقدم والحضور'}
        </h3>

        {studentLogs.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">
              {isFiltered ? 'لا توجد سجلات في هذا الشهر' : 'لا توجد سجلات بعد'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {studentLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Teacher Info */}
      {teacher && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4">المعلم المسؤول</h3>
          <div className="flex items-center gap-4">
            <Avatar name={teacher.name} color="bg-emerald-500" size="lg" />
            <div>
              <p className="font-bold text-slate-800">{teacher.name}</p>
              <p className="text-sm text-slate-500">{teacher.subject}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogCard({ log }: { log: SessionLog }) {
  const isPresent = log.attendance_status === 'حاضر';
  const isTeacherExcuse = log.attendance_status === 'اعتذار المعلم';
  const isStudentExcuse = log.attendance_status === 'اعتذار الطالب بعذر';

  const statusColor = isPresent ? 'emerald' : isTeacherExcuse ? 'amber' : isStudentExcuse ? 'blue' : 'rose';
  const headerBg = isPresent
    ? 'bg-emerald-50 border-emerald-200'
    : isTeacherExcuse
    ? 'bg-amber-50 border-amber-200'
    : isStudentExcuse
    ? 'bg-blue-50 border-blue-200'
    : 'bg-rose-50 border-rose-200';

  const StatusIcon = isPresent
    ? CheckCircle2
    : isTeacherExcuse || isStudentExcuse
    ? AlertTriangle
    : XCircle;

  const iconColor = isPresent
    ? 'text-emerald-600'
    : isTeacherExcuse
    ? 'text-amber-600'
    : isStudentExcuse
    ? 'text-blue-600'
    : 'text-rose-600';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className={`flex items-start justify-between gap-3 px-4 py-3 border-b ${headerBg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPresent ? 'bg-emerald-100' : isTeacherExcuse ? 'bg-amber-100' : isStudentExcuse ? 'bg-blue-100' : 'bg-rose-100'}`}>
            <StatusIcon size={16} className={iconColor} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{log.attendance_status}</p>
            <p className="text-xs text-slate-400">
              {formatDate(log.date)} — {log.type}
            </p>
          </div>
        </div>
        <Badge color={statusColor as 'emerald' | 'amber' | 'rose' | 'blue'}>
          {log.subject_name || log.type}
        </Badge>
      </div>

      {/* Score cells — only for present sessions */}
      {isPresent && (
        <div className="p-4 space-y-3">
          {log.type === 'قرآن' ? (
            <div className="grid grid-cols-3 gap-2">
              <ScoreDisplay label="الحفظ" value={log.hifz_score} icon={<BookOpen size={12} />} color="text-blue-600" bgColor="bg-blue-50" borderColor="border-blue-200" />
              <ScoreDisplay label="التجويد" value={log.tajweed_score} icon={<Star size={12} />} color="text-amber-600" bgColor="bg-amber-50" borderColor="border-amber-200" />
              <ScoreDisplay label="المراجعة" value={log.review_score} icon={<Star size={12} />} color="text-teal-600" bgColor="bg-teal-50" borderColor="border-teal-200" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ScoreDisplay label="تفاعل قديم" value={log.interaction_old} icon={<MessageSquare size={12} />} color="text-blue-600" bgColor="bg-blue-50" borderColor="border-blue-200" />
              <ScoreDisplay label="تفاعل جديد" value={log.interaction_new} icon={<MessageSquare size={12} />} color="text-emerald-600" bgColor="bg-emerald-50" borderColor="border-emerald-200" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <ScoreDisplay label="السلوك" value={log.behavior_score} icon={<Smile size={12} />} color="text-teal-600" bgColor="bg-teal-50" borderColor="border-teal-200" />
            <div className="bg-slate-100 rounded-lg p-2.5 text-center border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                <Clock size={12} />
                <span className="text-xs font-medium">المدة</span>
              </div>
              <p className="text-sm font-bold text-slate-700 ltr-nums">{log.duration_minutes} دقيقة</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes / Alerts */}
      {(log.material_covered || log.student_alerts || log.notes) && (
        <div className="px-4 pb-4 space-y-2">
          {log.material_covered && (
            <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <BookOpen size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-700">المادة: </span>
                {log.material_covered}
              </p>
            </div>
          )}
          {log.student_alerts && (
            <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 border border-amber-100">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                <span className="font-semibold">تنبيهات: </span>
                {log.student_alerts}
              </p>
            </div>
          )}
          {log.notes && (
            <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-600">{log.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ScoreDisplay({
  label,
  value,
  icon,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-2.5 text-center border ${borderColor}`}>
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">
        {value !== null ? `${value}/10` : '—'}
      </p>
    </div>
  );
}
