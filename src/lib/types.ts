import { z } from "zod";

// ============= API Request/Response Types =============

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  image: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============= Gemini Types =============

export type GeminiPart = Record<string, unknown>;

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type StreamRoundResult = {
  parts: GeminiPart[];
};

// ============= Tool Types =============

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, unknown>;
    required: string[];
  };
};

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

// ============= Search/Weather Types =============

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type Weather = {
  city: string;
  dateStr: string;
  tempC: number;
  windKmh: number;
  condition: string;
};

// ============= Product Types =============

export type Product = {
  id: string;
  name: string;
  category: string;
  shades: string[];
  pricePKR: number;
  stock: "in_stock" | "low_stock" | "out_of_stock";
  description: string;
};

export type ProductSearchResult = {
  found: boolean;
  products: Product[];
  query: string;
};

// ============= Order Types =============

export type OrderItem = {
  name: string;
  quantity: number;
};

export type OrderRequest = {
  items: OrderItem[];
  customer_name: string;
  phone: string;
  address?: string;
};

export type OrderResult = {
  ok: boolean;
  order_url?: string;
  message?: string;
  error?: string;
};

// ============= Ticket Types =============

export type Ticket = {
  id: string;
  subject: string;
  description?: string;
  order_id?: string;
  contact?: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  messages: Array<{
    role: "customer" | "agent";
    content: string;
    timestamp: string;
  }>;
};

export type CreateTicketInput = {
  subject: string;
  description?: string;
  order_id?: string;
  contact?: string;
};

// ============= Session Types =============

export type Session = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  summary?: string;
};

// ============= Intent Types =============

export type IntentType =
  | "product_query"
  | "order_status"
  | "complaint"
  | "faq"
  | "web_search"
  | "general"
  | "weather"
  | "pc_control";

export type ClassifiedIntent = {
  type: IntentType;
  confidence: number;
  entities: Record<string, string>;
};
