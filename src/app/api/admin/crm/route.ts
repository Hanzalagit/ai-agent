import { getAllCustomers, getTopCustomers, getCustomerStats } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "all";

  if (action === "top") {
    const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
    return Response.json({ customers: getTopCustomers(limit) });
  }

  if (action === "stats") {
    return Response.json(getCustomerStats());
  }

  return Response.json({ customers: getAllCustomers() });
}
