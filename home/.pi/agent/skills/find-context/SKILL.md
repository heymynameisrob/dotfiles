---
name: find-context
description: Finds relevant notes from past sessions in ~/.pi/notes. Use when the user asks about previous conversations, past sessions, prior context, earlier decisions, or says to look in notes.
---

# Find Context

Use this skill to recover context from prior notes saved as Markdown in `~/.pi/notes`.

## Workflow

1. Search `~/.pi/notes` for relevant `.md` files using `bash` with `rg` or `find`.
2. Prefer filename matches first, then search inside files for key terms from the user's request.
3. Read only the most relevant note files with `read`.
4. Summarize the findings briefly and cite the note file path(s) used.
5. If nothing relevant is found, say so clearly and continue without inventing prior context.

## Search patterns

Use commands like:

```bash
find ~/.pi/notes -type f -name '*.md'
rg -n "keyword1|keyword2|keyword3" ~/.pi/notes --glob '*.md'
```

## Notes

- Treat notes in `~/.pi/notes` as the source of truth for remembered session context.
- Do not claim memory outside what is written in those note files.
- When multiple notes match, prefer the newest or most specific one.
