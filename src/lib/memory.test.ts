import { describe, it, expect } from "vitest";
import {
  generateConversationSummary,
  generateSessionTitle,
  classifyIntent,
  needsWebSearch,
  isWeatherQuery,
} from "./memory";

describe("generateConversationSummary", () => {
  it("returns undefined for short conversations", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "Hello", time: Date.now() },
    ];
    expect(generateConversationSummary(messages)).toBeUndefined();
  });

  it("generates summary for longer conversations", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: i % 2 === 0 ? `Message ${i}` : `Response ${i}`,
      time: Date.now(),
    }));
    const summary = generateConversationSummary(messages);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe("string");
  });
});

describe("generateSessionTitle", () => {
  it("generates title from order inquiry", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "What's the status of ORD-1001?", time: Date.now() },
    ];
    expect(generateSessionTitle(messages)).toBe("Order ORD-1001");
  });

  it("generates title from ticket inquiry", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "Check ticket TCK-201", time: Date.now() },
    ];
    expect(generateSessionTitle(messages)).toBe("Ticket TCK-201");
  });

  it("generates title from price inquiry", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "How much is the lipstick?", time: Date.now() },
    ];
    expect(generateSessionTitle(messages)).toBe("Price Inquiry");
  });

  it("truncates long messages", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "A".repeat(50), time: Date.now() },
    ];
    const title = generateSessionTitle(messages);
    expect(title.length).toBeLessThanOrEqual(43);
    expect(title).toContain("...");
  });
});

describe("classifyIntent", () => {
  it("classifies product queries", () => {
    expect(classifyIntent("What lipstick colors do you have?").type).toBe("product_query");
    expect(classifyIntent("Show me foundations").type).toBe("product_query");
  });

  it("classifies order status queries", () => {
    expect(classifyIntent("Where is my order ORD-1001?").type).toBe("order_status");
    expect(classifyIntent("Track my delivery").type).toBe("order_status");
  });

  it("classifies complaint queries", () => {
    expect(classifyIntent("I have a complaint about my order").type).toBe("complaint");
    expect(classifyIntent("My product is damaged").type).toBe("complaint");
  });

  it("classifies weather queries", () => {
    expect(classifyIntent("What's the weather today?").type).toBe("weather");
    expect(classifyIntent("Temperature in Lahore").type).toBe("weather");
  });

  it("classifies general queries", () => {
    expect(classifyIntent("Hello, how are you?").type).toBe("general");
  });
});

describe("needsWebSearch", () => {
  it("returns true for time-sensitive queries", () => {
    expect(needsWebSearch("What movies are playing today?")).toBe(true);
    expect(needsWebSearch("Current weather")).toBe(true);
    expect(needsWebSearch("Showtimes for CineStar")).toBe(true);
  });

  it("returns false for static queries", () => {
    expect(needsWebSearch("What is your return policy?")).toBe(false);
    expect(needsWebSearch("How do I contact you?")).toBe(false);
  });
});

describe("isWeatherQuery", () => {
  it("identifies weather queries", () => {
    expect(isWeatherQuery("What's the weather?")).toBe(true);
    expect(isWeatherQuery("Temperature today")).toBe(true);
    expect(isWeatherQuery("Mausam kaisa hai")).toBe(true);
  });

  it("rejects non-weather queries", () => {
    expect(isWeatherQuery("What movies are playing?")).toBe(false);
    expect(isWeatherQuery("How much is lipstick?")).toBe(false);
  });
});
