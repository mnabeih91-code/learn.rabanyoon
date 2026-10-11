import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Fetch all active (non-paused, non-deleted) students with a subscription_start_date
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("id, monthly_fee, subscription_start_date, is_paused, is_deleted, subscription_status")
      .eq("is_paused", false)
      .eq("is_deleted", false);

    if (fetchErr) throw fetchErr;

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const student of students || []) {
      if (!student.subscription_start_date) continue;

      const startDate = new Date(student.subscription_start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();

      // Don't create subscriptions before the student's start date
      if (currentYear < startYear || (currentYear === startYear && currentMonth < startMonth)) {
        continue;
      }

      // 1. Check previous month — if pending, mark as overdue
      const prevDate = new Date(currentYear, currentMonth - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();

      const prevIsBeforeStart = prevYear < startYear || (prevYear === startYear && prevMonth < startMonth);

      if (!prevIsBeforeStart) {
        const { data: prevSub } = await supabase
          .from("monthly_subscriptions")
          .select("id, status")
          .eq("student_id", student.id)
          .eq("billing_year", prevYear)
          .eq("billing_month", prevMonth)
          .maybeSingle();

        if (prevSub && prevSub.status === "pending") {
          const { error: updateErr } = await supabase
            .from("monthly_subscriptions")
            .update({ status: "overdue" })
            .eq("id", prevSub.id);
          if (updateErr) {
            errors.push(`Failed to update prev month for ${student.id}: ${updateErr.message}`);
          } else {
            updatedCount++;
          }
        }
      }

      // 2. Create current month subscription if it doesn't exist (idempotent)
      const { data: existing } = await supabase
        .from("monthly_subscriptions")
        .select("id")
        .eq("student_id", student.id)
        .eq("billing_year", currentYear)
        .eq("billing_month", currentMonth)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase
          .from("monthly_subscriptions")
          .insert({
            student_id: student.id,
            billing_year: currentYear,
            billing_month: currentMonth,
            amount: student.monthly_fee || 0,
            status: "pending",
          });
        if (insertErr) {
          // Ignore unique constraint violations (race condition safety)
          if (!insertErr.message.includes("duplicate") && !insertErr.message.includes("unique")) {
            errors.push(`Failed to create current month for ${student.id}: ${insertErr.message}`);
          }
        } else {
          createdCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: createdCount,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
