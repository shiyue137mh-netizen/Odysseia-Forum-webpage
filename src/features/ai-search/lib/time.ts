function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatAISearchTimestamp(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  return `${String(date.getFullYear()).slice(-2)}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatAISearchDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
