import type { Spoiler } from "./editions";

export interface LoreCard {
  id: string;
  name: string;
  settingId: string;
  sourceId: string;
  era: string;
  spoiler: Spoiler;
  /** Свой короткий пересказ. Чужой абзац книги сюда не кладётся. */
  short: string;
  text: string;
  link: string;
  location: string;
  /** Жетоны других карточек того же мира: «Талдор → Оппара». */
  links: string[];
}

/** Карточки преданий. Пустой список — решение владельца принято, текст ещё не заведён. */
export const LORE: LoreCard[] = [];
