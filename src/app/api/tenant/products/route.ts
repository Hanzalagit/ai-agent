import { requireAuth } from "@/lib/auth";
import { getTenantById } from "@/lib/tenant";
import {
  getTenantProducts,
  searchTenantProducts,
  addTenantProduct,
  updateTenantProduct,
  deleteTenantProduct,
} from "@/lib/tenant-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (query) {
      const products = searchTenantProducts(auth.tenant.id, query);
      return Response.json({ ok: true, products, query });
    }

    const products = getTenantProducts(auth.tenant.id);
    return Response.json({ ok: true, products, total: products.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch products";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const tenant = getTenantById(auth.tenant.id);

    const { name, category, shades, size, pricePKR, stock, description } = body;

    if (!name || !category || pricePKR === undefined) {
      return Response.json(
        { error: "Name, category and price are required" },
        { status: 400 }
      );
    }

    const products = getTenantProducts(auth.tenant.id);
    const maxProducts = tenant?.limits?.maxProducts ?? 20;
    if (maxProducts !== -1 && products.length >= maxProducts) {
      return Response.json(
        { error: `Product limit reached (${maxProducts}). Upgrade your plan to add more.` },
        { status: 403 }
      );
    }

    const product = addTenantProduct(auth.tenant.id, {
      name,
      category,
      shades,
      size,
      pricePKR: Number(pricePKR),
      stock: stock || "in_stock",
      description: description || "",
    });

    return Response.json({ ok: true, product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add product";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const { productId, ...updates } = body;

    if (!productId) {
      return Response.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = updateTenantProduct(auth.tenant.id, productId, updates);
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ ok: true, product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update product";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return Response.json({ error: "Product ID is required" }, { status: 400 });
    }

    const deleted = deleteTenantProduct(auth.tenant.id, productId);
    if (!deleted) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ ok: true, message: "Product deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete product";
    return Response.json({ error: message }, { status: 500 });
  }
}
