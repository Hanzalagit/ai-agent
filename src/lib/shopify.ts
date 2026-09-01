/**
 * Live order/customer lookups via the Shopify Admin REST API.
 * Configure with SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN.
 * If not configured (or on error), callers fall back to local demo data.
 */

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

export function isShopifyConfigured(): boolean {
  return Boolean(DOMAIN && TOKEN);
}

async function shopifyFetch<T>(path: string): Promise<T> {
  const url = `https://${DOMAIN}/admin/api/${VERSION}/${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": TOKEN as string,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Shopify API ${res.status}: ${(await res.text()).slice(0, 200)}`
    );
  }
  return res.json() as Promise<T>;
}

function extractDigits(text: string): string {
  return String(text).replace(/\D/g, "");
}

type ShopifyLineItem = {
  title?: string;
  quantity?: number;
  variant_title?: string | null;
};

type ShopifyFulfillment = {
  status?: string | null;
  tracking_number?: string | null;
};

type ShopifyOrder = {
  id: number;
  order_number?: number;
  name?: string;
  created_at?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  total_price?: string;
  currency?: string;
  note?: string | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  phone?: string | null;
  email?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  line_items?: ShopifyLineItem[];
  fulfillments?: ShopifyFulfillment[] | null;
};

function mapOrder(o: ShopifyOrder): Record<string, unknown> {
  const tracking = o.fulfillments?.find((f) => f.tracking_number);

  let status = "";
  if (o.cancelled_at) status = "Cancelled";
  else if (
    o.financial_status === "paid" &&
    o.fulfillment_status === "delivered"
  )
    status = "Delivered";
  else if (o.financial_status === "paid" && o.fulfillment_status === "fulfilled")
    status = "Shipped";
  else if (o.financial_status === "paid" && o.fulfillment_status === null)
    status = "Paid – processing";
  else if (o.financial_status === "pending") status = "Payment pending";
  else status = `${o.financial_status ?? "?"} / ${o.fulfillment_status ?? "unfulfilled"}`;

  return {
    id: o.name ?? `#${o.order_number ?? o.id}`,
    customer: o.customer
      ? `${o.customer.first_name ?? ""} ${o.customer.last_name ?? ""}`.trim()
      : o.email
        ? o.email
        : "Guest",
    phone_last4: extractDigits(
      o.phone || o.customer?.phone || ""
    ).slice(-4),
    status,
    payment: o.financial_status ?? null,
    fulfillment: o.fulfillment_status ?? "unfulfilled",
    items: (o.line_items ?? []).map((li) => ({
      title: li.title,
      quantity: li.quantity ?? 1,
      variant: li.variant_title ?? null,
    })),
    total: `${o.currency ?? ""} ${o.total_price ?? "?"}`.trim(),
    placed: o.created_at?.slice(0, 10) ?? null,
    tracking_number: tracking?.tracking_number ?? null,
    note: o.note ?? null,
  };
}

/** Look up an order by any human form: "ORD-1001", "#1001", "1001". */
export async function shopifyOrderLookup(
  rawId: string
): Promise<Record<string, unknown> | null> {
  const digits = extractDigits(rawId);
  if (!digits || !isShopifyConfigured()) return null;

  try {
    const exact = await shopifyFetch<{ orders?: ShopifyOrder[] }>(
      `orders.json?name=${encodeURIComponent("#" + digits)}&status=any&limit=5`
    );
    let orders = exact.orders ?? [];

    if (orders.length === 0) {
      const recent = await shopifyFetch<{ orders?: ShopifyOrder[] }>(
        `orders.json?status=any&limit=25&order=created_at%20desc`
      );
      orders = (recent.orders ?? []).filter(
        (o) =>
          String(o.order_number ?? "") === digits ||
          String(o.name ?? "").replace(/\D/g, "") === digits
      );
    }

    if (orders.length === 0) return null;

    const [o] = orders;
    const mapped = mapOrder(o);
    const tickets = (o.note ?? "")
      ? [{ subject: "Order note", note: o.note }]
      : [];
    return { found: true, source: "shopify", order: mapped, support_tickets: tickets };
  } catch (err) {
    console.error("Shopify order lookup failed:", err);
    return null;
  }
}

/** Find a customer by the last 4 digits of their phone, then their orders. */
export async function shopifyCustomerLookup(
  rawPhone: string
): Promise<Record<string, unknown> | null> {
  const digits = extractDigits(rawPhone);
  if (!digits || !isShopifyConfigured()) return null;

  try {
    const search = await shopifyFetch<{ customers?: ShopifyOrder["customer"][] }>(
      `customers/search.json?query=${encodeURIComponent(digits)}`
    );
    const matches = (search.customers ?? []).filter((c) =>
      extractDigits(c?.phone ?? "").endsWith(digits.slice(-4))
    );
    if (matches.length === 0) return null;

    const [c] = matches;
    const customerId = (c as unknown as { id?: number })?.id;
    let orders: Record<string, unknown>[] = [];

    if (customerId) {
      const co = await shopifyFetch<{ orders?: ShopifyOrder[] }>(
        `orders.json?customer_id=${customerId}&status=any&limit=10&order=created_at%20desc`
      );
      orders = (co.orders ?? []).map(mapOrder);
    }

    return {
      found: true,
      source: "shopify",
      customer:
        `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "Unknown",
      phone_last4: digits.slice(-4),
      orders,
    };
  } catch (err) {
    console.error("Shopify customer lookup failed:", err);
    return null;
  }
}
