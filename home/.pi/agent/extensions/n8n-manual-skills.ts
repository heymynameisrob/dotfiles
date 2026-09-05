import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const AUTOMATIC_N8N_SKILLS = new Set([
  "n8n:ui-design",
  "n8n:design-system",
  "n8n:content-design",
  "n8n:conventions",
]);

/**
 * Decode XML entities used in Pi's skill catalog.
 */
function decodeXml(value: string): string {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

/**
 * Read a field from a serialized skill entry.
 */
function getSkillField(
  skillBlock: string,
  field: "name" | "location",
): string | undefined {
  const match = skillBlock.match(
    new RegExp(`<${field}>([\\s\\S]*?)</${field}>`),
  );
  return match?.[1] ? decodeXml(match[1].trim()) : undefined;
}

/**
 * Determine if an n8n project skill must be manual-only.
 */
function isManualN8nSkill(skillBlock: string): boolean {
  const name = getSkillField(skillBlock, "name");
  const location = getSkillField(skillBlock, "location")?.replaceAll("\\", "/");

  if (!name || !location) return false;

  return (
    name.startsWith("n8n:") &&
    location.includes("/.agents/skills/") &&
    !AUTOMATIC_N8N_SKILLS.has(name)
  );
}

/**
 * Remove manual n8n skills from Pi's model-visible skill catalog.
 */
function filterN8nSkills(systemPrompt: string): string {
  return systemPrompt.replace(
    /<available_skills>([\s\S]*?)<\/available_skills>/,
    function filterAvailableSkills(_catalog: string, entries: string): string {
      const filteredEntries = entries.replace(
        /\s*<skill>[\s\S]*?<\/skill>/g,
        function filterSkillBlock(skillBlock: string): string {
          return isManualN8nSkill(skillBlock) ? "" : skillBlock;
        },
      );

      return `<available_skills>${filteredEntries}</available_skills>`;
    },
  );
}

/**
 * Keep n8n project skills manual-only except for the design-system skill.
 */
export default function n8nManualSkillsExtension(pi: ExtensionAPI): void {
  pi.on("before_agent_start", function handleBeforeAgentStart(event) {
    return {
      systemPrompt: filterN8nSkills(event.systemPrompt),
    };
  });
}
