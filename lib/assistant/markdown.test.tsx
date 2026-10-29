import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import AssistantMarkdown from "./AssistantMarkdown";

test("renders Markdown lists, emphasis, tables and fenced code", () => {
  const html = renderToStaticMarkup(<AssistantMarkdown>{"## Summary\n\n**Collected events**\n\n- One\n- Two\n\n| Type | Count |\n| --- | --- |\n| edit | 12 |\n\n```sql\nSELECT 1 < 2;\n```"}</AssistantMarkdown>);
  for (const tag of ["<h2>", "<strong>", "<ul>", "<table>", "<pre>"]) assert.ok(html.includes(tag), tag);
  assert.ok(html.includes("SELECT 1 &lt; 2;"));
});

test("rejects raw HTML and unsafe links without loading remote images", () => {
  const html = renderToStaticMarkup(<AssistantMarkdown>{'<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n![description](https://example.com/tracker.png)\n\n[Docs](https://example.com/help)'}</AssistantMarkdown>);
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.ok(html.includes('href="https://example.com/help"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes("description"));
});
