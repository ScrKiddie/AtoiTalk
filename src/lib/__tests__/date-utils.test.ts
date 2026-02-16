import { describe, expect, it } from "vitest";
import { formatBanMessage, formatChatPreviewDate, formatMessageDateLabel } from "../date-utils";

describe("formatMessageDateLabel", () => {
  it('returns "Today" for today\'s date', () => {
    const now = new Date().toISOString();
    expect(formatMessageDateLabel(now)).toBe("Today");
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatMessageDateLabel(yesterday.toISOString())).toBe("Yesterday");
  });

  it("returns day name for dates within 2-7 days ago", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = formatMessageDateLabel(threeDaysAgo.toISOString());
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    expect(dayNames.some((day) => result.includes(day))).toBe(true);
  });

  it("returns dd/MM/yyyy for dates older than 7 days", () => {
    const old = new Date("2024-01-15T12:00:00Z");
    expect(formatMessageDateLabel(old.toISOString())).toBe("15/01/2024");
  });

  it("returns empty string for empty input", () => {
    expect(formatMessageDateLabel("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatMessageDateLabel("not-a-date")).toBe("");
  });
});

describe("formatChatPreviewDate", () => {
  it("returns time for today's date", () => {
    const now = new Date();
    const result = formatChatPreviewDate(now.toISOString());
    expect(result).toMatch(/\d{1,2}[:.]\d{2}/);
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatChatPreviewDate(yesterday.toISOString())).toBe("Yesterday");
  });

  it("returns date string for older dates", () => {
    const old = new Date("2024-01-15T12:00:00Z");
    const result = formatChatPreviewDate(old.toISOString());
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for undefined", () => {
    expect(formatChatPreviewDate(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatChatPreviewDate("")).toBe("");
  });
});

describe("formatBanMessage", () => {
  it("formats a valid suspension date", () => {
    const result = formatBanMessage("suspended until 2024-06-15T14:30:00Z");
    expect(result).toContain("Account suspended until");
    expect(result).toContain("2024");
  });

  it("passes through non-matching messages", () => {
    expect(formatBanMessage("You have been banned permanently")).toBe(
      "You have been banned permanently"
    );
  });

  it("passes through when date is invalid", () => {
    const msg = "suspended until not-a-date";
    expect(formatBanMessage(msg)).toBe(msg);
  });

  it("handles regular messages without suspension text", () => {
    const msg = "Your account has been suspended";
    expect(formatBanMessage(msg)).toBe(msg);
  });
});
