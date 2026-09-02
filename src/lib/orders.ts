import demoData from "@/data/customer-data.json";
import { findProductByName } from "./products";
import { sendEmail, generateOrderConfirmationEmail } from "./email";

export type OrderRequestItem = {
  name: string;
  quantity: number;
};

export function createOrderRequest(input: {
  items: OrderRequestItem[];
  customer_name: string;
  phone: string;
  email?: string;
  address?: string;
  tenantId?: string;
}): Record<string, unknown> {
  const business = demoData.business as { name: string; whatsapp: string };

  const lines: string[] = [];
  let knownTotal = 0;
  let hasUnknownPrice = false;

  for (const item of input.items) {
    const product = findProductByName(item.name);
    if (product) {
      const qty = Math.max(1, Math.min(99, item.quantity));
      knownTotal += product.price_pkr * qty;
      const shade = item.name.toLowerCase().includes(product.name.toLowerCase())
        ? ""
        : ` (${item.name.replace(new RegExp(product.name, "i"), "").trim()})`;
      lines.push(`• ${product.name}${shade} x${qty} — PKR ${(product.price_pkr * qty).toLocaleString("en-PK")}`);
      if (product.stock === "out_of_stock") {
        return {
          ok: false,
          error: `${product.name} is out of stock. Apologise and suggest alternatives from the catalog.`,
        };
      }
    } else {
      hasUnknownPrice = true;
      lines.push(`• ${item.name} x${item.quantity} — (price to confirm)`);
    }
  }

  const message = [
    `Assalam o Alaikum! New order request from the website assistant:`,
    "",
    ...lines,
    "",
    hasUnknownPrice
      ? `Estimated total: PKR ${knownTotal.toLocaleString("en-PK")} + items pending confirmation`
      : `Estimated total: PKR ${knownTotal.toLocaleString("en-PK")}`,
    "",
    `Name: ${input.customer_name}`,
    `Phone: ${input.phone}`,
    input.address ? `Address: ${input.address}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const whatsappUrl = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;

  if (input.email && input.tenantId) {
    const orderItems = input.items.map((item) => {
      const product = findProductByName(item.name);
      return {
        name: item.name,
        quantity: item.quantity,
        price: product?.price_pkr || 0,
      };
    });

    const emailMsg = generateOrderConfirmationEmail(
      `ORD-${Date.now()}`,
      orderItems,
      knownTotal
    );
    emailMsg.to = input.email;

    sendEmail(input.tenantId, emailMsg).catch((err) =>
      console.error("Failed to send order confirmation email:", err)
    );
  }

  return {
    ok: true,
    order_lines: lines,
    estimated_total_pkr: knownTotal,
    whatsapp_url: whatsappUrl,
    instruction:
      "Show the user a short confirmation of their order request, then ALWAYS end your reply with this exact action token so they get a one-tap button: [OPEN:Order on WhatsApp|<whatsapp_url>]. Never claim the order was placed automatically — it is sent via WhatsApp for confirmation.",
  };
}
