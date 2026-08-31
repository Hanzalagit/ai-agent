import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const CAMPAIGN_FILE = path.join(STORE_DIR, "campaigns.json");

export type Campaign = {
  id: string;
  name: string;
  message: string;
  targetAudience: "all" | "vip" | "new" | "inactive" | "custom";
  customPhones?: string[];
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  template?: string;
};

function readStore(): Campaign[] {
  try {
    const raw = fs.readFileSync(CAMPAIGN_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Campaign[]) : [];
  } catch {
    return [];
  }
}

function writeStore(campaigns: Campaign[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(campaigns, null, 2), "utf8");
}

export function createCampaign(input: {
  name: string;
  message: string;
  targetAudience: Campaign["targetAudience"];
  customPhones?: string[];
  scheduledAt?: string;
}): Campaign {
  const campaigns = readStore();
  const campaign: Campaign = {
    id: `CMP-${String(campaigns.length + 1).padStart(4, "0")}`,
    name: input.name,
    message: input.message,
    targetAudience: input.targetAudience,
    customPhones: input.customPhones,
    status: input.scheduledAt ? "scheduled" : "draft",
    scheduledAt: input.scheduledAt,
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString(),
  };
  campaigns.push(campaign);
  writeStore(campaigns);
  return campaign;
}

export function getAllCampaigns(): Campaign[] {
  return readStore();
}

export function getCampaignById(id: string): Campaign | undefined {
  return readStore().find((c) => c.id === id);
}

export function updateCampaignStatus(
  id: string,
  status: Campaign["status"],
  sentCount?: number,
  failedCount?: number
): void {
  const campaigns = readStore();
  const campaign = campaigns.find((c) => c.id === id);
  if (campaign) {
    campaign.status = status;
    if (status === "sent") campaign.sentAt = new Date().toISOString();
    if (sentCount !== undefined) campaign.sentCount = sentCount;
    if (failedCount !== undefined) campaign.failedCount = failedCount;
    writeStore(campaigns);
  }
}

export function generateWhatsAppBroadcastUrl(
  phone: string,
  message: string
): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encoded}`;
}

export function getMessageTemplates(): Array<{
  name: string;
  template: string;
}> {
  return [
    {
      name: "Welcome Offer",
      template:
        "Assalam-o-Alaikum! 🌸 Welcome to Urban Hive! Use code WELCOME10 for 10% off your first order. Shop now at urbanhive.com",
    },
    {
      name: "Flash Sale",
      template:
        "FLASH SALE! ⚡ Upto 30% off on selected items. Limited time only! Order now before stock runs out. 🛍️",
    },
    {
      name: "New Arrivals",
      template:
        "New Arrivals are here! ✨ Check out our latest collection. Be the first to try them! 💄",
    },
    {
      name: "Order Update",
      template:
        "Your order has been dispatched! 📦 Track your order with the link shared on WhatsApp. Thank you for choosing Urban Hive! 💕",
    },
    {
      name: "Feedback Request",
      template:
        "Hi! How was your recent order from Urban Hive? We'd love your feedback! ⭐ Rate us and get 5% off your next order.",
    },
    {
      name: "Loyalty Reward",
      template:
        "Congratulations! 🎉 You've earned loyalty points! Redeem them for discounts on your next purchase. Keep shopping with Urban Hive! 💖",
    },
  ];
}
