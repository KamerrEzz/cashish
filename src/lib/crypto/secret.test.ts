import { afterEach, describe, expect, it } from "vitest";
import {
  assertApiKeyFormat,
  assertHttpsApiUrl,
  decryptSecret,
  encryptSecret,
  last4OfKey,
} from "./secret";

const SECRET = "dev-cashish-app-secret-change-me-32chars!!";

describe("crypto secret", () => {
  afterEach(() => {
    delete process.env.CASHISH_APP_SECRET;
  });

  it("roundtrips AES-GCM", () => {
    process.env.CASHISH_APP_SECRET = SECRET;
    const plain = "sk-test-key-abcdefghijklmnop";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
    expect(last4OfKey(plain)).toBe("mnop");
  });

  it("rejects short wrap secret", () => {
    process.env.CASHISH_APP_SECRET = "too-short";
    expect(() => encryptSecret("sk-test-key-abcdefghijklmnop")).toThrow(
      /CASHISH_APP_SECRET/,
    );
  });

  it("validates key and URL formats", () => {
    expect(() => assertApiKeyFormat("short")).toThrow();
    expect(() => assertApiKeyFormat("has space here!!")).toThrow();
    assertApiKeyFormat("sk-valid-key-12");
    expect(assertHttpsApiUrl("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1",
    );
    expect(assertHttpsApiUrl("http://127.0.0.1:11434/v1")).toContain(
      "127.0.0.1",
    );
    expect(() => assertHttpsApiUrl("ftp://x")).toThrow();
  });
});
