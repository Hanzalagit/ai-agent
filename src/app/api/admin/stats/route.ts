import { getAllTenants } from "@/lib/tenant";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenants = getAllTenants();

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0];

    let totalMessages = 0;
    let totalOrders = 0;
    let totalTickets = 0;
    let activeToday = 0;
    let newThisMonth = 0;

    const planDistribution: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };

    tenants.forEach((tenant) => {
      planDistribution[tenant.plan] = (planDistribution[tenant.plan] || 0) + 1;

      if (tenant.createdAt.startsWith(thisMonth)) {
        newThisMonth++;
      }

      const tenantDir = path.join(process.cwd(), ".runtime", "tenants", tenant.id);
      const analyticsFile = path.join(tenantDir, "analytics.json");

      if (fs.existsSync(analyticsFile)) {
        try {
          const raw = fs.readFileSync(analyticsFile, "utf8");
          const events = JSON.parse(raw);
          if (Array.isArray(events)) {
            totalMessages += events.filter((e: any) => e.type === "message").length;
            totalOrders += events.filter((e: any) => e.type === "order_created").length;
            totalTickets += events.filter((e: any) => e.type === "ticket_created").length;

            const todayEvents = events.filter(
              (e: any) => e.timestamp && e.timestamp.startsWith(today)
            );
            const todaySessions = new Set(
              todayEvents
                .filter((e: any) => e.data?.sessionId)
                .map((e: any) => e.data.sessionId)
            );
            activeToday += todaySessions.size;
          }
        } catch {}
      }
    });

    const monthlyRevenue =
      planDistribution.pro * 29 + planDistribution.enterprise * 99;

    const recentTenants = tenants
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        plan: t.plan,
        createdAt: t.createdAt,
      }));

    return Response.json({
      totalTenants: tenants.length,
      totalMessages,
      totalOrders,
      totalTickets,
      activeToday,
      newThisMonth,
      monthlyRevenue,
      planDistribution,
      recentTenants,
    });
  } catch {
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
