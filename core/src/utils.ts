export function isEmpty(value: any[] | readonly any[] | string) {
  if (value == null) {
    return true;
  }

  if (Array.isArray(value) || typeof value === "string") {
    return !value.length;
  }

  return true;
}
