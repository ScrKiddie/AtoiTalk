import { z } from "zod";

export const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/;

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(72, { message: "Password must be at most 72 characters." })
  .regex(passwordComplexityRegex, {
    message: "Password must contain uppercase, lowercase, number, and symbol.",
  });

export const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters." })
  .max(50, { message: "Username must be at most 50 characters." })
  .regex(/^[a-z0-9_]+$/, {
    message: "Username can only contain lowercase letters, numbers, and underscores.",
  });

export const nameSchema = z
  .string()
  .min(3, { message: "Name must be at least 3 characters." })
  .max(100, { message: "Name must be at most 100 characters." });

export const emailSchema = z
  .string()
  .min(1, { message: "Email is required." })
  .email({ message: "Invalid email format." });

export const otpSchema = z
  .string()
  .length(6, { message: "OTP code must be 6 digits." })
  .regex(/^\d+$/, { message: "OTP code must only contain numbers." });

export const bioSchema = z
  .string()
  .max(255, { message: "Bio must be at most 255 characters." })
  .optional();
