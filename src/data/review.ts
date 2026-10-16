import type { ReviewStatus } from "./editions";

/**
 * Построчная сверка. Ключ — жетон записи `редакция~раздел~id`.
 * Пустой объект значит: сверенных записей нет. Не добавлять ключ без вычитки источника.
 */
export const REVIEW: Record<string, { status: ReviewStatus; checkedOn: string; sourceVersion: string; originalName?: string; location?: string }> = {};

/** Связь между записями разных редакций. Оба конца должны уже лежать в каталоге. */
export const LINKS: { from: string; to: string; note: string }[] = [];
