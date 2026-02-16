import { describe, expect, it } from "vitest";
import { getInitials } from "../avatar-utils";

describe("getInitials", () => {
  it("returns initials for two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for one word", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns first two initials for three+ words", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it('returns "?" for empty string', () => {
    expect(getInitials("")).toBe("?");
  });

  it("respects custom count parameter", () => {
    expect(getInitials("John Michael Doe", 3)).toBe("JMD");
  });

  it("handles count=1", () => {
    expect(getInitials("John Doe", 1)).toBe("J");
  });

  it("handles single character name", () => {
    expect(getInitials("A")).toBe("A");
  });
});
