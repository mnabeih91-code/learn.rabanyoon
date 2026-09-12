import type { PageConfig, BookingPageConfig, PaymentPageConfig } from '../types';

export const DEFAULT_BOOKING_CONFIG: BookingPageConfig = {
  title: 'البيانات الأساسية',
  subtitle: 'أدخل بيانات الطالب لبدء التسجيل',
  successTitle: 'تم تسجيل حجزك بنجاح!',
  successMessage:
    'مرحباً بك في أكاديمية ربانيون. تم إنشاء حسابك بحالة "طالب جديد" وسيتم التواصل معك لتأكيد الحجز.',
  bannerTitle: 'مرحباً بك في رحلتك القرآنية!',
  bannerText:
    'نود إحاطتك علماً بأن حلقتك الأولى ستبدأ بعد 24 ساعة من وقت الحجز الحالي، وذلك لضمان إتمام التنسيق الفني المباشر وتجهيز المعلم لخطتك الدراسية المخصصة بكفاءة.',
  showBanner: true,
  enabledFields: { name: true, phone: true, teacher: true },
  customFields: [],
};

export const DEFAULT_PAYMENT_CONFIG: PaymentPageConfig = {
  title: 'ادخل كود الطالب',
  subtitle:
    'اكتب الكود الذي حصلت عليه من الأكاديمية لعرض بيانات الطالب وخيارات الدفع.',
  successMessage: 'سيتم تحويلك إلى بوابة دفع آمنة عبر Stripe لإتمام العملية.',
  bannerTitle: 'الدفع المباشر',
  bannerText: 'ادفع رسوم الاشتراك بسهولة وأمان عبر بوابة الدفع الإلكتروني.',
  showBanner: false,
  enableCurrentPackage: true,
  enableCustomAmount: true,
  enableAltPackages: true,
  customFields: [],
};

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  booking: DEFAULT_BOOKING_CONFIG,
  payment: DEFAULT_PAYMENT_CONFIG,
};

export function resolvePageConfig(raw: unknown): PageConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_PAGE_CONFIG;
  const obj = raw as Partial<PageConfig>;
  return {
    booking: { ...DEFAULT_BOOKING_CONFIG, ...(obj.booking || {}) },
    payment: { ...DEFAULT_PAYMENT_CONFIG, ...(obj.payment || {}) },
  };
}
