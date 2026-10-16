/**
 * Записи, которые не живут в основных массивах правил 2024 года и ремастера.
 * Пустые массивы держат редакции раздельно, пока пакет не заполнен.
 */
export interface PackedEntry {
  id: string;
  name: string;
  originalName: string;
  altNames: string[];
  category: string;
  categoryTitle: string;
  rank: number | null;
  short: string;
  text: string;
  sourceId: string;
  prereq: string;
  location: string;
  link: string;
}

export const DND_2014: PackedEntry[] = [];
export const PF_LEGACY: PackedEntry[] = [];
export const PF_ORC_MORE: PackedEntry[] = [];
export const DND_2024_MORE: PackedEntry[] = [];
