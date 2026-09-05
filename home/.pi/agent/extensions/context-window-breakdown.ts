import type {
	BuildSystemPromptOptions,
	ExtensionAPI,
	ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

type Row = {
	section: string;
	item: string;
	tokens: number;
	percent: number;
};

type CapturedPrompt = {
	systemPrompt: string;
	options: BuildSystemPromptOptions;
	capturedAt: Date;
};

const CUSTOM_TYPE = "context-window-breakdown";

function estimateTokens(value: unknown): number {
	if (value === undefined || value === null) return 0;
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return Math.ceil(text.length / 4);
}

function formatNumber(value: number): string {
	return Math.round(value).toLocaleString();
}

function formatPercent(value: number): string {
	return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function escapeCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function makeRow(section: string, item: string, tokens: number, contextWindow: number): Row {
	return {
		section,
		item,
		tokens,
		percent: contextWindow > 0 ? (tokens / contextWindow) * 100 : 0,
	};
}

function messageContentTokens(message: unknown): number {
	return estimateTokens(message);
}

function getMessageRole(message: unknown): string {
	if (typeof message !== "object" || message === null || !("role" in message)) return "unknown";
	const role = (message as { role?: unknown }).role;
	return typeof role === "string" ? role : "unknown";
}

function buildSystemRows(captured: CapturedPrompt | undefined, systemPrompt: string, contextWindow: number): Row[] {
	if (!captured) {
		return [makeRow("System prompt", "Full system prompt (structured parts unavailable until next agent turn)", estimateTokens(systemPrompt), contextWindow)];
	}

	const options = captured.options;
	const rows: Row[] = [];
	const customPromptTokens = estimateTokens(options.customPrompt);
	if (customPromptTokens > 0) rows.push(makeRow("System prompt", "Custom prompt", customPromptTokens, contextWindow));

	const toolNames = options.selectedTools ?? [];
	for (const toolName of toolNames) {
		const snippet = options.toolSnippets?.[toolName] ?? "";
		rows.push(makeRow("Tools", toolName, estimateTokens(`${toolName}: ${snippet}`), contextWindow));
	}

	const guidelineTokens = estimateTokens(options.promptGuidelines?.join("\n"));
	if (guidelineTokens > 0) rows.push(makeRow("System prompt", "Tool/custom guidelines", guidelineTokens, contextWindow));

	for (const file of options.contextFiles ?? []) {
		rows.push(makeRow("Context files", file.path, estimateTokens(file.content), contextWindow));
	}

	for (const skill of options.skills ?? []) {
		rows.push(makeRow("Skills", skill.name, estimateTokens(`${skill.name}\n${skill.description}`), contextWindow));
	}

	const appendTokens = estimateTokens(options.appendSystemPrompt);
	if (appendTokens > 0) rows.push(makeRow("System prompt", "Appended system prompt", appendTokens, contextWindow));

	const accounted = rows.reduce((sum, row) => sum + row.tokens, 0);
	const fullSystemTokens = estimateTokens(captured.systemPrompt);
	const baseTokens = Math.max(0, fullSystemTokens - accounted);
	rows.unshift(makeRow("System prompt", "Pi base instructions and formatting", baseTokens, contextWindow));
	rows.unshift(makeRow("System prompt", "Full system prompt total", fullSystemTokens, contextWindow));
	return rows;
}

function buildConversationRows(ctx: ExtensionCommandContext, contextWindow: number): Row[] {
	const rowsByKey = new Map<string, Row>();

	for (const message of ctx.sessionManager.buildSessionContext().messages) {
		const role = getMessageRole(message);
		let item = role;
		if (role === "toolResult") {
			const toolName = typeof message === "object" && message !== null && "toolName" in message ? (message as { toolName?: unknown }).toolName : undefined;
			item = typeof toolName === "string" ? `toolResult: ${toolName}` : "toolResult";
		}

		const key = `Conversation\u0000${item}`;
		const previous = rowsByKey.get(key);
		const tokens = messageContentTokens(message);
		if (previous) {
			previous.tokens += tokens;
			previous.percent = contextWindow > 0 ? (previous.tokens / contextWindow) * 100 : 0;
		} else {
			rowsByKey.set(key, makeRow("Conversation", item, tokens, contextWindow));
		}
	}

	return [...rowsByKey.values()];
}

function renderMarkdown(rows: Row[], contextWindow: number, actualTokens: number | null, captured: CapturedPrompt | undefined, modelLabel: string): string {
	const totalEstimated = rows.reduce((sum, row) => sum + row.tokens, 0);
	const usageTokens = actualTokens ?? totalEstimated;
	const usagePercent = contextWindow > 0 ? (usageTokens / contextWindow) * 100 : 0;
	const note = captured
		? `System prompt parts captured at ${captured.capturedAt.toLocaleTimeString()} from the most recent agent turn.`
		: "System prompt parts will be more detailed after the next agent turn; showing full prompt only for now.";

	const table = rows
		.sort((a, b) => b.tokens - a.tokens)
		.map((row) => `| ${escapeCell(row.section)} | ${escapeCell(row.item)} | ${formatNumber(row.tokens)} | ${formatPercent(row.percent)} |`)
		.join("\n");

	return `## Context window breakdown\n\nModel: **${modelLabel}**\n\nContext window: **${formatNumber(contextWindow)} tokens**\nCurrent usage: **${actualTokens === null ? "~" : ""}${formatNumber(usageTokens)} tokens (${formatPercent(usagePercent)})**\n\n${note}\n\n| Section | Item | Est. tokens | % of window |\n|---|---:|---:|---:|\n${table}\n| **Total shown** |  | **${formatNumber(totalEstimated)}** | **${formatPercent(contextWindow > 0 ? (totalEstimated / contextWindow) * 100 : 0)}** |`;
}

export default function (pi: ExtensionAPI) {
	let captured: CapturedPrompt | undefined;

	pi.on("before_agent_start", (event) => {
		captured = {
			systemPrompt: event.systemPrompt,
			options: event.systemPromptOptions,
			capturedAt: new Date(),
		};
	});

	pi.registerCommand("context-window", {
		description: "Show a table breaking down current context-window usage by system prompt, tools, skills, and conversation",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const usage = ctx.getContextUsage();
			const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
			const modelLabel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "unknown";
			const rows = [
				...buildSystemRows(captured, ctx.getSystemPrompt(), contextWindow),
				...buildConversationRows(ctx, contextWindow),
			];
			const markdown = renderMarkdown(rows, contextWindow, usage?.tokens ?? null, captured, modelLabel);

			pi.sendMessage({
				customType: CUSTOM_TYPE,
				content: markdown,
				display: true,
				details: { contextWindow, actualTokens: usage?.tokens ?? null },
			});
		},
	});
}
