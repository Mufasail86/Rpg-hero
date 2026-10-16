import { describe, expect, it } from "vitest";
import { artefolCharacter } from "./pf2e/artefol";
import { applySave, previewSave, serialize } from "./transfer";

describe("импорт", () => {
  const hero = artefolCharacter();
  hero.notes = "заметка остаётся";
  hero.photo = "data:image/gif;base64,abc";

  it("показывает превью и переносит копию без потерь", () => {
    const text = serialize([hero]);
    const preview = previewSave(text);
    expect("rows" in preview && preview.rows[0]).toMatchObject({ name: "Артефол Побочка", system: "pf2e", level: 20 });
    const copied = applySave([], text, "copy");
    if ("error" in copied) throw new Error(copied.error);
    expect(copied.characters[0].progress?.choices.length).toBe(hero.progress?.choices.length);
    expect(copied.characters[0].notes).toBe("заметка остаётся");
    expect(copied.characters[0].photo).toBe(hero.photo);
    expect(copied.characters[0].items.some((item) => item.custom || item.catalogId === "scale-mail")).toBe(true);
  });

  it("обновляет того же героя и не трогает файл при ошибке", () => {
    const bad = applySave([hero], "{", "update");
    expect("error" in bad).toBe(true);
    const text = serialize([{ ...hero, name: "Артефол", xp: 40 }]);
    const updated = applySave([hero], text, "update");
    if ("error" in updated) throw new Error(updated.error);
    expect(updated.characters).toHaveLength(1);
    expect(updated.characters[0].xp).toBe(40);
    expect(updated.characters[0].id).toBe(hero.id);
  });

  it("копия не затирает уже живущего героя с тем же id", () => {
    const text = serialize([hero]);
    const copied = applySave([hero], text, "copy");
    if ("error" in copied) throw new Error(copied.error);
    expect(copied.characters).toHaveLength(2);
    expect(copied.characters[1].id).not.toBe(hero.id);
    expect(copied.characters[0].name).toBe(hero.name);
  });
});
