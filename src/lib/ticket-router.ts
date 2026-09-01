export type TicketCategory =
  | "delivery"
  | "billing"
  | "product_quality"
  | "returns"
  | "general"
  | "urgent"
  | "technical";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type RoutingResult = {
  category: TicketCategory;
  priority: TicketPriority;
  department: string;
  assignedTo: string;
  estimatedResolution: string;
  autoResponse: string;
};

const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  delivery: [
    "delivery", "shipping", "track", "courier", "package", "received",
    "late", "delayed", "dispatch", "arrived", "transit", "deliver",
    "pohancha", "send", "bhejo", "parcel",
  ],
  billing: [
    "payment", "bill", "charge", "price", "refund", "money", "discount",
    "coupon", "promo", "overcharged", "extra", "receipt", "invoice",
    "paisa", "paise", "charge", "wasool",
  ],
  product_quality: [
    "quality", "defect", "broken", "damaged", "fake", "original",
    "expiry", "expired", "smell", "texture", "color", "faded",
    "kharab", "nakli", "asli", "quality", "product",
  ],
  returns: [
    "return", "exchange", "replace", "wrong", "size", "shade",
    "mismatch", "not as described", "wapis", "badlo", "change",
  ],
  general: [
    "info", "details", "timing", "hours", "location", "address",
    "contact", "help", "support", "ask", "question",
  ],
  urgent: [
    "urgent", "emergency", "immediately", "asap", "now", "critical",
    "seriously", "complaint", "legal", "fraud", "scam",
  ],
  technical: [
    "website", "app", "login", "password", "error", "bug", "crash",
    "not working", "slow", "loading", "technical",
  ],
};

const DEPARTMENT_MAP: Record<TicketCategory, string> = {
  delivery: "Logistics & Shipping",
  billing: "Finance & Payments",
  product_quality: "Quality Assurance",
  returns: "Returns & Exchanges",
  general: "Customer Support",
  urgent: "Management",
  technical: "IT & Development",
};

const ASSIGNED_TO: Record<TicketCategory, string> = {
  delivery: "Delivery Team",
  billing: "Finance Team",
  product_quality: "QA Team",
  returns: "Returns Desk",
  general: "Support Agent",
  urgent: "Manager on Duty",
  technical: "Tech Lead",
};

const RESOLUTION_TIME: Record<TicketCategory, string> = {
  delivery: "24-48 hours",
  billing: "12-24 hours",
  product_quality: "24-72 hours",
  returns: "24-48 hours",
  general: "12-24 hours",
  urgent: "1-4 hours",
  technical: "24-72 hours",
};

const AUTO_RESPONSES: Record<TicketCategory, string> = {
  delivery:
    "Hum aapki delivery ka issue samajh gaye hain. Humara logistics team isko check karega aur aapko update dega within 24 hours. 📦",
  billing:
    "Payment/billing issue receive ho gaya hai. Humara finance team jald se jald review karega aur aapko reply dega. 💰",
  product_quality:
    "Product quality ke baare mein complaint mil gayi hai. Hum quality team se verify karayenge aur replacement安排 karenge. ✨",
  returns:
    "Return/exchange request note ho gayi hai. Humari team aapko WhatsApp par instructions bhejegi. 🔄",
  general:
    "Aapka sawaal mil gaya hai! Hum aapki madad karna chahte hain. Jald hi aapko reply milega. 😊",
  urgent:
    "URGENT: Aapka complaint hamari management tak pohanch gaya hai. Hamare senior team member aapko 1-2 hours mein contact karenge. ⚡",
  technical:
    "Technical issue report ho gaya hai. Hamari IT team isko resolve kar rahi hai. Aapko update milta rahega. 🔧",
};

export function classifyTicket(
  subject: string,
  description?: string
): RoutingResult {
  const text = `${subject} ${description ?? ""}`.toLowerCase();
  const scores: Record<TicketCategory, number> = {
    delivery: 0,
    billing: 0,
    product_quality: 0,
    returns: 0,
    general: 0,
    urgent: 0,
    technical: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[category as TicketCategory] += 1;
      }
    }
  }

  let maxScore = 0;
  let topCategory: TicketCategory = "general";
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = category as TicketCategory;
    }
  }

  let priority: TicketPriority = "medium";
  if (topCategory === "urgent") {
    priority = "urgent";
  } else if (maxScore >= 3) {
    priority = "high";
  } else if (maxScore <= 1) {
    priority = "low";
  }

  return {
    category: topCategory,
    priority,
    department: DEPARTMENT_MAP[topCategory],
    assignedTo: ASSIGNED_TO[topCategory],
    estimatedResolution: RESOLUTION_TIME[topCategory],
    autoResponse: AUTO_RESPONSES[topCategory],
  };
}

export function getCategoryEmoji(category: TicketCategory): string {
  const emojis: Record<TicketCategory, string> = {
    delivery: "📦",
    billing: "💰",
    product_quality: "✨",
    returns: "🔄",
    general: "💬",
    urgent: "⚡",
    technical: "🔧",
  };
  return emojis[category];
}

export function getPriorityColor(priority: TicketPriority): string {
  const colors: Record<TicketPriority, string> = {
    low: "#22c55e",
    medium: "#eab308",
    high: "#f97316",
    urgent: "#ef4444",
  };
  return colors[priority];
}
