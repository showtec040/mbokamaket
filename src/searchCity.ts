export const normalizeSearchCity = (value: string) => value
  .split(",")[0]
  .replace(/^ville(?:\s+de)?\s*/i, "")
  .trim()
  .split(/\s+/)[0]
  ?.toLocaleLowerCase("fr") ?? "";

export const searchCityLabel = (value: string) => normalizeSearchCity(value)
  .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("fr"));
