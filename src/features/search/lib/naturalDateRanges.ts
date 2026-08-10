function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type NaturalDatePeriod =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'lastWeek'
  | 'month'
  | 'lastMonth';

export function getNaturalDateRange(period: NaturalDatePeriod, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
  } else if (period === 'week' || period === 'lastWeek') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (period === 'lastWeek') start.setDate(start.getDate() - 7);
  } else if (period === 'month' || period === 'lastMonth') {
    start.setDate(1);
    if (period === 'lastMonth') start.setMonth(start.getMonth() - 1);
  }

  const end = new Date(start);
  if (period === 'today' || period === 'yesterday') end.setDate(end.getDate() + 1);
  if (period === 'week' || period === 'lastWeek') end.setDate(end.getDate() + 7);
  if (period === 'month' || period === 'lastMonth') end.setMonth(end.getMonth() + 1);

  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}
