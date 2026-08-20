export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export async function searchGoogle(query: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!key || !cx) {
    return [];
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
    key
  )}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(
    query
  )}&num=5`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("Google CSE error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const items: { title?: string; link?: string; snippet?: string }[] =
      data.items ?? [];
    return items
      .filter((i) => i.link)
      .map((i) => ({
        title: i.title ?? "Untitled",
        url: i.link as string,
        snippet: i.snippet ?? "",
      }));
  } catch (err) {
    console.error("Google CSE fetch error:", err);
    return [];
  }
}