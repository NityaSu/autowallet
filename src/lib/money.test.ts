import { describe, expect, it } from "vitest";
import { formatTxDateTime, formatTxTime } from "@/lib/money";

const now = new Date(2026, 8, 22, 21, 30, 0);

describe("formatTxTime", () => {
  it("returns the original string when the date is invalid", () => {
    expect(formatTxTime("not-a-date")).toBe("not-a-date");
  });

  it("uses relative copy for recent times", () => {
    expect(formatTxTime(new Date(2026, 8, 22, 21, 29, 50).toISOString(), now)).toBe(
      "Just now",
    );
    expect(formatTxTime(new Date(2026, 8, 22, 21, 25, 0).toISOString(), now)).toBe(
      "5 min ago",
    );
    expect(formatTxTime(new Date(2026, 8, 22, 18, 30, 0).toISOString(), now)).toBe(
      "3 hr ago",
    );
  });

  it("uses yesterday and calendar dates like common apps", () => {
    expect(formatTxTime(new Date(2026, 8, 21, 14, 41, 0).toISOString(), now)).toBe(
      "Yesterday, 2:41 PM",
    );
    expect(formatTxTime(new Date(2026, 8, 10, 14, 41, 2).toISOString(), now)).toBe(
      "Sep 10, 2:41 PM",
    );
    expect(formatTxTime(new Date(2025, 11, 2, 9, 5, 0).toISOString(), now)).toBe(
      "Dec 2, 2025, 9:05 AM",
    );
  });
});

describe("formatTxDateTime", () => {
  it("always includes the calendar date and 12-hour time", () => {
    expect(formatTxDateTime(new Date(2026, 8, 22, 14, 41, 2).toISOString())).toBe(
      "Sep 22, 2026, 2:41 PM",
    );
  });
});
