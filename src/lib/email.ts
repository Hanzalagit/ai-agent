import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================
// TYPES
// ============================================

export type EmailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  useTls: boolean;
};

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

// ============================================
// CONFIGURATION
// ============================================

export function getEmailConfig(tenantId: string): EmailConfig | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT config FROM integrations 
    WHERE organization_id = ? AND provider = 'email' AND status = 'active'
  `).get(tenantId) as any;

  if (!row) return null;

  const config = JSON.parse(row.config);
  return {
    smtpHost: config.smtpHost || "",
    smtpPort: config.smtpPort || 587,
    smtpUser: config.smtpUser || "",
    smtpPass: config.smtpPass || "",
    fromEmail: config.fromEmail || "",
    fromName: config.fromName || "",
    useTls: config.useTls !== false,
  };
}

export function saveEmailConfig(
  tenantId: string,
  config: Partial<EmailConfig>
): void {
  const db = getDb();
  const existing = db.prepare(`
    SELECT id FROM integrations 
    WHERE organization_id = ? AND provider = 'email'
  `).get(tenantId) as any;

  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE integrations SET config = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(config), now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO integrations (id, organization_id, provider, status, config, created_at, updated_at)
      VALUES (?, ?, 'email', 'active', ?, ?, ?)
    `).run(generateId("INT"), tenantId, JSON.stringify(config), now, now);
  }
}

// ============================================
// EMAIL SENDING (Using API-based services)
// ============================================

export async function sendEmail(
  tenantId: string,
  message: EmailMessage
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const config = getEmailConfig(tenantId);
  if (!config) {
    return { success: false, error: "Email not configured" };
  }

  // For now, we'll use a simple HTTP-based email service
  // In production, you'd use nodemailer or a service like SendGrid, Resend, etc.
  
  try {
    // Log the email attempt
    logEmail(tenantId, message, "attempted");

    // For demo purposes, we'll simulate sending
    // Replace with actual SMTP or API-based sending
    console.log(`[Email] Sending to: ${message.to}`);
    console.log(`[Email] Subject: ${message.subject}`);
    console.log(`[Email] From: ${config.fromName} <${config.fromEmail}>`);

    // Generate a fake message ID for tracking
    const messageId = generateId("EMAIL");

    // Log success
    logEmail(tenantId, message, "sent", messageId);

    return { success: true, messageId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email";
    logEmail(tenantId, message, "failed", undefined, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export function generateTicketCreatedEmail(
  ticketId: string,
  subject: string,
  customerName: string,
  description: string
): EmailMessage {
  return {
    to: "", // Will be filled by caller
    subject: `New Support Ticket: ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .ticket-id { background: #e5e7eb; padding: 5px 10px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Support Ticket</h1>
          </div>
          <div class="content">
            <p><strong>Ticket ID:</strong> <span class="ticket-id">${ticketId}</span></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Description:</strong></p>
            <p>${description}</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Urban Hive Support System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New Support Ticket\n\nTicket ID: ${ticketId}\nSubject: ${subject}\nCustomer: ${customerName}\nDescription: ${description}`,
  };
}

export function generateTicketUpdatedEmail(
  ticketId: string,
  subject: string,
  status: string,
  priority: string
): EmailMessage {
  return {
    to: "",
    subject: `Ticket Updated: ${subject} [${status.toUpperCase()}]`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin-top: 20px; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; }
          .status-open { background: #f59e0b; }
          .status-in_progress { background: #3b82f6; }
          .status-resolved { background: #10b981; }
          .status-closed { background: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Updated</h1>
          </div>
          <div class="content">
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Status:</strong> <span class="status status-${status}">${status.toUpperCase()}</span></p>
            <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Ticket Updated\n\nTicket ID: ${ticketId}\nSubject: ${subject}\nStatus: ${status}\nPriority: ${priority}`,
  };
}

export function generateOrderConfirmationEmail(
  orderId: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number,
  currency: string = "PKR"
): EmailMessage {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currency} ${item.price.toLocaleString()}</td>
      </tr>
    `
    )
    .join("");

  return {
    to: "",
    subject: `Order Confirmation - ${orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #e5e7eb; padding: 10px; text-align: left; }
          .total { font-size: 18px; font-weight: bold; text-align: right; padding: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="total">
              Total: ${currency} ${total.toLocaleString()}
            </div>
            <p>Thank you for your order! We'll send you a confirmation when your order ships.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Order Confirmed!\n\nOrder ID: ${orderId}\nTotal: ${currency} ${total.toLocaleString()}\n\nThank you for your order!`,
  };
}

export function generateOrderShippedEmail(
  orderId: string,
  trackingNumber: string,
  carrier: string
): EmailMessage {
  return {
    to: "",
    subject: `Your Order ${orderId} Has Shipped!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin-top: 20px; }
          .tracking { background: #e5e7eb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Has Shipped!</h1>
          </div>
          <div class="content">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Carrier:</strong> ${carrier}</p>
            <p><strong>Tracking Number:</strong></p>
            <div class="tracking">${trackingNumber}</div>
            <p>You can track your package using the tracking number above.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your Order Has Shipped!\n\nOrder ID: ${orderId}\nCarrier: ${carrier}\nTracking Number: ${trackingNumber}`,
  };
}

// ============================================
// DATABASE LOGGING
// ============================================

function logEmail(
  tenantId: string,
  message: EmailMessage,
  status: string,
  messageId?: string,
  error?: string
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO audit_logs (id, organization_id, action, target_type, target_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId("LOG"),
    tenantId,
    "email_send",
    "email",
    messageId || null,
    JSON.stringify({
      to: message.to,
      subject: message.subject,
      status,
      error,
    }),
    new Date().toISOString()
  );
}
