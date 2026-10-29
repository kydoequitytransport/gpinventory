export function suggestedReorder(
  qtySold: number,
  leadTimeDays: number,
  minOnHand: number | null,
  onHand: number | null,
) {
  const value = qtySold * leadTimeDays + (minOnHand ?? 0) - (onHand ?? 0);
  return Math.round(value * 1000) / 1000;
}

export function nextPrNo(taken: string[], today: string) {
  const prefix = `PR-${today.replaceAll("-", "")}-`;
  let max = 0;
  for (const value of taken) {
    if (!value.toUpperCase().startsWith(prefix)) continue;
    const seq = Number(value.slice(prefix.length));
    if (Number.isInteger(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function manilaToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
