import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { adviceForOptions } from "../data/build-advice";
import { LevelWizard } from "./beginner";

const slots = [
  { id: "class-feat-2", source: "class-feat", level: 2, label: "Черта класса" },
  { id: "skill-feat-2", source: "skill-feat", level: 2, label: "Черта навыка" },
];
const optionsFor = (slot: { source: string }) => slot.source === "class-feat"
  ? [{ pick: "intimidating-strike", name: "Устрашающий удар" }]
  : [{ pick: "battle-medicine", name: "Боевая медицина" }];
const adviceAt = () => [
  { id: "intimidating-strike", reason: "Помогает союзникам." },
  { id: "battle-medicine", reason: "Помогает лечить в бою." },
];

describe("советы рядом с выбором уровня", () => {
  it("использует русское название доступного варианта, а не внутренний код", () => {
    expect(adviceForOptions([{ pick: "feat:tough", name: "Живучесть" }], [
      { id: "tough", reason: "Больше хитов." },
      { id: "missing-feat", reason: "Такого варианта нет." },
    ])).toEqual([{ pick: "feat:tough", name: "Живучесть", reason: "Больше хитов.", advised: true }]);
  });

  it("выводит каждый совет после соответствующего выбора и начинает с названия", () => {
    const html = renderToStaticMarkup(<LevelWizard level={2} next={3} slots={slots} selected={[]} adviceAt={adviceAt} optionsFor={optionsFor} onPick={() => {}} onRemove={() => {}} />);
    expect(html.indexOf('aria-label="Черта класса"')).toBeLessThan(html.indexOf("Устрашающий удар</b>"));
    expect(html.indexOf('aria-label="Черта навыка"')).toBeLessThan(html.indexOf("Боевая медицина</b>"));
    expect(html).toContain("Устрашающий удар</b><small>Помогает союзникам.");
    expect(html).not.toContain("Почему советуем");
  });

  it("не прячет выбранный вариант и оставляет отмену после заполнения", () => {
    const html = renderToStaticMarkup(<LevelWizard level={2} next={3} slots={slots} selected={[{ id: slots[0].id, pick: "intimidating-strike", name: "Устрашающий удар" }]} adviceAt={adviceAt} optionsFor={() => []} onPick={() => {}} onRemove={() => {}} />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Устрашающий удар · выбрано");
    expect(html).toContain("Отменить выбор");
  });

  it("не позволяет применить выбор будущего уровня до повышения", () => {
    const html = renderToStaticMarkup(<LevelWizard level={1} next={2} choose={slots} slots={[]} selected={[]} adviceAt={adviceAt} optionsFor={optionsFor} onPick={() => {}} onRemove={() => {}} />);
    expect(html).toContain('aria-label="Черта класса" disabled=""');
    expect(html).toContain('class="advise-row" disabled=""');
    expect(html).toContain("С 1 на 2 уровень");
  });
});
