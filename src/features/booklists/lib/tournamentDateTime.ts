export function fromDateTimeLocal(value?: string | null): string | null | undefined {
  if (value === null || value === '') return null;
  if (value === undefined) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
