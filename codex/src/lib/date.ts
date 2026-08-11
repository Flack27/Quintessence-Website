export function formatPostDate(date?: string): string | undefined {
  if (!date) return undefined;

  // Parse "YYYY-MM-DD" as a local date. `new Date("YYYY-MM-DD")` parses as
  // UTC midnight, which renders as the previous day in western timezones.
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
