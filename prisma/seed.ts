import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { Pool } from "pg";
import { OrganizationCreateInput } from "@/generated/prisma/models";
import { WIKI_ORG } from "./constants";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EVENT_BATCH_CAPACITY = 1000;
const EVENT_MAX_COUNT = 11000;
const EVENT_MIN_COUNT = 10000;

const MOCK_ORGS: Prisma.OrganizationCreateInput[] = [
  {
    name: "Fooble",
    slug: "https://fake-url-fooble.com",
  },
  {
    name: "Mooble",
    slug: "https://fake-url-mooble.com",
  },
  {
    name: "Looble",
    slug: "https://fake-url-looble.com",
  },
];

async function initMockOrgs() {
  await prisma.organization.createMany({
    data: MOCK_ORGS,
  });
}

async function initWikiOrg() {
  await prisma.organization.create({
    data: WIKI_ORG,
  });
}

function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

const COUNTRIES = [
  "US",
  "US",
  "US",
  "GB",
  "GB",
  "DE",
  "DE",
  "FR",
  "CA",
  "AU",
  "JP",
  "IN",
  "BR",
];

function getRandomSeasonalTimestamp(daysAgoLimit: number): Date {
  const now = new Date();
  const dayOffset = Math.floor(Math.random() * daysAgoLimit);

  // Rejection sampling for seasonal daily distribution
  // Peak activity is in the afternoon (3 PM / 15:00), lowest activity is late night (3 AM / 03:00)
  let hour = 0;
  while (true) {
    const h = Math.random() * 24;
    const prob = 0.6 + 0.4 * Math.cos((2 * Math.PI * (h - 15)) / 24);
    if (Math.random() < prob) {
      hour = h;
      break;
    }
  }

  const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
  const hours = Math.floor(hour);
  const minutes = Math.floor((hour - hours) * 60);
  const seconds = Math.floor(((hour - hours) * 60 - minutes) * 60);
  const ms = Math.floor(
    (((hour - hours) * 60 - minutes) * 60 - seconds) * 1000,
  );

  date.setHours(hours, minutes, seconds, ms);

  if (date > now) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

async function initMockEvents() {
  const eventsCount = getRandomIntInclusive(EVENT_MIN_COUNT, EVENT_MAX_COUNT);

  const pageviewEventsCount = Math.floor(eventsCount * 0.7);
  const clickEventsCount = Math.floor(eventsCount * 0.2);
  const signupEventsCount = Math.floor(eventsCount * 0.07);
  const purchaseEventsCount = Math.floor(eventsCount * 0.03);

  const orgs = await prisma.organization.findMany();
  if (orgs.length === 0) {
    throw new Error("No organizations found to seed events for.");
  }

  let flushedEventsCount = 0;

  let events: Prisma.EventUncheckedCreateInput[] = [];

  const flushEvents = async () => {
    const eventsCount = events.length;
    await prisma.event.createMany({
      data: events,
    });

    events = [];

    console.log(`Successfully added ${eventsCount} events.`);
    flushedEventsCount += eventsCount;
  };

  const addEvents = async (
    type: string,
    count: number,
    getUrl: (org: OrganizationCreateInput) => string,
    getProps: () => Prisma.InputJsonValue,
  ) => {
    for (let i = 0; i < count; i++) {
      const org = orgs[Math.floor(Math.random() * orgs.length)];
      const timestamp = getRandomSeasonalTimestamp(21);
      const session_id = `sess_${Math.random().toString(36).substring(2, 10)}`;
      const user_agent =
        USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];

      const urlStr = getUrl(org);
      const urlObj = new URL(urlStr);
      const host = urlObj.host;
      const path = urlObj.pathname;

      events.push({
        org_id: org.id,
        type,
        timestamp,
        host,
        path,
        session_id,
        user_agent,
        country,
        properties: getProps(),
      });

      if (events.length >= EVENT_BATCH_CAPACITY) {
        await flushEvents();
      }
    }
  };

  const PAGE_URLS = [
    "/home",
    "/pricing",
    "/docs",
    "/features",
    "/about",
    "/blog",
  ];
  await addEvents(
    "pageview",
    pageviewEventsCount,
    (org) =>
      `${org.slug}${PAGE_URLS[Math.floor(Math.random() * PAGE_URLS.length)]}`,
    () => ({
      referrer: Math.random() > 0.4 ? "https://google.com" : "direct",
    }),
  );

  const CLICK_ELEMENTS = [
    "btn_cta_signup",
    "btn_pricing_premium",
    "link_docs_install",
    "nav_blog",
  ];
  await addEvents(
    "click",
    clickEventsCount,
    (org) =>
      `${org.slug}${PAGE_URLS[Math.floor(Math.random() * PAGE_URLS.length)]}`,
    () => ({
      element:
        CLICK_ELEMENTS[Math.floor(Math.random() * CLICK_ELEMENTS.length)],
    }),
  );

  const SIGNUP_METHODS = ["email", "google", "github"];
  await addEvents(
    "signup",
    signupEventsCount,
    (org) => `${org.slug}/signup`,
    () => ({
      method: SIGNUP_METHODS[Math.floor(Math.random() * SIGNUP_METHODS.length)],
    }),
  );

  const PLANS = ["starter", "pro", "enterprise"];
  await addEvents(
    "purchase",
    purchaseEventsCount,
    (org) => `${org.slug}/pricing`,
    () => {
      const plan = PLANS[Math.floor(Math.random() * PLANS.length)];
      let amount = 0;
      if (plan === "starter") amount = 9;
      else if (plan === "pro") amount = 29;
      else amount = 99;

      return { plan, amount, currency: "USD" };
    },
  );

  await flushEvents();

  console.log(`Successfully seeded ${flushedEventsCount} events.`);
}

async function clearDatabase() {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('Event', 'User', 'Organization');
  `;

  if (tables.length > 0) {
    const tableNames = tables.map((t) => `"${t.table_name}"`).join(", ");
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
    );
  }
}

async function main() {
  await clearDatabase();

  await initMockOrgs();
  await initMockEvents();
  await initWikiOrg();

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
