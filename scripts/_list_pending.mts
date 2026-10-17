import { allEntries } from "../src/data/catalog.ts";
import { writeFileSync } from "node:fs";
const entries = allEntries().filter((e) => e.status === "pending" && e.edition !== "lore");
const slim = entries.map((e) => ({
  token: e.token,
  edition: e.edition,
  category: e.category,
  id: e.localId,
  name: e.name,
  rank: e.rank,
  text: `${e.short}\n${e.text}`,
}));
writeFileSync("/tmp/pending.json", JSON.stringify(slim));
console.log(slim.length);
