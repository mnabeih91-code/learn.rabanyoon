import type { SubscriptionStatus } from '../types';

export interface MonthlySubscription {
  id: string;
  student_id: string;
  billing_year: number;
  billing_month: number; // 0-11
  amount: number;
  status: SubscriptionStatus;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentLite {
  id: string;
  name: string;
  monthly_fee: number;
  subscription_start_date: string | null;
  is_paused: boolean;
  is_deleted: boolean;
  subscription_status: SubscriptionStatus;
}

export interface BillingResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface OverdueBalance {
  total: number;
  count: number;
  records: MonthlySubscription[];
}

export interface MonthlySummary {
  paid: { total: number; count: number };
  pending: { total: number; count: number };
  overdue: { total: number; count: number };
}

export interface IMonthlySubscriptionService {
  getMonthlySubscriptions(): Promise<MonthlySubscription[]>;
  getStudentMonthlySubscriptions(studentId: string): Promise<MonthlySubscription[]>;
  getSubscriptionsForMonth(year: number, month: number): Promise<MonthlySubscription[]>;
  createMonthlySubscription(record: Omit<MonthlySubscription, 'id' | 'created_at' | 'updated_at'>): Promise<MonthlySubscription | null>;
  updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    paymentDate?: string | null
  ): Promise<void>;
  updateStudentMonthlyStatus(
    studentId: string,
    status: SubscriptionStatus,
    year: number,
    month: number
  ): Promise<void>;
  runMonthlyBilling(students: StudentLite[]): Promise<BillingResult>;
  getPreviousOverdueBalance(year: number, month: number): Promise<OverdueBalance>;
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>;
}

export const SERVICE_MODE_LOCAL = 'local' as const;
export const SERVICE_MODE_SUPABASE = 'supabase' as const;

export type ServiceMode = typeof SERVICE_MODE_LOCAL | typeof SERVICE_MODE_SUPABASE;
