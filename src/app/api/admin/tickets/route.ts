import { createdTickets } from "@/lib/tickets";
import { classifyTicket, getCategoryEmoji } from "@/lib/ticket-router";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const tickets = createdTickets();

  // Enrich tickets with routing info
  const enriched = tickets.map((ticket) => {
    const routing = classifyTicket(ticket.subject, ticket.note);
    return {
      ...ticket,
      category: routing.category,
      priority: routing.priority,
      department: routing.department,
      assignedTo: routing.assignedTo,
      emoji: getCategoryEmoji(routing.category),
    };
  });

  // Stats
  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  for (const t of enriched) {
    categoryCounts[t.category] = (categoryCounts[t.category] ?? 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1;
  }

  return Response.json({
    tickets: enriched,
    stats: {
      total: tickets.length,
      byCategory: categoryCounts,
      byPriority: priorityCounts,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { subject, description, order_id, contact } = body;

  const routing = classifyTicket(subject, description);

  trackEvent({
    type: "ticket_created",
    data: {
      subject,
      category: routing.category,
      priority: routing.priority,
    },
  });

  return Response.json({ routing });
}
