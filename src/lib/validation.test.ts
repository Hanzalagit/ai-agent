import { describe, it, expect } from "vitest";
import {
  ChatRequestSchema,
  sanitizeInput,
  isValidUrl,
  isSafeUrl,
} from "./validation";

describe("ChatRequestSchema", () => {
  it("validates valid chat request", () => {
    const valid = {
      messages: [{ role: "user", content: "Hello" }],
    };
    expect(ChatRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty messages", () => {
    const invalid = { messages: [] };
    expect(ChatRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid role", () => {
    const invalid = {
      messages: [{ role: "invalid", content: "Hello" }],
    };
    expect(ChatRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects empty content", () => {
    const invalid = {
      messages: [{ role: "user", content: "" }],
    };
    expect(ChatRequestSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("removes angle brackets", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
      "scriptalert('xss')/script"
    );
  });

  it("removes javascript protocol", () => {
    expect(sanitizeInput("javascript:alert('xss')")).toBe("alert('xss')");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });
});

describe("isValidUrl", () => {
  it("validates http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("validates https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("rejects non-URL strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects file protocol", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
  });
});

describe("isSafeUrl", () => {
  it("allows public URLs", () => {
    expect(isSafeUrl("https://google.com")).toBe(true);
    expect(isSafeUrl("https://example.com/path")).toBe(true);
  });

  it("blocks localhost", () => {
    expect(isSafeUrl("http://localhost:3000")).toBe(false);
    expect(isSafeUrl("http://127.0.0.1:3000")).toBe(false);
  });

  it("blocks private IP ranges", () => {
    expect(isSafeUrl("http://192.168.1.1")).toBe(false);
    expect(isSafeUrl("http://10.0.0.1")).toBe(false);
    expect(isSafeUrl("http://172.16.0.1")).toBe(false);
  });

  it("blocks file protocol", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isSafeUrl("not a url")).toBe(false);
  });
});
