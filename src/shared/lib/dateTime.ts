export function formatAbsoluteDateTime(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "时间未知";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

export function formatRelativeDateTime(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "时间未知";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";

  const diffMs = Date.now() - date.getTime();
  const absSeconds = Math.abs(Math.round(diffMs / 1000));
  const suffix = diffMs >= 0 ? "前" : "后";

  if (absSeconds < 45) return "刚刚";

  const units: Array<[unit: string, seconds: number]> = [
    ["年", 365 * 24 * 60 * 60],
    ["个月", 30 * 24 * 60 * 60],
    ["天", 24 * 60 * 60],
    ["小时", 60 * 60],
    ["分钟", 60],
  ];

  const [unit, seconds] =
    units.find(([, unitSeconds]) => absSeconds >= unitSeconds) ||
    units[units.length - 1];
  const amount = Math.max(1, Math.round(absSeconds / seconds));

  return `${amount}${unit}${suffix}`;
}
