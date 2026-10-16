/** Универсальное наследие складывается с народом. Идентификатор не должен совпадать с наследием внутри народа. */
export interface VersatileHeritage {
  id: string;
  name: string;
  originalName: string;
  short: string;
  info: string;
  sourceId: string;
}

/** Пока пусто: числа из книг ORC сюда не выдуманы. «Сумеречный» гнома (id umbral) сюда не кладётся. */
export const VERSATILE: VersatileHeritage[] = [];
