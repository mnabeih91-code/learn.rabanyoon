import { supabase } from '../lib/supabase';
import type { IMonthlySubscriptionService, MonthlySubscription, StudentLite, BillingResult, MonthlySummary, OverdueBalance, SubscriptionStatus } from './types';
import {
  calculateMonthlySummary,
  calculatePreviousOverdue,
  computeBillingActions,
} from './billingLogic';

// ============================================================================
// SUPABASE IMPLEMENTATION
// ============================================================================
// This implementation uses the Supabase client to read/write monthly_subscriptions.
// It delegates the core billing algorithm to the shared billingLogic functions
// so the business rules are identical across all backends.
//
// When migrating to PHP + MySQL, replace this class with a PhpApiService
// that implements the same IMonthlySubscriptionService interface.
// ============================================================================

export class SupabaseMonthlySubscriptionService implements IMonthlySubscriptionService {
  async getMonthlySubscriptions(): Promise<MonthlySubscription[]> {
    const { data, error } = await supabase.from('monthly_subscriptions').select('*');
    if (error) throw error;
    return (data || []) as MonthlySubscription[];
  }

  async getStudentMonthlySubscriptions(studentId: string): Promise<MonthlySubscription[]> {
    const { data, error } = await supabase
      .from('monthly_subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .order('billing_year', { ascending: false })
      .order('billing_month', { ascending: false });
    if (error) throw error;
    return (data || []) as MonthlySubscription[];
  }

  async getSubscriptionsForMonth(year: number, month: number): Promise<MonthlySubscription[]> {
    const { data, error } = await supabase
      .from('monthly_subscriptions')
      .select('*')
      .eq('billing_year', year)
      .eq('billing_month', month);
    if (error) throw error;
    return (data || []) as MonthlySubscription[];
  }

  async createMonthlySubscription(
    record: Omit<MonthlySubscription, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MonthlySubscription | null> {
    const { data, error } = await supabase
      .from('monthly_subscriptions')
      .insert({
        student_id: record.student_id,
        billing_year: record.billing_year,
        billing_month: record.billing_month,
        amount: record.amount,
        status: record.status,
        payment_date: record.payment_date,
      })
      .select()
      .single();
    if (error) {
      // Ignore unique constraint violations (idempotency safety)
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return null;
      }
      throw error;
    }
    return data as MonthlySubscription;
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    paymentDate?: string | null
  ): Promise<void> {
    const updateData: { status: SubscriptionStatus; payment_date: string | null } = {
      status,
      payment_date: status === 'paid' ? (paymentDate || new Date().toISOString()) : null,
    };
    const { error } = await supabase
      .from('monthly_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);
    if (error) throw error;
  }

  async updateStudentMonthlyStatus(
    studentId: string,
    status: SubscriptionStatus,
    year: number,
    month: number
  ): Promise<void> {
    const updateData: { status: SubscriptionStatus; payment_date: string | null } = {
      status,
      payment_date: status === 'paid' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('monthly_subscriptions')
      .update(updateData)
      .eq('student_id', studentId)
      .eq('billing_year', year)
      .eq('billing_month', month)
      .select()
      .maybeSingle();

    if (error) throw error;

    // If no record was found to update, create one
    if (!data) {
      const student = await this._getStudentFee(studentId);
      await this.createMonthlySubscription({
        student_id: studentId,
        billing_year: year,
        billing_month: month,
        amount: student,
        status,
        payment_date: status === 'paid' ? new Date().toISOString() : null,
      });
    }
  }

  async runMonthlyBilling(students: StudentLite[]): Promise<BillingResult> {
    // Fetch existing subscriptions
    const existingSubs = await this.getMonthlySubscriptions();

    // Compute billing actions using shared pure logic
    const actions = computeBillingActions(students, existingSubs);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const action of actions) {
      try {
        if (action.type === 'create') {
          await this.createMonthlySubscription({
            student_id: action.studentId,
            billing_year: action.year,
            billing_month: action.month,
            amount: action.amount,
            status: action.newStatus,
            payment_date: action.paymentDate,
          });
          created++;
        } else if (action.type === 'update' && action.existingId) {
          await this.updateSubscriptionStatus(
            action.existingId,
            action.newStatus,
            action.paymentDate
          );
          updated++;
        }
      } catch (err) {
        errors.push(`Failed for student ${action.studentId}: ${(err as Error).message}`);
      }
    }

    return { created, updated, errors };
  }

  async getPreviousOverdueBalance(year: number, month: number): Promise<OverdueBalance> {
    const allSubs = await this.getMonthlySubscriptions();
    return calculatePreviousOverdue(allSubs, year, month);
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const monthSubs = await this.getSubscriptionsForMonth(year, month);
    return calculateMonthlySummary(monthSubs, year, month);
  }

  // ---- Private helpers ----

  private async _getStudentFee(studentId: string): Promise<number> {
    const { data, error } = await supabase
      .from('students')
      .select('monthly_fee')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw error;
    return (data as { monthly_fee?: number })?.monthly_fee || 0;
  }
}
