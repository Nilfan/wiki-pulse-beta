import { dispatchApi } from "@/lib/api/dispatch";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return dispatchApi("dashboard/recent", request);
}
