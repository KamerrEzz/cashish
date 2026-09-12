import { describe, expect, it } from "vitest";
import {
  authCallbackUrl,
  friendlyAuthError,
  safeNextPath,
} from "@/lib/auth-paths";

describe("safeNextPath", () => {
  it("defaults and blocks open redirects", () => {
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath("//evil.com")).toBe("/app");
    expect(safeNextPath("https://evil.com")).toBe("/app");
    expect(safeNextPath("/app/quincena")).toBe("/app/quincena");
    expect(safeNextPath("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });
});

describe("authCallbackUrl", () => {
  it("encodes next on the callback path", () => {
    expect(authCallbackUrl("https://cashish-beta.vercel.app", "/app")).toBe(
      "https://cashish-beta.vercel.app/auth/callback?next=%2Fapp",
    );
  });
});

describe("friendlyAuthError", () => {
  it("maps common supabase messages", () => {
    expect(friendlyAuthError("Invalid login credentials")).toMatch(/incorrectos/i);
    expect(friendlyAuthError("User already registered")).toMatch(/ya tiene cuenta/i);
  });
});
