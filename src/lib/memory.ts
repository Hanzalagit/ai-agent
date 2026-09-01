import type { ChatMessage } from "./types";

const MAX_HISTORY_FOR_SUMMARY = 20;
const SUMMARY_THRESHOLD = 10;

/**
 * Generate a lightweight summary of conversation history for context.
 * This is sent as part of the system prompt to maintain continuity.
 */
export function generateConversationSummary(
  messages: ChatMessage[]
): string | undefined {
  if (messages.length < SUMMARY_THRESHOLD) {
    return undefined;
  }

  const recentMessages = messages.slice(-MAX_HISTORY_FOR_SUMMARY);
  const keyTopics: string[] = [];
  const entities: Set<string> = new Set();
  const actionItems: string[] = [];

  for (const msg of recentMessages) {
    if (msg.role === "user") {
      const content = msg.content.toLowerCase();

      if (content.includes("order") || content.includes("ord-")) {
        keyTopics.push("order inquiry");
        const orderMatch = msg.content.match(/ORD-\d+/i);
        if (orderMatch) entities.add(orderMatch[0]);
      }
      if (content.includes("product") || content.includes("price") || content.includes("lipstick") || content.includes("foundation")) {
        keyTopics.push("product query");
      }
      if (
        content.includes("complaint") ||
        content.includes("ticket") ||
        content.includes("tck-")
      ) {
        keyTopics.push("support ticket");
        const ticketMatch = msg.content.match(/TCK-\d+/i);
        if (ticketMatch) entities.add(ticketMatch[0]);
      }
      if (content.includes("book") || content.includes("reserve")) {
        keyTopics.push("booking");
      }
      if (content.includes("weather") || content.includes("mausam")) {
        keyTopics.push("weather inquiry");
      }
    }

    if (msg.role === "assistant") {
      const actionMatch = msg.content.match(/\[OPEN:([^\]]+)\]/g);
      if (actionMatch) {
        actionItems.push(...actionMatch.map((a) => a.replace(/\[OPEN:|\]/g, "")));
      }
    }
  }

  const uniqueTopics = [...new Set(keyTopics)];
  const summaryParts: string[] = [];

  if (uniqueTopics.length > 0) {
    summaryParts.push(`Topics discussed: ${uniqueTopics.join(", ")}`);
  }

  if (entities.size > 0) {
    summaryParts.push(`Key entities: ${Array.from(entities).join(", ")}`);
  }

  if (actionItems.length > 0) {
    summaryParts.push(
      `Actions suggested: ${actionItems.slice(0, 3).join("; ")}`
    );
  }

  if (summaryParts.length === 0) {
    const messageCount = messages.length;
    const userMessages = messages.filter((m) => m.role === "user").length;
    const assistantMessages = messages.filter((m) => m.role === "assistant").length;
    summaryParts.push(`Conversation with ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant)`);
  }

  return summaryParts.join("\n") || undefined;
}

/**
 * Extract the first user message to create a smart session title.
 */
export function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (!firstUserMsg) return "New Chat";

  const content = firstUserMsg.content.trim();

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes("ord-")) {
    const orderMatch = content.match(/ORD-\d+/i);
    return orderMatch ? `Order ${orderMatch[0]}` : "Order Inquiry";
  }

  if (lowerContent.includes("tck-")) {
    const ticketMatch = content.match(/TCK-\d+/i);
    return ticketMatch ? `Ticket ${ticketMatch[0]}` : "Support Ticket";
  }

  if (lowerContent.includes("price") || lowerContent.includes("kitne") || lowerContent.includes("how much")) {
    return "Price Inquiry";
  }

  if (lowerContent.includes("book") || lowerContent.includes("reserve")) {
    return "Booking Request";
  }

  if (lowerContent.includes("weather") || lowerContent.includes("mausam")) {
    return "Weather Check";
  }

  return content.length > 40 ? `${content.slice(0, 40)}...` : content;
}

/**
 * Count tokens (rough estimate) for rate limiting.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if a message needs web search based on keywords.
 */
export function needsWebSearch(query: string): boolean {
  const searchIndicators = [
    "today",
    "current",
    "now",
    "latest",
    "recent",
    "aaj",
    "abhi",
    "haal",
    "showtime",
    "schedule",
    "price of",
    "cost of",
    "menu",
    "weather",
    "mausam",
  ];

  const lowerQuery = query.toLowerCase();
  return searchIndicators.some((indicator) => lowerQuery.includes(indicator));
}

/**
 * Extract weather-related keywords from a query.
 */
export function isWeatherQuery(query: string): boolean {
  return /\b(weather|temperature|mausam|forecast|weatherkaisa)\b/i.test(
    query
  );
}

/**
 * Simple intent classification for pre-routing.
 */
export type IntentType =
  | "product_query"
  | "order_status"
  | "complaint"
  | "faq"
  | "web_search"
  | "general"
  | "weather"
  | "pc_control";

export function classifyIntent(query: string): {
  type: IntentType;
  confidence: number;
} {
  const lower = query.toLowerCase();

  if (
    /\b(complaint|complain|ticket|problem|issue|broken|damaged|refund|return|wrong|defect|fault)\b/i.test(
      lower
    )
  ) {
    return { type: "complaint", confidence: 0.85 };
  }

  if (
    /\b(lipstick|foundation|foundations|serum|sunscreen|product|products|shade|color|colour|cosmetic|cream|powder|blush|mascara|eyeliner|moisturizer)\b/i.test(
      lower
    )
  ) {
    return { type: "product_query", confidence: 0.8 };
  }

  if (
    /\b(order|ORD-|track|delivery|shipping|status)\b/i.test(lower)
  ) {
    return { type: "order_status", confidence: 0.85 };
  }

  if (/\b(weather|temperature|mausam|forecast|weatherkaisa)\b/i.test(lower)) {
    return { type: "weather", confidence: 0.95 };
  }

  if (
    /\b(open|kholo|launch|run|command|notepad|chrome|vscode)\b/i.test(lower)
  ) {
    return { type: "pc_control", confidence: 0.7 };
  }

  if (
    /\b(search|find|look up|dhoondo|google|website|cinema|showtime|menu)\b/i.test(
      lower
    )
  ) {
    return { type: "web_search", confidence: 0.7 };
  }

  if (
    /\b(delivery|return|payment|timing|location|discount|authentic)\b/i.test(
      lower
    )
  ) {
    return { type: "faq", confidence: 0.6 };
  }

  return { type: "general", confidence: 0.5 };
}
