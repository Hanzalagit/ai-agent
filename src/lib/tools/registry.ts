// ============================================
// TOOL REGISTRY
// Central source of truth for all agent tools
// ============================================

export type ToolRiskLevel = 0 | 1 | 2 | 3 | 4;

export type ToolCategory =
  | "search"
  | "commerce"
  | "communication"
  | "productivity"
  | "developer"
  | "marketing"
  | "browser"
  | "local"
  | "media"
  | "finance"
  | "storage"
  | "automation";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  scopes: string[];
  supportsDryRun: boolean;
  timeout: number; // ms
  idempotent: boolean;
  enabled: boolean;
  parameters?: Record<string, any>; // JSON Schema for parameters
}

// ============================================
// TOOL RISK LEVELS
// ============================================
// Level 0 — Read only (search, weather, KB lookup)
// Level 1 — Reversible (create draft, add CRM note)
// Level 2 — External communication (send email, WhatsApp, publish post)
// Level 3 — Financial/destructive (purchase, refund, delete data, execute shell)
// Level 4 — Forbidden/unsupported (credentials theft, bypass security)

// ============================================
// TOOL DEFINITIONS
// ============================================

export const TOOL_REGISTRY: ToolDefinition[] = [
  // SEARCH TOOLS
  {
    id: "web.search",
    name: "Web Search",
    description: "Search the web for information",
    category: "search",
    riskLevel: 0,
    scopes: [],
    supportsDryRun: false,
    timeout: 10_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "weather.get",
    name: "Weather",
    description: "Get current weather for a location",
    category: "search",
    riskLevel: 0,
    scopes: [],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "webpage.fetch",
    name: "Fetch Webpage",
    description: "Fetch and read content from a URL",
    category: "search",
    riskLevel: 0,
    scopes: [],
    supportsDryRun: false,
    timeout: 15_000,
    idempotent: true,
    enabled: true,
  },

  // COMMERCE TOOLS
  {
    id: "shopify.search_products",
    name: "Search Products",
    description: "Search products in Shopify store",
    category: "commerce",
    riskLevel: 0,
    scopes: ["shopify.read"],
    supportsDryRun: false,
    timeout: 10_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "shopify.get_order",
    name: "Get Order",
    description: "Get order details from Shopify",
    category: "commerce",
    riskLevel: 0,
    scopes: ["shopify.read"],
    supportsDryRun: false,
    timeout: 10_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "shopify.create_order",
    name: "Create Order",
    description: "Create a draft order in Shopify",
    category: "commerce",
    riskLevel: 1,
    scopes: ["shopify.write"],
    supportsDryRun: true,
    timeout: 15_000,
    idempotent: false,
    enabled: true,
  },
  {
    id: "shopify.refund",
    name: "Refund Order",
    description: "Process a refund in Shopify",
    category: "commerce",
    riskLevel: 3,
    scopes: ["shopify.write", "orders.refund"],
    supportsDryRun: true,
    timeout: 15_000,
    idempotent: true,
    enabled: true,
  },

  // COMMUNICATION TOOLS
  {
    id: "whatsapp.send",
    name: "Send WhatsApp",
    description: "Send a WhatsApp message",
    category: "communication",
    riskLevel: 2,
    scopes: ["whatsapp.send"],
    supportsDryRun: true,
    timeout: 10_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "email.send",
    name: "Send Email",
    description: "Send an email",
    category: "communication",
    riskLevel: 2,
    scopes: ["email.send"],
    supportsDryRun: true,
    timeout: 10_000,
    idempotent: true,
    enabled: true,
  },

  // PRODUCTIVITY TOOLS
  {
    id: "crm.add_contact",
    name: "Add Contact",
    description: "Add a contact to CRM",
    category: "productivity",
    riskLevel: 1,
    scopes: ["crm.write"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: false,
    enabled: true,
  },
  {
    id: "crm.update_contact",
    name: "Update Contact",
    description: "Update a CRM contact",
    category: "productivity",
    riskLevel: 1,
    scopes: ["crm.write"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "ticket.create",
    name: "Create Ticket",
    description: "Create a support ticket",
    category: "productivity",
    riskLevel: 1,
    scopes: ["ticket.write"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: false,
    enabled: true,
  },
  {
    id: "ticket.update",
    name: "Update Ticket",
    description: "Update a support ticket",
    category: "productivity",
    riskLevel: 1,
    scopes: ["ticket.write"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: true,
    enabled: true,
  },

  // BROWSER TOOLS
  {
    id: "open.website",
    name: "Open Website",
    description: "Open a website in the default browser",
    category: "browser",
    riskLevel: 1,
    scopes: [],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: false,
    enabled: true,
  },
  {
    id: "open.app",
    name: "Open App",
    description: "Open a local application",
    category: "local",
    riskLevel: 2,
    scopes: ["local.execute"],
    supportsDryRun: false,
    timeout: 10_000,
    idempotent: false,
    enabled: true,
  },

  // DEVELOPER TOOLS
  {
    id: "shell.execute",
    name: "Execute Shell Command",
    description: "Execute a shell command on the server",
    category: "developer",
    riskLevel: 3,
    scopes: ["developer.shell"],
    supportsDryRun: true,
    timeout: 30_000,
    idempotent: false,
    enabled: true,
  },

  // MEDIA TOOLS
  {
    id: "image.generate",
    name: "Generate Image",
    description: "Generate an image from text",
    category: "media",
    riskLevel: 1,
    scopes: ["media.generate"],
    supportsDryRun: false,
    timeout: 60_000,
    idempotent: false,
    enabled: true,
  },
  {
    id: "image.edit",
    name: "Edit Image",
    description: "Edit an existing image",
    category: "media",
    riskLevel: 1,
    scopes: ["media.generate"],
    supportsDryRun: false,
    timeout: 60_000,
    idempotent: false,
    enabled: true,
  },

  // KNOWLEDGE TOOLS
  {
    id: "knowledge.search",
    name: "Search Knowledge",
    description: "Search the knowledge base",
    category: "search",
    riskLevel: 0,
    scopes: ["knowledge.read"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: true,
    enabled: true,
  },
  {
    id: "knowledge.add",
    name: "Add Knowledge",
    description: "Add entry to knowledge base",
    category: "productivity",
    riskLevel: 1,
    scopes: ["knowledge.write"],
    supportsDryRun: false,
    timeout: 5_000,
    idempotent: false,
    enabled: true,
  },
];

// ============================================
// TOOL REGISTRY FUNCTIONS
// ============================================

export function getToolById(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === toolId);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export function getToolsByRiskLevel(riskLevel: ToolRiskLevel): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.riskLevel === riskLevel);
}

export function getEnabledTools(): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.enabled);
}

export function getToolsForAgent(agentToolIds: string[]): ToolDefinition[] {
  return TOOL_REGISTRY.filter(
    (tool) => tool.enabled && agentToolIds.includes(tool.id)
  );
}

export function getToolRiskDescription(level: ToolRiskLevel): string {
  const descriptions: Record<ToolRiskLevel, string> = {
    0: "Read-only — Safe to auto-execute",
    1: "Reversible — Low risk, may auto-execute",
    2: "External communication — Requires confirmation by default",
    3: "Financial/Destructive — Requires explicit confirmation + re-auth",
    4: "Forbidden — Blocked entirely",
  };
  return descriptions[level];
}

export function requiresApproval(tool: ToolDefinition): boolean {
  return tool.riskLevel >= 2;
}

export function canAutoExecute(tool: ToolDefinition): boolean {
  return tool.riskLevel <= 1;
}
