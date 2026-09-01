import type { ToolDeclaration } from "./types";
import { listKnownApps } from "./local-agent";
import { searchWeb, type SearchResult } from "./search";
import { getWeather, type Weather } from "./weather";
import {
  answerFaq,
  customerLookup,
  listFaqTopics,
} from "./customer";
import {
  isLocalAgentEnabled,
  isShellEnabled,
  openLocalApp,
  openWebsite,
  runShellCommand,
} from "./local-agent";
import {
  isShopifyConfigured,
  shopifyCustomerLookup,
  shopifyOrderLookup,
} from "./shopify";
import { productSearch } from "./products";
import { createOrderRequest } from "./orders";
import { createTicket, findCreatedTicket } from "./tickets";
import { fetchWebpage } from "./webpage";
import { classifyTicket } from "./ticket-router";
import { analyzeSentiment } from "./sentiment";
import { searchKnowledge } from "./knowledge-base";
import { upsertCustomer, addLoyaltyPoints } from "./crm";
import { shouldEscalateToAgent, createHandoff } from "./agent-handoff";
import { trackEvent } from "./analytics";

function isPublicMode(): boolean {
  return process.env.PUBLIC_MODE === "true";
}

const GENERAL_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "fetch_webpage",
    description:
      "Read a specific webpage RIGHT NOW and get its real current text content. Use this whenever the user needs exact real-world details from any website: cinema/movie showtimes, bus/flight schedules, restaurant menus, university notices, prices or listings on ANY site. Pick the best URL (from live search results, or the official domain you know), then call this BEFORE answering. Quote exactly what the page says — times, dates, names.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description: "Full https:// URL of the page to read.",
        },
        what_to_find: {
          type: "STRING",
          description:
            "Optional hint about what info you need, e.g. \"today's movie showtimes at CineStar Lahore\".",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "customer_faq",
    description:
      "FAQ answers for the 'Urban Hive' online store only (its delivery times, returns, payments, timings, location, discounts, authenticity). Use ONLY when the user's question is about that specific store.",
    parameters: {
      type: "OBJECT",
      properties: {
        question: {
          type: "STRING",
          description: "The customer's question, in English or Roman Urdu.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "customer_lookup",
    description:
      "'Urban Hive' store records only: look up its order (ORD-xxxx), support ticket (TCK-xxx) or customer by last 4 digits of phone. Use ONLY for that store's records.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: 'What to look up: "order", "ticket" or "customer".',
          enum: ["order", "ticket", "customer"],
        },
        id: {
          type: "STRING",
          description:
            'The ID to look up, e.g. "ORD-1001", "TCK-201" or last-4 digits "4455".',
        },
      },
      required: ["type", "id"],
    },
  },
  {
    name: "product_search",
    description:
      "Search the 'Urban Hive' product catalog (name, category, shade, price, stock). Use ONLY for that store's products — for any other website's prices/details use fetch_webpage instead. Never invent prices.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            'What the customer is looking for, e.g. "lipstick ruby", "sunscreen", "serum for glow".',
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_order_request",
    description:
      "Create an order request for the 'Urban Hive' store and get a ready WhatsApp order link for the customer. Requires item names (with shade if any), quantity per item, and the customer's name and phone number.",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          description:
            "Items to order. Get exact names/prices from product_search first.",
          items: {
            type: "OBJECT",
            properties: {
              name: {
                type: "STRING",
                description:
                  'Product name incl. shade if chosen, e.g. "Matte Lipstick Ruby".',
              },
              quantity: {
                type: "NUMBER",
                description: "How many units (default 1).",
              },
            },
            required: ["name"],
          },
        },
        customer_name: {
          type: "STRING",
          description: "Customer's full name.",
        },
        phone: {
          type: "STRING",
          description: "Customer's phone number for delivery confirmation.",
        },
        address: {
          type: "STRING",
          description: "Optional delivery address / city.",
        },
      },
      required: ["items", "customer_name", "phone"],
    },
  },
  {
    name: "create_ticket",
    description:
      "File a support/complaint ticket for the 'Urban Hive' store (wrong or damaged item, late delivery, refund request etc.). Returns a ticket ID (TCK-xxx) the team responds to within 24 hours.",
    parameters: {
      type: "OBJECT",
      properties: {
        subject: {
          type: "STRING",
          description:
            'Short summary of the issue, e.g. "Wrong shade received".',
        },
        description: {
          type: "STRING",
          description: "Full details of the complaint in the customer's words.",
        },
        order_id: {
          type: "STRING",
          description: 'Related order ID if known, e.g. "ORD-1001".',
        },
        contact: {
          type: "STRING",
          description: "Customer's phone/WhatsApp so the team can reach them.",
        },
      },
      required: ["subject"],
    },
  },
];

const ADVANCED_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "search_knowledge_base",
    description:
      "Search the Urban Hive knowledge base for detailed product guides, policies, ingredient info, skincare routines, and more. Use this when FAQ doesn't have the answer but we might have detailed documentation.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "What to search for, e.g. 'vitamin c serum benefits', 'return policy details', 'wedding makeup guide'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_sentiment",
    description:
      "Analyze the sentiment and emotions of a customer message. Use this to understand how the customer is feeling - happy, frustrated, angry, etc. Useful for adjusting your response tone.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: {
          type: "STRING",
          description: "The customer message to analyze for sentiment.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "route_ticket",
    description:
      "File a support ticket AND auto-route it to the right department (delivery, billing, product quality, returns, technical). Returns routing info including department, priority, and estimated resolution time.",
    parameters: {
      type: "OBJECT",
      properties: {
        subject: {
          type: "STRING",
          description: 'Short summary of the issue, e.g. "Wrong shade received".',
        },
        description: {
          type: "STRING",
          description: "Full details of the complaint.",
        },
        order_id: {
          type: "STRING",
          description: 'Related order ID if known, e.g. "ORD-1001".',
        },
        contact: {
          type: "STRING",
          description: "Customer phone/WhatsApp.",
        },
      },
      required: ["subject"],
    },
  },
  {
    name: "escalate_to_agent",
    description:
      "Escalate the conversation to a human agent when the AI cannot resolve the issue. Use when: customer explicitly asks for a human, sentiment is very negative, or complex issues that need human intervention.",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "Why this needs human intervention.",
        },
        urgency: {
          type: "STRING",
          description: "How urgent: low, medium, or high.",
          enum: ["low", "medium", "high"],
        },
        context: {
          type: "STRING",
          description: "Summary of what happened so far for the human agent.",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "add_loyalty_points",
    description:
      "Reward a customer with loyalty points for purchases, referrals, or positive feedback. Points can be redeemed for discounts.",
    parameters: {
      type: "OBJECT",
      properties: {
        phone: {
          type: "STRING",
          description: "Customer phone number.",
        },
        points: {
          type: "NUMBER",
          description: "Number of points to award.",
        },
        reason: {
          type: "STRING",
          description: "Why the points are being awarded.",
        },
      },
      required: ["phone", "points"],
    },
  },
];

const PC_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "run_command",
    description:
      "Run a Windows Command Prompt (cmd) command on this PC and return its output. Use for system tasks: file/folder listing, ipconfig, tasklist, ping, running scripts, git status in the project folder etc. Prefer safe read-only commands. Destructive commands are blocked automatically. 30s timeout.",
    parameters: {
      type: "OBJECT",
      properties: {
        command: {
          type: "STRING",
          description:
            'The cmd command to run, e.g. "dir", "ipconfig", "tasklist | findstr chrome".',
        },
        working_directory: {
          type: "STRING",
          description:
            "Optional absolute folder path to run the command in. Defaults to the project folder.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "open_website",
    description:
      "Open a website/URL in the default browser of this PC immediately (YouTube, Google, Maps, wa.me WhatsApp links etc.). Call this whenever the user asks to open/play/show any website or send a WhatsApp message.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description:
            "Full URL to open. For WhatsApp use https://wa.me/<number>?text=<url-encoded message>.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "open_local_app",
    description:
      "Open a whitelisted application directly on this PC (Windows). Use only when the user asks to open/launch an installed program like notepad, calculator, chrome, vscode, spotify, whatsapp desktop etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        app: {
          type: "STRING",
          description: `Name of the app to launch. Known apps: ${listKnownApps().join(", ")}.`,
        },
      },
      required: ["app"],
    },
  },
];

export function getToolDeclarations(): ToolDeclaration[] {
  return isPublicMode()
    ? [...GENERAL_TOOL_DECLARATIONS, ...ADVANCED_TOOL_DECLARATIONS]
    : [...GENERAL_TOOL_DECLARATIONS, ...ADVANCED_TOOL_DECLARATIONS, ...PC_TOOL_DECLARATIONS];
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case "customer_faq": {
      const question = String(args.question ?? "");
      const faq = answerFaq(question);
      if (!faq) {
        return {
          found: false,
          known_topics: listFaqTopics(),
          message:
            "No matching FAQ entry. Tell the user honestly and offer to connect them to the team.",
        };
      }
      return { found: true, faq_question: faq.question, answer: faq.answer };
    }

    case "customer_lookup": {
      const lookupType = String(args.type ?? "");
      const lookupId = String(args.id ?? "");

      if (lookupType === "ticket") {
        const createdTicket = findCreatedTicket(lookupId);
        if (createdTicket) {
          return { found: true, ticket: createdTicket };
        }
      }

      if (lookupType === "order") {
        const shopifyOrder = await shopifyOrderLookup(lookupId);
        if (shopifyOrder) return shopifyOrder;
      } else if (lookupType === "customer") {
        const shopifyCustomer = await shopifyCustomerLookup(lookupId);
        if (shopifyCustomer) return shopifyCustomer;
      }

      const localResult = customerLookup(lookupType, lookupId) as Record<
        string,
        unknown
      >;
      if (
        (lookupType === "order" || lookupType === "customer") &&
        !isShopifyConfigured() &&
        localResult.found
      ) {
        return {
          ...localResult,
          demo_data: true,
          message:
            "This is DEMO sample data — Shopify is not connected yet. Tell the user these are placeholder records; connect SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN in .env.local for live orders.",
        };
      }
      return localResult;
    }

    case "fetch_webpage": {
      return fetchWebpage(String(args.url ?? ""));
    }

    case "product_search": {
      return productSearch(String(args.query ?? ""));
    }

    case "create_order_request": {
      const rawItems = Array.isArray(args.items) ? args.items : [];
      const items = rawItems
        .map((item) => {
          const obj = (item ?? {}) as Record<string, unknown>;
          return {
            name: String(obj.name ?? "").trim(),
            quantity: Number(obj.quantity ?? 1) || 1,
          };
        })
        .filter((item) => item.name.length > 0);
      if (items.length === 0) {
        return {
          ok: false,
          error: "No items provided. Ask the customer which products they want.",
        };
      }
      const customerName = String(args.customer_name ?? "").trim();
      const phone = String(args.phone ?? "").trim();
      if (!customerName || !phone) {
        return {
          ok: false,
          error:
            "customer_name and phone are required. Ask the customer for their name and phone number first.",
        };
      }
      return createOrderRequest({
        items,
        customer_name: customerName,
        phone,
        address: args.address ? String(args.address).trim() : undefined,
      });
    }

    case "create_ticket": {
      const subject = String(args.subject ?? "").trim();
      if (!subject) {
        return {
          ok: false,
          error: "subject is required — briefly summarise the complaint.",
        };
      }
      const ticket = createTicket({
        subject,
        description: String(args.description ?? "").trim() || undefined,
        order_id: String(args.order_id ?? "").trim() || undefined,
        contact: String(args.contact ?? "").trim() || undefined,
      });
      return {
        ok: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
        },
        message:
          "Tell the user their ticket ID and that the team will contact them within 24 hours (Mon–Sat, 10am–8pm), usually on WhatsApp.",
      };
    }

    case "run_command": {
      if (isPublicMode()) {
        return {
          ok: false,
          output: "Blocked in public mode — shell access is disabled.",
        };
      }
      if (!isShellEnabled()) {
        return {
          ok: false,
          command: String(args.command ?? ""),
          exitCode: null,
          output:
            "Shell commands are disabled by ENABLE_SHELL_COMMANDS=false or LOCAL_AGENT_ENABLED=false.",
        };
      }
      return runShellCommand(
        String(args.command ?? ""),
        args.working_directory ? String(args.working_directory) : undefined
      );
    }

    case "open_website": {
      if (isPublicMode()) {
        return {
          ok: false,
          message:
            "Blocked in public mode. Instead, end your reply with an [OPEN:Label|url] action token so the user gets a button.",
        };
      }
      if (!isLocalAgentEnabled()) {
        return {
          ok: false,
          message:
            "Opening websites on the PC is disabled by LOCAL_AGENT_ENABLED=false. Ask the user to use the link button instead.",
        };
      }
      return openWebsite(String(args.url ?? ""));
    }

    case "open_local_app": {
      if (isPublicMode()) {
        return {
          ok: false,
          message: "Blocked in public mode — app launching is disabled.",
        };
      }
      if (!isLocalAgentEnabled()) {
        return {
          ok: false,
          message:
            "Local app launching is disabled by LOCAL_AGENT_ENABLED=false.",
        };
      }
      return openLocalApp(String(args.app ?? ""));
    }

    case "search_knowledge_base": {
      const query = String(args.query ?? "");
      const results = searchKnowledge(query);
      if (results.length === 0) {
        return {
          found: false,
          message: "No knowledge base entries found for this query.",
        };
      }
      return {
        found: true,
        entries: results.map((e) => ({
          title: e.title,
          content: e.content,
          category: e.category,
        })),
      };
    }

    case "analyze_sentiment": {
      const message = String(args.message ?? "");
      const sentiment = analyzeSentiment(message);
      trackEvent({ type: "sentiment", data: { ...sentiment, source: "tool" } });
      return sentiment;
    }

    case "route_ticket": {
      const subject = String(args.subject ?? "").trim();
      if (!subject) {
        return { ok: false, error: "subject is required." };
      }
      const routing = classifyTicket(subject, String(args.description ?? ""));
      const ticket = createTicket({
        subject,
        description: String(args.description ?? "").trim() || undefined,
        order_id: String(args.order_id ?? "").trim() || undefined,
        contact: String(args.contact ?? "").trim() || undefined,
      });
      trackEvent({
        type: "ticket_created",
        data: { category: routing.category, priority: routing.priority },
      });
      return {
        ok: true,
        ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status },
        routing: {
          category: routing.category,
          priority: routing.priority,
          department: routing.department,
          assignedTo: routing.assignedTo,
          estimatedResolution: routing.estimatedResolution,
        },
        autoResponse: routing.autoResponse,
      };
    }

    case "escalate_to_agent": {
      const reason = String(args.reason ?? "");
      const urgency = (String(args.urgency ?? "medium") as "low" | "medium" | "high") || "medium";
      const context = String(args.context ?? "");
      const handoff = createHandoff({
        sessionId: "manual",
        customerName: "Customer",
        reason,
        urgency,
        context,
      });
      trackEvent({ type: "message", data: { intent: "escalation", urgency } });
      return {
        ok: true,
        handoffId: handoff.id,
        message: "Conversation has been escalated to a human agent. They will connect shortly.",
      };
    }

    case "add_loyalty_points": {
      const phone = String(args.phone ?? "");
      const points = Number(args.points ?? 0);
      if (!phone || points <= 0) {
        return { ok: false, error: "phone and positive points are required." };
      }
      addLoyaltyPoints(phone, points);
      upsertCustomer({
        phone,
        interaction: {
          id: `INT-${Date.now()}`,
          type: "chat",
          summary: `Awarded ${points} loyalty points: ${String(args.reason ?? "reward")}`,
          timestamp: new Date().toISOString(),
        },
      });
      return {
        ok: true,
        message: `Awarded ${points} loyalty points to ${phone}.`,
      };
    }

    default:
      return { error: `Unknown function "${name}".` };
  }
}

export async function performSearch(
  query: string
): Promise<SearchResult[]> {
  if (process.env.ENABLE_LIVE_SEARCH !== "true") {
    return [];
  }
  return searchWeb(query);
}

export async function performWeather(
  query: string
): Promise<Weather | null> {
  if (
    /\b(weather|temperature|mausam|forecast|weatherkaisa)\b/i.test(query)
  ) {
    return getWeather(query);
  }
  return null;
}
