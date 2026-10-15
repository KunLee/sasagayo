export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export function formatTotal(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ${minutes % 60} min`;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_ORIGIN ?? "https://ai.kumind.com.au").replace(/\/$/, "");

export function sourceLabel(source: string) {
  return source === "internet_archive" ? "Internet Archive" : "Wikimedia Commons";
}
