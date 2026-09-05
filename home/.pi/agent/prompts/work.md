---
description: Apply instructions from AGENT comments and remove completed comments
argument-hint: "[file-or-files...]"
---
Process all code comments that contain `AGENT:` in the target files.

Target selection:
- If arguments are supplied, use them as the file paths, directories, or glob patterns to inspect: `${ARGUMENTS:-}`.
- If no arguments are supplied, inspect files with unstaged changes in the current Git worktree, including untracked files. Ignore deleted files.
- Do not inspect files outside the selected scope.

For each `AGENT:` comment:
1. Read the complete comment and enough surrounding code to understand its instruction.
2. Treat the instruction as related to the nearby code. Follow repository instructions and established code patterns.
3. If the required action is not clear, ask the user one focused clarification question before changing that item. Do not guess.
4. Make the requested change.
5. Remove the full `AGENT:` comment only after its instruction has been completed. Preserve unrelated comments and formatting.

Process every `AGENT:` comment in scope. If instructions depend on each other, apply them in a safe order. Run focused validation that is appropriate for the changed files when practical.

Before finishing, search the selected scope again for remaining `AGENT:` comments. Report any comments that could not be completed and leave those comments in place.

Finish with a concise summary that includes:
- Each instruction found
- The change made for each instruction
- The files changed
- Validation run and its result
- Any unresolved instructions
