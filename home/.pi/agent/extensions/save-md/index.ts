import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { marked } from "marked";

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);

/**
 * Extract text blocks from an assistant message.
 */
function textContent(content: unknown): string {
	if (!Array.isArray(content)) return "";

	return content
		.filter(
		(block): block is { type: "text"; text: string } =>
			typeof block === "object" &&
			block !== null &&
			"type" in block &&
			block.type === "text" &&
			"text" in block &&
			typeof block.text === "string",
		)
		.map((block) => block.text)
		.join("\n\n");
}

/**
 * Escape text before inserting it into an HTML document.
 */
function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			} satisfies Record<string, string>)[character] ?? character,
	);
}

/**
 * Build a standalone HTML preview with Tailwind Typography.
 */
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

/**
 * Open a local file in the default browser.
 */
async function openInBrowser(path: string): Promise<void> {
	const command = process.platform === "darwin" ? "open" : "xdg-open";
	await execFileAsync(command, [path]);
}

export default function saveMarkdownExtension(pi: ExtensionAPI) {
	pi.registerCommand("save-md", {
		description: "Save the latest assistant response as Markdown (usage: /save-md name)",
		handler: async (args, ctx) => {
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
				ctx.ui.notify("No assistant response to save", "warning");
				return;
			}

			const name = args.trim();
			if (!name) {
				ctx.ui.notify("Usage: /save-md name", "warning");
				return;
			}

			const markdown = textContent(assistantMessage.content);
			if (!markdown.trim()) {
				ctx.ui.notify(
					"The latest assistant response has no Markdown text",
					"warning",
				);
				return;
			}

			const fileName = name.endsWith(".md") ? name : `${name}.md`;
			const hasPath = name.includes("/") || name.startsWith("~");
			const expandedName = name.startsWith("~/")
				? resolve(homedir(), name.slice(2))
				: name;
			const path = hasPath
				? resolve(ctx.cwd, expandedName)
				: resolve(homedir(), "code/notes", fileName);

			await mkdir(dirname(path), { recursive: true });

			try {
				await writeFile(path, markdown.endsWith("\n") ? markdown : `${markdown}\n`, {
					encoding: "utf8",
					flag: "wx",
				});
			} catch (error) {
				if (
					typeof error === "object" &&
					error !== null &&
					"code" in error &&
					error.code === "EEXIST"
				) {
					ctx.ui.notify(`File already exists: ${path}`, "error");
					return;
				}
				throw error;
			}

			const htmlPath = resolve(
				process.env.TMPDIR ?? "/tmp",
				`${basename(fileName, ".md")}.html`,
			);
			await writeFile(htmlPath, htmlDocument(markdown, basename(fileName, ".md")), {
				encoding: "utf8",
			});

			try {
				await openInBrowser(htmlPath);
			} catch (error) {
				ctx.ui.notify(`Saved Markdown to ${path}`, "info");
				ctx.ui.notify(`Could not open HTML preview: ${String(error)}`, "warning");
				return;
			}

			ctx.ui.notify(`Saved Markdown to ${path} and opened ${htmlPath}`, "info");
		},
	});
}
