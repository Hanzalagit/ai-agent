export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchProvider = "brave" | "tavily" | "serper";

async function serperSearch(query: string): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 5 }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Serper error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const items: { title?: string; link?: string; snippet?: string }[] =
      data.organic ?? [];
    return items
      .filter((i) => i.link)
      .map((i) => ({
        title: i.title ?? "Untitled",
        url: i.link as string,
        snippet: i.snippet ?? "",
      }));
  } catch (err) {
    console.error("Serper fetch error:", err);
    return [];
  }
}

async function braveSearch(query: string): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query
      )}&count=5`,
      {
        headers: { "X-Subscription-Token": key, Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.error("Brave Search error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const items: { title?: string; url?: string; description?: string }[] =
      data.web?.results ?? [];
    return items
      .filter((i) => i.url)
      .map((i) => ({
        title: i.title ?? "Untitled",
        url: i.url as string,
        snippet: i.description ?? "",
      }));
  } catch (err) {
    console.error("Brave Search fetch error:", err);
    return [];
  }
}

async function tavilySearch(query: string): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: 5,
        search_depth: "basic",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Tavily error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const items: { title?: string; url?: string; content?: string }[] =
      data.results ?? [];
    return items
      .filter((i) => i.url)
      .map((i) => ({
        title: i.title ?? "Untitled",
        url: i.url as string,
        snippet: i.content ?? "",
      }));
  } catch (err) {
    console.error("Tavily fetch error:", err);
    return [];
  }
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const provider: SearchProvider =
    (process.env.SEARCH_PROVIDER as SearchProvider) ?? "brave";

  if (provider === "tavily") return tavilySearch(query);
  if (provider === "serper") return serperSearch(query);
  return braveSearch(query);
}