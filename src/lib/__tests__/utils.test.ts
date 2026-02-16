import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, formatLastSeen } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("resolves tailwind conflicts", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("formatLastSeen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Last seen just now" for < 60 seconds ago', () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 30);
    expect(formatLastSeen(now.toISOString())).toBe("Last seen just now");
  });

  it('returns "Last seen at HH:MM" for today', () => {
    const today = new Date();
    today.setHours(today.getHours() - 2);
    const result = formatLastSeen(today.toISOString());
    expect(result).toMatch(/^Last seen at \d{1,2}[:.]\d{2}/);
  });

  it('returns "Last seen yesterday at HH:MM" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatLastSeen(yesterday.toISOString());
    expect(result).toMatch(/^Last seen yesterday at \d{1,2}[:.]\d{2}/);
  });

  it('returns "Last seen DD/MM/YY" for older dates', () => {
    const old = new Date("2024-01-01T12:00:00");
    const result = formatLastSeen(old.toISOString());
    expect(result).toMatch(/^Last seen \d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}/);
  });
});
