import type { IMonthlySubscriptionService, MonthlySubscription, StudentLite, BillingResult, MonthlySummary, OverdueBalance, SubscriptionStatus } from './types';
import {
  computeBillingActions,
  applyBillingActions,
  calculateMonthlySummary,
  calculatePreviousOverdue,
  generateId,
  isDuplicateSubscription,
  shouldCreateReactivationSubscription,
} from './billingLogic';

// ============================================================================
// LOCAL / MOCK IMPLEMENTATION
// ============================================================================
// This implementation stores data in memory and localStorage.
// It is for Bolt Preview testing only — the production backend will use
// a PHP + MySQL API adapter that implements the same IMonthlySubscriptionService.
//
// MOCK BEHAVIOR IS CLEARLY LABELED: all data is ephemeral/local.
// ============================================================================

const STORAGE_KEY = 'rabanyoon_monthly_subs_mock';
const SEED_KEY = 'rabanyoon_monthly_subs_seeded';

interface MockStudent {
  id: string;
  name: string;
  monthly_fee: number;
  subscription_start_date: string | null;
  is_paused: boolean;
  is_deleted: boolean;
  subscription_status: SubscriptionStatus;
}

export class LocalMonthlySubscriptionService implements IMonthlySubscriptionService {
  private subscriptions: MonthlySubscription[] = [];
  private students: MockStudent[] = [];
  private seeded = false;

  constructor() {
    this.loadFromStorage();
  }

  // ---- Storage ----

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.subscriptions = JSON.parse(raw);
      }
      this.seeded = localStorage.getItem(SEED_KEY) === 'true';
    } catch {
      this.subscriptions = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.subscriptions));
      localStorage.setItem(SEED_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Seed with mock students for preview testing.
   * Called externally when students are loaded from the real store.
   */
  setStudents(students: StudentLite[]) {
    this.students = students.map((s) => ({
      id: s.id,
      name: s.name,
      monthly_fee: s.monthly_fee,
      subscription_start_date: s.subscription_start_date,
      is_paused: s.is_paused,
      is_deleted: s.is_deleted,
      subscription_status: s.subscription_status,
    }));
  }

  // ---- Interface methods ----

  async getMonthlySubscriptions(): Promise<MonthlySubscription[]> {
    return [...this.subscriptions];
  }

  async getStudentMonthlySubscriptions(studentId: string): Promise<MonthlySubscription[]> {
    return this.subscriptions
      .filter((ms) => ms.student_id === studentId)
      .sort((a, b) => b.billing_year - a.billing_year || b.billing_month - a.billing_month);
  }

  async getSubscriptionsForMonth(year: number, month: number): Promise<MonthlySubscription[]> {
    return this.subscriptions.filter(
      (ms) => ms.billing_year === year && ms.billing_month === month
    );
  }

  async createMonthlySubscription(
    record: Omit<MonthlySubscription, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MonthlySubscription | null> {
    // Idempotency check
    if (isDuplicateSubscription(this.subscriptions, record.student_id, record.billing_year, record.billing_month)) {
      return null;
    }

    const now = new Date().toISOString();
    const newRecord: MonthlySubscription = {
      ...record,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };

    this.subscriptions.push(newRecord);
    this.saveToStorage();
    return newRecord;
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    paymentDate?: string | null
  ): Promise<void> {
    const idx = this.subscriptions.findIndex((ms) => ms.id === subscriptionId);
    if (idx < 0) return;

    this.subscriptions[idx] = {
      ...this.subscriptions[idx],
      status,
      payment_date: status === 'paid' ? (paymentDate || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    this.saveToStorage();
  }

  async updateStudentMonthlyStatus(
    studentId: string,
    status: SubscriptionStatus,
    year: number,
    month: number
  ): Promise<void> {
    const idx = this.subscriptions.findIndex(
      (ms) => ms.student_id === studentId && ms.billing_year === year && ms.billing_month === month
    );

    if (idx < 0) {
      // Create the record if it doesn't exist
      const student = this.students.find((s) => s.id === studentId);
      await this.createMonthlySubscription({
        student_id: studentId,
        billing_year: year,
        billing_month: month,
        amount: student?.monthly_fee || 0,
        status,
        payment_date: status === 'paid' ? new Date().toISOString() : null,
      });
      return;
    }

    this.subscriptions[idx] = {
      ...this.subscriptions[idx],
      status,
      payment_date: status === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    this.saveToStorage();
  }

  async runMonthlyBilling(students: StudentLite[]): Promise<BillingResult> {
    this.setStudents(students);

    const actions = computeBillingActions(students, this.subscriptions);
    this.subscriptions = applyBillingActions(this.subscriptions, actions);
    this.saveToStorage();

    const created = actions.filter((a) => a.type === 'create').length;
    const updated = actions.filter((a) => a.type === 'update').length;

    return { created, updated, errors: [] };
  }

  async getPreviousOverdueBalance(year: number, month: number): Promise<OverdueBalance> {
    return calculatePreviousOverdue(this.subscriptions, year, month);
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    return calculateMonthlySummary(this.subscriptions, year, month);
  }

  // ---- Reactivation helper ----

  async handleReactivation(student: StudentLite): Promise<boolean> {
    if (!shouldCreateReactivationSubscription(student, this.subscriptions)) {
      return false;
    }

    await this.createMonthlySubscription({
      student_id: student.id,
      billing_year: new Date().getFullYear(),
      billing_month: new Date().getMonth(),
      amount: student.monthly_fee,
      status: 'pending',
      payment_date: null,
    });

    return true;
  }

  // ---- Test utilities (preview only) ----

  /**
   * Clear all local data. For preview testing reset only.
   */
  clearAll() {
    this.subscriptions = [];
    this.seeded = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SEED_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Get raw subscriptions for debugging.
   */
  _debugGetAll(): MonthlySubscription[] {
    return [...this.subscriptions];
  }
}
