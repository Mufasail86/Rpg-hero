import { describe, expect, it } from "vitest";
import { BACKGROUNDS as BG5, CLASSES as CL5, CONDITIONS as C5, GENERAL_FEATS, ITEMS as I5, MASTERY, ORIGIN_FEATS, SKILLS as S5, SPECIES, SPELLS as SP5, STYLE_FEATS } from "./dnd5e";
import { ANCESTRIES, BACKGROUNDS as BG2, CLASSES as CL2, CONDITIONS as C2, ITEMS as I2, SKILL_FEATS, SKILLS as S2, SPELLS as SP2 } from "./pf2e";

type Row = { id: string; name: string; short?: string; info: string };

function take(rows: Row[], bucket: Row[]) {
  bucket.push(...rows);
}

describe("описания открытой базы", () => {
  const rows: Row[] = [];
  take(S5, rows);
  for (const species of SPECIES) {
    rows.push(species);
    take(species.lineage ?? [], rows);
  }
  take(BG5, rows);
  for (const job of CL5) {
    rows.push(job, { id: `${job.id}-sub`, name: job.subclass.name, short: job.subclass.short, info: job.subclass.info });
    for (const feature of job.features) rows.push({ id: feature.name, name: feature.name, short: feature.short, info: feature.info });
  }
  take([...ORIGIN_FEATS, ...STYLE_FEATS, ...GENERAL_FEATS], rows);
  for (const [id, mastery] of Object.entries(MASTERY)) rows.push({ id, name: mastery.name, short: mastery.short, info: mastery.info });
  take(C5, rows);
  take(SP5, rows);
  take(I5, rows);
  take(S2, rows);
  for (const ancestry of ANCESTRIES) {
    rows.push(ancestry);
    take(ancestry.heritages, rows);
    take(ancestry.feats, rows);
  }
  take(BG2, rows);
  for (const job of CL2) {
    rows.push(job);
    for (const feature of job.features) rows.push({ id: feature.name, name: feature.name, short: feature.short, info: feature.info });
    for (const choice of job.choices) take(choice.options, rows);
    take(job.feats, rows);
  }
  take(SKILL_FEATS, rows);
  take(C2, rows);
  take(SP2, rows);
  take(I2, rows);

  it("у каждой записи есть короткая и подробная русская строка без черновиковых вопросов", () => {
    const thin = rows.filter((row) => !row.short || row.short.length < 40 || row.info.length < 180 || row.short.includes("?") || row.info.includes("?"));
    expect(thin.map((row) => `${row.id}: short ${row.short?.length ?? 0}, info ${row.info.length}`)).toEqual([]);
  });
});
