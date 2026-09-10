import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

import { marked } from "marked";

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);

/** Extract text blocks from an assistant message. */
function textContent(content: unknown): string {
	if (!Array.isArray(content)) return "";

	return content
		.filter(function isTextBlock(block): block is { type: "text"; text: string } {
			return (
				typeof block === "object" &&
				block !== null &&
				"type" in block &&
				block.type === "text" &&
				"text" in block &&
				typeof block.text === "string"
			);
		})
		.map(function getText(block) {
			return block.text;
		})
		.join("\n\n");
}

/** Escape text before insertion into an HTML document. */
function escapeHtml(value: string): string {
	const entities: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};
	return value.replace(/[&<>"']/g, function replaceCharacter(character) {
		return entities[character] ?? character;
	});
}

/** Build a standalone HTML preview with Tailwind Typography. */
function htmlDocument(markdown: string, title: string): string {
	const html = marked.parse(markdown);
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escapeHtml(title)}</title>
	<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body class="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
	<main class="prose prose-slate mx-auto max-w-3xl rounded-xl bg-white px-6 py-8 shadow-sm sm:px-10">
		${html}
	</main>
</body>
</html>
`;
}

/** Return the current Git branch or a stable fallback. */
async function getBranchName(pi: ExtensionAPI, cwd: string): Promise<string> {
	const result = await pi.exec("git", ["branch", "--show-current"], { cwd });
	const branch = result.code === 0 ? result.stdout.trim() : "";
	return branch || basename(cwd) || "preview";
}

/** Convert a branch name to a safe file-name segment. */
function safeFileSegment(value: string): string {
	const segment = value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return segment || "preview";
}

/** Create a short URL-safe random identifier. */
function randomId(length = 6): string {
	const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
	const bytes = randomBytes(length);
	let value = "";
	for (const byte of bytes) value += alphabet[byte % alphabet.length];
	return value;
}

/** Open a local file in the default browser. */
async function openInBrowser(path: string): Promise<void> {
	const command = process.platform === "darwin" ? "open" : "xdg-open";
	await execFileAsync(command, [path]);
}

export default function readExtension(pi: ExtensionAPI) {
	pi.registerCommand("read", {
		description: "Open the latest assistant response as a temporary HTML page",
		async handler(_args, ctx) {
			await ctx.waitForIdle();

			const branch = ctx.sessionManager.getBranch();
			let assistantMessage: AssistantMessage | undefined;
			for (let index = branch.length - 1; index >= 0; index--) {
				const entry = branch[index];
				if (entry?.type === "message" && entry.message.role === "assistant") {
					assistantMessage = entry.message;
					break;
				}
			}

			if (!assistantMessage) {
				ctx.ui.notify("No assistant response to read", "warning");
				return;
			}

			const markdown = textContent(assistantMessage.content);
			if (!markdown.trim()) {
				ctx.ui.notify("The latest assistant response has no Markdown text", "warning");
				return;
			}

			const branchName = safeFileSegment(await getBranchName(pi, ctx.cwd));
			const fileName = `${branchName}-${randomId()}.html`;
			const path = resolve(process.env.TMPDIR ?? "/tmp", fileName);
			await writeFile(path, htmlDocument(markdown, branchName), "utf8");

			try {
				await openInBrowser(path);
			} catch (error) {
				ctx.ui.notify(`Created ${path}`, "info");
				ctx.ui.notify(`Could not open HTML preview: ${String(error)}`, "warning");
				return;
			}

			ctx.ui.notify(`Opened ${path}`, "info");
		},
	});
}
