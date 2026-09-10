---
description: Rebase the current branch and resolve conflicts to completion
argument-hint: "[upstream branch]"
---
Rebase the current branch onto `${1:-origin/master}`.

Follow this process:

1. Inspect the current branch, worktree status, and configured remotes.
2. Do not start if tracked or untracked work can interfere with the rebase. Explain the problem and ask me how to proceed. Do not stash, discard, or commit my work without approval.
3. Always run `git fetch origin` before the rebase. Do this even when the specified upstream uses a different remote. Do not put secrets in command arguments.
4. Start the rebase onto `${1:-origin/master}` only after `git fetch origin` completes successfully. If the fetch fails, stop and explain the error.
5. Continue until the rebase completes. After each conflict resolution, stage only the resolved files and continue with a non-interactive editor when necessary.
6. If conflicts occur, first inspect all current conflicts, the related commits, and both sides of each conflict. Determine the intended combined behavior.
7. At the first conflict, use the `ask_user` tool to ask me to select one mode:
   - **Fix all conflicts**: Resolve all conflicts autonomously. Ask again only when a resolution needs a product decision or cannot be determined safely.
   - **Discuss each conflict**: Explain one conflict at a time, recommend a resolution, and use `ask_user` before applying that resolution. Then continue to the next conflict.
8. Preserve valid changes from both the upstream branch and the rebased commits. Do not select `ours` or `theirs` without checking the rebase semantics and the intended behavior.
9. Do not skip or drop a commit unless I explicitly approve it. If Git reports an empty commit, inspect why it became empty and ask me before you skip it.
10. Do not run tests, lint, or type checks unless I ask.
11. When complete, show the final branch status and a concise summary of the conflict resolutions.

Safety rules:

- Never run `git push --force`, `git push -f`, or `git push --force-with-lease`.
- Never push any branch. Only I can push the rebased branch.
- Never discard local changes.
- Never use destructive recovery commands unless I explicitly approve them.
- If the rebase cannot continue safely, stop with the rebase state intact and explain what blocks progress.
