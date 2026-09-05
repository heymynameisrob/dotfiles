---
description: Get PR comments and resolve them
---

Get comments on this PR: $@

Fetch all comments on the PR, ignore any that don't have content. Filter for suggestions, feedback or questions (e.g ignoring code coverage, github actions bot etc).

Follow this workflow for each comment:

1. Group the comment in either [suggestion|feedback|question]
2. If suggestion, validate the potential fix and if it's valid, spawn a sub-agent to action fix.
3. If feedback, validate if it would work and suggest path forward
4. If question, spawn sub-agent to research the answer

Output this for each comment, with a summary of all the comments at the bottom:

```
Type:[suggestion|feedback|question]

## What I found
[What you investigated and discovered. Reference specific files, lines,
and code. Show that you did the work.]

## Options (if applicable)
(a) [First option] -- [tradeoff: what you gain, what you lose or risk]
(b) [Second option] -- [tradeoff]
(c) [Third option if applicable] -- [tradeoff]

## My advice
[If you have a recommendation, state it and why. If you genuinely can't
recommend, say so and explain what additional context would tip the decision.]
```
