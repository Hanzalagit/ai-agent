import { verifyAdminSession } from "@/lib/admin-auth";
import {
  createTicket,
  getTicketsAdmin,
  updateTicketAdmin,
  deleteTicketAdmin,
} from "@/lib/tickets";
import { classifyTicket, getCategoryEmoji } from "@/lib/ticket-router";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);

    const status = url.searchParams.get("status") as any;
    const priority = url.searchParams.get("priority") as any;
    const assignedTo = url.searchParams.get("assignedTo");

    const tickets = getTicketsAdmin({
      status: status || undefined,
      priority: priority || undefined,
      assignedTo: assignedTo || undefined,
    });

    // Enrich tickets with routing info
    const enriched = tickets.map((ticket) => {
      const routing = classifyTicket(ticket.subject, ticket.description || "");
      return {
        ...ticket,
        category: routing.category,
        department: routing.department,
        assignedTo: routing.assignedTo,
        emoji: getCategoryEmoji(routing.category),
      };
    });

    // Stats
    const categoryCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const t of enriched) {
      categoryCounts[t.category] = (categoryCounts[t.category] ?? 0) + 1;
      priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1;
      statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
    }

    return Response.json({
      ok: true,
      tickets: enriched,
      stats: {
        total: tickets.length,
        byCategory: categoryCounts,
        byPriority: priorityCounts,
        byStatus: statusCounts,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tickets";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { subject, description, contactId, priority, assignedTo, tags } = body;

    if (!subject) {
      return Response.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    const routing = classifyTicket(subject, description || "");

    trackEvent({
      type: "ticket_created",
      data: {
        subject,
        category: routing.category,
        priority: routing.priority,
        tenantId: "default",
      },
    });

    const ticket = createTicket({
      tenantId: "default",
      contactId,
      subject,
      description,
      priority: priority || routing.priority as any,
      assignedTo,
      tags,
    });

    return Response.json({
      ok: true,
      ticket: {
        ...ticket,
        category: routing.category,
        department: routing.department,
        emoji: getCategoryEmoji(routing.category),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create ticket";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { ticketId, status, priority, assignedTo, tags } = body;

    if (!ticketId) {
      return Response.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const ticket = updateTicketAdmin(ticketId, {
      status,
      priority,
      assignedTo,
      tags,
    });

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, ticket });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update ticket";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const ticketId = url.searchParams.get("id");

    if (!ticketId) {
      return Response.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const deleted = deleteTicketAdmin(ticketId);
    if (!deleted) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, message: "Ticket deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete ticket";
    return Response.json({ error: message }, { status: 500 });
  }
}
