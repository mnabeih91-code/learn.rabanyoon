import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Teacher, Student, SessionLog, Financial, Role, SubscriptionStatus,
  AvailabilitySlot, DayOfWeek, Package, AcademySettings, PayrollEntry, AuthUser,
  PageConfig,
} from '../types';
import { generate24HourGrid, migrateTo24HourGrid } from '../data/mockData';
import { DEFAULT_PAGE_CONFIG, resolvePageConfig } from '../data/pageConfigDefaults';

interface StoreContextValue {
  teachers: Teacher[];
  students: Student[];
  sessionLogs: SessionLog[];
  financials: Financial[];
  packages: Package[];
  settings: AcademySettings | null;
  payroll: PayrollEntry[];
  dbConnected: boolean;
  loading: boolean;
  currentRole: Role;
  currentUser: AuthUser | null;
  login: (identifier: string, password: string) => Promise<{ role: Role; user: AuthUser } | null>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  addTeacher: (t: Partial<Teacher>) => Promise<Teacher | null>;
  updateTeacher: (id: string, t: Partial<Teacher>) => Promise<void>;
  archiveTeacher: (id: string) => Promise<void>;
  reactivateTeacher: (id: string) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  addStudent: (s: Partial<Student>) => Promise<string | null>;
  updateStudent: (id: string, s: Partial<Student>) => Promise<void>;
  toggleStudentPaused: (id: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  toggleSlotStatus: (teacherId: string, slotIndex: number) => Promise<void>;
  setAvailabilitySlots: (teacherId: string, slots: AvailabilitySlot[]) => Promise<void>;
  logSession: (log: Partial<SessionLog> & { student_id: string; teacher_id: string }) => Promise<void>;
  updateSession: (id: string, updates: Partial<SessionLog>) => Promise<void>;
  setSubscriptionStatus: (studentId: string, status: SubscriptionStatus) => Promise<void>;
  createBooking: (name: string, phone: string, teacherId: string, packageId: string, selectedSlots: { day: DayOfWeek; start: string; end: string }[]) => Promise<void>;
  updatePackage: (id: string, updates: Partial<Package>) => Promise<void>;
  addPackage: (pkg: Partial<Package>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AcademySettings>) => Promise<void>;
  pageConfig: PageConfig;
  updatePageConfig: (config: PageConfig) => Promise<void>;
  updatePayroll: (teacherId: string, month: number, year: number, updates: { bonuses?: number; deductions?: number }) => Promise<void>;
  createStripeCheckout: (studentId: string, amount?: number) => Promise<{ url: string } | null>;
  confirmStripePayment: (financialId: string) => Promise<void>;
  runAutoBilling: () => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [tRes, sRes, lRes, fRes, pRes, setRes, payRes] = await Promise.all([
        supabase.from('teachers').select('*').order('created_at'),
        supabase.from('students').select('*').order('created_at'),
        supabase.from('sessions_log').select('*').order('date', { ascending: false }),
        supabase.from('financials').select('*').order('created_at'),
        supabase.from('packages').select('*').order('sort_order'),
        supabase.from('academy_settings').select('*').limit(1).maybeSingle(),
        supabase.from('payroll').select('*'),
      ]);

      if (tRes.error) throw tRes.error;
      if (sRes.error) throw sRes.error;
      if (lRes.error) throw lRes.error;
      if (fRes.error) throw fRes.error;
      if (pRes.error) throw pRes.error;
      if (setRes.error) throw setRes.error;
      if (payRes.error) throw payRes.error;

      // Migrate old availability_slots to 24-hour grid if needed
      const teacherData = (tRes.data || []) as Teacher[];
      for (const t of teacherData) {
        if (t.availability_slots && t.availability_slots.length > 0 && t.availability_slots.length < 100) {
          t.availability_slots = migrateTo24HourGrid(t.availability_slots);
        } else if (!t.availability_slots || t.availability_slots.length === 0) {
          t.availability_slots = generate24HourGrid();
        }
      }

      setTeachers(teacherData);
      setStudents((sRes.data || []) as Student[]);
      setSessionLogs((lRes.data || []) as SessionLog[]);
      setFinancials((fRes.data || []) as Financial[]);
      setPackages((pRes.data || []) as Package[]);
      setSettings(setRes.data as AcademySettings | null);
      setPageConfig(resolvePageConfig((setRes.data as AcademySettings | null)?.page_config));
      setPayroll((payRes.data || []) as PayrollEntry[]);
      setDbConnected(true);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============ AUTH ============
  const login = useCallback(async (identifier: string, password: string): Promise<{ role: Role; user: AuthUser } | null> => {
    const cleanId = identifier.trim().toLowerCase();
    // Check admin (hardcoded admin credentials)
    if (cleanId === 'admin' || cleanId === 'admin@rabanyoon.edu' || cleanId === '01000000000') {
      if (password === 'admin123') {
        const user: AuthUser = { id: 'admin', name: 'مدير النظام', role: 'admin' };
        setCurrentRole('admin');
        setCurrentUser(user);
        return { role: 'admin', user };
      }
      return null;
    }
    // Check teachers
    const teacherMatch = teachers.find(
      (t) =>
        (t.email.toLowerCase() === cleanId || t.phone === identifier.trim()) &&
        t.password === password
    );
    if (teacherMatch) {
      const user: AuthUser = { id: teacherMatch.id, name: teacherMatch.name, role: 'teacher', teacher_id: teacherMatch.id };
      setCurrentRole('teacher');
      setCurrentUser(user);
      return { role: 'teacher', user };
    }
    // Check students
    const studentMatch = students.find(
      (s) =>
        (s.phone === identifier.trim() || s.name === identifier.trim()) &&
        s.password === password
    );
    if (studentMatch) {
      const user: AuthUser = { id: studentMatch.id, name: studentMatch.name, role: 'student', student_id: studentMatch.id };
      setCurrentRole('student');
      setCurrentUser(user);
      return { role: 'student', user };
    }
    return null;
  }, [teachers, students]);

  const logout = useCallback(() => {
    setCurrentRole('admin');
    setCurrentUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'teacher' && currentUser.teacher_id) {
      await supabase.from('teachers').update({ password: newPassword }).eq('id', currentUser.teacher_id);
    } else if (currentUser.role === 'student' && currentUser.student_id) {
      await supabase.from('students').update({ password: newPassword }).eq('id', currentUser.student_id);
    }
  }, [currentUser]);

  // ============ TEACHER CRUD ============
  const addTeacher = useCallback(async (t: Partial<Teacher>) => {
    const { data, error } = await supabase.from('teachers').insert({
      name: t.name,
      phone: t.phone || '',
      email: t.email || '',
      subject: t.subject || '',
      salary_per_session: t.salary_per_session || 0,
      password: t.password || '123456',
      role: 'teacher',
      availability_slots: generate24HourGrid(),
    }).select().single();
    if (error) throw error;
    if (data) {
      setTeachers((prev) => [...prev, data as Teacher]);
      return data as Teacher;
    }
    return null;
  }, []);

  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher>) => {
    const { error } = await supabase.from('teachers').update(updates).eq('id', id);
    if (error) throw error;
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTeacher = useCallback(async (id: string) => {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setStudents((prev) => prev.filter((s) => s.teacher_id !== id));
  }, []);

  // Archive/Deactivate teacher instead of permanent deletion
  const archiveTeacher = useCallback(async (id: string) => {
    const { error } = await supabase.from('teachers').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: false } : t)));
  }, []);

  // Reactivate an archived teacher
  const reactivateTeacher = useCallback(async (id: string) => {
    const { error } = await supabase.from('teachers').update({ is_active: true }).eq('id', id);
    if (error) throw error;
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: true } : t)));
  }, []);

  // ============ STUDENT CRUD ============
  const addStudent = useCallback(async (s: Partial<Student>) => {
    const { data, error } = await supabase.from('students').insert({
      name: s.name,
      phone: s.phone || '',
      teacher_id: s.teacher_id,
      regular_slots: s.regular_slots || [],
      total_sessions: 0,
      subscription_status: s.subscription_status || 'pending',
      status: s.status || 'طالب جديد',
      expiry_date: s.expiry_date,
      monthly_fee: s.monthly_fee || 0,
      password: s.password || '123456',
      role: 'student',
      student_code: s.student_code || null,
    }).select().single();
    if (error) throw error;
    if (data) {
      setStudents((prev) => [...prev, data as Student]);
      await supabase.from('financials').insert({
        student_id: data.id,
        amount: s.monthly_fee || 0,
        status: 'pending',
      });
      await refresh();
    }
    return data?.id || null;
  }, [refresh]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    const { error } = await supabase.from('students').update(updates).eq('id', id);
    if (error) throw error;
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  // Toggle student paused status — paused students are excluded from financial ledger
  const toggleStudentPaused = useCallback(async (id: string) => {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const newPaused = !student.is_paused;
    const { error } = await supabase.from('students').update({ is_paused: newPaused }).eq('id', id);
    if (error) throw error;
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, is_paused: newPaused } : s)));
  }, [students]);

  const deleteStudent = useCallback(async (id: string) => {
    const student = students.find((s) => s.id === id);
    if (student && student.teacher_id && student.regular_slots) {
      const teacher = teachers.find((t) => t.id === student.teacher_id);
      if (teacher) {
        const newSlots = [...teacher.availability_slots];
        for (const regSlot of student.regular_slots) {
          const idx = newSlots.findIndex(
            (sl) => sl.day === regSlot.day && sl.start === regSlot.start && sl.end === regSlot.end
          );
          if (idx >= 0) {
            newSlots[idx] = { ...newSlots[idx], status: 'available', student_name: null };
          }
        }
        await supabase.from('teachers').update({ availability_slots: newSlots }).eq('id', teacher.id);
      }
    }
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setSessionLogs((prev) => prev.filter((l) => l.student_id !== id));
    setFinancials((prev) => prev.filter((f) => f.student_id !== id));
    await refresh();
  }, [students, teachers, refresh]);

  // ============ AVAILABILITY ============
  const toggleSlotStatus = useCallback(async (teacherId: string, slotIndex: number) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const newSlots = [...teacher.availability_slots];
    const slot = newSlots[slotIndex];
    if (!slot || slot.status === 'booked') return;
    newSlots[slotIndex] = {
      ...slot,
      status: slot.status === 'available' ? 'closed' : 'available',
    };
    const { error } = await supabase.from('teachers').update({ availability_slots: newSlots }).eq('id', teacherId);
    if (error) throw error;
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? { ...t, availability_slots: newSlots } : t)));
  }, [teachers]);

  const setAvailabilitySlots = useCallback(async (teacherId: string, slots: AvailabilitySlot[]) => {
    const { error } = await supabase.from('teachers').update({ availability_slots: slots }).eq('id', teacherId);
    if (error) throw error;
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? { ...t, availability_slots: slots } : t)));
  }, []);

  // ============ SESSION LOGGING ============
  // Session-based architecture: each session has a unique session_number
  // Multiple sessions per day are treated as separate entries
  const logSession = useCallback(async (log: Partial<SessionLog> & { student_id: string; teacher_id: string }) => {
    // Calculate session_number: count existing sessions for this student on this date + 1
    const sessionDate = (log.date || new Date().toISOString()).split('T')[0];
    const existingSessions = sessionLogs.filter(
      (l) => l.student_id === log.student_id && l.date.startsWith(sessionDate)
    );
    const sessionNumber = existingSessions.length + 1;

    const { data, error } = await supabase.from('sessions_log').insert({
      student_id: log.student_id,
      teacher_id: log.teacher_id,
      date: log.date || new Date().toISOString(),
      attendance_status: log.attendance_status || 'حاضر',
      type: log.type || 'قرآن',
      subject_name: log.subject_name || '',
      material_covered: log.material_covered || '',
      hifz_score: log.hifz_score,
      tajweed_score: log.tajweed_score,
      review_score: log.review_score,
      interaction_old: log.interaction_old,
      interaction_new: log.interaction_new,
      behavior_score: log.behavior_score,
      student_alerts: log.student_alerts || '',
      notes: log.notes || '',
      duration_minutes: log.duration_minutes || 30,
      session_number: sessionNumber,
    }).select().single();
    if (error) throw error;
    if (data) {
      setSessionLogs((prev) => [data as SessionLog, ...prev]);
      if (log.attendance_status === 'حاضر') {
        const student = students.find((s) => s.id === log.student_id);
        if (student) {
          await updateStudent(log.student_id, { total_sessions: student.total_sessions + 1 });
        }
      }
    }
  }, [students, updateStudent, sessionLogs]);

  const updateSession = useCallback(async (id: string, updates: Partial<SessionLog>) => {
    const { error } = await supabase.from('sessions_log').update(updates).eq('id', id);
    if (error) throw error;
    setSessionLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l)));
  }, []);

  // ============ FINANCE ============
  const setSubscriptionStatus = useCallback(async (studentId: string, status: SubscriptionStatus) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    let updates: Partial<Student> = { subscription_status: status };
    if (status === 'paid') {
      const currentExpiry = student.expiry_date ? new Date(student.expiry_date) : new Date();
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      base.setMonth(base.getMonth() + 1);
      updates.expiry_date = base.toISOString().split('T')[0];
    }
    const { error } = await supabase.from('students').update(updates).eq('id', studentId);
    if (error) throw error;
    await supabase.from('financials').update({ status }).eq('student_id', studentId);
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...updates } : s)));
    setFinancials((prev) => prev.map((f) => (f.student_id === studentId ? { ...f, status } : f)));
  }, [students]);

  // ============ STRIPE PAYMENT ============
  // Create a Stripe Checkout session for student payment
  // Payment confirmation is handled by admin after Stripe notification
  const createStripeCheckout = useCallback(async (studentId: string, amount?: number): Promise<{ url: string } | null> => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return null;
    const paymentAmount = amount ?? student.monthly_fee;
    // Call edge function to create Stripe checkout session
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ studentId, amount: paymentAmount, studentName: student.name }),
      });
      if (!response.ok) throw new Error(`Stripe checkout failed (${response.status})`);
      const data = await response.json();
      if (!data.url) throw new Error('No checkout URL returned');
      // Create a pending financial record with Stripe tracking
      await supabase.from('financials').insert({
        student_id: studentId,
        amount: paymentAmount,
        status: 'pending',
        stripe_checkout_session_id: data.sessionId || null,
        admin_confirmed: false,
      });
      return { url: data.url };
    } catch (err) {
      console.error('Stripe checkout error:', err);
      return null;
    }
  }, [students]);

  // Admin confirms Stripe payment — only then does status change to 'paid'
  const confirmStripePayment = useCallback(async (financialId: string) => {
    const financial = financials.find((f) => f.id === financialId);
    if (!financial) return;
    const { error } = await supabase.from('financials').update({
      status: 'paid',
      admin_confirmed: true,
    }).eq('id', financialId);
    if (error) throw error;
    // Update student subscription status to paid
    await setSubscriptionStatus(financial.student_id, 'paid');
    setFinancials((prev) => prev.map((f) => (f.id === financialId ? { ...f, status: 'paid', admin_confirmed: true } : f)));
  }, [financials, setSubscriptionStatus]);

  // ============ AUTO-BILLING ============
  // Auto-create pending invoice for next month as expiry approaches
  const runAutoBilling = useCallback(async () => {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 7); // 7 days before expiry

    for (const student of students) {
      if (student.is_paused) continue;
      if (!student.expiry_date) continue;
      const expiry = new Date(student.expiry_date);
      // If expiry is within 7 days and no pending invoice exists for next month
      if (expiry <= threshold && expiry >= now) {
        const nextMonth = new Date(expiry);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        // Check if a financial record already exists for this period
        const existingRecord = financials.find((f) => {
          const fDate = new Date(f.created_at);
          return f.student_id === student.id &&
            fDate.getFullYear() === nextMonth.getFullYear() &&
            fDate.getMonth() === nextMonth.getMonth();
        });
        if (!existingRecord) {
          await supabase.from('financials').insert({
            student_id: student.id,
            amount: student.monthly_fee,
            status: 'pending',
          });
          // Update student subscription status to pending
          await supabase.from('students').update({ subscription_status: 'pending' }).eq('id', student.id);
        }
      }
    }
    await refresh();
  }, [students, financials, refresh]);

  // ============ BOOKING ============
  const createBooking = useCallback(async (
    name: string, phone: string, teacherId: string, packageId: string,
    selectedSlots: { day: DayOfWeek; start: string; end: string }[]
  ) => {
    const pkg = packages.find((p) => p.id === packageId);
    const fee = pkg?.price || 0;
    const { data: studentData, error: studentErr } = await supabase.from('students').insert({
      name, phone, teacher_id: teacherId, regular_slots: selectedSlots,
      total_sessions: 0, subscription_status: 'pending', status: 'طالب جديد',
      expiry_date: null, monthly_fee: fee, password: '123456', role: 'student',
    }).select().single();
    if (studentErr) throw studentErr;
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      const newSlots = [...teacher.availability_slots];
      for (const sel of selectedSlots) {
        const idx = newSlots.findIndex(
          (sl) => sl.day === sel.day && sl.start === sel.start && sl.end === sel.end && sl.status === 'available'
        );
        if (idx >= 0) {
          newSlots[idx] = { ...newSlots[idx], status: 'booked', student_name: name };
        }
      }
      await supabase.from('teachers').update({ availability_slots: newSlots }).eq('id', teacherId);
    }
    await supabase.from('financials').insert({ student_id: studentData.id, amount: fee, status: 'pending' });
    await refresh();
  }, [packages, teachers, refresh]);

  // ============ PACKAGES ============
  const updatePackage = useCallback(async (id: string, updates: Partial<Package>) => {
    const { error } = await supabase.from('packages').update(updates).eq('id', id);
    if (error) throw error;
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const addPackage = useCallback(async (pkg: Partial<Package>) => {
    const { data, error } = await supabase.from('packages').insert(pkg).select().single();
    if (error) throw error;
    if (data) setPackages((prev) => [...prev, data as Package]);
  }, []);

  const deletePackage = useCallback(async (id: string) => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) throw error;
    setPackages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ============ SETTINGS ============
  const updateSettings = useCallback(async (updates: Partial<AcademySettings>) => {
    if (!settings) return;
    const { error } = await supabase.from('academy_settings').update(updates).eq('id', settings.id);
    if (error) throw error;
    setSettings({ ...settings, ...updates });
    if (updates.page_config) setPageConfig(resolvePageConfig(updates.page_config));
  }, [settings]);

  const updatePageConfig = useCallback(async (config: PageConfig) => {
    if (!settings) return;
    const { error } = await supabase.from('academy_settings').update({ page_config: config }).eq('id', settings.id);
    if (error) throw error;
    setPageConfig(config);
    setSettings({ ...settings, page_config: config });
  }, [settings]);

  // ============ PAYROLL ============
  const updatePayroll = useCallback(async (teacherId: string, month: number, year: number, updates: { bonuses?: number; deductions?: number }) => {
    const existing = payroll.find((p) => p.teacher_id === teacherId && p.month === month && p.year === year);
    if (existing) {
      const { error } = await supabase.from('payroll').update(updates).eq('id', existing.id);
      if (error) throw error;
      setPayroll((prev) => prev.map((p) => (p.id === existing.id ? { ...p, ...updates } : p)));
    } else {
      const { data, error } = await supabase.from('payroll').insert({
        teacher_id: teacherId, month, year,
        bonuses: updates.bonuses || 0, deductions: updates.deductions || 0,
      }).select().single();
      if (error) throw error;
      if (data) setPayroll((prev) => [...prev, data as PayrollEntry]);
    }
  }, [payroll]);

  const value: StoreContextValue = {
    teachers, students, sessionLogs, financials, packages, settings, payroll,
    dbConnected, loading, currentRole, currentUser,
    login, logout, changePassword,
    addTeacher, updateTeacher, deleteTeacher, archiveTeacher, reactivateTeacher,
    addStudent, updateStudent, deleteStudent, toggleStudentPaused,
    toggleSlotStatus, setAvailabilitySlots,
    logSession, updateSession,
    setSubscriptionStatus, createBooking,
    updatePackage, addPackage, deletePackage,
    updateSettings, updatePageConfig, pageConfig, updatePayroll,
    createStripeCheckout, confirmStripePayment, runAutoBilling,
    refresh,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
