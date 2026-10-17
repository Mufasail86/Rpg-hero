import lists from "./generated/pf-lists.json";
import wide from "./generated/pf-wide.json";
import srd2024 from "./generated/srd-2024.json";
import type { CatalogItem } from "../types";

const GEAR = new Set(["gear", "weapon", "armor", "shield", "alchemical", "rune", "item"]);

interface GearRow {
  id: string;
  name: string;
  category: string;
  text: string;
  short?: string;
}

function costCp(text: string): number | null {
  const match = text.match(/Цена:\s*([^.]+)\./);
  if (!match) return null;
  if (match[1].includes("без цены")) return null;
  let copper = 0;
  for (const part of match[1].matchAll(/(\d+)\s*(пм|зм|см|мм)/g)) {
    const amount = Number(part[1]);
    const unit = part[2];
    copper += unit === "пм" ? amount * 1000 : unit === "зм" ? amount * 100 : unit === "см" ? amount * 10 : amount;
  }
  return copper > 0 ? copper : null;
}

function weightOf(text: string): number {
  const match = text.match(/Объём:\s*([^.]+)\./);
  if (!match) return 1;
  if (match[1].includes("лёгк")) return 0.1;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 1;
}

function rowsFor(system: "pf2e" | "dnd5e"): GearRow[] {
  if (system === "dnd5e") return srd2024 as GearRow[];
  return [...(lists as GearRow[]), ...(wide as GearRow[])];
}

export function extraGear(system: "pf2e" | "dnd5e", taken: Set<string>): { priced: CatalogItem[]; noted: { id: string; name: string; info: string }[] } {
  const priced: CatalogItem[] = [];
  const noted: { id: string; name: string; info: string }[] = [];
  for (const row of rowsFor(system)) {
    if (!GEAR.has(row.category) || taken.has(row.id)) continue;
    taken.add(row.id);
    const cost = costCp(row.text ?? "");
    if (cost == null) {
      noted.push({ id: row.id, name: row.name, info: row.short || row.text });
      continue;
    }
    priced.push({
      id: row.id,
      name: row.name,
      kind: "gear",
      weight: weightOf(row.text ?? ""),
      costCp: cost,
      info: row.text,
      short: row.short,
    });
  }
  return { priced, noted };
}
