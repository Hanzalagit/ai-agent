import data from "@/data/customer-data.json";

export type Faq = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
};

export type Order = {
  id: string;
  customer: string;
  phone_last4: string;
  status: string;
  items: string[];
  total_pkr: number;
  placed: string;
};

export type Ticket = {
  id: string;
  order_id: string;
  subject: string;
  status: string;
  updated: string;
  note: string;
};

const FAQS = data.faqs as Faq[];
const ORDERS = data.orders as Order[];
const TICKETS = data.tickets as Ticket[];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
}

export function answerFaq(question: string): Faq | null {
  const q = normalize(question);
  if (!q) return null;

  let best: { faq: Faq; score: number } | null = null;
  for (const faq of FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.includes(" ") ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { faq, score };
  }
  return best && best.score >= 1 ? best.faq : null;
}

function findOrder(id: string): Order | undefined {
  const clean = normalize(id).replace(/\s+/g, "");
  return ORDERS.find(
    (o) =>
      o.id.toLowerCase() === clean ||
      o.id.replace("ORD-", "").toLowerCase() === clean
  );
}

function findTicket(id: string): Ticket | undefined {
  const clean = normalize(id).replace(/\s+/g, "");
  return TICKETS.find(
    (t) =>
      t.id.toLowerCase() === clean ||
      t.id.replace("TCK-", "").toLowerCase() === clean
  );
}

export function customerLookup(type: string, id: string): Record<string, unknown> {
  const t = type.toLowerCase();

  if (t === "order") {
    const order = findOrder(id);
    if (!order) {
      return {
        found: false,
        message: `No order found for "${id}". Valid IDs look like ORD-1001.`,
      };
    }
    const relatedTickets = TICKETS.filter((tk) => tk.order_id === order.id);
    return {
      found: true,
      order: {
        id: order.id,
        customer: order.customer,
        status: order.status,
        items: order.items,
        total_pkr: order.total_pkr,
        placed: order.placed,
      },
      support_tickets: relatedTickets.map((tk) => ({
        id: tk.id,
        subject: tk.subject,
        status: tk.status,
      })),
    };
  }

  if (t === "ticket") {
    const ticket = findTicket(id);
    if (!ticket) {
      return {
        found: false,
        message: `No ticket found for "${id}". Valid IDs look like TCK-201.`,
      };
    }
    return { found: true, ticket };
  }

  if (t === "customer") {
    const byPhone = ORDERS.find((o) => o.phone_last4 === normalize(id).slice(-4));
    if (!byPhone) {
      return {
        found: false,
        message: `No customer found. Try the last 4 digits of the phone number.`,
      };
    }
    const orders = ORDERS.filter((o) => o.phone_last4 === byPhone.phone_last4);
    return {
      found: true,
      customer: byPhone.customer,
      phone_last4: byPhone.phone_last4,
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        total_pkr: o.total_pkr,
        placed: o.placed,
      })),
    };
  }

  return {
    found: false,
    message: `Unknown lookup type "${type}". Use "order", "ticket" or "customer".`,
  };
}

export function listFaqTopics(): string[] {
  return FAQS.map((f) => f.question);
}
