const won = new Intl.NumberFormat("ko-KR");

export function formatWon(n: number): string {
  return `${won.format(n)}원`;
}

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTime(iso: string | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "-";
}

export function formatDate(isoOrYmd: string | undefined): string {
  if (!isoOrYmd) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd) ? new Date(`${isoOrYmd}T00:00:00+09:00`) : new Date(isoOrYmd);
  return dateOnly.format(d);
}

/** 남은 날짜(올림). 음수면 지남. */
export function daysUntil(target: string, now: Date): number {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(target) ? new Date(`${target}T23:59:59+09:00`) : new Date(target);
  return Math.ceil((t.getTime() - now.getTime()) / 86400_000);
}
