import { allEntries } from "../src/data/catalog.ts";
const entries = allEntries();
const pending = entries.filter((e) => e.status === "pending");
const by: Record<string, number> = {};
for (const e of pending) {
  const k = `${e.edition} / ${e.category}`;
  by[k] = (by[k] || 0) + 1;
}
console.log("pending", pending.length, "total", entries.length);
for (const k of Object.keys(by).sort()) console.log(String(by[k]).padStart(4), k);
