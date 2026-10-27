"use server";

import { backendJson } from "@/lib/api/http";

/** Expire the cache where the database queries execute. */
export async function revalidateDashboardData() {
  await backendJson("/api/dashboard/revalidate", { method: "POST" });
}
