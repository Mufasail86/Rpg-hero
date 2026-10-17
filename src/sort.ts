/** Русский алфавитный порядок. Ё учитывается правилами локали ru. */
export function byRu<T>(name: (item: T) => string): (left: T, right: T) => number {
  return (left, right) => name(left).localeCompare(name(right), "ru");
}

export function ruSort<T>(items: readonly T[], name: (item: T) => string): T[] {
  return [...items].sort(byRu(name));
}
