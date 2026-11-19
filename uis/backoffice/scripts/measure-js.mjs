// measure-js.mjs — evidence for CACHING_REPORT.md (frontend section).
//
// Loads backoffice routes in a real browser (production build) and reports:
//   * JS downloaded on first paint (bytes, uncompressed) and which chunks
//   * extra JS downloaded after an interaction (to prove a lazy chunk is
//     really deferred until it is needed)
//   * time until the order-history table is on screen
//
// Prereqs: API on :8000 (with seed_load.py data), `next build && next start`
// on :3000. Usage: node scripts/measure-js.mjs <email> <password>
// Playwright is not a project dependency (only needed for this measurement):
// install it once with `npx playwright install chromium` + `npm i --no-save playwright`.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const [email = "bench@healthcore.example", password = "BenchPass123!"] = process.argv.slice(2);
const API = "http://127.0.0.1:8000";
const WEB = "http://localhost:3000";

const tokenRes = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ username: email, password }),
});
const { access_token } = await tokenRes.json();

const browser = await chromium.launch();

async function visit(path, { interact, waitFor } = {}) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((t) => localStorage.setItem("healthcore_backoffice_token", t), access_token);
  const page = await ctx.newPage();
  const js = [];
  page.on("response", async (r) => {
    if (r.url().endsWith(".js")) {
      try { js.push({ url: r.url().split("/").pop(), bytes: (await r.body()).length, phase: page.__phase }); } catch {}
    }
  });
  page.__phase = "load";
  const t0 = Date.now();
  await page.goto(WEB + path);
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 60000 });
  const visibleMs = Date.now() - t0;
  await page.waitForLoadState("networkidle");
  const initial = js.filter((j) => j.phase === "load");
  let extra = [];
  if (interact) {
    page.__phase = "interaction";
    await interact(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    extra = js.filter((j) => j.phase === "interaction");
  }
  const sum = (a) => (a.reduce((s, j) => s + j.bytes, 0) / 1024).toFixed(1);
  console.log(`\n${path}`);
  console.log(`  first-load JS: ${sum(initial)} KB in ${initial.length} chunks`);
  if (process.env.VERBOSE) console.log("   ", initial.map((j) => `${j.url}(${(j.bytes / 1024).toFixed(1)})`).join(" "));
  if (waitFor) console.log(`  "${waitFor}" visible after: ${visibleMs} ms`);
  if (interact) console.log(`  JS loaded on interaction: ${sum(extra)} KB  ${extra.map((j) => j.url).join(", ")}`);
  await ctx.close();
  return { initial, extra };
}

await visit("/suppliers", {
  waitFor: "table tbody tr td",
  interact: async (p) => {
    const btn = p.getByRole("button", { name: /Registrar nuevo proveedor/ });
    if (await btn.count()) await btn.click();
  },
});
await visit("/incidents", { waitFor: "table tbody tr" });
await visit("/inventory/orders", { waitFor: "table tbody tr td" });
await browser.close();
