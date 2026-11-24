import { useState } from "react";
import { TOUR_KEY } from "../tour-key";

/** Знакомство при первом запуске. Лёгкий модуль: главный экран не тянет за ним справочник. */
const TOUR = [
  { title: "Лист в кармане", text: "Здесь герой для D&D или Pathfinder. Две игры не смешиваются. Аккаунт не нужен." },
  { title: "Быстрый старт", text: "Выберите игру, роль и имя. Получите готового героя 1 уровня. Потом любое число можно сменить." },
  { title: "Если хотите сами", text: "«Новый персонаж» ведёт по шагам. У каждого шага есть фраза, зачем он. Знак «?» объясняет слово." },
  { title: "За столом", text: "Лист — один экран. Знак «?» в шапке включает подсказки: что делать в свой ход. Их можно выключить." },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const slide = TOUR[page];
  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* приватный режим */
    }
    onDone();
  }
  return (
    <div className="sheet-layer tour" role="dialog" aria-modal="true" aria-label="Первый запуск" data-testid="tour">
      <button type="button" className="backdrop" aria-label="Пропустить знакомство" onClick={finish} />
      <div className="info-card">
        <p className="kicker">Шаг {page + 1} из {TOUR.length}</p>
        <h2>{slide.title}</h2>
        <p>{slide.text}</p>
        <div className="row">
          <button type="button" className="btn" data-testid="tour-skip" onClick={finish}>Пропустить</button>
          {page < TOUR.length - 1 ? (
            <button type="button" className="btn primary" data-testid="tour-next" onClick={() => setPage(page + 1)}>Дальше</button>
          ) : (
            <button type="button" className="btn primary" data-testid="tour-next" onClick={finish}>К героям</button>
          )}
        </div>
      </div>
    </div>
  );
}
