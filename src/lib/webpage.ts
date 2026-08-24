const BLOCKED_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|::1)/i;

const MAX_CONTENT_CHARS = 12000;

function stripBlockTags(html: string, tag: string): string {
  return html.replace(
    new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
    " "
  );
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

function extractText(html: string): string {
  let working = html;
  for (const tag of ["script", "style", "noscript", "svg", "iframe"]) {
    working = stripBlockTags(working, tag);
  }
  working = working
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  working = working
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return working
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export async function fetchWebpage(
  rawUrl: string
): Promise<Record<string, unknown>> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: `Invalid URL: "${rawUrl}". Include full https://.` };
  }

  if (!/^https?:$/.test(url.protocol)) {
    return { ok: false, error: "Only http/https URLs are supported." };
  }
  if (BLOCKED_HOST.test(url.hostname)) {
    return { ok: false, error: "This host is not allowed." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ur;q=0.8",
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        url: res.url,
        error: `The site returned HTTP ${res.status}. Try another URL from the search results.`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return {
        ok: false,
        url: res.url,
        content_type: contentType,
        error:
          "Not a readable web page. Tell the user honestly and offer an [OPEN:] button instead.",
      };
    }

    const html = await res.text();
    const title = extractTitle(html);
    const text = extractText(html);

    if (text.length < 40) {
      return {
        ok: false,
        url: res.url,
        error:
          "Page contained no readable text (it is likely JavaScript-only). Tell the user you could not read it and give an [OPEN:] button to the page instead.",
      };
    }

    return {
      ok: true,
      final_url: res.url,
      title,
      content: text.slice(0, MAX_CONTENT_CHARS),
      truncated: text.length > MAX_CONTENT_CHARS,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "The page took over 15 seconds to load — timed out. Try another URL."
        : "Could not reach the site (down, blocked, or DNS issue). Try another URL from the search results.",
    };
  } finally {
    clearTimeout(timer);
  }
}
