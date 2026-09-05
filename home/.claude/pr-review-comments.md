## Gets PR comments from Claude Review

## Context

1. Get PR comments from claude using `gh pr view 123 --comments | grep -A 10 -B 2 "claude"`
2. Run type check and lint after each fix
3. Always start with a plan first and ask user for approval

## Task

Go through Claude PR review and action suggestions, focusing on critical issues first.

When formulating a plan, think hard and follow this approach:

1. **Discovery**: Get all actionable suggestions in priority order
2. **Planning**: Create parallel work assignments by file/area
3. **Execution**: Spawn sub-agents for independent comment groups
4. **Coordination**: Monitor progress and handle dependencies
5. **Integration**: Merge all changes and verify compatibility
6. **Quality**: Run typecheck and lint to check everything works
