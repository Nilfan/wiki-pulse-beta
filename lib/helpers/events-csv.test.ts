import assert from "node:assert/strict";
import test from "node:test";
import { eventsCsv } from "./events-csv";

const event = { id: "1", timestamp: "2026-10-26T12:30:00.000Z", type: "edit", path: '/wiki/A_"quoted",_title\n人工智能', host: "https://en.wikipedia.org", country: "en" };

test("CSV preserves quotes, commas, newlines and Unicode in a quoted cell", () => {
  const csv = eventsCsv([event]);
  assert.ok(csv.startsWith('"Timestamp (UTC)","Type","Page","Wiki","Language"\r\n'));
  assert.ok(csv.includes('"/wiki/A_""quoted"",_title\n人工智能"'));
  assert.ok(csv.endsWith('"en"\r\n'));
});

test("CSV neutralizes spreadsheet formulas in user-controlled values", () => {
  for (const path of ["=1+1", "+SUM(1)", "-1+1", "@SUM(1)", "  =1+1", "\tformula"]) {
    assert.ok(eventsCsv([{ ...event, path }]).includes(`"'${path}"`));
  }
});

test("an empty export contains just its header", () => {
  assert.equal(eventsCsv([]).split("\r\n").length, 2);
});

test("dashboard exports use the viewer's zone including daylight saving", () => {
  const yerevan = eventsCsv([event], "Asia/Yerevan");
  assert.ok(yerevan.includes('"Timestamp (Asia/Yerevan)"'));
  assert.ok(yerevan.includes("26/10/2026, 16:30:00"));
  const summer = { ...event, timestamp: "2026-07-01T12:30:00.000Z" };
  assert.ok(eventsCsv([summer], "America/New_York").includes("01/07/2026, 08:30:00"));
  assert.ok(eventsCsv([event], "America/New_York").includes("26/10/2026, 08:30:00"));
  const winter = { ...event, timestamp: "2026-12-01T12:30:00.000Z" };
  assert.ok(eventsCsv([winter], "America/New_York").includes("01/12/2026, 07:30:00"));
});
