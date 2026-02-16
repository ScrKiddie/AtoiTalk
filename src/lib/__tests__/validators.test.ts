import { describe, expect, it } from "vitest";
import {
  bioSchema,
  emailSchema,
  groupDescriptionSchema,
  groupNameSchema,
  nameSchema,
  otpSchema,
  passwordSchema,
  usernameSchema,
} from "../validators";

describe("passwordSchema", () => {
  it("accepts a valid password", () => {
    expect(passwordSchema.safeParse("Abcdef1!").success).toBe(true);
  });

  it("rejects too short", () => {
    const r = passwordSchema.safeParse("Ab1!");
    expect(r.success).toBe(false);
  });

  it("rejects too long (>72)", () => {
    const long = "Aa1!" + "a".repeat(69);
    expect(long.length).toBe(73);
    expect(passwordSchema.safeParse(long).success).toBe(false);
  });

  it("rejects missing uppercase", () => {
    expect(passwordSchema.safeParse("abcdefg1!").success).toBe(false);
  });

  it("rejects missing lowercase", () => {
    expect(passwordSchema.safeParse("ABCDEFG1!").success).toBe(false);
  });

  it("rejects missing digit", () => {
    expect(passwordSchema.safeParse("Abcdefgh!").success).toBe(false);
  });

  it("rejects missing symbol", () => {
    expect(passwordSchema.safeParse("Abcdefg1").success).toBe(false);
  });

  it("accepts exactly 8 characters", () => {
    expect(passwordSchema.safeParse("Abcdef1!").success).toBe(true);
  });

  it("accepts exactly 72 characters", () => {
    const pw = "Aa1!" + "b".repeat(68);
    expect(pw.length).toBe(72);
    expect(passwordSchema.safeParse(pw).success).toBe(true);
  });
});

describe("usernameSchema", () => {
  it("accepts valid username", () => {
    expect(usernameSchema.safeParse("johndoe123").success).toBe(true);
  });

  it("rejects too short (<3)", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects too long (>50)", () => {
    expect(usernameSchema.safeParse("a".repeat(51)).success).toBe(false);
  });

  it("accepts uppercase letters", () => {
    expect(usernameSchema.safeParse("JohnDoe").success).toBe(true);
  });

  it("rejects special characters and underscores", () => {
    expect(usernameSchema.safeParse("john-doe").success).toBe(false);
    expect(usernameSchema.safeParse("john.doe").success).toBe(false);
    expect(usernameSchema.safeParse("john doe").success).toBe(false);
    expect(usernameSchema.safeParse("user_123").success).toBe(false);
    expect(usernameSchema.safeParse("john_doe").success).toBe(false);
  });

  it("accepts numbers", () => {
    expect(usernameSchema.safeParse("user123").success).toBe(true);
  });
});

describe("nameSchema", () => {
  it("accepts valid name", () => {
    expect(nameSchema.safeParse("John Doe").success).toBe(true);
  });

  it("rejects too short (<3)", () => {
    expect(nameSchema.safeParse("Ab").success).toBe(false);
  });

  it("rejects too long (>100)", () => {
    expect(nameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it("accepts exactly 3 characters", () => {
    expect(nameSchema.safeParse("abc").success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects malformed email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("@domain.com").success).toBe(false);
    expect(emailSchema.safeParse("user@").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts valid 6-digit OTP", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects too short", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects too long", () => {
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects non-numeric characters", () => {
    expect(otpSchema.safeParse("12345a").success).toBe(false);
    expect(otpSchema.safeParse("abcdef").success).toBe(false);
  });
});

describe("bioSchema", () => {
  it("accepts valid bio", () => {
    expect(bioSchema.safeParse("Hello world").success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    expect(bioSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepts empty string", () => {
    expect(bioSchema.safeParse("").success).toBe(true);
  });

  it("rejects too long (>255)", () => {
    expect(bioSchema.safeParse("a".repeat(256)).success).toBe(false);
  });

  it("accepts exactly 255 characters", () => {
    expect(bioSchema.safeParse("a".repeat(255)).success).toBe(true);
  });
});

describe("groupNameSchema", () => {
  it("accepts valid group name", () => {
    expect(groupNameSchema.safeParse("Study Group").success).toBe(true);
  });

  it("rejects too short (<3)", () => {
    expect(groupNameSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects too long (>100)", () => {
    expect(groupNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});

describe("groupDescriptionSchema", () => {
  it("accepts valid description", () => {
    expect(groupDescriptionSchema.safeParse("A cool group").success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    expect(groupDescriptionSchema.safeParse(undefined).success).toBe(true);
  });

  it("rejects too long (>255)", () => {
    expect(groupDescriptionSchema.safeParse("a".repeat(256)).success).toBe(false);
  });

  it("accepts exactly 255 characters", () => {
    expect(groupDescriptionSchema.safeParse("a".repeat(255)).success).toBe(true);
  });
});
