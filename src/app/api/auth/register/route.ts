import { NextRequest, NextResponse } from "next/server";
import { createUser, addUserToOrganization } from "@/lib/auth";
import { createTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, businessName } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create user
    const user = createUser({ email, name, password });

    // Create organization (tenant)
    const tenant = createTenant({
      name: businessName || name,
      email,
      password,
    });

    // Add user as owner of the organization
    addUserToOrganization(user.id, tenant.id, "owner");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 400 }
    );
  }
}
