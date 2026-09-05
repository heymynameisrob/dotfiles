import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

const THINKING_LEVELS = new Set<ThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

const THINKING_BY_MODEL: Record<string, ThinkingLevel> = {
  "openai-codex/gpt-5.5": "low",
  "anthropic/claude-opus-4-7": "high",
  "opencode/deepseek-v4-flash": "high",
  "openrouter/deepseek-v4-pro": "high",
};

function getUserDefaultThinkingLevel(): ThinkingLevel | undefined {
  try {
    const settingsPath = join(homedir(), ".pi", "agent", "settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as {
      defaultThinkingLevel?: unknown;
    };

    return typeof settings.defaultThinkingLevel === "string" &&
      THINKING_LEVELS.has(settings.defaultThinkingLevel as ThinkingLevel)
      ? (settings.defaultThinkingLevel as ThinkingLevel)
      : undefined;
  } catch {
    return undefined;
  }
}

export default function (pi: ExtensionAPI) {
  const userDefault = getUserDefaultThinkingLevel();

  pi.on("model_select", async (event, ctx) => {
    const modelKey = `${event.model.provider}/${event.model.id}`;
    const level = THINKING_BY_MODEL[modelKey] ?? userDefault ?? pi.getThinkingLevel();

    pi.setThinkingLevel(level);

    if (ctx.hasUI) {
      ctx.ui.notify(`Thinking set to ${level} for ${modelKey}`, "info");
    }
  });
}
