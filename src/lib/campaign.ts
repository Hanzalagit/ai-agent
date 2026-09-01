import crypto from "node:crypto";
import { getDb } from "./db/client";
import { sendWhatsAppMessage, broadcastWhatsAppMessage } from "./whatsapp";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================
// TYPES
// ============================================

export type Campaign = {
  id: string;
  name: string;
  type: "whatsapp" | "email" | "sms";
  message: string;
  targetAudience: "all" | "vip" | "new" | "inactive" | "custom";
  customPhones?: string[];
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  template?: string;
};

// ============================================
// CRUD OPERATIONS
// ============================================

export function createCampaign(input: {
  name: string;
  type?: Campaign["type"];
  message: string;
  targetAudience: Campaign["targetAudience"];
  customPhones?: string[];
  scheduledAt?: string;
}): Campaign {
  const db = getDb();
  const id = generateId("CMP");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO campaigns (id, organization_id, name, type, status, content, audience, scheduled_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.type || "whatsapp",
    input.name,
    input.type || "whatsapp",
    input.scheduledAt ? "scheduled" : "draft",
    input.message,
    JSON.stringify({
      targetAudience: input.targetAudience,
      customPhones: input.customPhones || [],
    }),
    input.scheduledAt || null,
    now,
    now
  );

  return {
    id,
    name: input.name,
    type: input.type || "whatsapp",
    message: input.message,
    targetAudience: input.targetAudience,
    customPhones: input.customPhones,
    status: input.scheduledAt ? "scheduled" : "draft",
    scheduledAt: input.scheduledAt,
    sentCount: 0,
    failedCount: 0,
    createdAt: now,
  };
}

export function getAllCampaigns(tenantId: string): Campaign[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM campaigns WHERE organization_id = ? ORDER BY created_at DESC"
  ).all(tenantId) as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    message: row.content,
    targetAudience: JSON.parse(row.audience || "{}").targetAudience || "all",
    customPhones: JSON.parse(row.audience || "{}").customPhones || [],
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    sentCount: 0,
    failedCount: 0,
    createdAt: row.created_at,
  }));
}

export function getCampaignById(tenantId: string, id: string): Campaign | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND organization_id = ?"
  ).get(id, tenantId) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    message: row.content,
    targetAudience: JSON.parse(row.audience || "{}").targetAudience || "all",
    customPhones: JSON.parse(row.audience || "{}").customPhones || [],
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    sentCount: 0,
    failedCount: 0,
    createdAt: row.created_at,
  };
}

export function updateCampaignStatus(
  tenantId: string,
  id: string,
  status: Campaign["status"],
  sentCount?: number,
  failedCount?: number
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns SET status = ?, sent_at = ?, updated_at = ? WHERE id = ? AND organization_id = ?
  `).run(
    status,
    status === "sent" ? now : null,
    now,
    id,
    tenantId
  );
}

// ============================================
// CAMPAIGN EXECUTION
// ============================================

export async function executeCampaign(
  tenantId: string,
  campaignId: string
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const campaign = getCampaignById(tenantId, campaignId);
  if (!campaign) {
    return { success: false, sent: 0, failed: 0, errors: ["Campaign not found"] };
  }

  // Update status to sending
  updateCampaignStatus(tenantId, campaignId, "sending");

  // Get recipients based on target audience
  const recipients = await getRecipients(tenantId, campaign.targetAudience, campaign.customPhones);

  if (recipients.length === 0) {
    updateCampaignStatus(tenantId, campaignId, "failed");
    return { success: false, sent: 0, failed: 0, errors: ["No recipients found"] };
  }

  // Send messages
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage(tenantId, recipient, campaign.message);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient}: ${result.error}`);
    }

    // Log campaign run
    logCampaignRun(tenantId, campaignId, recipient, result.success ? "sent" : "failed", result.error);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Update campaign status
  updateCampaignStatus(tenantId, campaignId, "sent", sent, failed);

  return { success: true, sent, failed, errors };
}

async function getRecipients(
  tenantId: string,
  targetAudience: Campaign["targetAudience"],
  customPhones?: string[]
): Promise<string[]> {
  const db = getDb();

  if (targetAudience === "custom" && customPhones) {
    return customPhones;
  }

  // Get all contacts with phone numbers
  const rows = db.prepare(`
    SELECT phone FROM contacts WHERE organization_id = ? AND phone IS NOT NULL AND phone != ''
  `).all(tenantId) as any[];

  const allPhones = rows.map((r) => r.phone).filter(Boolean);

  // Filter based on target audience
  switch (targetAudience) {
    case "all":
      return allPhones;
    case "vip":
      // Filter contacts with high lifetime value
      const vipRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE organization_id = ? AND phone IS NOT NULL AND lifetime_value > 10000
      `).all(tenantId) as any[];
      return vipRows.map((r) => r.phone).filter(Boolean);
    case "new":
      // Filter contacts created in last 30 days
      const newRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE organization_id = ? AND phone IS NOT NULL 
        AND created_at > datetime('now', '-30 days')
      `).all(tenantId) as any[];
      return newRows.map((r) => r.phone).filter(Boolean);
    case "inactive":
      // Filter contacts with no recent activity
      const inactiveRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE organization_id = ? AND phone IS NOT NULL 
        AND updated_at < datetime('now', '-60 days')
      `).all(tenantId) as any[];
      return inactiveRows.map((r) => r.phone).filter(Boolean);
    default:
      return allPhones;
  }
}

function logCampaignRun(
  tenantId: string,
  campaignId: string,
  recipient: string,
  status: string,
  error?: string
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO campaign_runs (id, campaign_id, status, recipient, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId("CRUN"),
    campaignId,
    status,
    recipient,
    error || null,
    new Date().toISOString()
  );
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

// ============================================
// ADMIN OPERATIONS (no tenant filtering)
// ============================================

export function getAllCampaignsAdmin(): Campaign[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM campaigns ORDER BY created_at DESC"
  ).all() as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    message: row.content,
    targetAudience: JSON.parse(row.audience || "{}").targetAudience || "all",
    customPhones: JSON.parse(row.audience || "{}").customPhones || [],
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    sentCount: 0,
    failedCount: 0,
    createdAt: row.created_at,
  }));
}

export function getCampaignByIdAdmin(id: string): Campaign | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    message: row.content,
    targetAudience: JSON.parse(row.audience || "{}").targetAudience || "all",
    customPhones: JSON.parse(row.audience || "{}").customPhones || [],
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    sentCount: 0,
    failedCount: 0,
    createdAt: row.created_at,
  };
}

export function updateCampaignStatusAdmin(
  id: string,
  status: Campaign["status"],
  sentCount?: number,
  failedCount?: number
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns SET status = ?, sent_at = ?, updated_at = ? WHERE id = ?
  `).run(
    status,
    status === "sent" ? now : null,
    now,
    id
  );
}

export async function executeCampaignAdmin(
  campaignId: string
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const campaign = getCampaignByIdAdmin(campaignId);
  if (!campaign) {
    return { success: false, sent: 0, failed: 0, errors: ["Campaign not found"] };
  }

  updateCampaignStatusAdmin(campaignId, "sending");

  const recipients = await getRecipientsAdmin(campaign.targetAudience, campaign.customPhones);

  if (recipients.length === 0) {
    updateCampaignStatusAdmin(campaignId, "failed");
    return { success: false, sent: 0, failed: 0, errors: ["No recipients found"] };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage("default", recipient, campaign.message);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient}: ${result.error}`);
    }

    logCampaignRunAdmin(campaignId, recipient, result.success ? "sent" : "failed", result.error);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  updateCampaignStatusAdmin(campaignId, "sent", sent, failed);

  return { success: true, sent, failed, errors };
}

async function getRecipientsAdmin(
  targetAudience: Campaign["targetAudience"],
  customPhones?: string[]
): Promise<string[]> {
  const db = getDb();

  if (targetAudience === "custom" && customPhones) {
    return customPhones;
  }

  const rows = db.prepare(`
    SELECT phone FROM contacts WHERE phone IS NOT NULL AND phone != ''
  `).all() as any[];

  const allPhones = rows.map((r) => r.phone).filter(Boolean);

  switch (targetAudience) {
    case "all":
      return allPhones;
    case "vip":
      const vipRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE phone IS NOT NULL AND lifetime_value > 10000
      `).all() as any[];
      return vipRows.map((r) => r.phone).filter(Boolean);
    case "new":
      const newRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE phone IS NOT NULL 
        AND created_at > datetime('now', '-30 days')
      `).all() as any[];
      return newRows.map((r) => r.phone).filter(Boolean);
    case "inactive":
      const inactiveRows = db.prepare(`
        SELECT phone FROM contacts 
        WHERE phone IS NOT NULL 
        AND updated_at < datetime('now', '-60 days')
      `).all() as any[];
      return inactiveRows.map((r) => r.phone).filter(Boolean);
    default:
      return allPhones;
  }
}

function logCampaignRunAdmin(
  campaignId: string,
  recipient: string,
  status: string,
  error?: string
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO campaign_runs (id, campaign_id, status, recipient, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId("CRUN"),
    campaignId,
    status,
    recipient,
    error || null,
    new Date().toISOString()
  );
}

export function getMessageTemplates(): Array<{
  name: string;
  template: string;
}> {
  return [
    {
      name: "Welcome Offer",
      template:
        "Assalam-o-Alaikum! Welcome to Urban Hive! Use code WELCOME10 for 10% off your first order. Shop now at urbanhive.com",
    },
    {
      name: "Flash Sale",
      template:
        "FLASH SALE! Upto 30% off on selected items. Limited time only! Order now before stock runs out.",
    },
    {
      name: "New Arrivals",
      template:
        "New Arrivals are here! Check out our latest collection. Be the first to try them!",
    },
    {
      name: "Order Update",
      template:
        "Your order has been dispatched! Track your order with the link shared on WhatsApp. Thank you for choosing Urban Hive!",
    },
    {
      name: "Feedback Request",
      template:
        "Hi! How was your recent order from Urban Hive? We'd love your feedback! Rate us and get 5% off your next order.",
    },
    {
      name: "Loyalty Reward",
      template:
        "Congratulations! You've earned loyalty points! Redeem them for discounts on your next purchase. Keep shopping with Urban Hive!",
    },
  ];
}
