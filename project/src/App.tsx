import { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/Layout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminTeachers } from './components/admin/AdminTeachers';
import { AdminStudents } from './components/admin/AdminStudents';
import { AdminFinance } from './components/admin/AdminFinance';
import { AdminPackages } from './components/admin/AdminPackages';
import { AdminSettings } from './components/admin/AdminSettings';
import { TeacherSchedule } from './components/teacher/TeacherSchedule';
import { TeacherSessionLogger } from './components/teacher/TeacherSessionLogger';
import { TeacherAvailability } from './components/teacher/TeacherAvailability';
import { StudentProgress } from './components/student/StudentProgress';
import { StudentInvoicing } from './components/student/StudentInvoicing';
import { BookingPage } from './components/booking/BookingPage';
import { PaymentPage } from './components/booking/PaymentPage';

function Dashboard() {
  const { currentRole, currentUser, loading } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showBooking, setShowBooking] = useState(false);

  // Public route: /booking bypasses auth entirely
  const isPublicBookingRoute = window.location.pathname === '/booking';
  const isPublicPayRoute = window.location.pathname === '/pay';

  if (isPublicBookingRoute) {
    return <BookingPage onClose={() => { window.location.href = '/'; }} />;
  }

  if (isPublicPayRoute) {
    return <PaymentPage onClose={() => { window.location.href = '/'; }} />;
  }

  if (showBooking) {
    return <BookingPage onClose={() => setShowBooking(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Auth gate: if no current user and role is admin (default), show login
  if (!currentUser) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (currentRole === 'admin') {
      switch (activeTab) {
        case 'overview': return <AdminOverview />;
        case 'teachers': return <AdminTeachers />;
        case 'students': return <AdminStudents />;
        case 'finance': return <AdminFinance />;
        case 'packages': return <AdminPackages />;
        case 'settings': return <AdminSettings />;
        default: return <AdminOverview />;
      }
    }
    if (currentRole === 'teacher') {
      switch (activeTab) {
        case 'schedule': return <TeacherSchedule />;
        case 'logger': return <TeacherSessionLogger />;
        case 'availability': return <TeacherAvailability />;
        default: return <TeacherSchedule />;
      }
    }
    switch (activeTab) {
      case 'progress': return <StudentProgress />;
      case 'invoicing': return <StudentInvoicing />;
      default: return <StudentProgress />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onOpenBooking={() => setShowBooking(true)}>
      {renderContent()}
    </Layout>
  );
}

function App() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
}

export default App;
