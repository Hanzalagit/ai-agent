import { verifyAdminSession } from "@/lib/admin-auth";
import { getAllCustomersAdmin, getTopCustomersAdmin, getCustomerStatsAdmin, findCustomerByIdAdmin, upsertCustomer } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "all";

    if (action === "top") {
      const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
      const customers = getTopCustomersAdmin(limit);
      return Response.json({ ok: true, customers });
    }

    if (action === "stats") {
      const stats = getCustomerStatsAdmin();
      return Response.json({ ok: true, ...stats });
    }

    if (action === "detail") {
      const customerId = url.searchParams.get("id");
      if (!customerId) {
        return Response.json({ error: "Customer ID is required" }, { status: 400 });
      }
      const customer = findCustomerByIdAdmin(customerId);
      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }
      return Response.json({ ok: true, customer });
    }

    const customers = getAllCustomersAdmin();
    return Response.json({ ok: true, customers, total: customers.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch customers";
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

    const { name, phone, email, city } = body;

    if (!phone && !email) {
      return Response.json(
        { error: "Phone or email is required" },
        { status: 400 }
      );
    }

    const customer = upsertCustomer({
      tenantId: "default",
      name,
      phone,
      email,
      city,
    });

    return Response.json({ ok: true, customer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create customer";
    return Response.json({ error: message }, { status: 500 });
  }
}
