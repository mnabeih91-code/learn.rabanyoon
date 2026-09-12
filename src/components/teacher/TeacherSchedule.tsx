import { useStore } from '../../store/StoreContext';
import { getTodayDay, DAYS_AR, formatTime, getTodayISO } from '../../data/mockData';
import { Avatar, Badge } from '../ui/Avatar';
import { Clock, Calendar, Users, CheckCircle2 } from 'lucide-react';

export function TeacherSchedule() {
  const { teachers, students, sessionLogs, currentUser } = useStore();

  // SANDBOX INSULATION: find the logged-in teacher via currentUser.teacher_id
  // (NOT teachers[0]) so a teacher only ever sees their own data.
  const teacher = teachers.find((t) => t.id === currentUser?.teacher_id);

  const todayDay = getTodayDay();
  const today = getTodayISO();

  if (!teacher) {
    return (
      <div className="card p-12 text-center">
        <Users size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-400">لا يوجد معلم مسجّل</p>
      </div>
    );
  }

  // Today's booked slots from the teacher's availability_slots
  const todaySlots = (teacher.availability_slots || [])
    .filter((s) => s.day === todayDay && s.status === 'booked')
    .sort((a, b) => a.start.localeCompare(b.start));

  // Stats — scoped to THIS teacher only
  const totalStudents = students.filter(
    (s) => s.teacher_id === teacher.id
  ).length;
  const loggedToday = sessionLogs.filter(
    (l) => l.teacher_id === teacher.id && l.date.startsWith(today)
  );
  const presentToday = loggedToday.filter(
    (l) => l.attendance_status === 'حاضر'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-l from-emerald-600 to-emerald-700 text-white border-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-emerald-100 text-sm mb-1">مرحباً، {teacher.name}</p>
            <h2 className="text-2xl font-bold">جدول اليوم — {DAYS_AR[todayDay]}</h2>
            <p className="text-emerald-100 text-sm mt-1">
              {todaySlots.length} حصة مجدولة
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="text-xs text-emerald-100">طلاب</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{presentToday}</p>
              <p className="text-xs text-emerald-100">حاضر اليوم</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Sessions */}
      <div>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          حصص اليوم
        </h3>

        {todaySlots.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">لا توجد حصص مجدولة اليوم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySlots.map((slot, idx) => {
              // Find a matching session log for this slot's student today
              const student = students.find(
                (s) =>
                  s.teacher_id === teacher.id &&
                  s.name === slot.student_name
              );
              const log = sessionLogs.find(
                (l) =>
                  l.teacher_id === teacher.id &&
                  l.date.startsWith(today) &&
                  student &&
                  l.student_id === student.id
              );
              const isLogged = !!log;

              return (
                <div
                  key={`${slot.day}-${slot.start}-${idx}`}
                  className={`card p-4 transition-all duration-300 hover:shadow-elevated ${
                    isLogged ? 'border-emerald-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Time */}
                    <div className="text-center min-w-[70px]">
                      <div className="bg-emerald-50 rounded-xl px-3 py-2">
                        <p className="text-sm font-bold text-emerald-700 ltr-nums">
                          {formatTime(slot.start)}
                        </p>
                        <p className="text-xs text-emerald-500 ltr-nums mt-0.5">
                          {formatTime(slot.end)}
                        </p>
                      </div>
                    </div>

                    {/* Student */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={slot.student_name || '؟'} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {slot.student_name || 'طالب'}
                        </p>
                        {student && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {teacher.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      {isLogged ? (
                        log.attendance_status === 'حاضر' ? (
                          <Badge color="emerald" icon={<CheckCircle2 size={12} />}>
                            حضر
                            {log.hifz_score !== null && ` — ${log.hifz_score}/10`}
                          </Badge>
                        ) : (
                          <Badge color="rose" icon={<Clock size={12} />}>
                            غائب
                          </Badge>
                        )
                      ) : (
                        <Badge color="amber" icon={<Clock size={12} />}>
                          بانتظار التسجيل
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
