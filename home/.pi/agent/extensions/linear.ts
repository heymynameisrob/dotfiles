import { LinearClient } from "@linear/sdk";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const ENV_PATH = join(homedir(), ".config", "n8n", ".env");
const API_KEY_NAME = "N8N_LINEAR_API_KEY";

type Env = Record<string, string>;

/** Parse the small dotenv subset used by this extension. */
function parseEnv(source: string): Env {
  const values: Env = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if (!key || value === undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value.replace(/\\n/g, "\n");
  }
  return values;
}

/** Read the Personal API Key from the n8n environment file. */
async function getApiKey(): Promise<string> {
  let source: string;
  try {
    source = await readFile(ENV_PATH, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Linear settings file not found: ${ENV_PATH}`);
    }
    throw error;
  }

  const apiKey = parseEnv(source)[API_KEY_NAME];
  if (!apiKey) throw new Error(`${API_KEY_NAME} is not set in ${ENV_PATH}.`);
  return apiKey;
}

/** Convert SDK models to compact tool output. */
function issueSummary(issue: { id: string; identifier: string; title: string; url: string; priority: number }): object {
  return { id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url, priority: issue.priority };
}

/** Register the Linear client tool. */
export default function linearExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "linear_client",
    label: "Linear Client",
    description: "Read and change Linear issues with the official Linear TypeScript SDK. Reads N8N_LINEAR_API_KEY from ~/.config/n8n/.env.",
    promptSnippet: "Read, create, and update Linear issues with the official SDK",
    promptGuidelines: ["Use linear_client for Linear data instead of direct GraphQL or shell requests."],
    parameters: Type.Object({
      action: StringEnum(["viewer", "teams", "assigned_issues", "issue", "create_issue", "update_issue", "create_comment"] as const),
      issueId: Type.Optional(Type.String({ description: "Issue UUID or identifier, such as ENG-123" })),
      teamId: Type.Optional(Type.String()),
      title: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      stateId: Type.Optional(Type.String()),
      assigneeId: Type.Optional(Type.String()),
      body: Type.Optional(Type.String({ description: "Comment body in Markdown" })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 25 })),
    }),
    execute: async function executeLinear(_toolCallId, params, signal) {
      const client = new LinearClient({ apiKey: await getApiKey() });
      let result: unknown;
      if (params.action === "viewer") {
        const viewer = await client.viewer;
        result = { id: viewer.id, name: viewer.name, displayName: viewer.displayName, email: viewer.email };
      } else if (params.action === "teams") {
        const teams = await client.teams({ first: params.limit ?? 25 });
        result = teams.nodes.map(function summarizeTeam(team) { return { id: team.id, key: team.key, name: team.name }; });
      } else if (params.action === "assigned_issues") {
        const viewer = await client.viewer;
        const issues = await viewer.assignedIssues({ first: params.limit ?? 25 });
        result = issues.nodes.map(issueSummary);
      } else if (params.action === "issue") {
        if (!params.issueId) throw new Error("issueId is required for issue.");
        const issue = await client.issue(params.issueId);
        result = { ...issueSummary(issue), description: issue.description, createdAt: issue.createdAt, updatedAt: issue.updatedAt };
      } else if (params.action === "create_issue") {
        if (!params.teamId || !params.title) throw new Error("teamId and title are required for create_issue.");
        const payload = await client.createIssue({ teamId: params.teamId, title: params.title, description: params.description, stateId: params.stateId, assigneeId: params.assigneeId });
        const issue = await payload.issue;
        if (!payload.success || !issue) throw new Error("Linear did not create the issue.");
        result = issueSummary(issue);
      } else if (params.action === "update_issue") {
        if (!params.issueId) throw new Error("issueId is required for update_issue.");
        const payload = await client.updateIssue(params.issueId, { title: params.title, description: params.description, stateId: params.stateId, assigneeId: params.assigneeId });
        const issue = await payload.issue;
        if (!payload.success || !issue) throw new Error("Linear did not update the issue.");
        result = issueSummary(issue);
      } else {
        if (!params.issueId || !params.body) throw new Error("issueId and body are required for create_comment.");
        const issue = await client.issue(params.issueId);
        const payload = await client.createComment({ issueId: issue.id, body: params.body });
        const comment = await payload.comment;
        if (!payload.success || !comment) throw new Error("Linear did not create the comment.");
        result = { id: comment.id, body: comment.body, url: comment.url };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: { result } };
    },
  });
}
