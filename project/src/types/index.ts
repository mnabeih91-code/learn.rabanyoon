export type Role = 'admin' | 'teacher' | 'student';

export type SubscriptionStatus = 'paid' | 'pending' | 'overdue';

export type AttendanceStatus =
  | 'حاضر'
  | 'اعتذار المعلم'
  | 'اعتذار الطالب بعذر'
  | 'غائب بدون عذر';

export type SessionType = 'قرآن' | 'علوم شرعية';

export type DayOfWeek = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type SlotStatus = 'available' | 'booked' | 'closed';

export interface AvailabilitySlot {
  day: DayOfWeek;
  start: string;
  end: string;
  status: SlotStatus;
  student_name: string | null;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  salary_per_session: number;
  availability_slots: AvailabilitySlot[];
  created_at: string;
  password: string;
  role: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  teacher_id: string | null;
  regular_slots: { day: DayOfWeek; start: string; end: string }[];
  total_sessions: number;
  subscription_status: SubscriptionStatus;
  status: string;
  expiry_date: string | null;
  monthly_fee: number;
  created_at: string;
  password: string;
  role: string;
  is_paused: boolean;
  student_code: string | null;
}

export interface SessionLog {
  id: string;
  student_id: string;
  teacher_id: string;
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
  updated_at: string;
  session_number: number | null;
}

export interface Financial {
  id: string;
  student_id: string;
  amount: number;
  status: SubscriptionStatus;
  updated_at: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  admin_confirmed: boolean;
}

export interface Package {
  id: string;
  session_count: number;
  label: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type CustomFieldType = 'text' | 'number' | 'dropdown';

export interface CustomField {
  id: string;
  type: CustomFieldType;
  label: string;
  placeholder: string;
  options: string[];
  required: boolean;
  visible: boolean;
}

export interface BookingPageConfig {
  title: string;
  subtitle: string;
  successTitle: string;
  successMessage: string;
  bannerTitle: string;
  bannerText: string;
  showBanner: boolean;
  enabledFields: { name: boolean; phone: boolean; teacher: boolean };
  customFields: CustomField[];
}

export interface PaymentPageConfig {
  title: string;
  subtitle: string;
  successMessage: string;
  bannerTitle: string;
  bannerText: string;
  showBanner: boolean;
  enableCurrentPackage: boolean;
  enableCustomAmount: boolean;
  enableAltPackages: boolean;
  customFields: CustomField[];
}

export interface PageConfig {
  booking: BookingPageConfig;
  payment: PaymentPageConfig;
}

export interface AcademySettings {
  id: string;
  whatsapp_number: string;
  academy_name: string;
  booking_url: string;
  updated_at: string;
  page_config: PageConfig | null;
}

export interface PayrollEntry {
  id: string;
  teacher_id: string;
  month: number;
  year: number;
  bonuses: number;
  deductions: number;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  teacher_id?: string;
  student_id?: string;
}
