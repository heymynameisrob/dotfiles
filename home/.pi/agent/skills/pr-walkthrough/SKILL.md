---
name: pr-walkthrough
description: Walk through the current branch's diff against master interactively, one logical group at a time. Use only when specifically requested by user.
---

# PR Walkthrough

Guide the user through PR changes, one logical group at a time, pausing after each group so they can determine the action:

PR: $@

## Core Principles

1. **Show the diff, never assume it's visible.** The user does NOT see the output of my tool calls. I always paste the actual diff content into my message as a fenced ```diff block. Tool results are for me; the visible diff is for them.
2. **Group logically, not by file order.** Implementation first, then tests, then docs/config last. Within a group, keep related ranges (a function and its call sites, a type and its usages) close together.
3. **One group at a time.** I never dump all groups at once. I present a group, pause for a decision, then proceed.
4. **Track progress in `/tmp`.** I maintain a concise progress file so state survives across the session.

## Workflow

### 1. Get the PR

Get the PR diff and description from `master` using `gh` cli

```
gh gh pr view <PR> --json number,title,body,author,baseRefName,headRefName,files,additions,deletions
gh pr diff <PR>
```

### 2. Create walkthrough

Analyse diff and combine into 3 logical groups:

- **Implementation** groups first (core logic, then supporting code).
- **Tests** next.
- **Docs / config / chore** last.

Each group bundles ranges that belong together conceptually even if they span multiple files. I keep groups small enough to review in one sitting (roughly one coherent idea per group).

### 3. Create the progress document

Write a concise progress file named after the **current branch** (`$BRANCH`, not the base): `/tmp/interactive-review-<branch>.md`. Slugify slashes in the branch name (e.g. `feat/foo` → `feat-foo`). Keep it terse — it's a checklist, not prose:

```markdown
# Review: <branch> vs <base>

Started: <date>

## Groups

- [ ] 1. <name> — <files/ranges> — STATUS: pending
- [ ] 2. <name> — ... — STATUS: pending
     ...

## Deferred

(none)

## Notes

(decisions, requested changes)
```

I update STATUS (pending / approved / changes-requested / deferred) and check boxes as I go.

### 4. Present each group

For every group, in order, I first generate the visible diff from Git, then post it inline.

#### Group diff extraction

Use `git diff` as the source of truth for the branch diff, then post-process it to include only the files/hunks/line ranges belonging to the current logical group:

```bash
git diff <base>...HEAD -- <path1> <path2>
git diff <base>...HEAD -U20 -- <path1> <path2>
```

- Use the PR base branch from step 1, defaulting to `master` when unknown.
- Include file headers (`diff --git`, `---`, `+++`) for every file in the group.
- Include only hunks relevant to the current group. When a file contains unrelated changes, trim the diff to the selected hunks/ranges instead of showing the whole file.
- Preserve valid unified diff structure for trimmed hunks: keep the `@@ ... @@` hunk header and enough context lines to make the change understandable.
- If `git diff` cannot isolate an exact source line range, extract the file diff and post-process the hunk text manually before presenting it.
- Collapse runs of blank/whitespace-only lines so the diff stays compact and readable.

For every group, I post a message containing:

1. **Heading**: `Group N/M: <name>`
2. **The actual diff** as a ```diff fenced block — pasted from `git diff` output after the group-specific post-processing above. This is mandatory; I never say "see above" or rely on tool output.
3. **What it does** — a plain-language description of the change.
4. **Why** — the apparent intent / problem it solves.
5. **How it links** — relationships to other groups or ranges (e.g. "calls the helper added in Group 1", "covered by tests in Group 4").
6. **Concerns** — anything I'm unsure about or that looks risky: possible bugs, edge cases, missing tests, unclear intent, or things that warrant a closer look. If I have none, I say "No concerns." Each concern is a short, specific bullet.

Then I **pause** and wait for user input and give them these suggestions to move forward:

- **Approve**: mark the group `approved` in the progress file, move to the next group.
- **Request changes**: let the user describe the changes. Make them, then **re-show the range** (updated diff + explanation) and pause again. If the requested change is large enough to alter the structure, I **rework the group boundaries** and re-present.
- **Defer**: move the group to the `Deferred` section, mark `deferred`, continue with the next group. Revisit deferred groups after the main pass.
- **Code Review** — Spawn sub-agent to run `/code-review` skill on this group's diff and reply with results.
- **Chat about this**: answer the user's questions, then re-ask the same prompt for this group. I do not advance until the user picks a terminal decision (approve / request changes / defer).

### 5. Automated Code Review

Spawn sub-agent with `openai-codex/gpt-5.5` and use `code-review` skill on entire diff.
Once finished, pass that review into a new sub-agent using `anthropic/claude-opus-4-7` to verify findings

Report back only high confidence issues

### 6. Post-review summary

After all groups and code-review are resolved, return the following:

- Concise summary
- Any suggested PR comments with file paths and line numbers
- Any high-confidence issues found in Automated Code Review

## Notes

- If the working tree has uncommitted changes relevant to the branch, I note them but review the committed branch diff by default unless the user says otherwise.
- If the diff is empty (branch equals base), I say so and stop.
- I keep my prose tight. The diff and the decision are what matter; explanations are brief and concrete.
- For very large groups I may show the diff in sub-chunks within the same group message, but I still take one decision for the group unless the user asks to split it.
