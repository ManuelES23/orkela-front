import { describe, it, expect } from "vitest";
import { formatDistanceToNow, formatTimestampDate, isPast } from "./dateUtils";

describe("dateUtils con timestamps", () => {
  it("formatDistanceToNow respeta la hora de un timestamp ISO UTC", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    expect(formatDistanceToNow(threeHoursAgo)).toBe("hace 3 horas");
    expect(formatDistanceToNow(fiveMinutesAgo)).toBe("hace 5 minutos");
  });

  it("formatTimestampDate usa el día local del timestamp, no el día UTC", () => {
    const lateNight = new Date(2026, 0, 15, 23, 30).toISOString();
    const earlyMorning = new Date(2026, 0, 15, 0, 30).toISOString();

    expect(formatTimestampDate(lateNight, { day: "numeric" })).toBe("15");
    expect(formatTimestampDate(earlyMorning, { day: "numeric" })).toBe("15");
  });

  it("formatTimestampDate conserva las fechas sin hora", () => {
    expect(formatTimestampDate("2026-01-16", { day: "numeric" })).toBe("16");
  });

  it("isPast no considera vencida una tarea que vence hoy", () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    expect(isPast(today)).toBe(false);
  });
});
