import type { SubscriptionStatus, MonthlySubscription } from './types';
import type { StudentLite, BillingResult, MonthlySummary, OverdueBalance } from './types';

// ============================================================================
// Pure billing logic — completely backend-agnostic.
// These functions operate on plain data and can be reused by any backend.
// ============================================================================

/**
 * Calculate the financial status to display for a student in management views.
 *
 * Priority:
 * 1. If any month BEFORE the current month has unpaid (pending or overdue) → 'overdue'
 * 2. Otherwise, the current month's status
 * 3. Fallback to the student's legacy subscription_status
 */
export function computeFinancialStatus(
  student: { is_paused: boolean; subscription_status: SubscriptionStatus },
  monthlySubs: MonthlySubscription[]
): SubscriptionStatus {
  if (student.is_paused) return 'pending';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const hasOlderUnpaid = monthlySubs.some(
    (ms) =>
      (ms.billing_year < currentYear ||
        (ms.billing_year === currentYear && ms.billing_month < currentMonth)) &&
      (ms.status === 'pending' || ms.status === 'overdue')
  );

  if (hasOlderUnpaid) return 'overdue';

  const currentSub = monthlySubs.find(
    (ms) => ms.billing_year === currentYear && ms.billing_month === currentMonth
  );

  return currentSub?.status || student.subscription_status || 'pending';
}

/**
 * Core monthly billing algorithm (pure function).
 *
 * Given the list of active students and their existing monthly subscriptions,
 * computes what records should be created or updated for the current billing period.
 *
 * Rules:
 * - For each active student whose subscription has started:
 *   A. Previous month: if pending → mark overdue
 *   B. Current month: create pending if not exists
 * - Paused students: skip (no new records)
 * - Students not yet started: skip
 * - Idempotent: never creates duplicate (student_id + year + month)
 */
export interface BillingAction {
  type: 'create' | 'update';
  studentId: string;
  year: number;
  month: number;
  amount: number;
  newStatus: SubscriptionStatus;
  paymentDate: string | null;
  existingId?: string;
}

export function computeBillingActions(
  students: StudentLite[],
  existingSubs: MonthlySubscription[],
  now: Date = new Date()
): BillingAction[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Previous month
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const actions: BillingAction[] = [];

  for (const student of students) {
    // Skip paused or deleted
    if (student.is_paused || student.is_deleted) continue;

    // Skip if no start date
    if (!student.subscription_start_date) continue;

    const startDate = new Date(student.subscription_start_date);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();

    // Skip if subscription hasn't started yet
    if (currentYear < startYear || (currentYear === startYear && currentMonth < startMonth)) {
      continue;
    }

    // A. Check previous month — mark pending as overdue
    const prevIsBeforeStart =
      prevYear < startYear || (prevYear === startYear && prevMonth < startMonth);

    if (!prevIsBeforeStart) {
      const prevSub = existingSubs.find(
        (ms) =>
          ms.student_id === student.id &&
          ms.billing_year === prevYear &&
          ms.billing_month === prevMonth
      );

      if (prevSub && prevSub.status === 'pending') {
        actions.push({
          type: 'update',
          studentId: student.id,
          year: prevYear,
          month: prevMonth,
          amount: prevSub.amount,
          newStatus: 'overdue',
          paymentDate: null,
          existingId: prevSub.id,
        });
      }
    }

    // B. Create current month if not exists (idempotency)
    const currentExists = existingSubs.some(
      (ms) =>
        ms.student_id === student.id &&
        ms.billing_year === currentYear &&
        ms.billing_month === currentMonth
    );

    if (!currentExists) {
      actions.push({
        type: 'create',
        studentId: student.id,
        year: currentYear,
        month: currentMonth,
        amount: student.monthly_fee,
        newStatus: 'pending',
        paymentDate: null,
      });
    }
  }

  return actions;
}

/**
 * Calculate monthly summary from subscription records for a specific month/year.
 */
export function calculateMonthlySummary(
  subs: MonthlySubscription[],
  year: number,
  month: number
): MonthlySummary {
  const monthSubs = subs.filter(
    (ms) => ms.billing_year === year && ms.billing_month === month
  );

  const paid = monthSubs.filter((ms) => ms.status === 'paid');
  const pending = monthSubs.filter((ms) => ms.status === 'pending');
  const overdue = monthSubs.filter((ms) => ms.status === 'overdue');

  return {
    paid: { total: paid.reduce((s, ms) => s + ms.amount, 0), count: paid.length },
    pending: { total: pending.reduce((s, ms) => s + ms.amount, 0), count: pending.length },
    overdue: { total: overdue.reduce((s, ms) => s + ms.amount, 0), count: overdue.length },
  };
}

/**
 * Calculate previous overdue balance — all unpaid records from months
 * BEFORE the given (year, month).
 */
export function calculatePreviousOverdue(
  subs: MonthlySubscription[],
  year: number,
  month: number
): OverdueBalance {
  const prevRecords = subs.filter((ms) => {
    if (ms.billing_year > year) return false;
    if (ms.billing_year === year && ms.billing_month >= month) return false;
    return ms.status === 'overdue' || ms.status === 'pending';
  });

  return {
    total: prevRecords.reduce((s, ms) => s + ms.amount, 0),
    count: prevRecords.length,
    records: prevRecords,
  };
}

/**
 * Reactivation logic: when a paused student is reactivated,
 * determine if a current-month subscription needs to be created.
 *
 * Returns true if a new pending subscription should be created for the current month.
 */
export function shouldCreateReactivationSubscription(
  student: StudentLite,
  existingSubs: MonthlySubscription[],
  now: Date = new Date()
): boolean {
  if (student.is_paused) return false;
  if (!student.subscription_start_date) return false;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startDate = new Date(student.subscription_start_date);
  if (currentYear < startDate.getFullYear() || (currentYear === startDate.getFullYear() && currentMonth < startDate.getMonth())) {
    return false;
  }

  return !existingSubs.some(
    (ms) =>
      ms.student_id === student.id &&
      ms.billing_year === currentYear &&
      ms.billing_month === currentMonth
  );
}

/**
 * Validate that a billing record key (student_id + year + month) is unique.
 */
export function isDuplicateSubscription(
  subs: MonthlySubscription[],
  studentId: string,
  year: number,
  month: number
): boolean {
  return subs.some(
    (ms) => ms.student_id === studentId && ms.billing_year === year && ms.billing_month === month
  );
}

/**
 * Generate a unique ID for mock/local mode.
 */
export function generateId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Apply billing actions to an existing array of subscriptions (pure, returns new array).
 * Used by the local/mock implementation.
 */
export function applyBillingActions(
  subs: MonthlySubscription[],
  actions: BillingAction[]
): MonthlySubscription[] {
  const result = [...subs];
  const now = new Date().toISOString();

  for (const action of actions) {
    if (action.type === 'create') {
      result.push({
        id: generateId(),
        student_id: action.studentId,
        billing_year: action.year,
        billing_month: action.month,
        amount: action.amount,
        status: action.newStatus,
        payment_date: action.paymentDate,
        created_at: now,
        updated_at: now,
      });
    } else if (action.type === 'update' && action.existingId) {
      const idx = result.findIndex((ms) => ms.id === action.existingId);
      if (idx >= 0) {
        result[idx] = {
          ...result[idx],
          status: action.newStatus,
          payment_date: action.paymentDate,
          updated_at: now,
        };
      }
    }
  }

  return result;
}
