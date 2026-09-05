import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

const execFileAsync = promisify(execFile);

function readEnvValue(name: string) {
  if (process.env[name]) return process.env[name];

  const envPath = join(homedir(), ".pi", "agent", ".env");
  let envText = "";

  try {
    envText = readFileSync(envPath, "utf8");
  } catch {
    return undefined;
  }

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== name) continue;

    const value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value.replace(/\s+#.*$/, "");
  }

  return undefined;
}

function getApiKey(): string | undefined {
  return readEnvValue("FIRECRAWL_API_KEY");
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// --- Firecrawl SDK mode ---

async function searchWithSdk(params: {
  query: string;
  limit: number;
  source: string;
  scrapeResults: boolean;
}, signal: AbortSignal | undefined, onUpdate?: (update: { content: { type: string; text: string }[]; details: undefined }) => void) {
  // Dynamic import so the SDK is only required when an API key exists
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const client = new Firecrawl({ apiKey: getApiKey()! });

  onUpdate?.({
    content: [{ type: "text", text: `Searching Firecrawl for: ${params.query}` }],
    details: undefined,
  });

  const result = await client.search(params.query, {
    limit: params.limit,
    sources: [params.source as any],
    scrapeOptions: params.scrapeResults ? { formats: ["markdown"], timeout: 30000 } : undefined,
    timeout: 30000,
  });

  if (signal?.aborted) throw new Error("Search cancelled");

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    details: result,
  };
}

async function scrapeWithSdk(params: {
  url: string;
  onlyMainContent: boolean;
  waitFor: number | undefined;
  timeout: number;
  includeMetadata: boolean;
}, signal: AbortSignal | undefined, onUpdate?: (update: { content: { type: string; text: string }[]; details: undefined }) => void) {
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const client = new Firecrawl({ apiKey: getApiKey()! });

  onUpdate?.({
    content: [{ type: "text", text: `Scraping page with Firecrawl: ${params.url}` }],
    details: undefined,
  });

  const document = await client.scrape(params.url, {
    formats: ["markdown"],
    onlyMainContent: params.onlyMainContent,
    waitFor: params.waitFor,
    timeout: params.timeout,
  });

  if (signal?.aborted) throw new Error("Scrape cancelled");

  const metadata = params.includeMetadata && document.metadata ? `\n\nMetadata:\n${JSON.stringify(document.metadata, null, 2)}` : "";
  const markdown = document.markdown?.trim() || "No markdown content returned.";

  return {
    content: [{ type: "text" as const, text: `${markdown}${metadata}` }],
    details: document,
  };
}

// --- curl fallback mode ---

async function searchWithCurl(params: {
  query: string;
  limit: number;
  source: string;
  scrapeResults: boolean;
}, signal: AbortSignal | undefined, onUpdate?: (update: { content: { type: string; text: string }[]; details: undefined }) => void) {
  onUpdate?.({
    content: [{ type: "text", text: `Searching (curl) for: ${params.query}` }],
    details: undefined,
  });

  const endpoint = "https://api.firecrawl.dev/v1/search";
  const body = JSON.stringify({
    query: params.query,
    limit: params.limit,
    scrapeOptions: params.scrapeResults ? { formats: ["markdown"] } : undefined,
  });

  const { stdout, stderr } = await execFileAsync("curl", [
    "-sS",
    "-X", "POST",
    endpoint,
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + getApiKey()!,
    "-d", body,
    "--max-time", "30",
  ], { timeout: 35_000, signal });

  if (signal?.aborted) throw new Error("Search cancelled");

  // Try parsing as JSON for a nicer display
  try {
    const parsed = JSON.parse(stdout);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(parsed, null, 2) }],
      details: parsed,
    };
  } catch {
    return {
      content: [{ type: "text" as const, text: `Firecrawl search response:\n${stdout}\n${stderr ? `stderr: ${stderr}` : ""}` }],
      details: { raw: stdout },
      isError: stderr && !stdout,
    };
  }
}

async function scrapeWithCurl(params: {
  url: string;
  onlyMainContent: boolean;
  waitFor: number | undefined;
  timeout: number;
  includeMetadata: boolean;
}, signal: AbortSignal | undefined, onUpdate?: (update: { content: { type: string; text: string }[]; details: undefined }) => void) {
  onUpdate?.({
    content: [{ type: "text", text: `Scraping (curl): ${params.url}` }],
    details: undefined,
  });

  const endpoint = "https://api.firecrawl.dev/v1/scrape";
  const body = JSON.stringify({
    url: params.url,
    formats: ["markdown"],
    onlyMainContent: params.onlyMainContent,
    waitFor: params.waitFor,
    timeout: params.timeout,
  });

  const { stdout, stderr } = await execFileAsync("curl", [
    "-sS",
    "-X", "POST",
    endpoint,
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + getApiKey()!,
    "-d", body,
    "--max-time", String(Math.min(params.timeout / 1000 + 10, 120)),
  ], { timeout: Math.min(params.timeout + 10_000, 125_000), signal });

  if (signal?.aborted) throw new Error("Scrape cancelled");

  try {
    const parsed = JSON.parse(stdout);
    const data = parsed.data ?? parsed;
    const markdown = data.markdown?.trim() || "No markdown content returned.";
    const metadata = params.includeMetadata && data.metadata ? `\n\nMetadata:\n${JSON.stringify(data.metadata, null, 2)}` : "";
    return {
      content: [{ type: "text" as const, text: `${markdown}${metadata}` }],
      details: data,
    };
  } catch {
    return {
      content: [{ type: "text" as const, text: `Firecrawl scrape response:\n${stdout}\n${stderr ? `stderr: ${stderr}` : ""}` }],
      details: { raw: stdout },
      isError: stderr && !stdout,
    };
  }
}

export default function (pi: ExtensionAPI) {
  const hasApiKey = !!getApiKey();

  pi.registerTool({
    name: "search",
    label: "Search Web",
    description: "Search the web with Firecrawl. Returns web/news/image results, and can optionally include markdown content for each web result.",
    promptSnippet: "Search the web with Firecrawl for current information.",
    promptGuidelines: [
      "Use search when the user asks for current web information, discovery, or sources beyond the local workspace.",
      "Use scrape after search when you need the full markdown content of a specific page.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "The web search query." }),
      limit: Type.Optional(Type.Number({ description: "Maximum number of results to return. Defaults to 5.", minimum: 1, maximum: 20 })),
      source: Type.Optional(StringEnum(["web", "news", "images"] as const)),
      scrapeResults: Type.Optional(Type.Boolean({ description: "Whether to scrape result pages and include markdown. Defaults to false." })),
    }),
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        const searchParams = {
          query: params.query,
          limit: params.limit ?? 5,
          source: params.source ?? "web",
          scrapeResults: params.scrapeResults ?? false,
        };

        if (hasApiKey) {
          try {
            return await searchWithSdk(searchParams, signal, onUpdate);
          } catch (sdkError) {
            // If SDK import/runtime fails, fall back to curl
            const msg = asErrorMessage(sdkError);
            if (msg.includes("@mendable/firecrawl-js") || msg.includes("Cannot find module") || msg.includes("Failed to resolve")) {
              return await searchWithCurl(searchParams, signal, onUpdate);
            }
            throw sdkError;
          }
        }
        return await searchWithCurl(searchParams, signal, onUpdate);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Firecrawl search failed: ${asErrorMessage(error)}` }],
          details: { error: asErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "scrape",
    label: "Scrape Page",
    description: "Grab the content of a single page with Firecrawl and return agent-consumable markdown.",
    promptSnippet: "Fetch a URL's page content as markdown with Firecrawl.",
    promptGuidelines: [
      "Use scrape when you need the full readable markdown content of a known URL.",
      "Prefer scrape over bash/fetch for web pages because scrape returns cleaned markdown suitable for agent context.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "The URL to fetch." }),
      onlyMainContent: Type.Optional(Type.Boolean({ description: "Only return the main page content. Defaults to true." })),
      waitFor: Type.Optional(Type.Number({ description: "Milliseconds to wait before capturing content, useful for JS-heavy pages." })),
      timeout: Type.Optional(Type.Number({ description: "Request timeout in milliseconds. Defaults to 30000." })),
      includeMetadata: Type.Optional(Type.Boolean({ description: "Append page metadata to the markdown output. Defaults to false. Full metadata is always available in details." })),
    }),
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        const scrapeParams = {
          url: params.url,
          onlyMainContent: params.onlyMainContent ?? true,
          waitFor: params.waitFor,
          timeout: params.timeout ?? 30000,
          includeMetadata: params.includeMetadata ?? false,
        };

        if (hasApiKey) {
          try {
            return await scrapeWithSdk(scrapeParams, signal, onUpdate);
          } catch (sdkError) {
            const msg = asErrorMessage(sdkError);
            if (msg.includes("@mendable/firecrawl-js") || msg.includes("Cannot find module") || msg.includes("Failed to resolve")) {
              return await scrapeWithCurl(scrapeParams, signal, onUpdate);
            }
            throw sdkError;
          }
        }
        return await scrapeWithCurl(scrapeParams, signal, onUpdate);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Firecrawl scrape failed: ${asErrorMessage(error)}` }],
          details: { error: asErrorMessage(error) },
          isError: true,
        };
      }
    },
  });
}