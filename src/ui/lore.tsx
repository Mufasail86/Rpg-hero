import { ART, ART_CAPTION, artSrc } from "./art";
import { go } from "./common";

export function Lore() {
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Предания</h1>
      </header>
      <main className="screen stack">
        <p className="kicker">Пока пусто</p>
        <h1 className="display">Карт и легенд здесь нет</h1>
        <p className="lead">
          Имена стран, богов и сюжетов изданных миров в приложение не входят. Владелец ещё не решил, какие открытые источники можно показывать отдельно от правил.
          Ниже только свой ночной замок: это не вид города из книги и не карта.
        </p>
        <figure className="figure-card">
          <img src={artSrc(ART.castle)} alt="Ночной замок из синего камня над водопадом, свой рисунок" loading="lazy" decoding="async" />
          <figcaption className="caption">{ART_CAPTION} Файл hill-castle.jpg, происхождение в art/provenance.json.</figcaption>
        </figure>
        <p>
          Бестиарий тоже не подключён. Рисунок речного змея в справочнике — напоминание, что чудовища книг сюда не скопированы.
        </p>
        <button type="button" className="btn" onClick={() => go("#/library")}>К справочнику правил</button>
      </main>
    </div>
  );
}
