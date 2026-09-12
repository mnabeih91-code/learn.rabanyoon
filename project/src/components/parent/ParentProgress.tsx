import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import type { SessionLog } from '../../types';
import { DAYS_AR, DAY_ORDER, formatDate, formatTime } from '../../data/mockData';
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
} from 'lucide-react';

export function ParentProgress() {
  const { students, teachers, sessionLogs } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const teacher = teachers.find((t) => t.id === student?.teacher_id);

  const studentLogs: SessionLog[] = student
    ? sessionLogs
        .filter((l) => l.student_id === student.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const presentCount = studentLogs.filter((l) => l.attendance_status === 'حاضر').length;
  const attendanceRate = studentLogs.length > 0
    ? Math.round((presentCount / studentLogs.length) * 100)
    : 0;

  const hifzLogs = studentLogs.filter((l) => l.hifz_score !== null);
  const avgHifz = hifzLogs.length > 0
    ? hifzLogs.reduce((sum, l) => sum + (l.hifz_score || 0), 0) / hifzLogs.length
    : 0;

  const behaviorLogs = studentLogs.filter((l) => l.behavior_score !== null);
  const avgBehavior = behaviorLogs.length > 0
    ? behaviorLogs.reduce((sum, l) => sum + (l.behavior_score || 0), 0) / behaviorLogs.length
    : 0;

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <GraduationCap size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا يوجد طلاب مسجلون بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-l from-slate-800 to-slate-900 text-white border-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} color="bg-emerald-500" size="lg" />
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-slate-300 text-sm mt-1">{student.status}</p>
              <p className="text-slate-400 text-xs mt-1 ltr-nums">{student.phone}</p>
            </div>
          </div>
          {students.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-white/10 text-white rounded-xl px-4 py-2.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id} className="text-slate-800">
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="معدل الحضور"
          value={`${attendanceRate}%`}
          icon={<Calendar size={20} />}
          color="bg-emerald-500"
        />
        <StatBox
          label="متوسط الحفظ"
          value={`${avgHifz.toFixed(1)}/10`}
          icon={<BookOpen size={20} />}
          color="bg-blue-500"
        />
        <StatBox
          label="متوسط السلوك"
          value={`${avgBehavior.toFixed(1)}/10`}
          icon={<Smile size={20} />}
          color="bg-teal-500"
        />
        <StatBox
          label="إجمالي الحصص"
          value={student.total_sessions.toString()}
          icon={<TrendingUp size={20} />}
          color="bg-slate-600"
        />
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
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
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
            <p className="text-slate-400 text-sm col-span-full text-center py-4">
              لا توجد مواعيد مجدلة
            </p>
          )}
        </div>
      </div>

      {/* Progress History */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Award size={20} className="text-emerald-600" />
          سجل التقدم والحضور
        </h3>

        {studentLogs.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">لا توجد سجلات بعد</p>
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
              <p className="text-xs text-slate-400 mt-1 ltr-nums">{teacher.phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogCard({ log }: { log: SessionLog }) {
  const isPresent = log.attendance_status === 'حاضر';
  const isExcused = log.attendance_status === 'اعتذار المعلم' || log.attendance_status === 'اعتذار الطالب بعذر';

  return (
    <div className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isPresent ? (
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
          ) : isExcused ? (
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
              <XCircle size={16} className="text-rose-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-700">{log.attendance_status}</p>
            <p className="text-xs text-slate-400">
              {formatDate(log.date)} — {log.type}
            </p>
          </div>
        </div>
        <Badge color={isPresent ? 'emerald' : isExcused ? 'amber' : 'rose'}>
          {log.subject_name || log.type}
        </Badge>
      </div>

      {isPresent && (
        <>
          {log.type === 'قرآن' ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <ScoreDisplay label="الحفظ" value={log.hifz_score} icon={<BookOpen size={12} />} color="text-blue-600" />
              <ScoreDisplay label="التجويد" value={log.tajweed_score} icon={<Star size={12} />} color="text-amber-600" />
              <ScoreDisplay label="المراجعة" value={log.review_score} icon={<Star size={12} />} color="text-teal-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <ScoreDisplay label="تفاعل قديم" value={log.interaction_old} icon={<MessageSquare size={12} />} color="text-blue-600" />
              <ScoreDisplay label="تفاعل جديد" value={log.interaction_new} icon={<MessageSquare size={12} />} color="text-emerald-600" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <ScoreDisplay label="السلوك" value={log.behavior_score} icon={<Smile size={12} />} color="text-teal-600" />
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                <Calendar size={12} />
                <span className="text-xs">المدة</span>
              </div>
              <p className="text-sm font-bold text-slate-700 ltr-nums">{log.duration_minutes} دقيقة</p>
            </div>
          </div>
        </>
      )}

      {log.material_covered && (
        <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 mb-2">
          <BookOpen size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-700">المادة: </span>
            {log.material_covered}
          </p>
        </div>
      )}

      {log.student_alerts && (
        <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 mb-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">تنبيهات: </span>
            {log.student_alerts}
          </p>
        </div>
      )}

      {log.notes && (
        <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
          <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600">{log.notes}</p>
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
    <div className="card p-4">
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
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">
        {value !== null ? `${value}/10` : '—'}
      </p>
    </div>
  );
}
