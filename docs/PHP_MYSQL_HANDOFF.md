# PHP + MySQL Backend Handoff Guide

## Overview

The Rabanyoon Academy frontend uses a **service abstraction layer** for all monthly subscription operations. The current implementation talks to Supabase, but the architecture is designed so you can swap in a PHP + MySQL backend by implementing one interface.

## Architecture

```
StoreContext.tsx
       │
       ▼
getMonthlySubscriptionService()   ← factory in src/services/index.ts
       │
       ├── SupabaseMonthlySubscriptionService  (current)
       ├── LocalMonthlySubscriptionService     (mock for preview testing)
       └── PhpApiMonthlySubscriptionService    (YOU CREATE THIS)
```

## Files to Know

| File | Purpose |
|------|---------|
| `src/services/types.ts` | Interface definitions — `IMonthlySubscriptionService`, data models |
| `src/services/billingLogic.ts` | Pure billing functions (backend-agnostic, reusable as-is) |
| `src/services/supabaseService.ts` | Current Supabase implementation (reference) |
| `src/services/localService.ts` | Mock/local implementation (reference) |
| `src/services/index.ts` | Factory that selects which implementation to use |
| `src/store/StoreContext.tsx` | App store — calls the service, never touches Supabase directly for monthly subs |

## The Interface You Must Implement

```typescript
interface IMonthlySubscriptionService {
  getMonthlySubscriptions(): Promise<MonthlySubscription[]>
  getStudentMonthlySubscriptions(studentId: string): Promise<MonthlySubscription[]>
  getSubscriptionsForMonth(year: number, month: number): Promise<MonthlySubscription[]>
  createMonthlySubscription(record): Promise<MonthlySubscription | null>
  updateSubscriptionStatus(id: string, status: SubscriptionStatus, paymentDate?: string | null): Promise<void>
  updateStudentMonthlyStatus(studentId: string, status: SubscriptionStatus, year: number, month: number): Promise<void>
  runMonthlyBilling(students: StudentLite[]): Promise<BillingResult>
  getPreviousOverdueBalance(year: number, month: number): Promise<OverdueBalance>
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>
}
```

## Data Models

### MonthlySubscription
```typescript
{
  id: string;
  student_id: string;
  billing_year: number;
  billing_month: number;   // 0-11 (JavaScript Date.getMonth())
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  payment_date: string | null;   // ISO timestamp
  created_at: string;
  updated_at: string;
}
```

### StudentLite (minimal student shape for billing)
```typescript
{
  id: string;
  name: string;
  monthly_fee: number;
  subscription_start_date: string | null;
  is_paused: boolean;
  is_deleted: boolean;
  subscription_status: SubscriptionStatus;
}
```

### BillingResult
```typescript
{ created: number; updated: number; errors: string[] }
```

### MonthlySummary
```typescript
{
  paid: { total: number; count: number };
  pending: { total: number; count: number };
  overdue: { total: number; count: number };
}
```

### OverdueBalance
```typescript
{ total: number; count: number; records: MonthlySubscription[] }
```

## MySQL Table Schema

```sql
CREATE TABLE monthly_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  billing_year INT NOT NULL,
  billing_month INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('paid','pending','overdue') NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_month (student_id, billing_year, billing_month),
  INDEX idx_year_month (billing_year, billing_month),
  INDEX idx_student (student_id),
  INDEX idx_status (status)
);
```

The `UNIQUE KEY uniq_student_month` enforces idempotency — attempting to insert a duplicate (student_id + billing_year + billing_month) should fail silently (return null) just like the Supabase implementation does.

## Billing Rules (Implemented in billingLogic.ts)

These are **already coded** as pure functions in `src/services/billingLogic.ts`. Your PHP backend should replicate the same logic, or the frontend can continue using the shared pure functions and your API only handles CRUD.

### 1. Monthly Billing Run (`computeBillingActions`)
For each active (not paused, not deleted) student whose subscription has started:
- **Previous month**: if a `pending` record exists → mark it `overdue`
- **Current month**: create a `pending` record if one doesn't exist (idempotent)

### 2. Financial Status Display (`computeFinancialStatus`)
- If any month **before** the current month has `pending` or `overdue` status → display `overdue`
- Otherwise → display the current month's status
- Paused students → always `pending`

### 3. Reactivation (`shouldCreateReactivationSubscription`)
When unpausing a student:
- If current month has no subscription record and the subscription has started → create a `pending` record
- **No retroactive billing** for months while paused

### 4. Idempotency (`isDuplicateSubscription`)
Never create duplicate (student_id + billing_year + billing_month) records.

## How to Create the PHP Implementation

### Step 1: Create the PHP API endpoints

Create endpoints on your Hostinger PHP backend that map to the interface methods:

| Method | HTTP | Path |
|--------|------|------|
| `getMonthlySubscriptions` | GET | `/api/monthly-subscriptions` |
| `getStudentMonthlySubscriptions` | GET | `/api/monthly-subscriptions?student_id={id}` |
| `getSubscriptionsForMonth` | GET | `/api/monthly-subscriptions?year={y}&month={m}` |
| `createMonthlySubscription` | POST | `/api/monthly-subscriptions` |
| `updateSubscriptionStatus` | PUT | `/api/monthly-subscriptions/{id}` |
| `updateStudentMonthlyStatus` | PUT | `/api/monthly-subscriptions?student_id={id}&year={y}&month={m}` |
| `runMonthlyBilling` | POST | `/api/monthly-billing` |
| `getPreviousOverdueBalance` | GET | `/api/monthly-overdue?year={y}&month={m}` |
| `getMonthlySummary` | GET | `/api/monthly-summary?year={y}&month={m}` |

### Step 2: Create the frontend adapter

Create `src/services/phpApiService.ts`:

```typescript
import type { IMonthlySubscriptionService, MonthlySubscription, StudentLite, BillingResult, MonthlySummary, OverdueBalance, SubscriptionStatus } from './types';
import { computeBillingActions, calculateMonthlySummary, calculatePreviousOverdue } from './billingLogic';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class PhpApiMonthlySubscriptionService implements IMonthlySubscriptionService {
  // Implement each method as a fetch() call to your PHP endpoints
  // ...
}
```

### Step 3: Wire it into the factory

In `src/services/index.ts`, add a case for the PHP mode:

```typescript
switch (mode) {
  case 'local':
    _instance = new LocalMonthlySubscriptionService();
    break;
  case 'php':
    _instance = new PhpApiMonthlySubscriptionService();
    break;
  default:
    _instance = new SupabaseMonthlySubscriptionService();
}
```

Set the mode via `localStorage.setItem('rabanyoon_service_mode', 'php')` or change the default in `getModeFromEnv()`.

## What Stays the Same

- **All billing logic** in `billingLogic.ts` is pure TypeScript and backend-agnostic — no changes needed
- **StoreContext.tsx** only talks to the service interface — no changes needed when switching backends
- **All UI components** read from the store's `monthlySubscriptions` state — no changes needed
- **Auth, teachers, sessions, packages, payroll, settings** still use Supabase directly (only monthly subscriptions are abstracted)

## Other Tables (Still on Supabase)

The service layer only abstracts `monthly_subscriptions`. These tables still go through direct Supabase calls in StoreContext.tsx and will need separate PHP endpoints when you migrate:

- `teachers`
- `students`
- `sessions_log`
- `financials`
- `packages`
- `academy_settings`
- `payroll`

## Mode Switching

```javascript
// Use Supabase (default)
localStorage.setItem('rabanyoon_service_mode', 'supabase')

// Use local mock (for preview testing)
localStorage.setItem('rabanyoon_service_mode', 'local')

// Use PHP API (after you build it)
localStorage.setItem('rabanyoon_service_mode', 'php')
```

The factory in `src/services/index.ts` reads this on every `getMonthlySubscriptionService()` call and caches the instance until the mode changes.
