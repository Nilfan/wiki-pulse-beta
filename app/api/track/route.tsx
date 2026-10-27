import { dispatchApi } from "@/lib/api/dispatch";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return dispatchApi("track", request);
}

export async function OPTIONS(request: NextRequest) {
  return dispatchApi("track", request);
}
