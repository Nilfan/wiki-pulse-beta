import type { NextRequest } from "next/server";
import { dispatchApi } from "@/lib/api/dispatch";

export async function POST(request: NextRequest) {
  return dispatchApi("dashboard/revalidate", request);
}
