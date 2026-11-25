import { describe, expect, it } from "vitest";
import { CARD_BY_ID } from "./cards";
import { rulesCatalog } from "./catalog";
import { FEAT_BY_ID, featInfo } from "./pf-index";
import { reviewedPfText } from "./pf-reviewed-text";

describe("сверенные карточки Pathfinder Remaster", () => {
  it.each(["it-takes-a-village", "sudden-terror", "oni-weapon-familiarity", "orc-sight", "angel-form"])(
    "%s одинаково читается в карточке и справочнике",
    id => {
      const text = reviewedPfText(id)!;
      const card = CARD_BY_ID.get(id)!;
      const rule = rulesCatalog().find(row => row.localId === id && row.edition === "pf-remaster");
      expect(card.name).toBe(text.name);
      expect(card.originalName).not.toBe("");
      expect(rule).toMatchObject({ name: text.name, link: text.link, rank: card.level });
      expect(rule?.text).toContain(text.summary);
      const feat = FEAT_BY_ID.get(id);
      if (card.kind === "feat") {
        expect(feat?.name).toBe(text.name);
        expect(featInfo(feat!)).toContain(text.summary);
      }
    },
  );

  it("не выдаёт ситуационные бонусы за постоянные значения и сохраняет круг заклинания", () => {
    expect(CARD_BY_ID.get("it-takes-a-village")?.summary).toMatch(/Помощь.*\+4/);
    expect(CARD_BY_ID.get("sudden-terror")?.summary).toMatch(/скрыты от цели.*\+2/);
    expect(CARD_BY_ID.get("orc-sight")?.prereqNote).toBe("сумеречное зрение");
    expect(CARD_BY_ID.get("angel-form")).toMatchObject({ level: 7, actions: "2" });
  });
});
