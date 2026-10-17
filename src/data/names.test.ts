import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function rows(name: string): { id: string; name: string; text?: string }[] {
  return JSON.parse(readFileSync(new URL(`./generated/${name}`, import.meta.url), "utf8")) as { id: string; name: string; text?: string }[];
}

describe("русские имена карточек", () => {
  it("общая подготовка и сомнительное знание не переданы по буквам", () => {
    const list = rows("pf-lists.json");
    expect(list.find((row) => row.id === "general-training")?.name).toBe("Общая подготовка");
    expect(list.find((row) => row.id === "dubious-knowledge")?.name).toBe("Сомнительное знание");
    expect(list.find((row) => row.id === "dubious-knowledge")?.text).not.toContain("по буквам");
    const index = rows("pf-feat-index.json");
    expect(index.find((row) => row.id === "general-training")?.name).toBe("Общая подготовка");
  });
});
