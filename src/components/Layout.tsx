import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store/StoreContext';
import type { Role } from '../types';
import {
  LayoutDashboard, Users, GraduationCap, DollarSign, CalendarDays,
  ClipboardCheck, TrendingUp, FileText, BookOpen, ChevronLeft,
  CalendarClock, Wifi, WifiOff, Copy, Check, LogOut, KeyRound, Settings,
  Package,
} from 'lucide-react';

interface NavItem { id: string; label: string; icon: ReactNode; }

const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'لوحة التحليلات', icon: <LayoutDashboard size={20} /> },
  { id: 'teachers', label: 'إدارة المعلمين', icon: <GraduationCap size={20} /> },
  { id: 'students', label: 'إدارة الطلاب', icon: <Users size={20} /> },
  { id: 'finance', label: 'المعاملات المالية', icon: <DollarSign size={20} /> },
  { id: 'packages', label: 'الأسعار والباقات', icon: <Package size={20} /> },
  { id: 'settings', label: 'الإعدادات', icon: <Settings size={20} /> },
];

const TEACHER_NAV: NavItem[] = [
  { id: 'schedule', label: 'جدول اليوم', icon: <CalendarDays size={20} /> },
  { id: 'logger', label: 'تسجيل الحصص', icon: <ClipboardCheck size={20} /> },
  { id: 'availability', label: 'مصفوفة الـ 24 ساعة', icon: <CalendarClock size={20} /> },
];

const STUDENT_NAV: NavItem[] = [
  { id: 'progress', label: 'تتبع التقدم', icon: <TrendingUp size={20} /> },
  { id: 'invoicing', label: 'الفواتير والاشتراك', icon: <FileText size={20} /> },
];

const ROLE_NAV: Record<Role, NavItem[]> = {
  admin: ADMIN_NAV,
  teacher: TEACHER_NAV,
  student: STUDENT_NAV,
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'المدير',
  teacher: 'المعلم',
  student: 'الطالب',
};

interface LayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenBooking: () => void;
  children: ReactNode;
}

export function Layout({ activeTab, onTabChange, onOpenBooking, children }: LayoutProps) {
  const { currentRole, currentUser, dbConnected, loading, logout, changePassword } = useStore();
  const [toast, setToast] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = ROLE_NAV[currentRole];

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}/booking`;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setToast('تم نسخ رابط الحجز بنجاح!');
      setTimeout(() => setToast(''), 3000);
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) return;
    await changePassword(newPassword);
    setPwSuccess(true);
    setTimeout(() => {
      setShowChangePassword(false);
      setNewPassword('');
      setPwSuccess(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-elevated flex items-center gap-2">
            <Check size={18} />
            <span className="font-semibold text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-elevated">
        <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
              <BookOpen size={22} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base leading-tight tracking-tight">أكاديمية ربانيون</h1>
              <p className="text-xs text-slate-400">نظام الإدارة المتكامل</p>
            </div>
          </div>

          {/* DB Connectivity Badge */}
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            dbConnected
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            {dbConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {loading ? 'جاري الاتصال...' : dbConnected ? 'متصل بقاعدة البيانات' : 'غير متصل'}
          </div>

          {/* Smart Copy Booking Link (admin only) */}
          {currentRole === 'admin' && (
            <button
              onClick={handleCopyLink}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-emerald-500/20"
            >
              <Copy size={14} />
              نسخ رابط الحجز
            </button>
          )}

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-1.5 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {currentUser?.name?.[0] || '؟'}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold">{currentUser?.name || 'مدير النظام'}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[currentRole]}</p>
              </div>
              <ChevronLeft size={16} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-200 py-2 z-50 animate-scale-in origin-top-left">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[currentRole]}</p>
                </div>
                {(currentRole === 'teacher' || currentRole === 'student') && (
                  <button
                    onClick={() => {
                      setShowChangePassword(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <KeyRound size={16} className="text-slate-400" />
                    تغيير كلمة المرور
                  </button>
                )}
                {currentRole === 'admin' && (
                  <button
                    onClick={() => {
                      onOpenBooking();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <BookOpen size={16} className="text-slate-400" />
                    صفحة الحجز الخارجية
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                >
                  <LogOut size={16} />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowChangePassword(false)} />
          <div className="relative bg-white rounded-2xl shadow-elevated p-6 w-full max-w-sm animate-scale-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <KeyRound size={20} className="text-emerald-600" />
              تغيير كلمة المرور
            </h3>
            {pwSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-emerald-600" />
                </div>
                <p className="font-semibold text-slate-700">تم تغيير كلمة المرور بنجاح</p>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="input-field mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={newPassword.length < 4}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    حفظ
                  </button>
                  <button onClick={() => setShowChangePassword(false)} className="btn-secondary">
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-l border-slate-200 flex-col hidden lg:flex">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {item.label}
                {activeTab === item.id && <ChevronLeft size={16} className="mr-auto text-emerald-500" />}
              </button>
            ))}
          </nav>
          {currentRole === 'admin' && (
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={onOpenBooking}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-3 text-white hover:opacity-90 transition-opacity"
              >
                <BookOpen size={16} />
                <span className="text-sm font-bold">صفحة الحجز الخارجية</span>
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
          <nav className="flex justify-around p-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {item.icon}
                <span className="max-w-[60px] truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
