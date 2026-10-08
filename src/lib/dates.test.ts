import { describe, expect, it } from "vitest";
import { addBusinessDays, addCalendarDays, countBusinessDays, isBusinessDay } from "./dates";

describe("Business-Day & Date Calculations", () => {
  it("determines whether a given date is a business day (Mon-Fri)", () => {
    // 2026-10-05 is a Monday
    const monday = new Date("2026-10-05T10:00:00Z");
    const friday = new Date("2026-10-09T10:00:00Z");
    const saturday = new Date("2026-10-10T10:00:00Z");
    const sunday = new Date("2026-10-11T10:00:00Z");

    expect(isBusinessDay(monday)).toBe(true);
    expect(isBusinessDay(friday)).toBe(true);
    expect(isBusinessDay(saturday)).toBe(false);
    expect(isBusinessDay(sunday)).toBe(false);
  });

  it("adds business days correctly skipping weekends", () => {
    // Starting on Thursday 2026-10-08:
    // +1 business day -> Friday 2026-10-09
    // +2 business days -> Monday 2026-10-12
    // +3 business days -> Tuesday 2026-10-13
    const thursday = new Date("2026-10-08T12:00:00Z");

    const plusOne = addBusinessDays(thursday, 1);
    expect(plusOne.toISOString().slice(0, 10)).toBe("2026-10-09");

    const plusTwo = addBusinessDays(thursday, 2);
    expect(plusTwo.toISOString().slice(0, 10)).toBe("2026-10-12");

    const plusThree = addBusinessDays(thursday, 3);
    expect(plusThree.toISOString().slice(0, 10)).toBe("2026-10-13");
  });

  it("handles starting on a weekend when adding business days", () => {
    // Saturday 2026-10-10 + 1 business day -> Monday 2026-10-12
    const saturday = new Date("2026-10-10T12:00:00Z");
    const plusOne = addBusinessDays(saturday, 1);
    expect(plusOne.toISOString().slice(0, 10)).toBe("2026-10-12");
  });

  it("counts business days accurately between two dates", () => {
    // Thursday 2026-10-08 to Tuesday 2026-10-13 is 3 business days (Fri, Mon, Tue)
    const thursday = new Date("2026-10-08T00:00:00Z");
    const nextTuesday = new Date("2026-10-13T00:00:00Z");

    expect(countBusinessDays(thursday, nextTuesday)).toBe(3);
  });

  it("adds calendar days accurately", () => {
    const start = new Date("2026-10-08T00:00:00Z");
    const result = addCalendarDays(start, 15);
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-23");
  });
});
