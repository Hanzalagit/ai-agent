import productsData from "@/data/products.json";

export type Product = {
  id: string;
  name: string;
  category: string;
  shades?: string[];
  size?: string;
  price_pkr: number;
  stock: "in_stock" | "low_stock" | "out_of_stock";
  description: string;
};

const PRODUCTS = productsData.products as Product[];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
}

const STOCK_LABEL: Record<Product["stock"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock — order soon",
  out_of_stock: "Out of stock",
};

export function allProductsSummary(): string[] {
  return PRODUCTS.map((p) => `${p.name} — PKR ${p.price_pkr.toLocaleString("en-PK")} (${STOCK_LABEL[p.stock]})`);
}

export function findProductByName(name: string): Product | undefined {
  const n = normalize(name);
  return (
    PRODUCTS.find((p) => normalize(p.name) === n) ??
    PRODUCTS.find((p) => normalize(p.name).includes(n) || n.includes(normalize(p.name)))
  );
}

export function productSearch(query: string): Record<string, unknown> {
  const q = normalize(query);
  if (!q) {
    return { found: false, catalog: allProductsSummary() };
  }

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  const scored = PRODUCTS.map((product) => {
    const haystack = normalize(
      [product.name, product.category, product.description, ...(product.shades ?? [])].join(" ")
    );
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1;
    }
    return { product, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) {
    return {
      found: false,
      catalog: allProductsSummary(),
      message:
        "No direct match. Show this short catalog to the user and ask which product they are interested in. Never invent products or prices.",
    };
  }

  return {
    found: true,
    results: scored.map(({ product }) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      shades: product.shades ?? null,
      size: product.size ?? null,
      price_pkr: product.price_pkr,
      availability: STOCK_LABEL[product.stock],
      description: product.description,
    })),
  };
}
