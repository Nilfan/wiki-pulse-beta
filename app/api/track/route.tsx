import { Prisma } from "@/generated/prisma/client";
import { JsonValue } from "@prisma/client/runtime/client";
import * as v from "valibot";
import { getPrismaClient } from "../getPrismaClient";

// edge runtime can't be used since NextJS 16, all routes are Node.js runtime

const TRACKER_KEY = process.env.TRACKER_KEY;

const EventSchema = v.object({
  type: v.string(),
  path: v.string(),
  host: v.string(),
  org_id: v.string(),
  properties: v.optional(v.looseObject({})),
  session_id: v.optional(v.string()),
});

const HEADERS_OBJ = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: HEADERS_OBJ,
  });
}

function getBadResponse(error: string, status = 400) {
  return Response.json({ error }, { status, headers: HEADERS_OBJ });
}

export async function POST(request: Request) {
  let body:
    | (v.InferOutput<typeof EventSchema> & { trackerKey: string })
    | undefined;

  try {
    console.log("[API REQUEST] api/track POST request");

    body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      console.log("Body is empty");
      return getBadResponse("Request body cannot be empty");
    }
  } catch (err) {
    return getBadResponse("Request body can't be empty");
  }

  const { trackerKey, ...restBody } = body;

  if (!trackerKey || trackerKey !== TRACKER_KEY) {
  }

  const bodyParseResult = v.safeParse(EventSchema, restBody);

  if (!bodyParseResult.success) {
    return getBadResponse(`Body is invalid: ${bodyParseResult.issues}`);
  }

  const { org_id: orgIdStr, ...validBody } = bodyParseResult.output;

  const timestamp = new Date();

  const userAgent = request.headers.get("User-Agent");
  const country = request.headers.get("x-vercel-ip-country") || "unknown";

  let jsonProperties: JsonValue = "";

  try {
    jsonProperties = validBody.properties
      ? JSON.stringify(validBody.properties)
      : "";
  } catch (_err) {
    return getBadResponse("Event properties field is invalid");
  }

  const session_id = validBody.session_id || null;

  const org_id = parseInt(orgIdStr, 10);

  if (isNaN(org_id)) {
    return getBadResponse("org_id field is incorrect");
  }

  const event: Prisma.EventCreateInput = {
    ...validBody,
    org: { connect: { id: org_id } },
    session_id,
    properties: jsonProperties || Prisma.JsonNull,
    timestamp,
    user_agent: userAgent,
    country,
  };

  const prismaClient = getPrismaClient();

  try {
    await prismaClient.event.create({ data: event });
  } catch (err) {
    console.log(err);
    return getBadResponse("DB write operation error", 500);
  }

  return Response.json(null, { status: 200, headers: HEADERS_OBJ });
}
