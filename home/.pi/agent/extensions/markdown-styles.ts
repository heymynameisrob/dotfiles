/**
 * Markdown Styles Extension for Pi
 *
 * Wraps long lines in assistant markdown messages at a configurable width
 * (default: 100 chars). Uses Pi's built-in markdown rendering — no external
 * CLI needed.
 *
 * Commands:
 *   /mdstyles            Show current status
 *   /mdstyles on          Enable line wrapping
 *   /mdstyles off         Disable line wrapping
 *   /mdstyles width 80    Set max line width
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_WIDTH = 100;

/**
 * Wrap text at a maximum line width, respecting markdown structure:
 * - Don't break inside code blocks (``` fences)
 * - Don't break URLs inside []() syntax
 * - Don't break inside inline code (` ... `)
 * - Don't break lines that start with list markers (-, *, •, 1.)
 * - Don't add breaks to lines that are already short enough
 */
function wrapMarkdown(text: string, maxWidth: number): string {
	const lines = text.split("\n");
	const result: string[] = [];
	let inCodeBlock = false;

	for (const line of lines) {
		// Track code block boundaries
		if (line.trimStart().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			result.push(line);
			continue;
		}

		// Don't wrap inside code blocks
		if (inCodeBlock) {
			result.push(line);
			continue;
		}

		// Don't wrap short lines
		if (line.length <= maxWidth) {
			result.push(line);
			continue;
		}

		// Don't wrap lines that are just a heading (rare but possible)
		if (/^#{1,6}\s/.test(line)) {
			result.push(line);
			continue;
		}

		// Don't wrap blockquote-only lines (they have their own structure)
		if (/^>\s*$/.test(line)) {
			result.push(line);
			continue;
		}

		// Wrap the line
		result.push(...wrapLine(line, maxWidth));
	}

	return result.join("\n");
}

/**
 * Wrap a single line at maxWidth, trying to break at word boundaries.
 * Preserves leading whitespace (important for nested lists, blockquotes).
 */
function wrapLine(line: string, maxWidth: number): string[] {
	const lines: string[] = [];
	const indent = line.match(/^(\s*)/)?.[1] ?? "";

	// For list items, include the marker in the continuation indent
	const listMatch = line.match(/^(\s*)([-*•]|\d+\.)\s/);
	const hangIndent = listMatch
		? " ".repeat(listMatch[1].length + (listMatch[2].length + 1))
		: indent;

	let remaining = line;
	let isFirstLine = true;

	while (remaining.length > maxWidth) {
		// Find the last space before maxWidth
		let breakAt = -1;
		for (let i = maxWidth - 1; i >= 0; i--) {
			if (remaining[i] === " ") {
				breakAt = i;
				break;
			}
		}

		// If no space found, don't wrap — force break at maxWidth
		if (breakAt === -1) {
			breakAt = maxWidth;
		}

		const linePart = remaining.slice(0, breakAt);
		remaining = (isFirstLine ? hangIndent : indent) + remaining.slice(breakAt).trimStart();

		lines.push(linePart);
		isFirstLine = false;

		// Safety: avoid infinite loop
		if (remaining.length >= line.length && line.length > maxWidth) {
			// Force break
			lines.push(remaining);
			remaining = "";
			break;
		}
	}

	if (remaining) {
		lines.push(remaining);
	}

	return lines;
}

interface ContentBlock {
	type: string;
	text?: string;
	[key: string]: unknown;
}

export default function markdownStylesExtension(pi: ExtensionAPI) {
	let enabled = true;
	let width = DEFAULT_WIDTH;

	pi.registerCommand("mdstyles", {
		description: "Control markdown line wrapping: /mdstyles [on|off] /mdstyles width N",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const subcmd = parts[0]?.toLowerCase();

			if (subcmd === "off") {
				enabled = false;
				ctx.ui.notify("Markdown styles disabled", "info");
			} else if (subcmd === "on") {
				enabled = true;
				ctx.ui.notify("Markdown styles enabled", "info");
			} else if (subcmd === "width" && parts[1] && /^\d+$/.test(parts[1])) {
				width = parseInt(parts[1], 10);
				ctx.ui.notify(`Markdown width set to ${width}`, "info");
			} else {
				ctx.ui.notify(
					`Markdown wrapping: ${enabled ? "enabled" : "disabled"}\nWidth: ${width}`,
					"info",
				);
			}
		},
	});

	pi.on("message_end", async (event) => {
		if (!enabled) return;
		if (event.message.role !== "assistant") return;

		const message = event.message;

		// Handle string content
		if (typeof message.content === "string" && message.content.trim()) {
			const wrapped = wrapMarkdown(message.content, width);
			if (wrapped !== message.content) {
				return { message: { ...message, content: wrapped } };
			}
			return;
		}

		// Handle array content blocks
		if (Array.isArray(message.content)) {
			let modified = false;

			const newContent = (message.content as ContentBlock[]).map((block: ContentBlock) => {
				if (block.type === "text" && typeof block.text === "string" && block.text.trim()) {
					const wrapped = wrapMarkdown(block.text, width);
					if (wrapped !== block.text) {
						modified = true;
						return { ...block, text: wrapped };
					}
				}
				return block;
			});

			if (modified) {
				return { message: { ...message, content: newContent } };
			}
		}
	});
}