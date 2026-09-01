import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  verifyToken: string;
  apiVersion: string;
};

export type WhatsAppMessage = {
  messaging_product: string;
  to: string;
  type: "text" | "template" | "image" | "document";
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  image?: { link: string };
  document?: { link: string; filename: string };
};

export type WhatsAppWebhookEntry = {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type: string; caption?: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
};

export function getWhatsAppConfig(tenantId: string): WhatsAppConfig | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT config FROM integrations 
    WHERE organization_id = ? AND provider = 'whatsapp' AND status = 'active'
  `).get(tenantId) as any;

  if (!row) return null;

  const config = JSON.parse(row.config);
  return {
    phoneNumberId: config.phoneNumberId || "",
    accessToken: config.accessToken || "",
    businessAccountId: config.businessAccountId || "",
    verifyToken: config.verifyToken || "",
    apiVersion: config.apiVersion || "v21.0",
  };
}

export function saveWhatsAppConfig(
  tenantId: string,
  config: Partial<WhatsAppConfig>
): void {
  const db = getDb();
  const existing = db.prepare(`
    SELECT id FROM integrations 
    WHERE organization_id = ? AND provider = 'whatsapp'
  `).get(tenantId) as any;

  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE integrations SET config = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(config), now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO integrations (id, organization_id, provider, status, config, created_at, updated_at)
      VALUES (?, ?, 'whatsapp', 'active', ?, ?, ?)
    `).run(generateId("INT"), tenantId, JSON.stringify(config), now, now);
  }
}

export async function sendWhatsAppMessage(
  tenantId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig(tenantId);
  if (!config) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to send message",
      };
    }

    logMessage(tenantId, to, "outgoing", message, data.messages?.[0]?.id);

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function sendWhatsAppTemplate(
  tenantId: string,
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  components?: any[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig(tenantId);
  if (!config) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components || [],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to send template",
      };
    }

    logMessage(tenantId, to, "outgoing", `[Template: ${templateName}]`, data.messages?.[0]?.id);

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function sendWhatsAppImage(
  tenantId: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig(tenantId);
  if (!config) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "image",
          image: {
            link: imageUrl,
            ...(caption ? { caption } : {}),
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to send image",
      };
    }

    logMessage(tenantId, to, "outgoing", caption || "[Image]", data.messages?.[0]?.id);

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string,
  verifyToken: string
): string | null {
  if (mode === "subscribe" && token === verifyToken) {
    return challenge;
  }
  return null;
}

export function processWebhookMessage(
  tenantId: string,
  entry: WhatsAppWebhookEntry
): Array<{
  from: string;
  message: string;
  type: string;
  messageId: string;
}> {
  const messages: Array<{
    from: string;
    message: string;
    type: string;
    messageId: string;
  }> = [];

  for (const change of entry.changes) {
    if (change.field !== "messages") continue;

    const value = change.value;

    if (value.messages) {
      for (const msg of value.messages) {
        let messageContent = "";

        if (msg.type === "text" && msg.text) {
          messageContent = msg.text.body;
        } else if (msg.type === "image" && msg.image) {
          messageContent = msg.image.caption || "[Image received]";
        } else {
          messageContent = `[${msg.type} received]`;
        }

        messages.push({
          from: msg.from,
          message: messageContent,
          type: msg.type,
          messageId: msg.id,
        });

        logMessage(tenantId, msg.from, "incoming", messageContent, msg.id);

        updateContactFromMessage(tenantId, msg.from, value.contacts?.[0]?.profile?.name);
      }
    }

    if (value.statuses) {
      for (const status of value.statuses) {
        updateMessageStatus(tenantId, status.id, status.status);
      }
    }
  }

  return messages;
}

function logMessage(
  tenantId: string,
  phone: string,
  direction: "incoming" | "outgoing",
  content: string,
  externalId?: string
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, organization_id, action, target_type, target_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId("LOG"),
    tenantId,
    `whatsapp_${direction}`,
    "message",
    externalId || null,
    JSON.stringify({ phone, content: content.slice(0, 500), direction }),
    now
  );
}

function updateMessageStatus(tenantId: string, externalId: string, status: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE audit_logs SET metadata = json_set(metadata, '$.status', ?)
    WHERE organization_id = ? AND target_id = ? AND action LIKE 'whatsapp_%'
  `).run(status, tenantId, externalId);
}

function updateContactFromMessage(
  tenantId: string,
  phone: string,
  name?: string
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare(`
    SELECT id FROM contacts WHERE organization_id = ? AND phone = ?
  `).get(tenantId, phone) as any;

  if (existing) {
    db.prepare(`
      UPDATE contacts SET updated_at = ? WHERE id = ?
    `).run(now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO contacts (id, organization_id, name, phone, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId("CTX"),
      tenantId,
      name || `WhatsApp User`,
      phone,
      JSON.stringify({ source: "whatsapp" }),
      now,
      now
    );
  }
}

export async function broadcastWhatsAppMessage(
  tenantId: string,
  recipients: string[],
  message: string
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage(tenantId, recipient, message);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient}: ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, failed, errors };
}

export async function getWhatsAppTemplates(
  tenantId: string
): Promise<Array<{ name: string; status: string; category: string }>> {
  const config = getWhatsAppConfig(tenantId);
  if (!config) return [];

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}
