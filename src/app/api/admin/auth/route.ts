import { authenticateAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const session = authenticateAdmin(email, password);
    if (!session) {
      return Response.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    return Response.json({ ok: true, session });
  } catch {
    return Response.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
