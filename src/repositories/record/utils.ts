export const groupBy = <T, U>(rows: T[], getter: (row: T) => U): Map<U, T[]> => {
  const map = new Map<U, T[]>();
  for (const row of rows) {
    const key = getter(row);
    const collection = map.get(key);
    if (collection) {
      collection.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return map;
};
